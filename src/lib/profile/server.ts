import { createServerFn } from "@tanstack/react-start";
import { appAccessMiddleware } from "@/lib/account/guard";
import { getSql } from "@/lib/db";

export const getSocialCard = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const accounts = await sql<{
      first_name: string;
      last_name: string;
      username: string;
      bio: string;
      photo_url: string;
      institution: string;
      course: string;
    }>`select first_name, last_name, username, bio, photo_url, institution, course from unibud_accounts where user_id = ${context.userId} limit 1`;
    const account = accounts[0];
    const profiles = await sql<{ display_name: string; handle: string; bio: string }>`
      select display_name, handle, bio from connect_profiles where user_id = ${context.userId} limit 1`;
    const followers = await sql<{ n: number }>`select count(*)::int as n from connect_follows where followed_id = ${context.userId} and status = ${"active"}`;
    const following = await sql<{ n: number }>`select count(*)::int as n from connect_follows where follower_id = ${context.userId} and status = ${"active"}`;
    const posts = await sql<{ id: string; body: string; image: string | null }>`
      select id, body, image from board_posts where author_id = ${context.userId} order by created_at desc limit 60`;
    const highlights = await sql<{ id: string; name: string; cover: string }>`
      select id, name, cover from profile_highlights where user_id = ${context.userId} order by created_at asc`;
    const name = profiles[0]?.display_name || (account ? `${account.first_name} ${account.last_name}`.trim() : "You");
    return {
      name,
      handle: profiles[0]?.handle || account?.username || "you",
      bio: profiles[0]?.bio || account?.bio || "",
      photoUrl: account?.photo_url && account.photo_url !== "initials" ? account.photo_url : "",
      institution: account?.institution ?? "",
      course: account?.course ?? "",
      posts: posts.length,
      followers: Number(followers[0]?.n ?? 0),
      following: Number(following[0]?.n ?? 0),
      grid: posts,
      highlights,
    };
  });

export const saveSocialCard = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { name: string; bio: string; photoUrl?: string }) => input)
  .handler(async ({ context, data }) => {
    const name = data.name.trim().slice(0, 80);
    if (name.length < 2) return { ok: false as const, error: "Add the name on your profile." };
    const bio = data.bio.trim().slice(0, 280);
    const photo = (data.photoUrl ?? "").trim().slice(0, 400_000);
    const sql = await getSql();
    const parts = name.split(/\s+/);
    const first = parts[0] ?? name;
    const last = parts.slice(1).join(" ");
    if (photo) {
      await sql`update unibud_accounts set first_name = ${first}, last_name = ${last}, bio = ${bio}, photo_url = ${photo}, updated_at = now() where user_id = ${context.userId}`;
    } else {
      await sql`update unibud_accounts set first_name = ${first}, last_name = ${last}, bio = ${bio}, updated_at = now() where user_id = ${context.userId}`;
    }
    await sql`update connect_profiles set display_name = ${name}, bio = ${bio}, updated_at = now() where user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const createHighlight = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { name: string; cover?: string }) => input)
  .handler(async ({ context, data }) => {
    const name = data.name.trim().slice(0, 24);
    if (name.length < 1) return { ok: false as const, error: "Name the highlight first." };
    const cover = (data.cover ?? "").slice(0, 400_000);
    const sql = await getSql();
    const count = await sql<{ n: number }>`select count(*)::int as n from profile_highlights where user_id = ${context.userId}`;
    if (Number(count[0]?.n ?? 0) >= 12) return { ok: false as const, error: "Twelve highlights is the limit." };
    const id = crypto.randomUUID();
    await sql`insert into profile_highlights (id, user_id, name, cover) values (${id}, ${context.userId}, ${name}, ${cover})`;
    return { ok: true as const, id };
  });

export const removeHighlight = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from profile_highlights where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });
