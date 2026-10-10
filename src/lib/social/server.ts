import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { mapConvo, mapMessage } from "@/lib/unibud/map";
import { PEOPLE } from "@/lib/unibud/catalog";
import { notify } from "@/lib/unibud/server";
import { recordLyncShareFor } from "@/lib/lync/server";
import { toggleCommunityMembership } from "@/lib/quad/server";

type Sql = Awaited<ReturnType<typeof getSql>>;

async function loadConversation(userId: string, id: string) {
  const sql = await getSql();
  const convos = await sql`select * from conversations where id = ${id} and user_id = ${userId} limit 1`;
  if (!convos[0]) return null;
  const messages = (
    await sql`select * from messages where conversation_id = ${id} and user_id = ${userId} order by created_at asc`
  ).map(mapMessage);
  return { conversation: mapConvo(convos[0]), messages };
}

// ── Real account-to-account DMs ────────────────────────────────────────────────
// Threads between two verified accounts live in `dm_threads` (one row per
// unordered pair) with messages in `dm_messages`; their ids start with `dm_`.
// Everything else stays a demo catalog conversation (peer from PEOPLE). Both
// kinds surface through the same conversation API so the chat UI is unchanged.

type DmThread = { id: string; user_a: string; user_b: string; last_body: string; updated_at: string };

async function dmThreadById(sql: Sql, id: string): Promise<DmThread | null> {
  const rows = await sql<DmThread>`select * from dm_threads where id = ${id} limit 1`;
  return rows[0] ?? null;
}

async function findOrCreateDmThread(sql: Sql, me: string, peerId: string): Promise<DmThread> {
  const [a, b] = [me, peerId].sort();
  const existing = await sql<DmThread>`select * from dm_threads where user_a = ${a} and user_b = ${b} limit 1`;
  if (existing[0]) return existing[0];
  const id = `dm_${crypto.randomUUID().slice(0, 12)}`;
  await sql`insert into dm_threads (id, user_a, user_b) values (${id}, ${a}, ${b}) on conflict (user_a, user_b) do nothing`;
  const rows = await sql<DmThread>`select * from dm_threads where id = ${id} limit 1`;
  return rows[0];
}

async function dmPeerHandle(sql: Sql, me: string, thread: DmThread): Promise<string> {
  const peerId = thread.user_a === me ? thread.user_b : thread.user_a;
  const rows = await sql<{ handle: string }>`select handle from student_profiles where user_id = ${peerId} limit 1`;
  return rows[0]?.handle ?? "student";
}

async function loadDmConversation(userId: string, thread: DmThread) {
  const sql = await getSql();
  const peerHandle = await dmPeerHandle(sql, userId, thread);
  const messages = (
    await sql`select * from dm_messages where thread_id = ${thread.id} order by created_at asc`
  ).map((m) =>
    mapMessage({
      id: m.id,
      conversation_id: thread.id,
      sender: m.sender_id === userId ? "me" : "peer",
      body: m.body,
      created_at: m.created_at,
    }),
  );
  return {
    conversation: mapConvo({
      id: thread.id,
      peer_handle: peerHandle,
      listing_id: null,
      last_body: thread.last_body,
      updated_at: thread.updated_at,
    }),
    messages,
  };
}

/** Resolve a handle to a real account id (null for seeded catalog personas). */
async function realUserIdByHandle(sql: Sql, handle: string): Promise<string | null> {
  const rows = await sql<{ user_id: string }>`select user_id from student_profiles where handle = ${handle} limit 1`;
  return rows[0]?.user_id ?? null;
}

async function dmPairBlocked(sql: Sql, a: string, b: string): Promise<boolean> {
  const rows = await sql`select 1 from blocks
    where (blocker_id = ${a} and blocked_id = ${b}) or (blocker_id = ${b} and blocked_id = ${a}) limit 1`;
  return Boolean(rows[0]);
}

export const listConversations = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const me = context.userId;
    const [demo, dms] = await Promise.all([
      sql`select * from conversations where user_id = ${me} order by updated_at desc`,
      sql<DmThread>`select * from dm_threads where user_a = ${me} or user_b = ${me}`,
    ]);
    const dmConvos = await Promise.all(
      dms.map(async (t) => {
        const peer = await dmPeerHandle(sql, me, t);
        return mapConvo({
          id: t.id,
          peer_handle: peer,
          listing_id: null,
          last_body: t.last_body,
          updated_at: t.updated_at,
        });
      }),
    );
    const all = [...demo.map(mapConvo), ...dmConvos];
    all.sort((x, y) => (x.updatedAt < y.updatedAt ? 1 : -1));
    return all;
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    if (id.startsWith("dm_")) {
      const sql = await getSql();
      const thread = await dmThreadById(sql, id);
      const member = thread && (thread.user_a === context.userId || thread.user_b === context.userId);
      if (!thread || !member) throw new Error("Conversation not found");
      return loadDmConversation(context.userId, thread);
    }
    return loadConversation(context.userId, id);
  });

export const openConversation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { handle: string; listingId?: string; seed?: string }) => input)
  .handler(async ({ context, data }) => {
    const handle = data.handle.replace(/^@/, "").trim().toLowerCase();
    const sql = await getSql();
    // Real account: find or open a persisted DM thread shared by both parties.
    const peerId = await realUserIdByHandle(sql, handle);
    if (peerId && peerId !== context.userId) {
      if (await dmPairBlocked(sql, context.userId, peerId)) throw new Error("This chat is unavailable");
      const thread = await findOrCreateDmThread(sql, context.userId, peerId);
      const peer = await dmPeerHandle(sql, context.userId, thread);
      return mapConvo({
        id: thread.id,
        peer_handle: peer,
        listing_id: null,
        last_body: thread.last_body,
        updated_at: thread.updated_at,
      });
    }
    const existing = await sql`select * from conversations where user_id = ${context.userId} and peer_handle = ${handle} limit 1`;
    if (existing[0]) return mapConvo(existing[0]);
    const id = crypto.randomUUID();
    const seed = data.seed || `Hi — I saw your listing on UNIBUD.`;
    await sql`insert into conversations (id, user_id, peer_handle, listing_id, last_body)
      values (${id}, ${context.userId}, ${handle}, ${data.listingId ?? null}, ${seed})`;
    await sql`insert into messages (id, conversation_id, user_id, sender, body)
      values (${crypto.randomUUID()}, ${id}, ${context.userId}, ${"me"}, ${seed})`;
    const person = PEOPLE.find((p) => p.handle === handle);
    const reply = person
      ? `Hey, this is ${person.name.split(" ")[0]}. Happy to talk — keep payments inside UNIBUD demo so we both have a record.`
      : "Got it. Let’s keep this on UNIBUD.";
    await sql`insert into messages (id, conversation_id, user_id, sender, body)
      values (${crypto.randomUUID()}, ${id}, ${context.userId}, ${"peer"}, ${reply})`;
    await sql`update conversations set last_body = ${reply}, updated_at = now() where id = ${id} and user_id = ${context.userId}`;
    await notify(context.userId, "message", `Chat with @${handle}`, reply, `/messages/${id}`);
    const rows = await sql`select * from conversations where id = ${id} and user_id = ${context.userId}`;
    return mapConvo(rows[0]);
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { conversationId: string; body: string; mediaId?: string; shareKind?: string; shareJson?: string }) => input)
  .handler(async ({ context, data }) => {
    const body = data.body.trim();
    if (!body && !data.mediaId && !data.shareJson) throw new Error("Message is empty");
    const sql = await getSql();
    // Real DM thread: both parties read the SAME rows; only members may write.
    if (data.conversationId.startsWith("dm_")) {
      const thread = await dmThreadById(sql, data.conversationId);
      const member = thread && (thread.user_a === context.userId || thread.user_b === context.userId);
      if (!thread || !member) throw new Error("Conversation not found");
      const peerId = thread.user_a === context.userId ? thread.user_b : thread.user_a;
      if (await dmPairBlocked(sql, context.userId, peerId)) throw new Error("This chat is unavailable");
      const preview = body || data.shareKind || "Media";
      await sql`insert into dm_messages (id, thread_id, sender_id, body)
        values (${crypto.randomUUID()}, ${thread.id}, ${context.userId}, ${body || preview})`;
      await sql`update dm_threads set last_body = ${preview}, updated_at = now() where id = ${thread.id}`;
      const peer = await dmPeerHandle(sql, context.userId, thread);
      const me = await sql<{ handle: string }>`select handle from student_profiles where user_id = ${context.userId} limit 1`;
      await notify(peerId, "message", `@${me[0]?.handle ?? "student"} messaged you`, preview.slice(0, 90), `/messages/${thread.id}`);
      return loadDmConversation(context.userId, { ...thread, last_body: preview, updated_at: new Date().toISOString() });
    }
    const convos = await sql`select * from conversations where id = ${data.conversationId} and user_id = ${context.userId} limit 1`;
    if (!convos[0]) throw new Error("Conversation not found");
    const preview = body || data.shareKind || "Media";
    await sql`insert into messages (id, conversation_id, user_id, sender, body, media_id, share_kind, share_json)
      values (${crypto.randomUUID()}, ${data.conversationId}, ${context.userId}, ${"me"}, ${body || preview}, ${data.mediaId ?? null}, ${data.shareKind ?? null}, ${data.shareJson ?? null})`;
    await sql`update conversations set last_body = ${preview}, updated_at = now()
      where id = ${data.conversationId} and user_id = ${context.userId}`;
    // Sharing content into a conversation is a qualifying Lync share (once per
    // calendar day); Lync must never block the message.
    if (data.shareJson || data.shareKind) {
      try {
        await recordLyncShareFor(context.userId);
      } catch {
        // Lync must never block a share
      }
    }
    return loadConversation(context.userId, data.conversationId);
  });

export const joinCommunity = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((communityId: string) => communityId)
  .handler(async ({ context, data: communityId }) =>
    // Shared core: duplicate-safe toggle, privacy rules, accurate member counts.
    toggleCommunityMembership(context.userId, communityId),
  );

export const myCommunities = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ community_id: string }>`select community_id from community_members where user_id = ${context.userId}`;
    return rows.map((r) => r.community_id);
  });

export const createPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      communityId: string;
      body: string;
      image?: string;
      video?: string;
      kind?: "post" | "reel";
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const body = data.body.trim() || (data.video ? "Reel" : data.image ? "Photo" : "");
    if (!body) throw new Error("Write something first");
    const sql = await getSql();
    const profile = await sql<{ handle: string }>`select handle from student_profiles where user_id = ${context.userId} limit 1`;
    const handle = profile[0]?.handle || "you";
    const id = `p_${crypto.randomUUID().slice(0, 8)}`;
    const kind = data.kind ?? (data.video ? "reel" : "post");
    try {
      await sql`insert into posts (id, community_id, author_handle, user_id, body, image, video, kind)
        values (${id}, ${data.communityId}, ${handle}, ${context.userId}, ${body}, ${data.image ?? null}, ${data.video ?? null}, ${kind})`;
    } catch {
      await sql`insert into posts (id, community_id, author_handle, body, image)
        values (${id}, ${data.communityId}, ${handle}, ${body}, ${data.image ?? null})`;
    }
    // Record a Lync qualifying share (once per calendar day)
    try {
      const state = await recordLyncShareFor(context.userId);
      // Persistent recognition for milestones earned by this share.
      for (const level of state.newlyEarned) {
        await notify(context.userId, "events", `Lync ${level}-day milestone`, `${level} days of sharing in a row — badge earned and kept on your profile.`, "/profile");
      }
    } catch {
      // Lync must never block a post
    }
    return { id, handle, body, kind };
  });

/** Edit one of MY posts — ownership is enforced server-side, never trusted. */
export const editMyPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { postId: string; body: string }) => input)
  .handler(async ({ context, data }) => {
    const body = data.body.trim();
    if (!body) throw new Error("Write something first");
    const sql = await getSql();
    const rows = await sql<{ id: string }>`update posts set body = ${body}
      where id = ${data.postId} and user_id = ${context.userId} returning id`;
    if (!rows[0]) throw new Error("Post not found");
    return { id: rows[0].id };
  });

/** Delete one of MY posts plus its likes and replies. */
export const deleteMyPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((postId: string) => postId)
  .handler(async ({ context, data: postId }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`delete from posts
      where id = ${postId} and user_id = ${context.userId} returning id`;
    if (!rows[0]) throw new Error("Post not found");
    await sql`delete from post_likes where post_id = ${postId}`;
    await sql`delete from comment_likes where reply_id in (select id from post_replies where post_id = ${postId})`;
    await sql`delete from post_replies where post_id = ${postId}`;
    return { id: rows[0].id };
  });
