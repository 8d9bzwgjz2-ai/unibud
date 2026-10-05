import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureCatalogSeed } from "./seed";
import {
  mapCommunity,
  mapDiscovery,
  mapListing,
  mapNote,
  mapPerson,
  mapPost,
  mapPostReply,
  mapProfile,
  mapUni,
} from "./map";
import type { ListingCategory, ListingKind, StudentProfile } from "./types";
import { canTeach, type CampusRole } from "./roles";

export const getCampusCatalog = createServerFn({ method: "GET" }).handler(
  async () => {
    await ensureCatalogSeed();
    const sql = await getSql();
    const universities = (await sql`select * from universities order by name`).map(mapUni);
    const people = (await sql`select * from directory_people order by name`).map(mapPerson);
    const listings = (
      await sql`select * from listings order by created_at desc`
    ).map(mapListing);
    const communities = (await sql`select * from communities order by members desc`).map(
      mapCommunity,
    );
    const posts = (
      await sql`select * from posts order by created_at desc limit 80`
    ).map(mapPost);
    const discovery = (await sql`select * from discovery_items`).map(mapDiscovery);
    let replies: ReturnType<typeof mapPostReply>[] = [];
    try {
      replies = (await sql`select * from post_replies order by created_at asc limit 800`).map((r) =>
        mapPostReply(r as Parameters<typeof mapPostReply>[0]),
      );
    } catch {
      replies = [];
    }
    return { universities, people, listings, communities, posts, discovery, replies };
  },
);

export const getListing = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    await ensureCatalogSeed();
    const sql = await getSql();
    const rows = await sql`select * from listings where id = ${id} limit 1`;
    const listing = rows[0] ? mapListing(rows[0]) : null;
    if (!listing) return null;
    const sellerRows = await sql`select * from directory_people where handle = ${listing.sellerHandle} limit 1`;
    const seller = sellerRows[0] ? mapPerson(sellerRows[0]) : null;
    const related = (
      await sql`select * from listings where category = ${listing.category} and id <> ${id} order by saved_count desc limit 4`
    ).map(mapListing);
    return { listing, seller, related };
  });

export const searchCampus = createServerFn({ method: "GET" })
  .validator((q: string) => q.trim().toLowerCase())
  .handler(async ({ data: q }) => {
    await ensureCatalogSeed();
    if (!q) return { listings: [], people: [], communities: [] };
    const sql = await getSql();
    const like = `%${q}%`;
    const listings = (
      await sql`select * from listings where lower(title) like ${like} or lower(description) like ${like} or lower(category) like ${like} limit 12`
    ).map(mapListing);
    const people = (
      await sql`select * from directory_people where lower(name) like ${like} or lower(handle) like ${like} limit 8`
    ).map(mapPerson);
    const communities = (
      await sql`select * from communities where lower(name) like ${like} or lower(description) like ${like} limit 8`
    ).map(mapCommunity);
    return { listings, people, communities };
  });

export const listByCategory = createServerFn({ method: "GET" })
  .validator((category: ListingCategory | "all") => category)
  .handler(async ({ data: category }) => {
    await ensureCatalogSeed();
    const sql = await getSql();
    const rows =
      category === "all"
        ? await sql`select * from listings order by created_at desc`
        : await sql`select * from listings where category = ${category} order by created_at desc`;
    return rows.map(mapListing);
  });

async function handleFromName(name: string, userId: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 12) || "student";
  return `${base}${userId.slice(-4)}`;
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureCatalogSeed();
    const sql = await getSql();
    const rows = await sql`select * from student_profiles where user_id = ${context.userId} limit 1`;
    if (rows[0]) return mapProfile(rows[0]);
    return null;
  });

export const upsertMyProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Partial<StudentProfile> & { displayName?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const existing = await sql`select * from student_profiles where user_id = ${context.userId} limit 1`;
    const existingProfile = existing[0] ? mapProfile(existing[0]) : null;
    const displayName =
      (data.displayName ?? existingProfile?.displayName ?? "Student").trim() || "Student";
    const handle =
      data.handle?.replace(/[^a-z0-9_]/gi, "").toLowerCase() ||
      existingProfile?.handle ||
      (await handleFromName(displayName, context.userId));
    const universityId = data.universityId || existingProfile?.universityId || "unilag";
    const program = data.program ?? existingProfile?.program ?? "";
    const year = data.year ?? existingProfile?.year ?? "";
    const bio = data.bio ?? existingProfile?.bio ?? "";
    const campusRole = data.campusRole ?? existingProfile?.campusRole ?? "student";
    const onboardingDone = data.onboardingDone ?? existingProfile?.onboardingDone ?? false;
    if (existing[0]) {
      await sql`update student_profiles set display_name = ${displayName}, handle = ${handle},
        university_id = ${universityId}, program = ${program}, year = ${year}, bio = ${bio},
        campus_role = ${campusRole}, onboarding_done = ${onboardingDone}
        where user_id = ${context.userId}`;
    } else {
      await sql`insert into student_profiles (user_id, display_name, handle, university_id, program, year, bio, campus_role, onboarding_done)
        values (${context.userId}, ${displayName}, ${handle}, ${universityId}, ${program}, ${year}, ${bio}, ${campusRole}, ${onboardingDone})`;
    }
    const rows = await sql`select * from student_profiles where user_id = ${context.userId} limit 1`;
    return mapProfile(rows[0]);
  });

export const toggleSave = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { kind: string; itemId: string; title: string; href: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const existing = await sql`select item_id from saves where user_id = ${context.userId} and kind = ${data.kind} and item_id = ${data.itemId}`;
    if (existing[0]) {
      await sql`delete from saves where user_id = ${context.userId} and kind = ${data.kind} and item_id = ${data.itemId}`;
      return { saved: false };
    }
    await sql`insert into saves (user_id, kind, item_id, title, href) values (${context.userId}, ${data.kind}, ${data.itemId}, ${data.title}, ${data.href})`;
    return { saved: true };
  });

export const listSaves = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<{
      kind: string;
      item_id: string;
      title: string;
      href: string;
    }>`select kind, item_id, title, href from saves where user_id = ${context.userId} order by created_at desc`;
  });

export async function notify(
  userId: string,
  kind: string,
  title: string,
  body: string,
  href?: string,
) {
  const sql = await getSql();
  await sql`insert into notifications (id, user_id, kind, title, body, href)
    values (${crypto.randomUUID()}, ${userId}, ${kind}, ${title}, ${body}, ${href ?? null})`;
}

export const createListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      kind: ListingKind;
      category: ListingCategory;
      title: string;
      description: string;
      priceKobo: number;
      priceNote: string;
      location: string;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const title = data.title.trim();
    if (!title) throw new Error("Give it a title");
    const sql = await getSql();
    const profile = await sql<{ handle: string; university_id: string }>`
      select handle, university_id from student_profiles where user_id = ${context.userId} limit 1`;
    const handle = profile[0]?.handle || "you";
    const universityId = profile[0]?.university_id || "unilag";
    const id = `l_${crypto.randomUUID().slice(0, 8)}`;
    await sql`insert into listings (
      id, owner_user_id, kind, category, title, description, price_kobo, price_note,
      tone, seller_handle, university_id, location, tags
    ) values (
      ${id}, ${context.userId}, ${data.kind}, ${data.category}, ${title}, ${data.description.trim()},
      ${data.priceKobo}, ${data.priceNote}, ${"ink"}, ${handle}, ${universityId},
      ${data.location.trim() || "Campus"}, ${"[]"}
    )`;
    const rows = await sql`select * from listings where id = ${id} limit 1`;
    return mapListing(rows[0]);
  });

export const listNotes = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql`select * from notifications where user_id = ${context.userId} order by created_at desc limit 40`;
    return rows.map(mapNote);
  });

/** Server gate for Tutor Mode. Class Governor does not pass. */
export const requireLecturer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ campus_role?: string }>`
      select campus_role from student_profiles where user_id = ${context.userId} limit 1`;
    const role = (rows[0]?.campus_role ?? "student") as CampusRole;
    if (!canTeach(role)) throw new Error("Only lecturers can use Tutor Mode.");
    return { ok: true as const };
  });

export const getMySquareState = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    let liked: string[] = [];
    let commentLiked: string[] = [];
    try {
      liked = (
        await sql<{ post_id: string }>`select post_id from post_likes where user_id = ${context.userId}`
      ).map((r) => r.post_id);
      commentLiked = (
        await sql<{ reply_id: string }>`select reply_id from comment_likes where user_id = ${context.userId}`
      ).map((r) => r.reply_id);
    } catch {
      liked = [];
      commentLiked = [];
    }
    const saved = (
      await sql<{ item_id: string }>`select item_id from saves where user_id = ${context.userId} and kind = ${"post"}`
    ).map((r) => r.item_id);
    return { liked, saved, commentLiked };
  });

export const togglePostLike = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((postId: string) => postId)
  .handler(async ({ context, data: postId }) => {
    const sql = await getSql();
    const existing = await sql`select post_id from post_likes where user_id = ${context.userId} and post_id = ${postId}`;
    if (existing[0]) {
      await sql`delete from post_likes where user_id = ${context.userId} and post_id = ${postId}`;
      return { liked: false };
    }
    await sql`insert into post_likes (user_id, post_id) values (${context.userId}, ${postId})`;
    return { liked: true };
  });

export const addSquareReply = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { postId: string; body: string; parentId?: string }) => input)
  .handler(async ({ context, data }) => {
    const body = data.body.trim();
    if (!body) throw new Error("Write a reply first");
    const sql = await getSql();
    const profile = await sql<{ handle: string }>`select handle from student_profiles where user_id = ${context.userId} limit 1`;
    const handle = profile[0]?.handle || "you";
    const id = `pr_${crypto.randomUUID().slice(0, 10)}`;
    await sql`insert into post_replies (id, post_id, user_id, author_handle, parent_id, body)
      values (${id}, ${data.postId}, ${context.userId}, ${handle}, ${data.parentId ?? null}, ${body})`;
    return { id, postId: data.postId, authorHandle: handle, parentId: data.parentId, body, createdAt: new Date().toISOString() };
  });

export const toggleCommentLike = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((replyId: string) => replyId)
  .handler(async ({ context, data: replyId }) => {
    const sql = await getSql();
    const existing = await sql`select reply_id from comment_likes where user_id = ${context.userId} and reply_id = ${replyId}`;
    if (existing[0]) {
      await sql`delete from comment_likes where user_id = ${context.userId} and reply_id = ${replyId}`;
      return { liked: false };
    }
    await sql`insert into comment_likes (user_id, reply_id) values (${context.userId}, ${replyId})`;
    return { liked: true };
  });

