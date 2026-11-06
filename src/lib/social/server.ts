import { createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { appAccessMiddleware } from "@/lib/account/guard";
import { mapConvo, mapMessage } from "@/lib/unibud/map";
import { notify } from "@/lib/unibud/server";
import { canDirectMessage, type ConnectRequest } from "@/lib/connect/domain";

type PeerRow = { user_id: string; handle: string; display_name: string; allow_messages: boolean };

function cleanHandle(raw: string) {
  return raw.replace(/^@+/, "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
}

function pairIds(a: string, b: string) {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

async function resolvePeer(sql: Sql, handle: string) {
  const clean = cleanHandle(handle);
  if (clean.length < 3) return null;
  const rows = await sql<PeerRow>`
    select p.user_id, p.handle, p.display_name, p.allow_messages
    from connect_profiles p
    left join unibud_accounts a on a.user_id = p.user_id
    where lower(p.handle) = ${clean} or lower(coalesce(a.username, '')) = ${clean}
    order by case when lower(p.handle) = ${clean} then 0 else 1 end
    limit 1`;
  return rows[0] ?? null;
}

async function messageGate(sql: Sql, fromId: string, toId: string, allowMessages: boolean) {
  const blocks = await sql<{ blocker_id: string; blocked_id: string }>`
    select blocker_id, blocked_id from connect_blocks
    where (blocker_id = ${fromId} and blocked_id = ${toId}) or (blocker_id = ${toId} and blocked_id = ${fromId})`;
  const requests = await sql<{ id: string; from_id: string; to_id: string; status: ConnectRequest["status"] }>`
    select id, from_id, to_id, status from connect_requests
    where (from_id = ${fromId} and to_id = ${toId}) or (from_id = ${toId} and to_id = ${fromId})`;
  const gate = canDirectMessage({
    fromId,
    toId,
    allowMessages,
    blocks: blocks.map((row) => ({ blockerId: row.blocker_id, blockedId: row.blocked_id })),
    requests: requests.map((row) => ({ id: row.id, fromId: row.from_id, toId: row.to_id, status: row.status })),
  });
  if (gate.ok) return gate;
  if (gate.error !== "Connect before you message." && gate.error !== "This person is not taking messages.") return gate;
  const mutual = await sql`
    select 1 as ok from soulync_swipes a
    join soulync_swipes b on b.from_id = a.to_id and b.to_id = a.from_id and b.direction = 'like'
    where a.from_id = ${fromId} and a.to_id = ${toId} and a.direction = 'like'
    limit 1`;
  if (mutual[0]) return { ok: true as const };
  return gate;
}

async function ensureThread(sql: Sql, a: string, b: string) {
  const { low, high } = pairIds(a, b);
  const existing = await sql<{ id: string }>`select id from direct_threads where low_id = ${low} and high_id = ${high} limit 1`;
  if (existing[0]) return { id: existing[0].id, created: false };
  const id = crypto.randomUUID();
  await sql`insert into direct_threads (id, low_id, high_id) values (${id}, ${low}, ${high})
    on conflict (low_id, high_id) do nothing`;
  const rows = await sql<{ id: string }>`select id from direct_threads where low_id = ${low} and high_id = ${high} limit 1`;
  return { id: rows[0]?.id ?? id, created: !existing[0] };
}

async function loadConversation(userId: string, id: string) {
  const sql = await getSql();
  const threads = await sql<{ id: string; low_id: string; high_id: string; last_body: string; updated_at: string }>`
    select id, low_id, high_id, last_body, updated_at from direct_threads
    where id = ${id} and (low_id = ${userId} or high_id = ${userId}) limit 1`;
  const thread = threads[0];
  if (!thread) return null;
  const peerId = thread.low_id === userId ? thread.high_id : thread.low_id;
  const peers = await sql<{ handle: string; display_name: string }>`
    select handle, display_name from connect_profiles where user_id = ${peerId} limit 1`;
  const messages = (
    await sql<{
      id: string;
      sender_id: string;
      body: string;
      created_at: string;
      media_id: string | null;
      share_kind: string | null;
      share_json: string | null;
    }>`select id, sender_id, body, created_at, media_id, share_kind, share_json from direct_messages
      where thread_id = ${id} order by created_at asc`
  ).map((row) =>
    mapMessage({
      id: row.id,
      conversation_id: id,
      sender: row.sender_id === userId ? "me" : "peer",
      body: row.body,
      created_at: row.created_at,
      media_id: row.media_id,
      share_kind: row.share_kind,
      share_json: row.share_json,
    }),
  );
  return {
    conversation: {
      ...mapConvo({
        id: thread.id,
        peer_handle: peers[0]?.handle ?? "member",
        listing_id: null,
        last_body: thread.last_body,
        updated_at: thread.updated_at,
      }),
      peerName: peers[0]?.display_name || peers[0]?.handle || "Member",
    },
    messages,
  };
}

async function myHandle(sql: Sql, userId: string) {
  const profiles = await sql<{ handle: string }>`select handle from connect_profiles where user_id = ${userId} limit 1`;
  if (profiles[0]?.handle) return profiles[0].handle;
  const accounts = await sql<{ username: string }>`select username from unibud_accounts where user_id = ${userId} limit 1`;
  return accounts[0]?.username ?? "member";
}

export const listConversations = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      last_body: string;
      updated_at: string;
      handle: string | null;
      display_name: string | null;
    }>`
      select t.id, t.last_body, t.updated_at, p.handle, p.display_name
      from direct_threads t
      left join connect_profiles p on p.user_id = case when t.low_id = ${context.userId} then t.high_id else t.low_id end
      where t.low_id = ${context.userId} or t.high_id = ${context.userId}
      order by t.updated_at desc`;
    return {
      directs: rows.map((row) => ({
        ...mapConvo({
          id: row.id,
          peer_handle: row.handle ?? "member",
          listing_id: null,
          last_body: row.last_body,
          updated_at: row.updated_at,
        }),
        peerName: row.display_name || row.handle || "Member",
      })),
      rooms: await inboxRooms(sql, context.userId),
    };
  });

async function inboxRooms(sql: Sql, userId: string) {
  try {
    const board = await sql<{ id: string; title: string; kind: string; last_body: string | null; sender_name: string | null }>`
      select r.id, r.title, r.kind,
        (select body from room_messages m where m.room_id = r.id order by m.created_at desc limit 1) as last_body,
        (select sender_name from room_messages m where m.room_id = r.id order by m.created_at desc limit 1) as sender_name
      from board_rooms r
      join board_members b on b.room_id = r.id and b.user_id = ${userId}
      order by r.created_at desc
      limit 30`;
    const plans = await sql<{ id: string; title: string; last_body: string | null; sender_name: string | null }>`
      select p.id, p.title,
        (select body from wayward_messages m where m.plan_id = p.id order by m.created_at desc limit 1) as last_body,
        (select sender_name from wayward_messages m where m.plan_id = p.id order by m.created_at desc limit 1) as sender_name
      from wayward_plans p
      join wayward_members b on b.plan_id = p.id and b.user_id = ${userId}
      order by p.created_at desc
      limit 30`;
    return [
      ...board.map((row) => ({
        id: row.id,
        title: row.title,
        kind: row.kind,
        lastBody: row.last_body ?? "",
        senderName: row.sender_name ?? "",
        href: `/board/room/${row.id}`,
      })),
      ...plans.map((row) => ({
        id: row.id,
        title: row.title,
        kind: "wayward",
        lastBody: row.last_body ?? "",
        senderName: row.sender_name ?? "",
        href: `/connect/wayward/${row.id}`,
      })),
    ];
  } catch {
    return [];
  }
}

export const getConversation = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => loadConversation(context.userId, id));

export const openDirect = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { handle: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const peer = await resolvePeer(sql, data.handle);
    if (!peer) return { ok: false as const, error: "No person with that username." };
    const gate = await messageGate(sql, context.userId, peer.user_id, peer.allow_messages);
    if (!gate.ok) return gate;
    const thread = await ensureThread(sql, context.userId, peer.user_id);
    return { ok: true as const, id: thread.id, handle: peer.handle, name: peer.display_name };
  });

export const openConversation = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { handle: string; listingId?: string; seed?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const peer = await resolvePeer(sql, data.handle);
    if (!peer) throw new Error("That person does not have a UNIBUD account.");
    const gate = await messageGate(sql, context.userId, peer.user_id, peer.allow_messages);
    if (!gate.ok) throw new Error(gate.error);
    const thread = await ensureThread(sql, context.userId, peer.user_id);
    const seed = data.seed?.trim().slice(0, 1000);
    if (thread.created && seed) {
      await sql`insert into direct_messages (id, thread_id, sender_id, body)
        values (${crypto.randomUUID()}, ${thread.id}, ${context.userId}, ${seed})`;
      await sql`update direct_threads set last_body = ${seed}, updated_at = now() where id = ${thread.id}`;
      const handle = await myHandle(sql, context.userId);
      await notify(peer.user_id, "message", `Message from @${handle}`, seed, `/messages/${thread.id}`);
    }
    const loaded = await loadConversation(context.userId, thread.id);
    if (!loaded) throw new Error("The conversation could not be opened.");
    return loaded.conversation;
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { conversationId: string; body: string; mediaId?: string; shareKind?: string; shareJson?: string }) => input)
  .handler(async ({ context, data }) => {
    const body = data.body.trim();
    if (!body && !data.mediaId && !data.shareJson) throw new Error("Message is empty");
    const sql = await getSql();
    const threads = await sql<{ low_id: string; high_id: string }>`
      select low_id, high_id from direct_threads
      where id = ${data.conversationId} and (low_id = ${context.userId} or high_id = ${context.userId})
      limit 1`;
    const thread = threads[0];
    if (!thread) throw new Error("Conversation not found");
    const peerId = thread.low_id === context.userId ? thread.high_id : thread.low_id;
    const peers = await sql<{ allow_messages: boolean }>`select allow_messages from connect_profiles where user_id = ${peerId} limit 1`;
    const gate = await messageGate(sql, context.userId, peerId, Boolean(peers[0]?.allow_messages));
    if (!gate.ok) throw new Error(gate.error);
    const preview = (body || data.shareKind || "Media").slice(0, 280);
    await sql`insert into direct_messages (id, thread_id, sender_id, body, media_id, share_kind, share_json)
      values (${crypto.randomUUID()}, ${data.conversationId}, ${context.userId}, ${body || preview}, ${data.mediaId ?? null}, ${data.shareKind ?? null}, ${data.shareJson ?? null})`;
    await sql`update direct_threads set last_body = ${preview}, updated_at = now() where id = ${data.conversationId}`;
    const handle = await myHandle(sql, context.userId);
    const nameRows = await sql<{ name: string }>`
      select coalesce(nullif(p.display_name, ''), a.username, ${handle}) as name
      from unibud_accounts a
      left join connect_profiles p on p.user_id = a.user_id
      where a.user_id = ${context.userId}
      limit 1`;
    try {
      await notify(
        peerId,
        "social",
        `Message from ${nameRows[0]?.name ?? handle} (@${handle})`,
        preview,
        `/messages/${data.conversationId}`,
      );
    } catch {
      /* The message is already in the thread. A missed notice must not undo it. */
    }
    return loadConversation(context.userId, data.conversationId);
  });

export const joinCommunity = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((communityId: string) => communityId)
  .handler(async ({ context, data: communityId }) => {
    const sql = await getSql();
    const existing = await sql`select community_id from community_members where user_id = ${context.userId} and community_id = ${communityId}`;
    if (existing[0]) {
      await sql`delete from community_members where user_id = ${context.userId} and community_id = ${communityId}`;
      return { joined: false };
    }
    await sql`insert into community_members (user_id, community_id) values (${context.userId}, ${communityId})`;
    return { joined: true };
  });

export const myCommunities = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ community_id: string }>`select community_id from community_members where user_id = ${context.userId}`;
    return rows.map((r) => r.community_id);
  });

export const createPost = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
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
      await sql`insert into posts (id, community_id, author_handle, body, image, video, kind)
        values (${id}, ${data.communityId}, ${handle}, ${body}, ${data.image ?? null}, ${data.video ?? null}, ${kind})`;
    } catch {
      await sql`insert into posts (id, community_id, author_handle, body, image)
        values (${id}, ${data.communityId}, ${handle}, ${body}, ${data.image ?? null})`;
    }
    return { id, handle, body, kind };
  });
