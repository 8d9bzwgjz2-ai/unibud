/** Canonical Bud model adapter. Providers are replaceable and capability-aware. */

export type ProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ProviderCapability = "text" | "vision" | "audio-input" | "audio-output" | "image-generation" | "video-generation";

export type ProviderResult =
  | { ok: true; text: string; providerId: string }
  | { ok: false; error: string; providerId: string };

export type AIProvider = {
  id: string;
  kind: "remote" | "free";
  capabilities: ProviderCapability[];
  complete: (messages: ProviderMessage[], opts?: { maxTokens?: number; signal?: AbortSignal }) => Promise<ProviderResult>;
};

const unavailableProvider: AIProvider = {
  id: "unavailable",
  kind: "free",
  capabilities: [],
  async complete() {
    return { ok: false, error: "Bud’s live model is not configured yet. Connect the approved server-side AI provider before using Bud.", providerId: "unavailable" };
  },
};

function xaiProvider(apiKey: string): AIProvider {
  return {
    id: "xai",
    kind: "remote",
    capabilities: ["text"],
    async complete(messages, opts) {
      try {
        const res = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          signal: opts?.signal,
          body: JSON.stringify({ model: "grok-4.5", max_tokens: opts?.maxTokens ?? 700, messages }),
        });
        if (!res.ok) {
          const error = res.status >= 500 ? "Bud couldn’t reach the model. Try again in a moment." : "Bud couldn’t reply just now. Try again.";
          return { ok: false, error, providerId: "xai" };
        }
        const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const text = body.choices?.[0]?.message?.content;
        if (!text) return { ok: false, error: "Bud received an empty reply. Try again.", providerId: "xai" };
        return { ok: true, text, providerId: "xai" };
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return { ok: false, error: "Bud stopped that reply.", providerId: "xai" };
        return { ok: false, error: "Looks like the connection dropped. Check your network and try again.", providerId: "xai" };
      }
    },
  };
}

export function getAIProvider(): AIProvider {
  const key = typeof process !== "undefined" ? process.env.XAI_API_KEY : undefined;
  if (key && key.trim()) return xaiProvider(key.trim());
  return unavailableProvider;
}
