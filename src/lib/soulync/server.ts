/**
 * SouLync — UNIBUD's matching product.
 *
 * Opt-in only: people appear in discovery only after creating a SouLync profile
 * and while it is not paused. Liking is one-sided until it is mutual, so nobody
 * can enumerate who liked them; blocks hide both people in both directions.
 * Everyone is 18+ — validated here and enforced by a database check.
 */
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

export const SOULYNC_INTENTS = ["friends", "dating", "long-term", "open"] as const;
export type SoulyncIntent = (typeof SOULYNC_INTENTS)[number];

export const SOULYNC_INTENT_LABEL: Record<SoulyncIntent, string> = {
  friends: "Friends first",
  dating: "Dating",
  "long-term": "Something serious",
  open: "Open to see",
};

export type SoulyncProfileInput = {
  displayName: string;
  age: number;
  campus: string;
  program: string;
  intent: SoulyncIntent;
  interests: string[];
  prompt: string;
  paused?: boolean;
};

export type SoulyncProfile = SoulyncProfileInput & { userId: string; paused: boolean };

export type SoulyncCard = {
  userId: string;
  displayName: string;
  age: number;
  campus: string;
  program: string;
  intent: SoulyncIntent;
  interests: string[];
  prompt: string;
};

export type SoulyncMatch = SoulyncCard & { matchedAt: string };

export type SoulyncState = {
  profile: SoulyncProfile | null;
  candidates: SoulyncCard[];
  matches: SoulyncMatch[];
  likesWaiting: number;
};

type ProfileRow = {
  user_id: string;
  display_name: string;
  age: number;
  campus: string;
  program: string;
  intent: string;
  interests: string[] | null;
  prompt: string;
  paused: boolean;
};

function asIntent(value: string): SoulyncIntent {
  return (SOULYNC_INTENTS as readonly string[]).includes(value) ? (value as SoulyncIntent) : "open";
}

function mapProfile(row: ProfileRow): SoulyncProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    age: row.age,
    campus: row.campus,
    program: row.program,
    intent: asIntent(row.intent),
    interests: row.interests ?? [],
    prompt: row.prompt,
    paused: row.paused,
  };
}

function mapCard(row: ProfileRow): SoulyncCard {
  const { userId, paused: _paused, ...rest } = mapProfile(row);
  return { userId, ...rest };
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function validateSoulyncProfile(input: SoulyncProfileInput): { ok: true; value: SoulyncProfileInput } | { ok: false; error: string } {
  const displayName = text(input?.displayName, 40);
  if (displayName.length < 2) return { ok: false, error: "Add the name you want people to see." };
  const age = Number(input?.age);
  if (!Number.isInteger(age)) return { ok: false, error: "Enter your age as a whole number." };
  if (age < 18) return { ok: false, error: "SouLync is 18+. You can’t create a profile yet." };
  if (age > 99) return { ok: false, error: "Enter an age between 18 and 99." };
  const interests = (Array.isArray(input?.interests) ? input.interests : [])
    .map((i) => text(i, 24))
    .filter(Boolean)
    .slice(0, 8);
  if (!interests.length) return { ok: false, error: "Pick at least one interest so people have something to open with." };
  return {
    ok: true,
    value: {
      displayName,
      age,
      campus: text(input?.campus, 60),
      program: text(input?.program, 60),
      intent: asIntent(String(input?.intent ?? "open")),
      interests,
      prompt: text(input?.prompt, 160),
      paused: Boolean(input?.paused),
    },
  };
}

export const getSoulync = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<SoulyncState> => {
    const sql = await getSql();
    const userId = context.userId;

    const mine = await sql<ProfileRow>`select * from soulync_profiles where user_id = ${userId} limit 1`;
    const profile = mine[0] ? mapProfile(mine[0]) : null;
    if (!profile) return { profile: null, candidates: [], matches: [], likesWaiting: 0 };

    const campus = profile.campus;
    const candidates = (
      await sql<ProfileRow>`
        select p.* from soulync_profiles p
        where p.user_id <> ${userId}
          and p.paused = false
          and not exists (
            select 1 from soulync_decisions d where d.user_id = ${userId} and d.target_user_id = p.user_id
          )
          and not exists (
            select 1 from soulync_blocks b
            where (b.user_id = ${userId} and b.blocked_user_id = p.user_id)
               or (b.user_id = p.user_id and b.blocked_user_id = ${userId})
          )
        order by (p.campus = ${campus}) desc, p.updated_at desc
        limit 20
      `
    ).map(mapCard);

    const matches = (
      await sql<ProfileRow & { matched_at: string }>`
        select p.*, mine.created_at as matched_at
        from soulync_decisions mine
        join soulync_decisions theirs
          on theirs.user_id = mine.target_user_id
         and theirs.target_user_id = mine.user_id
         and theirs.decision = 'like'
        join soulync_profiles p on p.user_id = mine.target_user_id
        where mine.user_id = ${userId}
          and mine.decision = 'like'
          and not exists (
            select 1 from soulync_blocks b
            where (b.user_id = ${userId} and b.blocked_user_id = p.user_id)
               or (b.user_id = p.user_id and b.blocked_user_id = ${userId})
          )
        order by mine.created_at desc
        limit 20
      `
    ).map((row) => ({ ...mapCard(row), matchedAt: String(row.matched_at) }));

    const waiting = await sql<{ count: number }>`
      select count(*)::int as count
      from soulync_decisions d
      where d.target_user_id = ${userId}
        and d.decision = 'like'
        and not exists (
          select 1 from soulync_decisions mine where mine.user_id = ${userId} and mine.target_user_id = d.user_id
        )
        and not exists (
          select 1 from soulync_blocks b
          where (b.user_id = ${userId} and b.blocked_user_id = d.user_id)
             or (b.user_id = d.user_id and b.blocked_user_id = ${userId})
        )
    `;

    return { profile, candidates, matches, likesWaiting: Number(waiting[0]?.count ?? 0) };
  });

export const saveSoulyncProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: SoulyncProfileInput) => input)
  .handler(async ({ context, data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const checked = validateSoulyncProfile(data);
    if (!checked.ok) return checked;
    const v = checked.value;
    const sql = await getSql();
    await sql`
      insert into soulync_profiles (user_id, display_name, age, campus, program, intent, interests, prompt, paused, updated_at)
      values (${context.userId}, ${v.displayName}, ${v.age}, ${v.campus}, ${v.program}, ${v.intent}, ${v.interests}, ${v.prompt}, ${v.paused ?? false}, now())
      on conflict (user_id) do update set
        display_name = excluded.display_name,
        age = excluded.age,
        campus = excluded.campus,
        program = excluded.program,
        intent = excluded.intent,
        interests = excluded.interests,
        prompt = excluded.prompt,
        paused = excluded.paused,
        updated_at = now()
    `;
    return { ok: true };
  });

export const decideSoulync = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { targetUserId: string; decision: "like" | "pass" }) => input)
  .handler(async ({ context, data }): Promise<{ ok: true; matched: boolean } | { ok: false; error: string }> => {
    const target = text(data?.targetUserId, 64);
    const decision = data?.decision === "pass" ? "pass" : "like";
    if (!target || target === context.userId) return { ok: false, error: "That profile can’t be opened." };

    const sql = await getSql();
    const exists = await sql<{ user_id: string }>`
      select user_id from soulync_profiles p
      where p.user_id = ${target}
        and not exists (
          select 1 from soulync_blocks b
          where (b.user_id = ${context.userId} and b.blocked_user_id = ${target})
             or (b.user_id = ${target} and b.blocked_user_id = ${context.userId})
        )
      limit 1
    `;
    if (!exists[0]) return { ok: false, error: "That profile is no longer available." };

    await sql`
      insert into soulync_decisions (user_id, target_user_id, decision)
      values (${context.userId}, ${target}, ${decision})
      on conflict (user_id, target_user_id) do update set decision = excluded.decision
    `;

    if (decision === "pass") return { ok: true, matched: false };

    const mutual = await sql<{ user_id: string }>`
      select user_id from soulync_decisions
      where user_id = ${target} and target_user_id = ${context.userId} and decision = 'like'
      limit 1
    `;
    return { ok: true, matched: Boolean(mutual[0]) };
  });

export const blockSoulync = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { targetUserId: string }) => input)
  .handler(async ({ context, data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const target = text(data?.targetUserId, 64);
    if (!target || target === context.userId) return { ok: false, error: "That profile can’t be blocked." };
    const sql = await getSql();
    await sql`
      insert into soulync_blocks (user_id, blocked_user_id) values (${context.userId}, ${target})
      on conflict do nothing
    `;
    await sql`delete from soulync_decisions where (user_id = ${context.userId} and target_user_id = ${target}) or (user_id = ${target} and target_user_id = ${context.userId})`;
    return { ok: true };
  });
