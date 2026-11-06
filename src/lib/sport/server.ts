import { createServerFn } from "@tanstack/react-start";
import { appAccessMiddleware } from "@/lib/account/guard";
import { getSql } from "@/lib/db";

function clean(value: string, max: number) {
  return value.trim().slice(0, max);
}

export const listSport = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      owner_id: string;
      competition: string;
      home_name: string;
      away_name: string;
      home_score: number | null;
      away_score: number | null;
      kickoff: string;
      venue: string;
      status: string;
    }>`
      select id, owner_id, competition, home_name, away_name, home_score, away_score, kickoff, venue, status
      from sport_matches order by created_at desc limit 60`;
    const matches = rows.map((row) => ({
      id: row.id,
      mine: row.owner_id === context.userId,
      competition: row.competition,
      home: row.home_name,
      away: row.away_name,
      homeScore: row.home_score == null ? null : Number(row.home_score),
      awayScore: row.away_score == null ? null : Number(row.away_score),
      kickoff: row.kickoff,
      venue: row.venue,
      status: row.status === "live" || row.status === "ft" ? row.status : "fixture",
    }));
    const table = new Map<string, { team: string; played: number; points: number; gf: number; ga: number }>();
    for (const match of matches) {
      if (match.status !== "ft" || match.homeScore == null || match.awayScore == null) continue;
      for (const side of [match.home, match.away]) {
        if (!table.has(side)) table.set(side, { team: side, played: 0, points: 0, gf: 0, ga: 0 });
      }
      const home = table.get(match.home)!;
      const away = table.get(match.away)!;
      home.played += 1;
      away.played += 1;
      home.gf += match.homeScore;
      home.ga += match.awayScore;
      away.gf += match.awayScore;
      away.ga += match.homeScore;
      if (match.homeScore > match.awayScore) home.points += 3;
      else if (match.homeScore < match.awayScore) away.points += 3;
      else {
        home.points += 1;
        away.points += 1;
      }
    }
    return {
      matches,
      table: [...table.values()].sort((a, b) => b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || a.team.localeCompare(b.team)),
    };
  });

export const createMatch = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { competition: string; home: string; away: string; kickoff: string; venue: string }) => input)
  .handler(async ({ context, data }) => {
    const home = clean(data.home, 40);
    const away = clean(data.away, 40);
    if (home.length < 2 || away.length < 2) return { ok: false as const, error: "Name both sides." };
    if (home.toLowerCase() === away.toLowerCase()) return { ok: false as const, error: "The two sides have to be different." };
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`insert into sport_matches (id, owner_id, competition, home_name, away_name, kickoff, venue, status)
      values (${id}, ${context.userId}, ${clean(data.competition, 40) || "Campus"}, ${home}, ${away}, ${clean(data.kickoff, 40)}, ${clean(data.venue, 60)}, ${"fixture"})`;
    return { ok: true as const, id };
  });

export const recordScore = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((input: { id: string; home: number; away: number; status: "live" | "ft" }) => input)
  .handler(async ({ context, data }) => {
    if (!Number.isInteger(data.home) || !Number.isInteger(data.away) || data.home < 0 || data.away < 0 || data.home > 30 || data.away > 30) {
      return { ok: false as const, error: "Enter a real score." };
    }
    const sql = await getSql();
    const rows = await sql<{ owner_id: string }>`select owner_id from sport_matches where id = ${data.id} limit 1`;
    if (rows[0]?.owner_id !== context.userId) return { ok: false as const, error: "Only the person who posted the fixture can record the score." };
    const status = data.status === "live" ? "live" : "ft";
    await sql`update sport_matches set home_score = ${data.home}, away_score = ${data.away}, status = ${status} where id = ${data.id}`;
    return { ok: true as const };
  });
