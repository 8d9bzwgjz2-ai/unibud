import { createServerFn } from "@tanstack/react-start";
import { appAccessMiddleware } from "@/lib/account/guard";
import { getSql, type Sql } from "@/lib/db";
import { notify } from "@/lib/unibud/server";
import { conciergeReply } from "./reply";

function clean(value: string, max: number) {
  return value.trim().slice(0, max);
}

async function who(sql: Sql, userId: string) {
  const rows = await sql<{ name: string; handle: string; photo: string; bio: string }>`
    select coalesce(nullif(p.display_name, ''), nullif(trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), ''), a.username, 'Member') as name,
      coalesce(nullif(p.handle, ''), a.username, 'member') as handle,
      coalesce(a.photo_url, '') as photo,
      coalesce(nullif(p.bio, ''), a.bio, '') as bio
    from unibud_accounts a
    left join connect_profiles p on p.user_id = a.user_id
    where a.user_id = ${userId}
    limit 1`;
  return rows[0] ?? { name: "Member", handle: "member", photo: "", bio: "" };
}

async function ensureThread(sql: Sql, a: string, b: string) {
  const low = a < b ? a : b;
  const high = a < b ? b : a;
  const existing = await sql<{ id: string }>`select id from direct_threads where low_id = ${low} and high_id = ${high} limit 1`;
  if (existing[0]) return existing[0].id;
  const id = crypto.randomUUID();
  await sql`insert into direct_threads (id, low_id, high_id) values (${id}, ${low}, ${high}) on conflict (low_id, high_id) do nothing`;
  const rows = await sql<{ id: string }>`select id from direct_threads where low_id = ${low} and high_id = ${high} limit 1`;
  return rows[0]?.id ?? id;
}

type SoulCard = {
  userId: string;
  name: string;
  handle: string;
  photo: string;
  bio: string;
  institution: string;
  interests: string;
  spot: string;
  km: number | null;
  note: string;
};

type SoulRow = {
  user_id: string;
  name: string;
  handle: string;
  photo: string;
  bio: string;
  institution: string;
  interests: string;
  spot: string;
  lat: number | null;
  lng: number | null;
  note: string;
  created_at: string;
};

const SOUL_LANES = ["all", "new", "campus", "spot", "night", "coffee", "outdoors"] as const;
type SoulLane = (typeof SOUL_LANES)[number];

function finite(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function kmBetween(aLat: number | null, aLng: number | null, bLat: number | null, bLng: number | null) {
  if (aLat == null || aLng == null || bLat == null || bLng == null) return null;
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
}

function asCard(row: SoulRow, meLat: number | null, meLng: number | null): SoulCard {
  const photo = row.photo && row.photo !== "initials" ? row.photo : "";
  return {
    userId: row.user_id,
    name: row.name,
    handle: row.handle,
    photo,
    bio: row.bio,
    institution: row.institution,
    interests: row.interests,
    spot: row.spot,
    km: kmBetween(meLat, meLng, finite(row.lat), finite(row.lng)),
    note: row.note ?? "",
  };
}

function laneMatch(lane: SoulLane, row: SoulRow, me: { institution: string; spot: string; lat: number | null; lng: number | null }) {
  const text = `${row.bio} ${row.interests}`.toLowerCase();
  if (lane === "new") return Date.now() - new Date(row.created_at).getTime() < 1000 * 60 * 60 * 24 * 14;
  if (lane === "campus") return Boolean(me.institution) && row.institution.toLowerCase() === me.institution.toLowerCase();
  if (lane === "spot") {
    const sameName = Boolean(me.spot) && row.spot.toLowerCase() === me.spot.toLowerCase();
    const near = (kmBetween(me.lat, me.lng, finite(row.lat), finite(row.lng)) ?? 999) <= 25;
    return sameName || near;
  }
  if (lane === "night") return /\b(night|party|concert|music|dance)\b/.test(text);
  if (lane === "coffee") return /\b(coffee|cafe|tea)\b/.test(text);
  if (lane === "outdoors") return /\b(hike|outdoor|tour|travel|sport|beach)\b/.test(text);
  return true;
}

const LANE_LABEL: Record<SoulLane, string> = {
  all: "Everyone",
  new: "New",
  campus: "Your campus",
  spot: "Your spot",
  night: "Nights",
  coffee: "Coffee",
  outdoors: "Outdoors",
};

export const soulyncState = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .validator((input?: { lane?: string }) => input ?? {})
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const mine = await sql<{ spot: string; lat: number | null; lng: number | null }>`
      select spot, lat, lng from soulync_members where user_id = ${context.userId} limit 1`;
    const meWho = await who(sql, context.userId);
    const meProfile = await sql<{ institution: string; interests: string }>`
      select coalesce(institution, '') as institution, coalesce(interests, '') as interests
      from connect_profiles where user_id = ${context.userId} limit 1`;
    const me = {
      name: meWho.name,
      handle: meWho.handle,
      photo: meWho.photo && meWho.photo !== "initials" ? meWho.photo : "",
      bio: meWho.bio,
      institution: meProfile[0]?.institution ?? "",
      interests: meProfile[0]?.interests ?? "",
      spot: mine[0]?.spot ?? "",
      pinned: mine[0]?.lat != null && mine[0]?.lng != null,
      lat: finite(mine[0]?.lat),
      lng: finite(mine[0]?.lng),
    };
    if (!mine[0]) {
      return { on: false as const, me, cards: [] as SoulCard[], likesIn: [] as SoulCard[], likesOut: [] as SoulCard[], matches: [] as Array<SoulCard & { threadId: string }>, lanes: [] as Array<{ id: SoulLane; label: string; count: number }> };
    }
    const lane = (SOUL_LANES as readonly string[]).includes(data.lane ?? "") ? (data.lane as SoulLane) : "all";
    const rows = await sql<SoulRow>`
      select m.user_id,
        coalesce(nullif(p.display_name, ''), nullif(trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), ''), a.username, 'Member') as name,
        coalesce(nullif(p.handle, ''), a.username, 'member') as handle,
        coalesce(a.photo_url, '') as photo,
        coalesce(nullif(p.bio, ''), a.bio, '') as bio,
        coalesce(p.institution, '') as institution,
        coalesce(p.interests, '') as interests,
        coalesce(m.spot, '') as spot,
        m.lat, m.lng, m.created_at,
        '' as note
      from soulync_members m
      join unibud_accounts a on a.user_id = m.user_id
      left join connect_profiles p on p.user_id = m.user_id
      where m.user_id <> ${context.userId}
        and not exists (
          select 1 from soulync_swipes s where s.from_id = ${context.userId} and s.to_id = m.user_id
        )
      order by m.created_at asc
      limit 80`;
    const lanes = SOUL_LANES.map((id) => ({
      id,
      label: LANE_LABEL[id],
      count: rows.filter((row) => laneMatch(id, row, me)).length,
    }));
    const cards = rows.filter((row) => laneMatch(lane, row, me)).slice(0, 12).map((row) => asCard(row, me.lat, me.lng));
    const likedYou = await sql<SoulRow>`
      select m.user_id,
        coalesce(nullif(p.display_name, ''), a.username, 'Member') as name,
        coalesce(nullif(p.handle, ''), a.username, 'member') as handle,
        coalesce(a.photo_url, '') as photo,
        coalesce(nullif(p.bio, ''), a.bio, '') as bio,
        coalesce(p.institution, '') as institution,
        coalesce(p.interests, '') as interests,
        coalesce(m.spot, '') as spot,
        m.lat, m.lng, s.created_at,
        coalesce(s.note, '') as note
      from soulync_swipes s
      join soulync_members m on m.user_id = s.from_id
      join unibud_accounts a on a.user_id = s.from_id
      left join connect_profiles p on p.user_id = s.from_id
      where s.to_id = ${context.userId} and s.direction = 'like'
        and not exists (
          select 1 from soulync_swipes mine where mine.from_id = ${context.userId} and mine.to_id = s.from_id
        )
      order by s.created_at desc
      limit 30`;
    const sent = await sql<SoulRow>`
      select m.user_id,
        coalesce(nullif(p.display_name, ''), a.username, 'Member') as name,
        coalesce(nullif(p.handle, ''), a.username, 'member') as handle,
        coalesce(a.photo_url, '') as photo,
        coalesce(nullif(p.bio, ''), a.bio, '') as bio,
        coalesce(p.institution, '') as institution,
        coalesce(p.interests, '') as interests,
        coalesce(m.spot, '') as spot,
        m.lat, m.lng, s.created_at,
        coalesce(s.note, '') as note
      from soulync_swipes s
      join soulync_members m on m.user_id = s.to_id
      join unibud_accounts a on a.user_id = s.to_id
      left join connect_profiles p on p.user_id = s.to_id
      where s.from_id = ${context.userId} and s.direction = 'like'
        and not exists (
          select 1 from soulync_swipes back
          where back.from_id = s.to_id and back.to_id = ${context.userId} and back.direction = 'like'
        )
      order by s.created_at desc
      limit 30`;
    const mutual = await sql<SoulRow & { thread_id: string | null }>`
      select m.user_id,
        coalesce(nullif(p.display_name, ''), a.username, 'Member') as name,
        coalesce(nullif(p.handle, ''), a.username, 'member') as handle,
        coalesce(a.photo_url, '') as photo,
        coalesce(nullif(p.bio, ''), a.bio, '') as bio,
        coalesce(p.institution, '') as institution,
        coalesce(p.interests, '') as interests,
        coalesce(m.spot, '') as spot,
        m.lat, m.lng, s.created_at,
        coalesce(s.note, '') as note,
        t.id as thread_id
      from soulync_swipes s
      join soulync_swipes back on back.from_id = s.to_id and back.to_id = s.from_id and back.direction = 'like'
      join soulync_members m on m.user_id = s.to_id
      join unibud_accounts a on a.user_id = s.to_id
      left join connect_profiles p on p.user_id = s.to_id
      left join direct_threads t on t.low_id = least(s.from_id, s.to_id) and t.high_id = greatest(s.from_id, s.to_id)
      where s.from_id = ${context.userId} and s.direction = 'like'
      order by s.created_at desc
      limit 30`;
    const matches = [];
    for (const row of mutual) {
      const threadId = row.thread_id || (await ensureThread(sql, context.userId, row.user_id));
      matches.push({ ...asCard(row, me.lat, me.lng), threadId });
    }
    return {
      on: true as const,
      me,
      lane,
      cards,
      likesIn: likedYou.map((row) => asCard(row, me.lat, me.lng)),
      likesOut: sent.map((row) => asCard(row, me.lat, me.lng)),
      matches,
      lanes,
    };
  });

export const setSoulync = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { on: boolean; spot?: string; lat?: number | null; lng?: number | null }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (!data.on) {
      await sql`delete from soulync_members where user_id = ${context.userId}`;
      return { ok: true as const };
    }
    const spot = clean(data.spot ?? "", 80);
    const lat = finite(data.lat);
    const lng = finite(data.lng);
    await sql`insert into soulync_members (user_id, spot, lat, lng) values (${context.userId}, ${spot}, ${lat}, ${lng})
      on conflict (user_id) do update set
        spot = case when ${spot} = '' then soulync_members.spot else ${spot} end,
        lat = coalesce(${lat}, soulync_members.lat),
        lng = coalesce(${lng}, soulync_members.lng)`;
    return { ok: true as const };
  });

export const soulyncSwipe = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { userId: string; direction: "like" | "pass"; note?: string }) => input)
  .handler(async ({ context, data }) => {
    if (data.userId === context.userId) return { ok: false as const, error: "That is your own card." };
    const sql = await getSql();
    const member = await sql`select user_id from soulync_members where user_id = ${context.userId} limit 1`;
    if (!member[0]) return { ok: false as const, error: "Turn SouLync on first." };
    const other = await sql`select user_id from soulync_members where user_id = ${data.userId} limit 1`;
    if (!other[0]) return { ok: false as const, error: "That person is not on SouLync." };
    const direction = data.direction === "like" ? "like" : "pass";
    const note = direction === "like" ? clean(data.note ?? "", 280) : "";
    await sql`insert into soulync_swipes (from_id, to_id, direction, note) values (${context.userId}, ${data.userId}, ${direction}, ${note})
      on conflict (from_id, to_id) do update set direction = excluded.direction, note = case when ${note} = '' then soulync_swipes.note else excluded.note end, created_at = now()`;
    if (direction !== "like") return { ok: true as const, match: null };
    const back = await sql<{ direction: string; note: string }>`
      select direction, coalesce(note, '') as note from soulync_swipes where from_id = ${data.userId} and to_id = ${context.userId} limit 1`;
    if (back[0]?.direction !== "like") return { ok: true as const, match: null };
    const threadId = await ensureThread(sql, context.userId, data.userId);
    const me = await who(sql, context.userId);
    const them = await who(sql, data.userId);
    const mineNote = note;
    const theirNote = (back[0]?.note ?? "").trim();
    try {
      if (theirNote) {
        await sql`insert into direct_messages (id, thread_id, sender_id, body) values (${crypto.randomUUID()}, ${threadId}, ${data.userId}, ${theirNote})`;
      }
      if (mineNote) {
        await sql`insert into direct_messages (id, thread_id, sender_id, body) values (${crypto.randomUUID()}, ${threadId}, ${context.userId}, ${mineNote})`;
      }
      const preview = mineNote || theirNote;
      if (preview) await sql`update direct_threads set last_body = ${preview}, updated_at = now() where id = ${threadId}`;
      await notify(data.userId, "social", `SouLync match with ${me.name} (@${me.handle})`, mineNote || "You both said yes. The chat is open.", `/messages/${threadId}`);
      await notify(context.userId, "social", `SouLync match with ${them.name} (@${them.handle})`, theirNote || "You both said yes. The chat is open.", `/messages/${threadId}`);
    } catch {
      /* The match still stands. */
    }
    return { ok: true as const, match: { threadId, name: them.name, handle: them.handle, photo: them.photo && them.photo !== "initials" ? them.photo : "" } };
  });

const LANES = new Set(["tour", "place", "night", "activity"]);

export const listWayward = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .validator((input?: { lane?: string }) => input ?? {})
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const lane = LANES.has(data.lane ?? "") ? data.lane! : "";
    const rows = await sql<{
      id: string;
      lane: string;
      title: string;
      place: string;
      when_text: string;
      details: string;
      members: number;
      joined: boolean;
      handle: string;
    }>`
      select p.id, p.lane, p.title, p.place, p.when_text, p.details,
        (select count(*)::int from wayward_members m where m.plan_id = p.id) as members,
        exists(select 1 from wayward_members m where m.plan_id = p.id and m.user_id = ${context.userId}) as joined,
        coalesce(nullif(c.handle, ''), a.username, 'member') as handle
      from wayward_plans p
      left join connect_profiles c on c.user_id = p.owner_id
      left join unibud_accounts a on a.user_id = p.owner_id
      where ${lane} = '' or p.lane = ${lane}
      order by p.created_at desc
      limit 40`;
    return rows.map((row) => ({
      ...row,
      members: Number(row.members),
      joined: row.joined === true,
    }));
  });

export const createWayward = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { lane: string; title: string; place: string; when: string; details: string }) => input)
  .handler(async ({ context, data }) => {
    if (!LANES.has(data.lane)) return { ok: false as const, error: "Choose a tour, a place, a night, or an activity." };
    const title = clean(data.title, 80);
    if (title.length < 2) return { ok: false as const, error: "Name the plan." };
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`insert into wayward_plans (id, owner_id, lane, title, place, when_text, details)
      values (${id}, ${context.userId}, ${data.lane}, ${title}, ${clean(data.place, 80)}, ${clean(data.when, 80)}, ${clean(data.details, 500)})`;
    await sql`insert into wayward_members (plan_id, user_id) values (${id}, ${context.userId})`;
    return { ok: true as const, id };
  });

export const getWayward = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      lane: string;
      title: string;
      place: string;
      when_text: string;
      details: string;
      owner_id: string;
      handle: string;
      name: string;
    }>`
      select p.id, p.lane, p.title, p.place, p.when_text, p.details, p.owner_id,
        coalesce(nullif(c.handle, ''), a.username, 'member') as handle,
        coalesce(nullif(c.display_name, ''), a.username, 'Member') as name
      from wayward_plans p
      left join connect_profiles c on c.user_id = p.owner_id
      left join unibud_accounts a on a.user_id = p.owner_id
      where p.id = ${id}
      limit 1`;
    const plan = rows[0];
    if (!plan) return { ok: false as const, error: "That plan is gone." };
    const members = await sql<{ user_id: string }>`select user_id from wayward_members where plan_id = ${id}`;
    const joined = members.some((member) => member.user_id === context.userId);
    const messages = joined
      ? await sql<{ id: string; user_id: string; sender_name: string; body: string; created_at: string }>`
          select id, user_id, sender_name, body, created_at from wayward_messages where plan_id = ${id} order by created_at asc`
      : [];
    return {
      ok: true as const,
      plan,
      joined,
      members: members.length,
      messages: messages.map((row) => ({
        id: row.id,
        mine: row.user_id === context.userId,
        sender: row.sender_name,
        body: row.body,
        createdAt: String(row.created_at),
      })),
    };
  });

export const joinWayward = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const plans = await sql`select id from wayward_plans where id = ${data.id} limit 1`;
    if (!plans[0]) return { ok: false as const, error: "That plan is gone." };
    await sql`insert into wayward_members (plan_id, user_id) values (${data.id}, ${context.userId}) on conflict do nothing`;
    return { ok: true as const };
  });

export const sendWayward = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { id: string; body: string }) => input)
  .handler(async ({ context, data }) => {
    const body = clean(data.body, 1000);
    if (!body) return { ok: false as const, error: "Write a message first." };
    const sql = await getSql();
    const member = await sql`select user_id from wayward_members where plan_id = ${data.id} and user_id = ${context.userId} limit 1`;
    if (!member[0]) return { ok: false as const, error: "Join the plan before you write." };
    const me = await who(sql, context.userId);
    await sql`insert into wayward_messages (id, plan_id, user_id, sender_name, body)
      values (${crypto.randomUUID()}, ${data.id}, ${context.userId}, ${`${me.name} (@${me.handle})`}, ${body})`;
    const others = await sql<{ user_id: string }>`select user_id from wayward_members where plan_id = ${data.id} and user_id <> ${context.userId}`;
    const plans = await sql<{ title: string }>`select title from wayward_plans where id = ${data.id} limit 1`;
    for (const other of others) {
      try {
        await notify(other.user_id, "social", `${me.name} (@${me.handle}) in ${plans[0]?.title ?? "Wayward"}`, body, `/connect/wayward/${data.id}`);
      } catch {
        /* The message is already stored. */
      }
    }
    return { ok: true as const };
  });

export const listConcierge = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string; role: string; body: string; created_at: string }>`
      select id, role, body, created_at from concierge_messages where user_id = ${context.userId} order by created_at asc limit 80`;
    return rows.map((row) => ({ id: row.id, role: row.role, body: row.body, createdAt: String(row.created_at) }));
  });

export const askConcierge = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { body: string }) => input)
  .handler(async ({ context, data }) => {
    const body = clean(data.body, 800);
    if (!body) return { ok: false as const, error: "Write what you need." };
    const sql = await getSql();
    const reply = conciergeReply(body);
    await sql`insert into concierge_messages (id, user_id, role, body) values (${crypto.randomUUID()}, ${context.userId}, ${"user"}, ${body})`;
    await sql`insert into concierge_messages (id, user_id, role, body) values (${crypto.randomUUID()}, ${context.userId}, ${"concierge"}, ${reply})`;
    return { ok: true as const, reply };
  });
