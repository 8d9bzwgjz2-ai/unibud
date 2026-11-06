import { createServerFn } from "@tanstack/react-start";
import { appAccessMiddleware } from "@/lib/account/guard";
import { getSql, type Sql } from "@/lib/db";
import {
  acceptRequest,
  authorizeService,
  cancelRequest,
  declineRequest,
  followUser,
  isBlocked,
  rankPeople,
  rankServices,
  relationWith,
  removeConnection,
  sendRequest,
  serviceLabel,
  visibleInSearch,
  type Block,
  type ConnectRequest,
  type DiscoverPerson,
} from "./domain";

export type ConnectProfile = {
  userId: string;
  displayName: string;
  handle: string;
  bio: string;
  institution: string;
  course: string;
  roleTitle: string;
  location: string;
  interests: string;
  skills: string;
  showInstitution: boolean;
  showCourse: boolean;
  showLocation: boolean;
  showInterests: boolean;
  discoverable: boolean;
  followerApproval: boolean;
  allowRequests: boolean;
  allowMessages: boolean;
  notifyRequests: boolean;
  notifyFollows: boolean;
  verified: boolean;
};

export type ConnectServiceCard = {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  integration: "available" | "unavailable";
  route: string;
  scopes: string[];
  status: string;
};

const SERVICES = [
  {
    id: "soulync",
    name: "SouLync",
    description: "Dating and intentional introductions.",
    category: "Social and Relationships",
    provider: "UNIBUD",
    integration: "unavailable" as const,
    route: "/connect/soulync",
    scopes: "Display name, interests",
  },
  {
    id: "wayward",
    name: "Wayward",
    description: "Events, culture, and trips.",
    category: "Events and Culture",
    provider: "UNIBUD",
    integration: "unavailable" as const,
    route: "/connect/wayward",
    scopes: "Display name",
  },
  {
    id: "flow",
    name: "Flow",
    description: "Student money, work, devices, and top-up. Nothing here moves money.",
    category: "Finance",
    provider: "UNIBUD",
    integration: "unavailable" as const,
    route: "/flow",
    scopes: "None until a licensed partner is connected",
  },
  {
    id: "quad",
    name: "Quad",
    description: "Communities and clubs.",
    category: "Education",
    provider: "UNIBUD",
    integration: "unavailable" as const,
    route: "/communities",
    scopes: "Display name",
  },
] as const;

type ProfileRow = {
  user_id: string;
  display_name: string;
  handle: string;
  bio: string;
  institution: string;
  course: string;
  role_title: string;
  location: string;
  interests: string;
  skills: string;
  show_institution: boolean;
  show_course: boolean;
  show_location: boolean;
  show_interests: boolean;
  discoverable: boolean;
  follower_approval: boolean;
  allow_requests: boolean;
  allow_messages: boolean;
  notify_requests: boolean;
  notify_follows: boolean;
  verified: boolean;
};

function mapProfile(row: ProfileRow): ConnectProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    handle: row.handle,
    bio: row.bio,
    institution: row.institution,
    course: row.course,
    roleTitle: row.role_title,
    location: row.location,
    interests: row.interests,
    skills: row.skills,
    showInstitution: row.show_institution,
    showCourse: row.show_course,
    showLocation: row.show_location,
    showInterests: row.show_interests,
    discoverable: row.discoverable,
    followerApproval: row.follower_approval,
    allowRequests: row.allow_requests,
    allowMessages: row.allow_messages,
    notifyRequests: row.notify_requests,
    notifyFollows: row.notify_follows,
    verified: row.verified,
  };
}

function publicFields(profile: ConnectProfile) {
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    handle: profile.handle,
    bio: profile.bio,
    institution: profile.showInstitution ? profile.institution : "",
    course: profile.showCourse ? profile.course : "",
    roleTitle: profile.roleTitle,
    location: profile.showLocation ? profile.location : "",
    interests: profile.showInterests ? profile.interests : "",
    skills: profile.showInterests ? profile.skills : "",
    verified: profile.verified,
    allowMessages: profile.allowMessages,
  };
}

function searchableText(profile: ConnectProfile) {
  return [
    profile.showInstitution ? profile.institution : "",
    profile.showCourse ? profile.course : "",
    profile.roleTitle,
    profile.showLocation ? profile.location : "",
    profile.showInterests ? profile.interests : "",
    profile.showInterests ? profile.skills : "",
    profile.bio,
  ]
    .filter(Boolean)
    .join(" ");
}

async function ensureServices(sql: Sql) {
  for (const service of SERVICES) {
    await sql`insert into connect_services (id, name, description, category, provider, integration, route, scopes)
      values (${service.id}, ${service.name}, ${service.description}, ${service.category}, ${service.provider}, ${service.integration}, ${service.route}, ${service.scopes})
      on conflict (id) do update set name = excluded.name, description = excluded.description, integration = excluded.integration, route = excluded.route, scopes = excluded.scopes`;
  }
}

async function loadRequests(sql: Sql, userId: string) {
  const rows = await sql<{ id: string; from_id: string; to_id: string; status: ConnectRequest["status"] }>`
    select id, from_id, to_id, status from connect_requests
    where from_id = ${userId} or to_id = ${userId}`;
  return rows.map((row) => ({ id: row.id, fromId: row.from_id, toId: row.to_id, status: row.status }));
}

async function loadBlocks(sql: Sql, userId: string): Promise<Block[]> {
  const rows = await sql<{ blocker_id: string; blocked_id: string }>`
    select blocker_id, blocked_id from connect_blocks where blocker_id = ${userId} or blocked_id = ${userId}`;
  return rows.map((row) => ({ blockerId: row.blocker_id, blockedId: row.blocked_id }));
}

function cleanHandle(raw: string) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
}

export const getMyConnectProfile = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<ProfileRow>`select * from connect_profiles where user_id = ${context.userId} limit 1`;
    return rows[0] ? mapProfile(rows[0]) : null;
  });

export const saveConnectProfile = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: Omit<ConnectProfile, "userId" | "verified">) => input)
  .handler(async ({ context, data }) => {
    const handle = cleanHandle(data.handle);
    if (handle.length < 3) return { ok: false as const, error: "Use at least 3 letters or numbers for a handle." };
    if (!data.displayName.trim()) return { ok: false as const, error: "Add the name people should see." };
    const sql = await getSql();
    const taken = await sql<{ user_id: string }>`select user_id from connect_profiles where lower(handle) = ${handle} and user_id <> ${context.userId} limit 1`;
    if (taken.length) return { ok: false as const, error: "That handle is already taken." };
    await sql`insert into connect_profiles (
      user_id, display_name, handle, bio, institution, course, role_title, location, interests, skills,
      show_institution, show_course, show_location, show_interests, discoverable, follower_approval, allow_requests, allow_messages,
      notify_requests, notify_follows, verified
    ) values (
      ${context.userId}, ${data.displayName.trim().slice(0, 80)}, ${handle}, ${data.bio.slice(0, 280)}, ${data.institution.slice(0, 80)},
      ${data.course.slice(0, 80)}, ${data.roleTitle.slice(0, 80)}, ${data.location.slice(0, 80)}, ${data.interests.slice(0, 160)}, ${data.skills.slice(0, 160)},
      ${data.showInstitution}, ${data.showCourse}, ${data.showLocation}, ${data.showInterests}, ${data.discoverable}, ${data.followerApproval},
      ${data.allowRequests}, ${data.allowMessages}, ${data.notifyRequests}, ${data.notifyFollows}, ${false}
    ) on conflict (user_id) do update set
      display_name = excluded.display_name, handle = excluded.handle, bio = excluded.bio, institution = excluded.institution,
      course = excluded.course, role_title = excluded.role_title, location = excluded.location, interests = excluded.interests,
      skills = excluded.skills, show_institution = excluded.show_institution, show_course = excluded.show_course,
      show_location = excluded.show_location, show_interests = excluded.show_interests, discoverable = excluded.discoverable,
      follower_approval = excluded.follower_approval, allow_requests = excluded.allow_requests, allow_messages = excluded.allow_messages,
      notify_requests = excluded.notify_requests, notify_follows = excluded.notify_follows,
      verified = false, updated_at = now()`;
    return { ok: true as const, handle };
  });

export const searchConnect = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .validator((input?: { q?: string; kind?: "all" | "people" | "services"; category?: string }) => input ?? {})
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureServices(sql);
    const q = (data.q ?? "").trim().replace(/^@+/, "").slice(0, 80).toLowerCase();
    const kind = data.kind === "people" || data.kind === "services" ? data.kind : "all";
    const category = (data.category ?? "").trim();
    const blocks = await loadBlocks(sql, context.userId);
    const rows = await sql<ProfileRow & { username: string | null; photo_url: string | null }>`
      select p.*, a.username, a.photo_url
      from connect_profiles p
      left join unibud_accounts a on a.user_id = p.user_id
      where p.user_id <> ${context.userId}
        and (
          ${q} = ''
          or strpos(lower(p.handle), ${q}) > 0
          or strpos(lower(p.display_name), ${q}) > 0
          or strpos(lower(coalesce(a.username, '')), ${q}) > 0
          or strpos(lower(p.bio), ${q}) > 0
          or (p.show_institution and strpos(lower(coalesce(p.institution, '')), ${q}) > 0)
          or (p.show_course and strpos(lower(coalesce(p.course, '')), ${q}) > 0)
          or (p.show_location and strpos(lower(coalesce(p.location, '')), ${q}) > 0)
          or (p.show_interests and (strpos(lower(coalesce(p.interests, '')), ${q}) > 0 or strpos(lower(coalesce(p.skills, '')), ${q}) > 0))
        )
      limit 80`;
    const people = rows
      .map((row) => ({
        profile: mapProfile(row),
        username: (row.username ?? row.handle).toLowerCase(),
        photo: row.photo_url && row.photo_url !== "initials" ? row.photo_url : "",
      }))
      .filter(({ profile, username }) => {
        const exact = q.length >= 3 && (profile.handle === q || username === q);
        if (exact) return !isBlocked(blocks, context.userId, profile.userId);
        return visibleInSearch(
          {
            id: profile.userId,
            handle: profile.handle,
            name: profile.displayName,
            extra: searchableText(profile),
            discoverable: profile.discoverable,
            verified: profile.verified,
            username: profile.handle,
          },
          context.userId,
          blocks,
        );
      });
    const ranked = rankPeople(
      q,
      people.map(({ profile, username }) => ({
        ...publicFields(profile),
        id: profile.userId,
        handle: profile.handle,
        name: profile.displayName,
        extra: searchableText(profile),
        discoverable: true,
        verified: profile.verified,
        username,
      })),
    ).slice(0, 24);
    const photoById = new Map(people.map(({ profile, photo }) => [profile.userId, photo]));
    const grants = await sql<{ service_id: string; status: string }>`select service_id, status from connect_grants where user_id = ${context.userId}`;
    const grantById = new Map(grants.map((grant) => [grant.service_id, grant.status]));
    const services: ConnectServiceCard[] = rankServices(
      q,
      SERVICES.filter((service) => !category || service.category === category),
    ).map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      category: service.category,
      provider: service.provider,
      integration: service.integration,
      route: service.route,
      scopes: service.scopes.split(",").map((scope) => scope.trim()),
      status: serviceLabel(service.integration, grantById.get(service.id)),
    }));
    return {
      people: kind === "services" ? [] : ranked.map(({ id, name, extra, discoverable, username, ...rest }) => ({
        ...rest,
        userId: id,
        displayName: name,
        username: username || rest.handle,
        photo: photoById.get(id) ?? "",
      })),
      services: kind === "people" ? [] : services,
      categories: [...new Set(SERVICES.map((service) => service.category))],
    };
  });

export const getConnectPerson = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .validator((input: { handle: string }) => input)
  .handler(async ({ context, data }) => {
    const handle = cleanHandle(data.handle);
    const sql = await getSql();
    const rows = await sql<ProfileRow>`select * from connect_profiles where lower(handle) = ${handle} limit 1`;
    const profile = rows[0] ? mapProfile(rows[0]) : null;
    if (!profile) return { ok: false as const, error: "No person with that handle." };
    const blocks = await loadBlocks(sql, context.userId);
    const self = profile.userId === context.userId;
    const iBlocked = blocks.some((block) => block.blockerId === context.userId && block.blockedId === profile.userId);
    const theyBlocked = blocks.some((block) => block.blockerId === profile.userId && block.blockedId === context.userId);
    const requests = self ? [] : await loadRequests(sql, context.userId);
    const relation = relationWith(requests, context.userId, profile.userId);
    if (!self && theyBlocked) return { ok: false as const, error: "This profile is not available." };
    const follows = self
      ? []
      : await sql<{ status: "pending" | "active" }>`select status from connect_follows where follower_id = ${context.userId} and followed_id = ${profile.userId} limit 1`;
    return {
      ok: true as const,
      self,
      blocked: iBlocked,
      profile: self ? profile : publicFields(profile),
      followStatus: follows[0]?.status ?? null,
      requestStatus: relation.requestStatus,
      requestId: relation.requestId,
      requestFromMe: relation.requestFromMe,
    };
  });

export const listConnectRelations = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const requests = await sql<{
      id: string;
      from_id: string;
      to_id: string;
      status: string;
      created_at: string;
      asker_name: string;
      asker_handle: string;
      asker_photo: string | null;
      asker_messages: boolean;
      other_name: string;
      other_handle: string;
      other_photo: string | null;
      other_messages: boolean;
    }>`
      select r.id, r.from_id, r.to_id, r.status, r.created_at,
        coalesce(nullif(ap.display_name, ''), nullif(trim(coalesce(aa.first_name, '') || ' ' || coalesce(aa.last_name, '')), ''), aa.username, 'Member') as asker_name,
        coalesce(nullif(ap.handle, ''), aa.username, 'member') as asker_handle,
        aa.photo_url as asker_photo,
        coalesce(ap.allow_messages, aa.allow_messages, false) as asker_messages,
        coalesce(nullif(op.display_name, ''), nullif(trim(coalesce(oa.first_name, '') || ' ' || coalesce(oa.last_name, '')), ''), oa.username, 'Member') as other_name,
        coalesce(nullif(op.handle, ''), oa.username, 'member') as other_handle,
        oa.photo_url as other_photo,
        coalesce(op.allow_messages, oa.allow_messages, false) as other_messages
      from connect_requests r
      left join connect_profiles ap on ap.user_id = r.from_id
      left join unibud_accounts aa on aa.user_id = r.from_id
      left join connect_profiles op on op.user_id = r.to_id
      left join unibud_accounts oa on oa.user_id = r.to_id
      where r.from_id = ${context.userId} or r.to_id = ${context.userId}
      order by r.created_at desc
      limit 50`;
    const card = (row: (typeof requests)[number]) => {
      const fromMe = row.from_id === context.userId;
      const person = fromMe
        ? { name: row.other_name, handle: row.other_handle, photo: row.other_photo, allowMessages: row.other_messages }
        : { name: row.asker_name, handle: row.asker_handle, photo: row.asker_photo, allowMessages: row.asker_messages };
      const photo = person.photo && person.photo !== "initials" ? person.photo : "";
      return {
        id: row.id,
        name: person.name,
        handle: person.handle,
        photo,
        at: String(row.created_at),
        fromMe,
        allowMessages: Boolean(person.allowMessages),
      };
    };
    return {
      incoming: requests.filter((row) => row.status === "pending" && row.to_id === context.userId).map(card),
      sent: requests.filter((row) => row.status === "pending" && row.from_id === context.userId).map(card),
      connections: requests.filter((row) => row.status === "accepted").map(card),
    };
  });

async function notify(sql: Sql, userId: string, title: string, body: string, href = "/connect") {
  try {
    await sql`insert into notifications (id, user_id, kind, title, body, href, read) values (${crypto.randomUUID()}, ${userId}, ${"social"}, ${title}, ${body}, ${href}, ${false})`;
  } catch {
    /* A failed notice must not undo the connection itself. */
  }
}

export const requestConnection = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { userId: string }) => input)
  .handler(async ({ context, data }) => {
    if (data.userId === context.userId) return { ok: false as const, error: "You cannot connect with yourself." };
    const sql = await getSql();
    const target = await sql<ProfileRow>`select * from connect_profiles where user_id = ${data.userId} limit 1`;
    if (!target[0]) return { ok: false as const, error: "That person is not in the directory." };
    const profile = mapProfile(target[0]);
    const blocks = await loadBlocks(sql, context.userId);
    const requests = await loadRequests(sql, context.userId);
    const decision = sendRequest({
      fromId: context.userId,
      toId: profile.userId,
      requests,
      blocks,
      allowRequests: profile.allowRequests,
    });
    if (!decision.ok) return decision;
    const id = crypto.randomUUID();
    await sql`insert into connect_requests (id, from_id, to_id, status) values (${id}, ${context.userId}, ${profile.userId}, ${"pending"})`;
    const me = await sql<{ display_name: string; handle: string }>`select display_name, handle from connect_profiles where user_id = ${context.userId} limit 1`;
    if (profile.notifyRequests) {
      const who = me[0]?.display_name || "Someone";
      const handle = me[0]?.handle || "";
      await notify(
        sql,
        profile.userId,
        handle ? `${who} (@${handle}) asked to connect` : `${who} asked to connect`,
        "Accept or decline this request from Connect.",
        handle ? `/connect/people/${handle}` : "/connect",
      );
    }
    return { ok: true as const, status: "pending" as const };
  });

export const respondConnection = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { id?: string; userId?: string; action: "accept" | "decline" | "cancel" | "remove" }) => ({
    id: (input.id ?? "").trim(),
    userId: (input.userId ?? "").trim(),
    action: input.action,
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const load = async (id: string) => {
      const rows = await sql<{ id: string; from_id: string; to_id: string; status: ConnectRequest["status"] }>`
        select id, from_id, to_id, status from connect_requests where id = ${id} limit 1`;
      return rows[0] ? { id: rows[0].id, fromId: rows[0].from_id, toId: rows[0].to_id, status: rows[0].status } : undefined;
    };
    const incomingFrom = async (userId: string) => {
      const rows = await sql<{ id: string; from_id: string; to_id: string; status: ConnectRequest["status"] }>`
        select id, from_id, to_id, status from connect_requests
        where status = ${"pending"} and to_id = ${context.userId} and from_id = ${userId}
        order by created_at desc limit 1`;
      return rows[0] ? { id: rows[0].id, fromId: rows[0].from_id, toId: rows[0].to_id, status: rows[0].status } : undefined;
    };
    let request = data.id ? await load(data.id) : undefined;
    if ((data.action === "accept" || data.action === "decline") && data.userId) {
      if (!request || request.status !== "pending" || request.toId !== context.userId) {
        request = (await incomingFrom(data.userId)) ?? request;
      }
    }
    if (data.action === "accept" && request?.status === "accepted" && (request.fromId === context.userId || request.toId === context.userId)) {
      return { ok: true as const };
    }
    if (data.action === "accept") {
      const decision = acceptRequest(request, context.userId);
      if (!decision.ok || !request) return decision.ok ? { ok: false as const, error: "That request is no longer waiting." } : decision;
      try {
        await sql`update connect_requests set status = ${"accepted"}, responded_at = now() where id = ${request.id}`;
        const me = await sql<{ display_name: string; handle: string }>`select display_name, handle from connect_profiles where user_id = ${context.userId} limit 1`;
        const who = me[0]?.display_name || "Someone";
        const handle = me[0]?.handle || "";
        await notify(
          sql,
          decision.requesterId,
          handle ? `${who} (@${handle}) accepted your request` : `${who} accepted your request`,
          "You are connected.",
          handle ? `/connect/people/${handle}` : "/connect",
        );
      } catch (error) {
        return { ok: false as const, error: error instanceof Error ? error.message : "That request could not be accepted." };
      }
      return { ok: true as const };
    }
    if (data.action === "decline") {
      const decision = declineRequest(request, context.userId);
      if (!decision.ok || !request) return decision.ok ? { ok: false as const, error: "That request is no longer waiting." } : decision;
      try {
        await sql`update connect_requests set status = ${"declined"}, responded_at = now() where id = ${request.id}`;
      } catch (error) {
        return { ok: false as const, error: error instanceof Error ? error.message : "That request could not be declined." };
      }
      return { ok: true as const };
    }
    if (data.action === "cancel") {
      const decision = cancelRequest(request, context.userId);
      if (!decision.ok || !request) return decision.ok ? { ok: false as const, error: "That request is no longer waiting." } : decision;
      await sql`update connect_requests set status = ${"cancelled"}, responded_at = now() where id = ${request.id}`;
      return { ok: true as const };
    }
    const decision = removeConnection(request, context.userId);
    if (!decision.ok || !request) return decision.ok ? { ok: false as const, error: "There is no connection to remove." } : decision;
    await sql`update connect_requests set status = ${"removed"}, responded_at = now() where id = ${request.id}`;
    return { ok: true as const };
  });

export const followPerson = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { userId: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const target = await sql<ProfileRow>`select * from connect_profiles where user_id = ${data.userId} limit 1`;
    if (!target[0]) return { ok: false as const, error: "That person is not in the directory." };
    const profile = mapProfile(target[0]);
    const blocks = await loadBlocks(sql, context.userId);
    const existing = await sql<{ status: "pending" | "active" }>`select status from connect_follows where follower_id = ${context.userId} and followed_id = ${profile.userId} limit 1`;
    const decision = followUser({
      followerId: context.userId,
      followedId: profile.userId,
      blocks,
      approval: profile.followerApproval,
      existing: existing[0] ? { followerId: context.userId, followedId: profile.userId, status: existing[0].status } : undefined,
    });
    if (!decision.ok) return decision;
    await sql`insert into connect_follows (follower_id, followed_id, status) values (${context.userId}, ${profile.userId}, ${decision.status})
      on conflict (follower_id, followed_id) do update set status = excluded.status`;
    if (decision.status === "active" && profile.notifyFollows) await notify(sql, profile.userId, "New follower", "Someone followed you.");
    if (decision.status === "pending" && profile.notifyFollows) await notify(sql, profile.userId, "Follow request", "Someone asked to follow you.");
    return { ok: true as const, status: decision.status };
  });

export const unfollowPerson = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { userId: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from connect_follows where follower_id = ${context.userId} and followed_id = ${data.userId}`;
    return { ok: true as const };
  });

export const blockPerson = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { userId: string }) => input)
  .handler(async ({ context, data }) => {
    if (data.userId === context.userId) return { ok: false as const, error: "You cannot block yourself." };
    const sql = await getSql();
    await sql`insert into connect_blocks (blocker_id, blocked_id) values (${context.userId}, ${data.userId}) on conflict do nothing`;
    await sql`delete from connect_follows where (follower_id = ${context.userId} and followed_id = ${data.userId}) or (follower_id = ${data.userId} and followed_id = ${context.userId})`;
    await sql`update connect_requests set status = ${"removed"}, responded_at = now()
      where (status = ${"pending"} or status = ${"accepted"})
      and ((from_id = ${context.userId} and to_id = ${data.userId}) or (from_id = ${data.userId} and to_id = ${context.userId}))`;
    return { ok: true as const };
  });

export const unblockPerson = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { userId: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from connect_blocks where blocker_id = ${context.userId} and blocked_id = ${data.userId}`;
    return { ok: true as const };
  });

export const reportPerson = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { userId: string; category: string; note?: string }) => input)
  .handler(async ({ context, data }) => {
    const category = data.category.trim().slice(0, 40);
    if (!category) return { ok: false as const, error: "Choose what you are reporting." };
    const sql = await getSql();
    await sql`insert into connect_reports (id, reporter_id, target_id, category, note) values (${crypto.randomUUID()}, ${context.userId}, ${data.userId}, ${category}, ${(data.note ?? "").slice(0, 500)})`;
    return { ok: true as const };
  });

export const getConnectService = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const service = SERVICES.find((item) => item.id === data.id);
    if (!service) return { ok: false as const, error: "That service is not registered." };
    const sql = await getSql();
    await ensureServices(sql);
    const grants = await sql<{ status: string }>`select status from connect_grants where user_id = ${context.userId} and service_id = ${service.id} limit 1`;
    return {
      ok: true as const,
      service: {
        ...service,
        scopes: service.scopes.split(",").map((scope) => scope.trim()),
        status: serviceLabel(service.integration, grants[0]?.status),
      },
    };
  });

export const approveConnectService = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const service = SERVICES.find((item) => item.id === data.id);
    if (!service) return { ok: false as const, error: "That service is not registered." };
    const decision = authorizeService(service.integration, service.scopes.split(","));
    if (!decision.ok) return decision;
    const sql = await getSql();
    await sql`insert into connect_grants (user_id, service_id, status, scopes, consented_at, revoked_at)
      values (${context.userId}, ${service.id}, ${"connected"}, ${decision.scopes.join(", ")}, now(), null)
      on conflict (user_id, service_id) do update set status = ${"connected"}, scopes = excluded.scopes, consented_at = now(), revoked_at = null`;
    await notify(sql, context.userId, `${service.name} connected`, "You approved the listed scopes. This does not share your whole profile.");
    return { ok: true as const, status: "connected" as const };
  });

export const revokeConnectService = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`insert into connect_grants (user_id, service_id, status, revoked_at)
      values (${context.userId}, ${data.id}, ${"revoked"}, now())
      on conflict (user_id, service_id) do update set status = ${"revoked"}, revoked_at = now()`;
    await notify(sql, context.userId, "Service access revoked", "That service no longer has the access you approved.");
    return { ok: true as const };
  });

export const listConnectNotifications = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string; title: string; body: string; href: string | null; read: boolean; created_at: string }>`
      select id, title, body, href, read, created_at from notifications
      where user_id = ${context.userId} and kind = ${"social"} order by created_at desc limit 30`;
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      href: row.href ?? "/connect",
      read: row.read,
      createdAt: String(row.created_at),
    }));
  });

export const markConnectNotificationRead = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`update notifications set read = true where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });
