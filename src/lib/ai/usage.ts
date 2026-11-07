/**
 * AI usage ledger and per-user daily quotas.
 *
 * Every Oracle Arc call is recorded (success or failure) so quality, latency and
 * spend stay measurable. Recording is best-effort: a ledger write must never
 * break a student's answer.
 */
import type { Sql } from "@/lib/db";

export type AiProduct = "bud" | "riff";

export type AiUsageEntry = {
  userId: string;
  product: AiProduct;
  provider: string;
  model?: string | null;
  status: "ok" | "error";
  errorCode?: string | null;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs: number;
};

export const DEFAULT_DAILY_AI_LIMIT = 200;

export function dailyAiLimit(
  env: Record<string, string | undefined> = typeof process === "undefined" ? {} : process.env,
): number {
  const parsed = Number(env.ORACLE_ARC_DAILY_LIMIT);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_DAILY_AI_LIMIT;
}

export async function recordAiUsage(sql: Sql, entry: AiUsageEntry): Promise<void> {
  try {
    await sql`
      insert into ai_usage (id, user_id, product, provider, model, status, error_code, prompt_tokens, completion_tokens, total_tokens, latency_ms)
      values (${crypto.randomUUID()}, ${entry.userId}, ${entry.product}, ${entry.provider}, ${entry.model ?? null}, ${entry.status}, ${entry.errorCode ?? null},
        ${entry.promptTokens ?? null}, ${entry.completionTokens ?? null}, ${entry.totalTokens ?? null}, ${Math.max(0, Math.round(entry.latencyMs))})
    `;
  } catch {
    /* the ledger is optional at runtime: an older database must not break replies */
  }
}

export async function aiCallsToday(sql: Sql, userId: string, product: AiProduct): Promise<number> {
  try {
    const rows = await sql<{ count: string | number }>`
      select count(*) as count from ai_usage
      where user_id = ${userId} and product = ${product} and created_at >= date_trunc('day', now())
    `;
    return Number(rows[0]?.count ?? 0);
  } catch {
    return 0;
  }
}

export const AI_QUOTA_COPY = "You’ve reached today’s limit for this assistant. It resets at midnight.";
