import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureCatalogSeed } from "@/lib/unibud/seed";
import { mapCommunity } from "@/lib/unibud/map";
import type { Community } from "@/lib/unibud/types";

export type QuadPrivacy = "public" | "private";

export type CreateQuadInput = {
  name: string;
  description: string;
  category: string;
  privacy: QuadPrivacy;
  image?: string;
};

export type QuadWithMembership = Community & {
  ownerUserId: string | null;
  privacy: string;
  category: string | null;
  isMember: boolean;
  isOwner: boolean;
  memberCount: number;
};

function mapQuad(
  r: {
    id: string;
    name: string;
    kind: string;
    university_id: string | null;
    description: string;
    cover: string | null;
    members: number;
    owner_user_id: string | null;
    privacy: string;
    category: string | null;
  },
  userId: string,
  memberIds: Set<string>,
): QuadWithMembership {
  return {
    ...mapCommunity(r),
    ownerUserId: r.owner_user_id,
    privacy: r.privacy,
    category: r.category,
    isMember: memberIds.has(r.id),
    isOwner: r.owner_user_id === userId,
    memberCount: r.members,
  };
}

/**
 * Create a real persistent Quad (interest group). The creator becomes the
 * owner/admin and first member. The Quad is immediately visible through the
 * existing Quad interface.
 */
export const createQuad = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: CreateQuadInput) => input)
  .handler(async ({ context, data }) => {
    const name = data.name.trim();
    if (!name) throw new Error("Give your Quad a name");
    if (name.length > 80) throw new Error("Name is too long (max 80 characters)");
    const description = data.description.trim();
    if (!description) throw new Error("Add a short description");
    const privacy: QuadPrivacy = data.privacy === "private" ? "private" : "public";
    const category = data.category.trim() || "Interest";

    await ensureCatalogSeed();
    const sql = await getSql();

    // Get the creator's profile for university scoping
    const profile = await sql<{ university_id: string }>`
      select university_id from student_profiles where user_id = ${context.userId} limit 1`;
    const universityId = profile[0]?.university_id || "unilag";

    const id = `q_${crypto.randomUUID().slice(0, 10)}`;
    await sql`insert into communities (
      id, name, kind, university_id, description, cover, members,
      owner_user_id, privacy, category
    ) values (
      ${id}, ${name}, ${"Interest"}, ${universityId}, ${description},
      ${data.image ?? null}, 1, ${context.userId}, ${privacy}, ${category}
    )`;

    // Creator is the first member (owner/admin)
    await sql`insert into community_members (user_id, community_id)
      values (${context.userId}, ${id}) on conflict do nothing`;

    const rows = await sql`select * from communities where id = ${id} limit 1`;
    return mapCommunity(rows[0]);
  });

/**
 * List all Quads (student-created interest groups) with the caller's membership
 * and ownership status. Private Quads are hidden from non-members.
 */
export const listQuads = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureCatalogSeed();
    const sql = await getSql();
    const memberRows = await sql<{ community_id: string }>`
      select community_id from community_members where user_id = ${context.userId}`;
    const memberIds = new Set(memberRows.map((r) => r.community_id));

    // All student-created quads (have owner_user_id set)
    const rows = await sql`
      select * from communities where owner_user_id is not null order by created_at desc`;
    return rows
      .filter((r) => r.privacy !== "private" || memberIds.has(r.id) || r.owner_user_id === context.userId)
      .map((r) => mapQuad(r, context.userId, memberIds));
  });

/** Join a Quad. Prevents duplicate memberships. */
export const joinQuad = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((quadId: string) => quadId)
  .handler(async ({ context, data: quadId }) => {
    const sql = await getSql();
    const quad = await sql`select * from communities where id = ${quadId} limit 1`;
    if (!quad[0]) throw new Error("Quad not found");

    const existing = await sql`select 1 from community_members where user_id = ${context.userId} and community_id = ${quadId}`;
    if (existing[0]) throw new Error("You are already a member");
    await sql`insert into community_members (user_id, community_id) values (${context.userId}, ${quadId})`;
    await sql`update communities set members = members + 1 where id = ${quadId}`;
    return { joined: true as const };
  });

/** Leave a Quad. The owner cannot leave (must transfer or delete). */
export const leaveQuad = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((quadId: string) => quadId)
  .handler(async ({ context, data: quadId }) => {
    const sql = await getSql();
    const quad = await sql`select * from communities where id = ${quadId} limit 1`;
    if (!quad[0]) throw new Error("Quad not found");
    if (quad[0].owner_user_id === context.userId) {
      throw new Error("As the owner you cannot leave your own Quad");
    }
    const existing = await sql`select 1 from community_members where user_id = ${context.userId} and community_id = ${quadId}`;
    if (!existing[0]) throw new Error("You are not a member");
    await sql`delete from community_members where user_id = ${context.userId} and community_id = ${quadId}`;
    await sql`update communities set members = greatest(0, members - 1) where id = ${quadId}`;
    return { left: true as const };
  });
