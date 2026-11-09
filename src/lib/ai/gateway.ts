/**
 * The single server-side gateway for every UNIBUD AI feature.
 *
 * Bud and Riff both call `generateAi`, so each AI surface gets the same
 * guarantees without re-implementing them:
 *
 *   - server-only provider access; no key ever reaches the browser
 *   - one bounded timeout, forwarded to the provider as an abort
 *   - the usage ledger records success *and* failure for every call
 *   - an empty completion is a failure, never a reply
 *
 * Quotas stay explicit at the call site (`aiQuotaError`) because a feature must
 * reject a request before it persists the user's turn. The pattern is always:
 *
 *   const quotaError = await aiQuotaError(sql, userId, product);
 *   if (quotaError) return { ok: false, error: quotaError };
 *   const result = await generateAi({ sql, userId, product, messages });
 *
 * Oracle Arc is the provider behind `getAIProvider()`; when it isn't configured
 * the gateway returns the adapter's honest failure. Nothing here invents text.
 */
// Relative `.ts` imports so the module also loads under `node --test`.
import type { Sql } from "../db.ts";
import {
  AI_QUOTA_COPY,
  aiCallsToday,
  dailyAiLimit,
  recordAiUsage,
  type AiProduct,
} from "./usage.ts";
import {
  getAIProvider,
  type AIProvider,
  type ProviderMessage,
} from "./provider.ts";

export const DEFAULT_AI_TIMEOUT_MS = 22_000;

/** Copy shown when a provider answers with nothing. Never presented as a reply. */
export const EMPTY_AI_COPY = "The assistant got an empty answer back. Try again.";

/** Daily-quota copy for this feature, or `null` when the user may proceed. */
export async function aiQuotaError(
  sql: Sql,
  userId: string,
  product: AiProduct,
): Promise<string | null> {
  const used = await aiCallsToday(sql, userId, product);
  return used >= dailyAiLimit() ? AI_QUOTA_COPY : null;
}

export type AiGenerateInput = {
  sql: Sql;
  userId: string;
  product: AiProduct;
  messages: ProviderMessage[];
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Injected in tests. */
  provider?: AIProvider;
};

export type AiGenerateResult =
  | {
      ok: true;
      text: string;
      providerId: string;
      model?: string;
      latencyMs: number;
    }
  | {
      ok: false;
      error: string;
      code: string;
      providerId: string;
    };

/** Runs one completion through the configured provider and ledgers it. */
export async function generateAi(input: AiGenerateInput): Promise<AiGenerateResult> {
  const provider = input.provider ?? getAIProvider();
  const timeoutMs = input.timeoutMs ?? DEFAULT_AI_TIMEOUT_MS;
  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  input.signal?.addEventListener("abort", forwardAbort, { once: true });

  let result: Awaited<ReturnType<AIProvider["complete"]>>;
  try {
    result = await provider.complete(input.messages, {
      maxTokens: input.maxTokens,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener("abort", forwardAbort);
  }

  const text = result.ok ? result.text.trim() : "";
  // An empty completion is a failure, never a reply.
  const ok = result.ok && text.length > 0;
  const code = ok ? null : result.ok ? "bad-response" : (result.code ?? "provider-error");

  await recordAiUsage(input.sql, {
    userId: input.userId,
    product: input.product,
    provider: result.providerId,
    model: result.ok ? result.model : null,
    status: ok ? "ok" : "error",
    errorCode: code,
    promptTokens: result.ok ? result.usage?.promptTokens : undefined,
    completionTokens: result.ok ? result.usage?.completionTokens : undefined,
    totalTokens: result.ok ? result.usage?.totalTokens : undefined,
    latencyMs: result.latencyMs ?? 0,
  });

  if (!ok || !result.ok) {
    return {
      ok: false,
      error: result.ok ? EMPTY_AI_COPY : result.error,
      code: code ?? "bad-response",
      providerId: result.providerId,
    };
  }

  return {
    ok: true,
    text,
    providerId: result.providerId,
    model: result.model,
    latencyMs: result.latencyMs ?? 0,
  };
}
