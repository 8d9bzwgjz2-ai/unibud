/**
 * Quad server functions. A Quad is an app-like community environment — open to
 * any interest, creator, organization, activity or experience. Creation is
 * open to real signed-in users; only official Class spaces keep the existing
 * class-governor gate. Every write persists to the database.
 */
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { canGovernClass, type CampusRole } from "@/lib/unibud/roles";
import { notify } from "@/lib/unibud/server";

/** Open-ended Quad types — examples, not restrictions. New kinds are fine. */
export const QUAD_TYPES = [
  "Sports",
  "Music",
  "Gaming",
  "Technology",
  "Creative",
  "News",
  "Career",
  "Culture",
  "Events",
  "Podcast",
  "Creator",
  "Interest",
  "Study",
  "Community",
  "Class",
] as const;
export type QuadType = (typeof QUAD_TYPES)[number];

type Sql = Awaited<ReturnType<typeof getSql>>;

async function myProfile(sql: Sql, userId: string) {
  const rows = await sql<{ handle: string; campus_role?: string; university_id: string }>`
    select handle, campus_role, university_id from student_profiles where user_id = ${userId} limit 1`;
  return rows[0] ?? null;
}

function slug(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "quad"
  );
}

export const createQuad = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; kind: string; description: string }) => input)
  .handler(async ({ context, data }) => {
    const name = data.name.trim();
    const description = data.description.trim() || `${name} — a Quad on UNIBUD.`;
    if (!name) throw new Error("Give the Quad a name");
    const sql = await getSql();
    const profile = await myProfile(sql, context.userId);
    if (!profile) throw new Error("Set up your profile first");
    const role = (profile.campus_role ?? "student") as CampusRole;
    // Preserve the existing rule: official class spaces belong to class governors.
    if (data.kind === "Class" && !canGovernClass(role)) {
      throw new Error("Only a class governor can open an official class space.");
    }
    const id = `q_${slug(name)}-${crypto.randomUUID().slice(0, 6)}`;
    await sql`insert into communities (id, name, kind, university_id, description, members, created_by)
      values (${id}, ${name}, ${data.kind}, ${profile.university_id}, ${description}, 0, ${context.userId})`;
    // The creator joins their own Quad — a real membership, not a number.
    await sql`insert into community_members (user_id, community_id)
      values (${context.userId}, ${id}) on conflict do nothing`;
    return { id, name };
  });

async function loadQuad(sql: Sql, quadId: string, userId: string) {
  const quads = await sql<{ id: string; name: string; kind: string; created_by: string | null }>`
    select id, name, kind, created_by from communities where id = ${quadId} limit 1`;
  if (!quads[0]) throw new Error("Quad not found");
  const quad = quads[0];
  const profile = await myProfile(sql, userId);
  const role = (profile?.campus_role ?? "student") as CampusRole;
  // Real permission: the Quad's creator manages groups; class spaces keep the
  // existing governor rule. Membership in the Quad lets anyone join groups.
  const canManage =
    quad.created_by === userId ||
    (quad.kind === "Class" && canGovernClass(role)) ||
    role === "governor" || role === "moderator";
  return { quad, canManage, role, handle: profile?.handle ?? "you" };
}

export const createQuadGroup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { quadId: string; name: string; description?: string }) => input)
  .handler(async ({ context, data }) => {
    const name = data.name.trim();
    if (!name) throw new Error("Give the group a name");
    const sql = await getSql();
    const { canManage } = await loadQuad(sql, data.quadId, context.userId);
    if (!canManage) throw new Error("Only the Quad's creator can open groups here.");
    const id = `g_${crypto.randomUUID().slice(0, 10)}`;
    await sql`insert into quad_groups (id, quad_id, name, description, created_by)
      values (${id}, ${data.quadId}, ${name}, ${data.description?.trim() ?? ""}, ${context.userId})`;
    await sql`insert into quad_group_members (user_id, group_id) values (${context.userId}, ${id})`;
    return { id, name };
  });

export const joinQuadGroup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((groupId: string) => groupId)
  .handler(async ({ context, data: groupId }) => {
    const sql = await getSql();
    const existing = await sql`select group_id from quad_group_members
      where user_id = ${context.userId} and group_id = ${groupId}`;
    if (existing[0]) {
      await sql`delete from quad_group_members where user_id = ${context.userId} and group_id = ${groupId}`;
      return { joined: false };
    }
    await sql`insert into quad_group_members (user_id, group_id) values (${context.userId}, ${groupId})`;
    return { joined: true };
  });

export const myQuadGroups = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ group_id: string }>`
      select group_id from quad_group_members where user_id = ${context.userId}`;
    return rows.map((r) => r.group_id);
  });

export const postQuadAnnouncement = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { quadId: string; body: string }) => input)
  .handler(async ({ context, data }) => {
    const body = data.body.trim();
    if (!body) throw new Error("Write the announcement first");
    const sql = await getSql();
    const { quad, canManage, handle } = await loadQuad(sql, data.quadId, context.userId);
    if (!canManage) throw new Error("Only the Quad's creator can post announcements here.");
    await sql`insert into quad_announcements (id, quad_id, author_handle, body)
      values (${crypto.randomUUID()}, ${data.quadId}, ${handle}, ${body})`;
    // A real announcement is a real event for every actual member — nothing else.
    const members = await sql<{ user_id: string }>`
      select user_id from community_members where community_id = ${data.quadId} and user_id <> ${context.userId}`;
    for (const m of members) {
      await notify(m.user_id, "communities", `New announcement in ${quad.name}`, body, `/communities/${data.quadId}`);
    }
    return { ok: true as const };
  });
