/**
 * Oracle Arc — UNIBUD's AI core.
 *
 * Oracle Arc is a separate service reached over its authenticated HTTP API. This
 * module is server-only: the provider key is read from the server environment and
 * never reaches the browser bundle. Configure it with:
 *
 *   ORACLE_ARC_API_URL   base URL of the deployment's Oracle Arc API
 *   ORACLE_ARC_MODEL     model id the deployment should use
 *   ORACLE_ARC_API_KEY   server-side bearer key
 *
 * When those are absent every caller receives an honest "not configured"
 * failure. Nothing here invents a reply.
 */

export type ArcMessage = { role: "system" | "user" | "assistant"; content: string };

export type ArcUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type ArcFailureCode =
  | "not-configured"
  | "unauthorized"
  | "rate-limited"
  | "timeout"
  | "network"
  | "provider-error"
  | "bad-response"
  | "stopped";

export type ArcSuccess = {
  ok: true;
  text: string;
  model: string;
  usage: ArcUsage;
  latencyMs: number;
  attempts: number;
};

export type ArcFailure = {
  ok: false;
  code: ArcFailureCode;
  error: string;
  retryable: boolean;
  latencyMs: number;
  attempts: number;
};

export type ArcResult = ArcSuccess | ArcFailure;

export type ArcConfig = {
  chatUrl: string;
  model: string;
  apiKey: string;
  timeoutMs: number;
  maxAttempts: number;
};

/** Student-facing copy. Never names providers, endpoints or keys. */
export const ARC_FAILURE_COPY: Record<ArcFailureCode, string> = {
  "not-configured": "Bud isn’t connected to its AI core yet, so I can’t answer that live. Nothing was sent.",
  unauthorized: "Bud couldn’t sign in to its AI core, so that answer didn’t run. Try again later.",
  "rate-limited": "Bud is handling a lot right now. Try again in a moment.",
  timeout: "That answer took too long, so Bud stopped it. Try again.",
  network: "The connection to Bud’s AI core dropped. Check your network and try again.",
  "provider-error": "Bud’s AI core had a problem just now. Try again.",
  "bad-response": "Bud got an empty answer back. Try again.",
  stopped: "Bud stopped that reply.",
};

const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 250;

/** Accepts a base URL, a `/v1` root, or a full chat-completions endpoint. */
export function chatUrlFrom(raw: string): string {
  const base = raw.trim().replace(/\/+$/, "");
  if (/\/chat\/completions$/.test(base)) return base;
  if (/\/v1$/.test(base)) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function readArcConfig(
  env: Record<string, string | undefined> = typeof process === "undefined" ? {} : process.env,
): ArcConfig | null {
  const url = (env.ORACLE_ARC_API_URL ?? env.ORACLE_ARC_ENDPOINT ?? "").trim();
  const model = (env.ORACLE_ARC_MODEL ?? "").trim();
  const apiKey = (env.ORACLE_ARC_API_KEY ?? "").trim();
  if (!url || !model || !apiKey) return null;
  return {
    chatUrl: chatUrlFrom(url),
    model,
    apiKey,
    timeoutMs: positiveInt(env.ORACLE_ARC_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    maxAttempts: positiveInt(env.ORACLE_ARC_MAX_ATTEMPTS, MAX_ATTEMPTS),
  };
}

type ArcBody = {
  choices?: { message?: { content?: unknown }; text?: unknown }[];
  output_text?: unknown;
  content?: { type?: unknown; text?: unknown }[];
  response?: unknown;
  model?: unknown;
  usage?: { prompt_tokens?: unknown; completion_tokens?: unknown; total_tokens?: unknown };
};

/** Tolerant of the common chat-completion response shapes. */
export function extractArcText(body: unknown): string {
  if (typeof body === "string") return body.trim();
  if (!body || typeof body !== "object") return "";
  const b = body as ArcBody;
  const candidates: unknown[] = [
    b.choices?.[0]?.message?.content,
    b.choices?.[0]?.text,
    b.output_text,
    b.response,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  if (Array.isArray(b.content)) {
    const joined = b.content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();
    if (joined) return joined;
  }
  return "";
}

function readUsage(body: unknown): ArcUsage {
  const usage = (body as ArcBody | null)?.usage;
  const pick = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);
  return {
    promptTokens: pick(usage?.prompt_tokens),
    completionTokens: pick(usage?.completion_tokens),
    totalTokens: pick(usage?.total_tokens),
  };
}

function failure(code: ArcFailureCode, latencyMs: number, attempts: number, retryable: boolean): ArcFailure {
  return { ok: false, code, error: ARC_FAILURE_COPY[code], retryable, latencyMs, attempts };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type ArcRequestOptions = {
  maxTokens?: number;
  signal?: AbortSignal;
  /** Injected in tests. */
  config?: ArcConfig | null;
  fetchImpl?: typeof fetch;
};

/**
 * Sends one completion to Oracle Arc. Retries once on rate limits, 5xx and
 * dropped connections; never retries auth failures or empty answers.
 */
export async function completeWithOracleArc(
  messages: ArcMessage[],
  opts: ArcRequestOptions = {},
): Promise<ArcResult> {
  const started = Date.now();
  if (typeof window !== "undefined") {
    return failure("not-configured", 0, 0, false);
  }
  const config = opts.config === undefined ? readArcConfig() : opts.config;
  if (!config) return failure("not-configured", 0, 0, false);
  const doFetch = opts.fetchImpl ?? fetch;
  const maxAttempts = Math.max(1, config.maxAttempts);
  let attempts = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (opts.signal?.aborted) return failure("stopped", Date.now() - started, attempts, false);
    attempts = attempt;
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, config.timeoutMs);
    const forwardAbort = () => controller.abort();
    opts.signal?.addEventListener("abort", forwardAbort, { once: true });

    try {
      const response = await doFetch(config.chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          max_tokens: opts.maxTokens ?? 700,
          stream: false,
        }),
        signal: controller.signal,
      });
      const latencyMs = Date.now() - started;

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return failure("unauthorized", latencyMs, attempts, false);
        }
        if (response.status === 429) {
          if (attempt < maxAttempts) {
            await wait(RETRY_DELAY_MS);
            continue;
          }
          return failure("rate-limited", latencyMs, attempts, true);
        }
        if (response.status >= 500) {
          if (attempt < maxAttempts) {
            await wait(RETRY_DELAY_MS);
            continue;
          }
          return failure("provider-error", latencyMs, attempts, true);
        }
        return failure("provider-error", latencyMs, attempts, false);
      }

      const body: unknown = await response.json().catch(() => null);
      const text = extractArcText(body);
      if (!text) return failure("bad-response", latencyMs, attempts, false);
      return {
        ok: true,
        text,
        model:
          typeof (body as ArcBody | null)?.model === "string" ? String((body as ArcBody).model) : config.model,
        usage: readUsage(body),
        latencyMs,
        attempts,
      };
    } catch (error) {
      const latencyMs = Date.now() - started;
      if (opts.signal?.aborted) return failure("stopped", latencyMs, attempts, false);
      const name = error instanceof Error ? error.name : "";
      if (timedOut || name === "TimeoutError") {
        if (attempt < maxAttempts) {
          await wait(RETRY_DELAY_MS);
          continue;
        }
        return failure("timeout", latencyMs, attempts, true);
      }
      if (attempt < maxAttempts) {
        await wait(RETRY_DELAY_MS);
        continue;
      }
      return failure("network", latencyMs, attempts, true);
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", forwardAbort);
    }
  }

  return failure("provider-error", Date.now() - started, attempts, false);
}
