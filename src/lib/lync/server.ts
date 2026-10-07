import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

/** Defined streak milestone levels. */
export const LYNC_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

export type LyncMilestone = { level: number; earnedAt: string };

export type LyncState = {
  currentStreak: number;
  longestStreak: number;
  lastShareDate: string | null;
  milestones: LyncMilestone[];
  /** Milestone levels earned by this specific share call (for toasts). */
  newlyEarned: number[];
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateStr(d: unknown): string | null {
  if (!d) return null;
  return String(d).slice(0, 10);
}

async function loadLyncState(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  newlyEarned: number[] = [],
): Promise<LyncState> {
  const streakRows = await sql<{ current_streak: number; longest_streak: number; last_share_date: unknown }>`
    select current_streak, longest_streak, last_share_date from lync_streaks where user_id = ${userId} limit 1`;
  const s = streakRows[0];
  const milestoneRows = await sql<{ level: number; earned_at: string }>`
    select level, earned_at from lync_milestones where user_id = ${userId} order by level asc`;
  return {
    currentStreak: s?.current_streak ?? 0,
    longestStreak: s?.longest_streak ?? 0,
    lastShareDate: s ? dateStr(s.last_share_date) : null,
    milestones: milestoneRows.map((m) => ({ level: m.level, earnedAt: m.earned_at })),
    newlyEarned,
  };
}

/**
 * Record a qualifying share for today. Counts at most once per calendar day.
 * Updates the streak, awards milestones without duplicates, and preserves
 * earned milestones even when a streak later resets.
 *
 * `recordLyncShareFor` is the core logic, callable from other server functions
 * without going through the middleware chain again.
 */
export async function recordLyncShareFor(userId: string): Promise<LyncState> {
  const sql = await getSql();
  const today = todayStr();

    // Idempotent per day: if a share already exists for today, return current state.
    const existing = await sql`select 1 from lync_shares where user_id = ${userId} and share_date = ${today}`;
    if (existing[0]) {
      return loadLyncState(sql, userId);
    }

    await sql`insert into lync_shares (user_id, share_date) values (${userId}, ${today}) on conflict do nothing`;

    const streakRows = await sql<{ current_streak: number; longest_streak: number; last_share_date: unknown }>`
      select current_streak, longest_streak, last_share_date from lync_streaks where user_id = ${userId} limit 1`;
    const streak = streakRows[0];
    const lastDate = streak ? dateStr(streak.last_share_date) : null;

    let newCurrent = 1;
    if (lastDate) {
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      if (lastDate === yesterday) {
        newCurrent = (streak.current_streak || 0) + 1;
      }
      // else: gap > 1 day → streak resets to 1
    }
    const newLongest = Math.max(streak?.longest_streak || 0, newCurrent);

    if (streak) {
      await sql`update lync_streaks set current_streak = ${newCurrent}, longest_streak = ${newLongest},
        last_share_date = ${today}, updated_at = now() where user_id = ${userId}`;
    } else {
      await sql`insert into lync_streaks (user_id, current_streak, longest_streak, last_share_date)
        values (${userId}, ${newCurrent}, ${newLongest}, ${today})`;
    }

    // Award milestones without duplicates
    const newlyEarned: number[] = [];
    for (const level of LYNC_MILESTONES) {
      if (newCurrent >= level) {
        const has = await sql`select 1 from lync_milestones where user_id = ${userId} and level = ${level}`;
        if (!has[0]) {
          await sql`insert into lync_milestones (user_id, level) values (${userId}, ${level}) on conflict do nothing`;
          newlyEarned.push(level);
        }
      }
    }

    return loadLyncState(sql, userId, newlyEarned);
}

export const recordLyncShare = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return recordLyncShareFor(context.userId);
  });

/** Read the current Lync streak state for the signed-in student. */
export const getLyncState = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return loadLyncState(sql, context.userId);
  });
