/** Canonical Bud model adapter. The live model is Oracle Arc. */

import { completeOracleArc, ORACLE_ARC_ID } from "@/lib/oracle/arc-llm";

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

const oracleArcProvider: AIProvider = {
  id: ORACLE_ARC_ID,
  kind: "remote",
  capabilities: ["text"],
  complete(messages, opts) {
    return completeOracleArc(messages, opts);
  },
};

export function getAIProvider(): AIProvider {
  return oracleArcProvider;
}
