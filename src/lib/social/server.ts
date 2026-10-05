import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { mapConvo, mapMessage } from "@/lib/unibud/map";

async function loadConversation(userId: string, id: string) {
  const sql = await getSql();
  const convos = await sql`select * from conversations where id = ${id} and user_id = ${userId} limit 1`;
  if (!convos[0]) return null;
  const messages = (
    await sql`select * from messages where conversation_id = ${id} and user_id = ${userId} order by created_at asc`
  ).map(mapMessage);
  return { conversation: mapConvo(convos[0]), messages };
}

export const listConversations = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql`select * from conversations where user_id = ${context.userId} order by updated_at desc`;
    return rows.map(mapConvo);
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => loadConversation(context.userId, id));

export const openConversation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { handle: string; listingId?: string; seed?: string }) => input)
  .handler(async ({ context, data }) => {
    const handle = data.handle.replace(/^@/, "").trim().toLowerCase();
    const sql = await getSql();
    const existing = await sql`select * from conversations where user_id = ${context.userId} and peer_handle = ${handle} limit 1`;
    if (existing[0]) return mapConvo(existing[0]);
    const id = crypto.randomUUID();
    // Reality First: only a message the student actually composed is stored. No peer reply is ever generated.
    const seed = data.seed?.trim() ?? "";
    await sql`insert into conversations (id, user_id, peer_handle, listing_id, last_body)
      values (${id}, ${context.userId}, ${handle}, ${data.listingId ?? null}, ${seed})`;
    if (seed) {
      await sql`insert into messages (id, conversation_id, user_id, sender, body)
        values (${crypto.randomUUID()}, ${id}, ${context.userId}, ${"me"}, ${seed})`;
    }
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
    const convos = await sql`select * from conversations where id = ${data.conversationId} and user_id = ${context.userId} limit 1`;
    if (!convos[0]) throw new Error("Conversation not found");
    const preview = body || data.shareKind || "Media";
    await sql`insert into messages (id, conversation_id, user_id, sender, body, media_id, share_kind, share_json)
      values (${crypto.randomUUID()}, ${data.conversationId}, ${context.userId}, ${"me"}, ${body || preview}, ${data.mediaId ?? null}, ${data.shareKind ?? null}, ${data.shareJson ?? null})`;
    await sql`update conversations set last_body = ${preview}, updated_at = now()
      where id = ${data.conversationId} and user_id = ${context.userId}`;
    return loadConversation(context.userId, data.conversationId);
  });

export const joinCommunity = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
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
      await sql`insert into posts (id, community_id, author_handle, body, image, video, kind)
        values (${id}, ${data.communityId}, ${handle}, ${body}, ${data.image ?? null}, ${data.video ?? null}, ${kind})`;
    } catch {
      await sql`insert into posts (id, community_id, author_handle, body, image)
        values (${id}, ${data.communityId}, ${handle}, ${body}, ${data.image ?? null})`;
    }
    return { id, handle, body, kind };
  });
