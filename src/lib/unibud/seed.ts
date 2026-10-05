import { getSql } from "@/lib/db";
import { COMMUNITIES, UNIVERSITIES } from "./catalog";

/**
 * Reality First: only structural reference data is seeded — real universities and
 * the empty campus spaces (communities, 0 members). No people, posts, listings or
 * discovery records are ever invented.
 */
export async function ensureCatalogSeed() {
  const sql = await getSql();
  const rows = await sql<{ id: number }>`select id from catalog_seeded where id = 1`;
  if (rows.length > 0) return;

  for (const u of UNIVERSITIES) {
    await sql`insert into universities (id, name, short_name, city)
      values (${u.id}, ${u.name}, ${u.shortName}, ${u.city})
      on conflict (id) do nothing`;
  }
  for (const c of COMMUNITIES) {
    await sql`insert into communities (id, name, kind, university_id, description, cover, members)
      values (${c.id}, ${c.name}, ${c.kind}, ${c.universityId ?? null}, ${c.description}, ${c.cover ?? null}, 0)
      on conflict (id) do nothing`;
  }
  await sql`insert into catalog_seeded (id, done) values (1, true) on conflict (id) do nothing`;
}
