/**
 * Oracle Arc is the model layer behind UNIBUD.
 * The student hears Bud. This module is never imported by navigation.
 */
import { connectSystemBrief } from "@/lib/connect/system";
import { campusSystemBrief } from "@/lib/oracle/campus";

export const ORACLE_ARC_MODEL = "grok-4.5";
export const ORACLE_ARC_ID = "oracle-arc" as const;

export type OracleMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OracleResult =
  | { ok: true; text: string; providerId: typeof ORACLE_ARC_ID }
  | { ok: false; error: string; providerId: typeof ORACLE_ARC_ID };

const IDENTITY = `You are the model behind Bud inside UNIBUD. The student only hears Bud. Never say you are Oracle, Arc, Grok, or a model, and never name internal agents.
Answer from the live record only when they ask for a figure. If they are just talking, answer like a person and do not recite balances, fixtures, titles, orders, or place duties. Concierge is a separate desk at /guild/concierge. Never paste its responsibilities or its action list into this chat. If a figure is not in the live record, say it is empty. Do not invent people, posts, matches, balances, grades, films, bookings, or payments.`;

export async function completeOracleArc(
  messages: OracleMessage[],
  opts?: { maxTokens?: number; signal?: AbortSignal },
): Promise<OracleResult> {
  const apiKey = typeof process !== "undefined" ? process.env.XAI_API_KEY?.trim() : undefined;
  if (!apiKey) {
    return { ok: false, error: "Bud couldn’t reply just now. The model is not connected.", providerId: ORACLE_ARC_ID };
  }
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: opts?.signal,
      body: JSON.stringify({
        model: ORACLE_ARC_MODEL,
        max_tokens: opts?.maxTokens ?? 500,
        messages: [
          { role: "system", content: IDENTITY },
          { role: "system", content: connectSystemBrief() },
          { role: "system", content: campusSystemBrief() },
          ...messages,
        ],
      }),
    });
    if (!res.ok) {
      const error = res.status >= 500 ? "Bud couldn’t reach the model. Try again in a moment." : "Bud couldn’t reply just now. Try again.";
      return { ok: false, error, providerId: ORACLE_ARC_ID };
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text) return { ok: false, error: "Bud received an empty reply. Try again.", providerId: ORACLE_ARC_ID };
    return { ok: true, text, providerId: ORACLE_ARC_ID };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "Bud stopped that reply.", providerId: ORACLE_ARC_ID };
    }
    return { ok: false, error: "Looks like the connection dropped. Check your network and try again.", providerId: ORACLE_ARC_ID };
  }
}
