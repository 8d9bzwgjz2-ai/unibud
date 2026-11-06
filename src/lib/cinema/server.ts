import { createServerFn } from "@tanstack/react-start";
import { appAccessMiddleware } from "@/lib/account/guard";
import { getSql } from "@/lib/db";

const GENRES = new Set(["Campus", "Sport", "Drama", "Comedy", "Doc"]);

function clean(value: string, max: number) {
  return value.trim().slice(0, max);
}

export const listCinema = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      owner_id: string;
      title: string;
      logline: string;
      genre: string;
      year_text: string;
      runtime_text: string;
      handle: string;
      progress: number | null;
    }>`
      select t.id, t.owner_id, t.title, t.logline, t.genre, t.year_text, t.runtime_text,
        coalesce(nullif(p.handle, ''), a.username, 'member') as handle,
        l.progress
      from cinema_titles t
      left join unibud_accounts a on a.user_id = t.owner_id
      left join connect_profiles p on p.user_id = t.owner_id
      left join cinema_list l on l.title_id = t.id and l.user_id = ${context.userId}
      order by t.created_at desc
      limit 80`;
    return rows.map((row) => ({
      id: row.id,
      mine: row.owner_id === context.userId,
      title: row.title,
      logline: row.logline,
      genre: row.genre,
      year: row.year_text,
      runtime: row.runtime_text,
      handle: row.handle,
      listed: row.progress != null,
      progress: row.progress == null ? 0 : Number(row.progress),
    }));
  });

export const publishTitle = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { title: string; logline: string; genre: string; year: string; runtime: string }) => input)
  .handler(async ({ context, data }) => {
    const title = clean(data.title, 80);
    const logline = clean(data.logline, 280);
    if (title.length < 2) return { ok: false as const, error: "Name the title." };
    if (logline.length < 2) return { ok: false as const, error: "Write a logline. Only publish what you have the right to show." };
    const genre = GENRES.has(data.genre) ? data.genre : "Campus";
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`insert into cinema_titles (id, owner_id, title, logline, genre, year_text, runtime_text)
      values (${id}, ${context.userId}, ${title}, ${logline}, ${genre}, ${clean(data.year, 8)}, ${clean(data.runtime, 16)})`;
    return { ok: true as const, id };
  });

export const setCinemaList = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { id: string; progress: number | null }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`select id from cinema_titles where id = ${data.id} limit 1`;
    if (!rows[0]) return { ok: false as const, error: "That title is gone." };
    if (data.progress == null) {
      await sql`delete from cinema_list where user_id = ${context.userId} and title_id = ${data.id}`;
      return { ok: true as const };
    }
    const progress = Math.max(0, Math.min(100, Math.round(data.progress)));
    await sql`insert into cinema_list (user_id, title_id, progress) values (${context.userId}, ${data.id}, ${progress})
      on conflict (user_id, title_id) do update set progress = excluded.progress`;
    return { ok: true as const };
  });
