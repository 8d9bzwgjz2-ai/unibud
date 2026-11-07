/**
 * Canonical Bud model adapter.
 *
 * Bud talks to Oracle Arc, UNIBUD's AI core, through its authenticated server-side
 * API (see `@/lib/ai/oracle-arc`). Providers are capability-aware and replaceable;
 * the adapter reports failure honestly instead of fabricating a reply.
 *
 * Optional fallback: set `ORACLE_ARC_FALLBACK_PROVIDER=xai` and `XAI_API_KEY` to
 * keep Bud answering while Oracle Arc is unreachable. The fallback is never used
 * silently — the result names the provider that actually answered.
 */

import { completeWithOracleArc, readArcConfig } from "@/lib/ai/oracle-arc";

export type ProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ProviderCapability =
  | "text"
  | "vision"
  | "audio-input"
  | "audio-output"
  | "image-generation"
  | "video-generation";

export type ProviderUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type ProviderResult =
  | {
      ok: true;
      text: string;
      providerId: string;
      model?: string;
      usage?: ProviderUsage;
      latencyMs?: number;
      attempts?: number;
      fallback?: boolean;
    }
  | {
      ok: false;
      error: string;
      providerId: string;
      code?: string;
      latencyMs?: number;
      attempts?: number;
    };

export type AIProvider = {
  id: string;
  kind: "remote" | "free";
  capabilities: ProviderCapability[];
  complete: (
    messages: ProviderMessage[],
    opts?: { maxTokens?: number; signal?: AbortSignal },
  ) => Promise<ProviderResult>;
};

const unavailableProvider: AIProvider = {
  id: "unavailable",
  kind: "free",
  capabilities: [],
  async complete() {
    return {
      ok: false,
      error:
        "Bud’s AI core isn’t connected yet, so I can’t answer that live. Nothing was sent.",
      providerId: "unavailable",
      code: "not-configured",
      latencyMs: 0,
      attempts: 0,
    };
  },
};

function oracleArcProvider(): AIProvider {
  return {
    id: "oracle-arc",
    kind: "remote",
    capabilities: ["text"],
    async complete(messages, opts) {
      const result = await completeWithOracleArc(messages, {
        maxTokens: opts?.maxTokens,
        signal: opts?.signal,
      });
      if (!result.ok) {
        return {
          ok: false,
          error: result.error,
          providerId: "oracle-arc",
          code: result.code,
          latencyMs: result.latencyMs,
          attempts: result.attempts,
        };
      }
      return {
        ok: true,
        text: result.text,
        providerId: "oracle-arc",
        model: result.model,
        usage: result.usage,
        latencyMs: result.latencyMs,
        attempts: result.attempts,
      };
    },
  };
}

function xaiProvider(apiKey: string): AIProvider {
  return {
    id: "xai-fallback",
    kind: "remote",
    capabilities: ["text"],
    async complete(messages, opts) {
      const started = Date.now();
      try {
        const res = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          signal: opts?.signal,
          body: JSON.stringify({ model: "grok-4.5", max_tokens: opts?.maxTokens ?? 700, messages }),
        });
        if (!res.ok) {
          const error =
            res.status >= 500
              ? "Bud couldn’t reach its AI core. Try again in a moment."
              : "Bud couldn’t reply just now. Try again.";
          return { ok: false, error, providerId: "xai-fallback", latencyMs: Date.now() - started };
        }
        const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const text = body.choices?.[0]?.message?.content;
        if (!text)
          return {
            ok: false,
            error: "Bud received an empty reply. Try again.",
            providerId: "xai-fallback",
            latencyMs: Date.now() - started,
          };
        return { ok: true, text, providerId: "xai-fallback", latencyMs: Date.now() - started };
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError")
          return { ok: false, error: "Bud stopped that reply.", providerId: "xai-fallback" };
        return {
          ok: false,
          error: "Looks like the connection dropped. Check your network and try again.",
          providerId: "xai-fallback",
        };
      }
    },
  };
}

/** True when the optional xAI fallback is explicitly enabled and keyed. */
export function xaiFallbackEnabled(
  env: Record<string, string | undefined> = typeof process === "undefined" ? {} : process.env,
): boolean {
  return env.ORACLE_ARC_FALLBACK_PROVIDER === "xai" && Boolean(env.XAI_API_KEY?.trim());
}

export function getAIProvider(): AIProvider {
  const env = typeof process === "undefined" ? {} : process.env;
  const oracle = readArcConfig(env);
  const fallbackKey = env.XAI_API_KEY?.trim();

  if (oracle) {
    if (!xaiFallbackEnabled(env) || !fallbackKey) return oracleArcProvider();
    // Primary stays Oracle Arc; the fallback covers a primary that is down.
    const primary = oracleArcProvider();
    const fallback = xaiProvider(fallbackKey);
    return {
      ...primary,
      async complete(messages, opts) {
        const first = await primary.complete(messages, opts);
        if (first.ok || opts?.signal?.aborted) return first;
        const retry = await fallback.complete(messages, opts);
        return retry.ok ? { ...retry, fallback: true } : first;
      },
    };
  }

  if (xaiFallbackEnabled(env) && fallbackKey) return xaiProvider(fallbackKey);
  return unavailableProvider;
}
