import { createServerFn } from "@tanstack/react-start";
import { appAccessMiddleware } from "@/lib/account/guard";
import { getSql, type Sql } from "@/lib/db";
import { notify } from "@/lib/unibud/server";

const KINDS = ["group", "class", "study", "community"] as const;
type RoomKind = (typeof KINDS)[number];

function clean(value: string, max: number) {
  return value.trim().slice(0, max);
}

function isKind(value: string): value is RoomKind {
  return (KINDS as readonly string[]).includes(value);
}

async function displayName(sql: Sql, userId: string) {
  const rows = await sql<{ name: string; handle: string }>`
    select coalesce(nullif(p.display_name, ''), nullif(trim(a.first_name || ' ' || a.last_name), ''), a.username, 'Member') as name,
           coalesce(nullif(p.handle, ''), a.username, 'member') as handle
    from unibud_accounts a
    left join connect_profiles p on p.user_id = a.user_id
    where a.user_id = ${userId}
    limit 1`;
  return rows[0] ?? { name: "Member", handle: "member" };
}

export const listBoardHome = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .validator((input?: { scope?: "academic" | "social" }) => input ?? {})
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const scope = data.scope ?? "academic";
    const rooms = await sql<{ id: string; kind: string; title: string; subtitle: string; members: number; joined: boolean; last_body: string | null; last_sender: string | null }>`
      select r.id, r.kind, r.title, r.subtitle,
        (select count(*)::int from board_members m where m.room_id = r.id) as members,
        exists(select 1 from board_members m where m.room_id = r.id and m.user_id = ${context.userId}) as joined,
        (select body from room_messages m where m.room_id = r.id order by m.created_at desc limit 1) as last_body,
        (select sender_name from room_messages m where m.room_id = r.id order by m.created_at desc limit 1) as last_sender
      from board_rooms r
      where (${scope} = 'social' and r.kind in ('group', 'community'))
         or (${scope} <> 'social' and r.kind in ('class', 'study'))
      order by r.created_at desc
      limit 80`;
    const posts = await sql<{ id: string; body: string; image: string | null; created_at: string; handle: string }>`
      select p.id, p.body, p.image, p.created_at, coalesce(c.handle, a.username, 'member') as handle
      from board_posts p
      left join connect_profiles c on c.user_id = p.author_id
      left join unibud_accounts a on a.user_id = p.author_id
      order by p.created_at desc
      limit 40`;
    const news = await sql<{ id: string; title: string; body: string; created_at: string; handle: string }>`
      select n.id, n.title, n.body, n.created_at, coalesce(c.handle, a.username, 'member') as handle
      from board_news n
      left join connect_profiles c on c.user_id = n.author_id
      left join unibud_accounts a on a.user_id = n.author_id
      order by n.created_at desc
      limit 40`;
    return {
      rooms: rooms.map((row) => ({ ...row, members: Number(row.members) })),
      posts: posts.map((row) => ({ ...row, createdAt: String(row.created_at) })),
      news: news.map((row) => ({ ...row, createdAt: String(row.created_at) })),
    };
  });

export const createBoardRoom = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { kind: string; title: string; subtitle?: string }) => input)
  .handler(async ({ context, data }) => {
    if (!isKind(data.kind)) return { ok: false as const, error: "Choose a group, class, study, or community room." };
    const title = clean(data.title, 80);
    if (title.length < 2) return { ok: false as const, error: "Give the room a name." };
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`insert into board_rooms (id, kind, title, subtitle, owner_id) values (${id}, ${data.kind}, ${title}, ${clean(data.subtitle ?? "", 120)}, ${context.userId})`;
    await sql`insert into board_members (room_id, user_id) values (${id}, ${context.userId})`;
    return { ok: true as const, id };
  });

export const joinBoardRoom = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rooms = await sql<{ id: string }>`select id from board_rooms where id = ${data.id} limit 1`;
    if (!rooms[0]) return { ok: false as const, error: "That room is not on Board." };
    await sql`insert into board_members (room_id, user_id) values (${data.id}, ${context.userId}) on conflict do nothing`;
    return { ok: true as const };
  });

export const getBoardRoom = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const rooms = await sql<{ id: string; kind: string; title: string; subtitle: string }>`
      select id, kind, title, subtitle from board_rooms where id = ${id} limit 1`;
    const room = rooms[0];
    if (!room) return { ok: false as const, error: "That room is not on Board." };
    const members = await sql<{ user_id: string }>`select user_id from board_members where room_id = ${id}`;
    const joined = members.some((member) => member.user_id === context.userId);
    const messages = joined
      ? await sql<{ id: string; sender_id: string; sender_name: string; body: string; created_at: string }>`
          select id, user_id as sender_id, sender_name, body, created_at from room_messages where room_id = ${id} order by created_at asc`
      : [];
    return {
      ok: true as const,
      room,
      joined,
      members: members.length,
      messages: messages.map((row) => ({
        id: row.id,
        mine: row.sender_id === context.userId,
        sender: row.sender_name,
        body: row.body,
        createdAt: String(row.created_at),
      })),
    };
  });

export const sendBoardMessage = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { roomId: string; body: string }) => input)
  .handler(async ({ context, data }) => {
    const body = clean(data.body, 1000);
    if (!body) return { ok: false as const, error: "Write a message first." };
    const sql = await getSql();
    const member = await sql`select user_id from board_members where room_id = ${data.roomId} and user_id = ${context.userId} limit 1`;
    if (!member[0]) return { ok: false as const, error: "Join the room before you write." };
    const who = await displayName(sql, context.userId);
    const sender = `${who.name} (@${who.handle})`;
    await sql`insert into room_messages (id, room_id, user_id, sender_name, body) values (${crypto.randomUUID()}, ${data.roomId}, ${context.userId}, ${sender}, ${body})`;
    const others = await sql<{ user_id: string }>`select user_id from board_members where room_id = ${data.roomId} and user_id <> ${context.userId}`;
    const rooms = await sql<{ title: string }>`select title from board_rooms where id = ${data.roomId} limit 1`;
    for (const other of others) {
      try {
        await notify(other.user_id, "social", `${sender} in ${rooms[0]?.title ?? "a room"}`, body, `/board/room/${data.roomId}`);
      } catch {
        /* The message is already in the room. */
      }
    }
    return { ok: true as const };
  });

export const createBoardPost = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { body: string }) => input)
  .handler(async ({ context, data }) => {
    const body = clean(data.body, 500);
    if (!body) return { ok: false as const, error: "Write the post first." };
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`insert into board_posts (id, author_id, body) values (${id}, ${context.userId}, ${body})`;
    return { ok: true as const, id };
  });

export const createBoardNotice = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { title: string; body: string }) => input)
  .handler(async ({ context, data }) => {
    const title = clean(data.title, 80);
    const body = clean(data.body, 500);
    if (title.length < 2 || !body) return { ok: false as const, error: "A notice needs a title and a detail." };
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`insert into board_news (id, author_id, title, body) values (${id}, ${context.userId}, ${title}, ${body})`;
    return { ok: true as const, id };
  });

export const searchBoard = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .validator((input?: { q?: string; filter?: string }) => input ?? {})
  .handler(async ({ data }) => {
    const sql = await getSql();
    const q = (data.q ?? "").trim().slice(0, 80).toLowerCase();
    const filter = data.filter ?? "all";
    if (!q) return { rooms: [], posts: [], news: [] };
    const wantRooms = filter === "all" || filter === "classes" || filter === "communities" || filter === "groups" || filter === "study";
    const kind =
      filter === "classes" ? "class" : filter === "communities" ? "community" : filter === "groups" ? "group" : filter === "study" ? "study" : "";
    const rooms = !wantRooms
      ? []
      : kind
        ? await sql<{ id: string; kind: string; title: string; subtitle: string }>`
            select id, kind, title, subtitle from board_rooms
            where kind = ${kind}
              and (strpos(lower(title), ${q}) > 0 or strpos(lower(subtitle), ${q}) > 0 or strpos(kind, ${q}) > 0)
            order by created_at desc
            limit 20`
        : await sql<{ id: string; kind: string; title: string; subtitle: string }>`
            select id, kind, title, subtitle from board_rooms
            where strpos(lower(title), ${q}) > 0 or strpos(lower(subtitle), ${q}) > 0 or strpos(kind, ${q}) > 0
            order by created_at desc
            limit 20`;
    const posts =
      filter === "all" || filter === "posts"
        ? await sql<{ id: string; body: string; handle: string }>`
            select p.id, p.body, coalesce(c.handle, a.username, 'member') as handle
            from board_posts p
            left join connect_profiles c on c.user_id = p.author_id
            left join unibud_accounts a on a.user_id = p.author_id
            where strpos(lower(p.body), ${q}) > 0 or strpos(lower(coalesce(c.handle, a.username, '')), ${q}) > 0
            order by p.created_at desc
            limit 20`
        : [];
    const news =
      filter === "all" || filter === "news"
        ? await sql<{ id: string; title: string; body: string; handle: string }>`
            select n.id, n.title, n.body, coalesce(c.handle, a.username, 'member') as handle
            from board_news n
            left join connect_profiles c on c.user_id = n.author_id
            left join unibud_accounts a on a.user_id = n.author_id
            where strpos(lower(n.title), ${q}) > 0 or strpos(lower(n.body), ${q}) > 0
            order by n.created_at desc
            limit 20`
        : [];
    return { rooms, posts, news };
  });
