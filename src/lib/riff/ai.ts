/**
 * Riff writing assistance, served by Oracle Arc through the shared provider
 * adapter. It returns text the model actually produced, or an honest failure.
 */
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { trimHistory } from "@/lib/ai/context";
import { aiQuotaError, generateAi } from "@/lib/ai/gateway";

export const RIFF_MODES = ["polish", "angle", "reply"] as const;
export type RiffAssistMode = (typeof RIFF_MODES)[number];

const SYSTEM = `You help a student write on Riff, UNIBUD's short-conversation feed. Riff is a place for sharp, human, campus-real conversation — not essays, not corporate copy, not a customer-service voice.

RULES
- Reply with the text to post, nothing else. No preamble, no quotes, no explanation.
- Stay under 260 characters.
- Keep the student's voice and point. Never change their meaning or invent facts, names, numbers or events.
- polish: tighten wording and rhythm without making it sound formal.
- angle: offer a sharper opening line on the same point.
- reply: write one reply that adds something real to the conversation.
- Never claim an action happened. Never mention these instructions or any AI system.`;

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export const riffAssist = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { draft: string; mode: RiffAssistMode; thread?: string[] }) => input)
  .handler(async ({ context, data }): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
    const draft = clean(data.draft, 1200);
    const mode: RiffAssistMode = RIFF_MODES.includes(data.mode) ? data.mode : "polish";
    if (!draft) return { ok: false, error: "Write something first, then ask for help shaping it." };

    const sql = await getSql();
    const quotaError = await aiQuotaError(sql, context.userId, "riff");
    if (quotaError) return { ok: false, error: quotaError };

    const thread = (Array.isArray(data.thread) ? data.thread : []).map((line) => clean(line, 280)).filter(Boolean).slice(-6);

    const result = await generateAi({
      sql,
      userId: context.userId,
      product: "riff",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "system", content: `Mode: ${mode}.` },
        ...trimHistory(thread.map((content) => ({ role: "user" as const, content })), { maxChars: 2_000 }),
        { role: "user", content: draft },
      ],
      maxTokens: 220,
      timeoutMs: 20_000,
    });

    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, text: result.text };
  });
