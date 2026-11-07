/**
 * Riff writing assistance, served by Oracle Arc through the shared provider
 * adapter. It returns text the model actually produced, or an honest failure.
 */
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { getAIProvider } from "@/lib/bud/provider";
import { trimHistory } from "@/lib/ai/context";
import { AI_QUOTA_COPY, aiCallsToday, dailyAiLimit, recordAiUsage } from "@/lib/ai/usage";

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
    if ((await aiCallsToday(sql, context.userId, "riff")) >= dailyAiLimit()) {
      return { ok: false, error: AI_QUOTA_COPY };
    }

    const thread = (Array.isArray(data.thread) ? data.thread : []).map((line) => clean(line, 280)).filter(Boolean).slice(-6);

    const provider = getAIProvider();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    const result = await provider.complete(
      [
        { role: "system", content: SYSTEM },
        { role: "system", content: `Mode: ${mode}.` },
        ...trimHistory(thread.map((content) => ({ role: "user" as const, content })), { maxChars: 2_000 }),
        { role: "user", content: draft },
      ],
      { maxTokens: 220, signal: controller.signal },
    );
    clearTimeout(timer);

    await recordAiUsage(sql, {
      userId: context.userId,
      product: "riff",
      provider: result.providerId,
      model: result.ok ? result.model : null,
      status: result.ok ? "ok" : "error",
      errorCode: result.ok ? null : result.code,
      promptTokens: result.ok ? result.usage?.promptTokens : undefined,
      completionTokens: result.ok ? result.usage?.completionTokens : undefined,
      totalTokens: result.ok ? result.usage?.totalTokens : undefined,
      latencyMs: result.latencyMs ?? 0,
    });

    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, text: result.text.trim() };
  });
