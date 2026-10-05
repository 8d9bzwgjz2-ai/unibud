import { getSql } from "@/lib/db";
import {
  COMMUNITIES,
  DISCOVERY,
  LISTINGS,
  PEOPLE,
  POSTS,
  UNIVERSITIES,
} from "./catalog";

export async function ensureCatalogSeed() {
  const sql = await getSql();
  const rows = await sql<{ id: number }>`select id from catalog_seeded where id = 1`;
  if (rows.length > 0) return;

  for (const u of UNIVERSITIES) {
    await sql`insert into universities (id, name, short_name, city)
      values (${u.id}, ${u.name}, ${u.shortName}, ${u.city})
      on conflict (id) do nothing`;
  }
  for (const p of PEOPLE) {
    await sql`insert into directory_people (handle, name, university_id, program, year, bio, verified)
      values (${p.handle}, ${p.name}, ${p.universityId}, ${p.program}, ${p.year}, ${p.bio}, ${p.verified})
      on conflict (handle) do nothing`;
  }
  for (const l of LISTINGS) {
    await sql`insert into listings (
      id, kind, category, title, description, price_kobo, price_note, image, tone,
      seller_handle, university_id, location, tags, saved_count, created_at
    ) values (
      ${l.id}, ${l.kind}, ${l.category}, ${l.title}, ${l.description}, ${l.priceKobo},
      ${l.priceNote}, ${l.image ?? null}, ${l.tone}, ${l.sellerHandle}, ${l.universityId},
      ${l.location}, ${JSON.stringify(l.tags)}, ${l.savedCount}, ${l.createdAt}
    ) on conflict (id) do nothing`;
  }
  for (const c of COMMUNITIES) {
    await sql`insert into communities (id, name, kind, university_id, description, cover, members)
      values (${c.id}, ${c.name}, ${c.kind}, ${c.universityId ?? null}, ${c.description}, ${c.cover ?? null}, ${c.members})
      on conflict (id) do nothing`;
  }
  for (const p of POSTS) {
    await sql`insert into posts (id, community_id, author_handle, body, image, created_at)
      values (${p.id}, ${p.communityId}, ${p.authorHandle}, ${p.body}, ${p.image ?? null}, ${p.createdAt})
      on conflict (id) do nothing`;
    try {
      await sql`update posts set video = ${p.video ?? null}, kind = ${p.kind ?? "post"} where id = ${p.id}`;
    } catch {
      /* column arrives in 0006 */
    }
  }
  for (const d of DISCOVERY) {
    await sql`insert into discovery_items (id, kicker, title, summary, topic, image)
      values (${d.id}, ${d.kicker}, ${d.title}, ${d.summary}, ${d.topic}, ${d.image ?? null})
      on conflict (id) do nothing`;
  }
  await sql`insert into catalog_seeded (id, done) values (1, true) on conflict (id) do nothing`;
}
