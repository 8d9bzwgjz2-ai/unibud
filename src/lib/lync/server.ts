/**
 * Lync server logic. A Lync only ever grows from real, persisted qualifying
 * shares (posts published through the server) — never from opening the app.
 */
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { notify } from "@/lib/unibud/server";
import { LYNC_ACTIVATION_DAYS, NO_LYNC, type LyncView } from "./copy";

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDay(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Record one qualifying share for the user and advance their real Lync state.
 * Called server-side from the publishing path only. Notifications are written
 * only for real state transitions.
 */
export async function recordLyncShare(userId: string, postId?: string) {
  const sql = await getSql();
  const today = todayUtc();
  await sql`insert into lync_shares (id, user_id, post_id, shared_on)
    values (${crypto.randomUUID()}, ${userId}, ${postId ?? null}, ${today})`;
  const rows = await sql<{ count: number; active: boolean; last_share_on: string | Date }>`
    select * from lync_states where user_id = ${userId} limit 1`;
  const state = rows[0];

  if (!state) {
    await sql`insert into lync_states (user_id, count, active, started_on, last_share_on)
      values (${userId}, 1, false, ${today}, ${today})`;
    await notify(userId, "lync", "Lync started.", "Share again tomorrow to keep it going.", "/");
    return;
  }

  const last = String(state.last_share_on);
  if (last === today) return; // already counted a qualifying share today

  if (last === shiftDay(today, -1)) {
    const count = Number(state.count) + 1;
    const active = Boolean(state.active) || count >= LYNC_ACTIVATION_DAYS;
    await sql`update lync_states set count = ${count}, active = ${active},
      last_share_on = ${today}, broken_on = null, updated_at = now() where user_id = ${userId}`;
    if (!state.active && active) {
      await notify(userId, "lync", "Your Lync is alive.", "Keep sharing to keep it going.", "/");
    }
    const hit = await sql<{ days: number; label: string }>`
      select days, label from lync_milestones where days = ${count} limit 1`;
    if (hit[0]) {
      // A bonus is only "ready" when a real reward was actually granted.
      const reward = await sql`select id from lync_rewards
        where user_id = ${userId} and milestone_days = ${count} limit 1`;
      if (reward[0]) {
        await notify(userId, "lync", "Bonus unlocked.", `${hit[0].label} — your reward is ready.`, "/");
      } else {
        await notify(userId, "lync", "Your Lync reached a milestone.", `You reached your ${hit[0].label}.`, "/");
      }
    } else {
      const upcoming = await sql<{ days: number; label: string }>`
        select days, label from lync_milestones where days > ${count} order by days asc limit 1`;
      if (upcoming[0] && upcoming[0].days - count === 2) {
        await notify(userId, "lync", "Your Lync bonus is almost here.", `2 days to your ${upcoming[0].label}.`, "/");
      }
    }
  } else {
    // A gap broke the previous Lync — only now is that a real event.
    if (state.active) {
      await notify(userId, "lync", "You broke your Lync.", "Sharing today starts a new one.", "/");
    }
    await sql`update lync_states set count = 1, active = false,
      started_on = ${today}, last_share_on = ${today}, broken_on = ${last}, updated_at = now()
      where user_id = ${userId}`;
    if (state.active) {
      await notify(userId, "lync", "New Lync started.", "Day 1.", "/");
    }
  }
}

/** The signed-in user's real Lync state — computed from persisted rows only. */
export const getMyLync = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<LyncView> => {
    const sql = await getSql();
    const rows = await sql<{
      count: number;
      active: boolean;
      started_on: string | Date;
      last_share_on: string | Date;
    }>`select * from lync_states where user_id = ${context.userId} limit 1`;
    const state = rows[0];
    if (!state) return NO_LYNC;
    const count = Number(state.count);
    const next = await sql<{ days: number; label: string }>`
      select days, label from lync_milestones where days > ${count} order by days asc limit 1`;
    const rewards = await sql`select id from lync_rewards where user_id = ${context.userId} limit 1`;
    return {
      exists: true,
      count,
      active: Boolean(state.active),
      startedOn: String(state.started_on),
      lastShareOn: String(state.last_share_on),
      nextMilestone: next[0] ?? null,
      rewardReady: rewards.length > 0,
    };
  });
