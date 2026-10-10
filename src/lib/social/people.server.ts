import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { notify } from "@/lib/unibud/server";

/**
 * Real account-to-account relationships (Connect): follows, connection
 * requests/accepts and blocks between VERIFIED users, resolved by handle —
 * the handle is the public identity the rest of the UI uses, and
 * `student_profiles.handle` is unique so it maps to exactly one account.
 *
 * Catalog personas (the seeded PEOPLE directory) have no real account behind
 * them: these functions return `{ ok: false, reason: "no-account" }` for them
 * and the client keeps its demo behaviour. Real handles always go through the
 * server, so records persist across devices and cannot be forged client-side.
 */

type Sql = Awaited<ReturnType<typeof getSql>>;

type ProfileRow = {
  user_id: string;
  display_name: string;
  handle: string;
  university_id: string;
  program: string;
  year: string;
  bio: string;
  campus_role?: string | null;
};

export type PublicPerson = {
  userId: string;
  handle: string;
  name: string;
  universityId: string;
  program: string;
  year: string;
  bio: string;
  campusRole: string;
};

async function profileByHandle(sql: Sql, handle: string): Promise<ProfileRow | null> {
  const rows =
    await sql<ProfileRow>`select user_id, display_name, handle, university_id, program, year, bio, campus_role
      from student_profiles where handle = ${handle} limit 1`;
  return rows[0] ?? null;
}

async function myHandle(sql: Sql, userId: string): Promise<string> {
  const rows = await sql<{ handle: string }>`select handle from student_profiles where user_id = ${userId} limit 1`;
  return rows[0]?.handle ?? "student";
}

async function pairBlocked(sql: Sql, a: string, b: string): Promise<boolean> {
  const rows = await sql`select 1 from blocks
    where (blocker_id = ${a} and blocked_id = ${b}) or (blocker_id = ${b} and blocked_id = ${a})
    limit 1`;
  return Boolean(rows[0]);
}

export type PeopleState = {
  following: string[];
  followers: string[];
  connections: string[];
  incoming: string[];
  outgoing: string[];
  blocked: string[];
};

/** Every relationship of the signed-in user, as handle lists for the UI. */
export const getMyPeopleState = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PeopleState> => {
    const sql = await getSql();
    const me = context.userId;
    const [following, followers, connA, connB, incoming, outgoing, blocked] = await Promise.all([
      sql<{ handle: string }>`select p.handle from follows f
        join student_profiles p on p.user_id = f.followee_id where f.follower_id = ${me}`,
      sql<{ handle: string }>`select p.handle from follows f
        join student_profiles p on p.user_id = f.follower_id where f.followee_id = ${me}`,
      sql<{ handle: string }>`select p.handle from connect_requests r
        join student_profiles p on p.user_id = r.from_id
        where r.to_id = ${me} and r.status = 'accepted'`,
      sql<{ handle: string }>`select p.handle from connect_requests r
        join student_profiles p on p.user_id = r.to_id
        where r.from_id = ${me} and r.status = 'accepted'`,
      sql<{ handle: string }>`select p.handle from connect_requests r
        join student_profiles p on p.user_id = r.from_id
        where r.to_id = ${me} and r.status = 'pending'`,
      sql<{ handle: string }>`select p.handle from connect_requests r
        join student_profiles p on p.user_id = r.to_id
        where r.from_id = ${me} and r.status = 'pending'`,
      sql<{ handle: string }>`select p.handle from blocks b
        join student_profiles p on p.user_id = b.blocked_id where b.blocker_id = ${me}`,
    ]);
    return {
      following: following.map((r) => r.handle),
      followers: followers.map((r) => r.handle),
      connections: [...connA, ...connB].map((r) => r.handle),
      incoming: incoming.map((r) => r.handle),
      outgoing: outgoing.map((r) => r.handle),
      blocked: blocked.map((r) => r.handle),
    };
  });

export type RelationshipResult =
  | { ok: true }
  | { ok: false; reason: "no-account" | "blocked" | "self" | "no-request" };

/** Follow / unfollow a real account. */
export const setFollowing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { handle: string; following: boolean }) => input)
  .handler(async ({ context, data }): Promise<RelationshipResult> => {
    const sql = await getSql();
    const peer = await profileByHandle(sql, data.handle);
    if (!peer) return { ok: false, reason: "no-account" };
    if (peer.user_id === context.userId) return { ok: false, reason: "self" };
    if (await pairBlocked(sql, context.userId, peer.user_id)) return { ok: false, reason: "blocked" };
    if (data.following) {
      await sql`insert into follows (follower_id, followee_id)
        values (${context.userId}, ${peer.user_id}) on conflict do nothing`;
      const me = await myHandle(sql, context.userId);
      await notify(
        peer.user_id,
        "social",
        `@${me} follows you now`,
        "Their posts will land in your circles.",
        `/u/${me}`,
      );
    } else {
      await sql`delete from follows where follower_id = ${context.userId} and followee_id = ${peer.user_id}`;
    }
    return { ok: true };
  });

/** Send a Connect request; auto-accepts when the peer already sent one to me. */
export const requestConnection = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { handle: string }) => input)
  .handler(async ({ context, data }): Promise<RelationshipResult> => {
    const sql = await getSql();
    const peer = await profileByHandle(sql, data.handle);
    if (!peer) return { ok: false, reason: "no-account" };
    if (peer.user_id === context.userId) return { ok: false, reason: "self" };
    if (await pairBlocked(sql, context.userId, peer.user_id)) return { ok: false, reason: "blocked" };
    const me = await myHandle(sql, context.userId);
    const reverse = await sql<{ id: string }>`select id from connect_requests
      where from_id = ${peer.user_id} and to_id = ${context.userId} and status = 'pending' limit 1`;
    if (reverse[0]) {
      // They already asked me — connecting now is mutual.
      await sql`update connect_requests set status = 'accepted' where id = ${reverse[0].id}`;
      await notify(
        peer.user_id,
        "social",
        `@${me} accepted your connection request`,
        "You can message each other without waiting on a request.",
        "/messages",
      );
      return { ok: true };
    }
    const existing = await sql<{ id: string }>`select id from connect_requests
      where from_id = ${context.userId} and to_id = ${peer.user_id} limit 1`;
    if (existing[0]) {
      await sql`update connect_requests set status = 'pending' where id = ${existing[0].id}`;
    } else {
      await sql`insert into connect_requests (id, from_id, to_id)
        values (${crypto.randomUUID()}, ${context.userId}, ${peer.user_id})`;
    }
    await notify(
      peer.user_id,
      "social",
      `@${me} wants to connect`,
      "Accept to let them message you first.",
      "/connect",
    );
    return { ok: true };
  });

/** Withdraw my pending Connect request. */
export const cancelConnectionRequest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { handle: string }) => input)
  .handler(async ({ context, data }): Promise<RelationshipResult> => {
    const sql = await getSql();
    const peer = await profileByHandle(sql, data.handle);
    if (!peer) return { ok: false, reason: "no-account" };
    await sql`delete from connect_requests
      where from_id = ${context.userId} and to_id = ${peer.user_id} and status = 'pending'`;
    return { ok: true };
  });

/** Accept or decline a pending request addressed to me. */
export const respondToConnection = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { handle: string; accept: boolean }) => input)
  .handler(async ({ context, data }): Promise<RelationshipResult> => {
    const sql = await getSql();
    const peer = await profileByHandle(sql, data.handle);
    if (!peer) return { ok: false, reason: "no-account" };
    const request = await sql<{ id: string }>`select id from connect_requests
      where from_id = ${peer.user_id} and to_id = ${context.userId} and status = 'pending' limit 1`;
    if (!request[0]) return { ok: false, reason: "no-request" };
    if (data.accept) {
      await sql`update connect_requests set status = 'accepted' where id = ${request[0].id}`;
      const me = await myHandle(sql, context.userId);
      await notify(
        peer.user_id,
        "social",
        `@${me} accepted your connection request`,
        "You can message each other without waiting on a request.",
        "/messages",
      );
    } else {
      await sql`delete from connect_requests where id = ${request[0].id}`;
    }
    return { ok: true };
  });

/** Remove an accepted connection (either side can do it). */
export const setConnected = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { handle: string; connected: boolean }) => input)
  .handler(async ({ context, data }): Promise<RelationshipResult> => {
    const sql = await getSql();
    const peer = await profileByHandle(sql, data.handle);
    if (!peer) return { ok: false, reason: "no-account" };
    if (!data.connected) {
      await sql`delete from connect_requests
        where ((from_id = ${context.userId} and to_id = ${peer.user_id})
            or (from_id = ${peer.user_id} and to_id = ${context.userId}))
          and status = 'accepted'`;
    }
    return { ok: true };
  });

/** Block or unblock an account. Blocking cuts every relationship both ways. */
export const setBlocked = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { handle: string; blocked: boolean }) => input)
  .handler(async ({ context, data }): Promise<RelationshipResult> => {
    const sql = await getSql();
    const peer = await profileByHandle(sql, data.handle);
    if (!peer) return { ok: false, reason: "no-account" };
    if (peer.user_id === context.userId) return { ok: false, reason: "self" };
    if (data.blocked) {
      await sql`insert into blocks (blocker_id, blocked_id)
        values (${context.userId}, ${peer.user_id}) on conflict do nothing`;
      await sql`delete from follows
        where (follower_id = ${context.userId} and followee_id = ${peer.user_id})
           or (follower_id = ${peer.user_id} and followee_id = ${context.userId})`;
      await sql`delete from connect_requests
        where (from_id = ${context.userId} and to_id = ${peer.user_id})
           or (from_id = ${peer.user_id} and to_id = ${context.userId})`;
    } else {
      await sql`delete from blocks where blocker_id = ${context.userId} and blocked_id = ${peer.user_id}`;
    }
    return { ok: true };
  });

/** Real profiles to discover in Connect (never me, never a blocked pair). */
export const listRealPeople = createServerFn({ method: "GET" })
  .validator((q: string) => q.trim().toLowerCase())
  .middleware([authMiddleware])
  .handler(async ({ context, data: q }): Promise<PublicPerson[]> => {
    const sql = await getSql();
    const me = context.userId;
    const like = `%${q}%`;
    const rows = await sql<ProfileRow>`select p.user_id, p.display_name, p.handle, p.university_id, p.program, p.year, p.bio, p.campus_role
      from student_profiles p
      where p.user_id <> ${me}
        and not exists (select 1 from blocks b
          where (b.blocker_id = ${me} and b.blocked_id = p.user_id)
             or (b.blocker_id = p.user_id and b.blocked_id = ${me}))
        and (${q} = '' or lower(p.display_name) like ${like} or lower(p.handle) like ${like} or lower(p.bio) like ${like})
      order by p.created_at desc
      limit 50`;
    return rows.map((r) => ({
      userId: r.user_id,
      handle: r.handle,
      name: r.display_name,
      universityId: r.university_id,
      program: r.program,
      year: r.year,
      bio: r.bio,
      campusRole: r.campus_role ?? "student",
    }));
  });

/** Public profile lookup by handle (for /u/$handle of real accounts). */
export const getProfileByHandle = createServerFn({ method: "GET" })
  .validator((handle: string) => handle.replace(/^@/, "").trim().toLowerCase())
  .handler(async ({ data: handle }): Promise<PublicPerson | null> => {
    const sql = await getSql();
    const peer = await profileByHandle(sql, handle);
    if (!peer) return null;
    return {
      userId: peer.user_id,
      handle: peer.handle,
      name: peer.display_name,
      universityId: peer.university_id,
      program: peer.program,
      year: peer.year,
      bio: peer.bio,
      campusRole: peer.campus_role ?? "student",
    };
  });
