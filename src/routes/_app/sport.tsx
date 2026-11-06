import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createMatch, listSport, recordScore } from "@/lib/sport/server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/sport")({ component: Sport });

function Sport() {
  const qc = useQueryClient();
  const board = useQuery({ queryKey: ["sport"], queryFn: () => listSport() });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ competition: "Campus", home: "", away: "", kickoff: "", venue: "" });
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["sport"] });
  };
  const post = useMutation({
    mutationFn: () => createMatch({ data: form }),
    onSuccess: async (result) => {
      setError(result.ok ? "" : result.error);
      if (result.ok) {
        setForm({ competition: "Campus", home: "", away: "", kickoff: "", venue: "" });
        setOpen(false);
        await refresh();
      }
    },
  });

  const matches = board.data?.matches ?? [];
  const hero = matches.find((match) => match.status === "live") ?? matches.find((match) => match.status === "fixture") ?? matches[0];
  const strip = matches.slice(0, 12);

  return (
    <main className="pb-8">
      <div className="bg-pitch text-pitch-foreground">
        <div className="flex items-end justify-between px-5 pt-5">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-pitch-foreground/70">Scores</p>
            <h1 className="font-display text-4xl">Sport</h1>
          </div>
          <button type="button" onClick={() => setOpen((value) => !value)} className="h-10 rounded-full bg-pitch-foreground px-4 text-sm font-medium text-pitch">
            {open ? "Close" : "Post fixture"}
          </button>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto px-5 pb-4">
          {!strip.length ? <p className="pb-2 text-sm text-pitch-foreground/80">No fixtures yet.</p> : null}
          {strip.map((match) => (
            <div key={match.id} className="w-36 shrink-0 rounded-2xl bg-pitch-foreground/12 px-3 py-2">
              <p className="text-[10px] tracking-wide uppercase text-pitch-foreground/70">{match.status === "live" ? "Live" : match.status === "ft" ? "FT" : "Fixture"}</p>
              <p className="mt-1 flex justify-between text-sm"><span className="truncate">{match.home}</span><span className="tabular">{match.homeScore ?? "–"}</span></p>
              <p className="flex justify-between text-sm"><span className="truncate">{match.away}</span><span className="tabular">{match.awayScore ?? "–"}</span></p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5">
        {open ? (
          <form
            className="mt-4 space-y-2 rounded-3xl bg-card p-4 ring-1 ring-border"
            onSubmit={(event) => {
              event.preventDefault();
              post.mutate();
            }}
          >
            <Field label="Competition" value={form.competition} onChange={(competition) => setForm({ ...form, competition })} />
            <Field label="Home" value={form.home} onChange={(home) => setForm({ ...form, home })} />
            <Field label="Away" value={form.away} onChange={(away) => setForm({ ...form, away })} />
            <Field label="Kickoff" value={form.kickoff} onChange={(kickoff) => setForm({ ...form, kickoff })} placeholder="Sat 16:00" />
            <Field label="Venue" value={form.venue} onChange={(venue) => setForm({ ...form, venue })} placeholder="Campus pitch" />
            <button type="submit" disabled={post.isPending} className="h-11 w-full rounded-full bg-pitch text-sm font-medium text-pitch-foreground disabled:opacity-50">
              {post.isPending ? "Posting…" : "Post fixture"}
            </button>
            {error ? <p className="text-sm text-muted-foreground" role="status">{error}</p> : null}
          </form>
        ) : null}

        {board.isPending ? <div className="mt-5 h-40 animate-pulse rounded-3xl bg-secondary" /> : null}
        {!board.isPending && !hero ? (
          <p className="mt-8 text-sm text-muted-foreground">No fixtures yet. Post one you are actually playing. Scores stay blank until you record them.</p>
        ) : null}
        {hero ? <Hero key={hero.id} match={hero} onSaved={refresh} /> : null}

        <h2 className="mt-8 font-display text-2xl">Table</h2>
        {!board.data?.table.length ? <p className="mt-2 text-sm text-muted-foreground">The table fills from full-time scores only.</p> : null}
        {board.data?.table.length ? (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-[11px] tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="py-2 font-medium">Team</th>
                <th className="py-2 text-right font-medium">P</th>
                <th className="py-2 text-right font-medium">GD</th>
                <th className="py-2 text-right font-medium">Pts</th>
              </tr>
            </thead>
            <tbody>
              {board.data.table.map((row, index) => (
                <tr key={row.team} className="border-t border-border">
                  <td className="py-2.5">{index + 1} {row.team}</td>
                  <td className="py-2.5 text-right tabular">{row.played}</td>
                  <td className="py-2.5 text-right tabular">{row.gf - row.ga}</td>
                  <td className="py-2.5 text-right font-medium tabular">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {matches.length > 1 ? (
          <>
            <h2 className="mt-8 font-display text-2xl">Fixtures</h2>
            <ul className="mt-3 divide-y divide-border">
              {matches.filter((match) => match.id !== hero?.id).map((match) => (
                <li key={match.id} className="py-3">
                  <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{match.competition} · {statusLabel(match.status)}</p>
                  <p className="mt-1 flex items-center justify-between text-sm">
                    <span>{match.home}</span>
                    <span className="tabular font-medium">{match.homeScore ?? "–"} – {match.awayScore ?? "–"}</span>
                    <span className="text-right">{match.away}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{[match.kickoff, match.venue].filter(Boolean).join(" · ") || "Time not set"}</p>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </main>
  );
}

function Hero({ match, onSaved }: { match: { id: string; mine: boolean; competition: string; home: string; away: string; homeScore: number | null; awayScore: number | null; kickoff: string; venue: string; status: string }; onSaved: () => Promise<void> }) {
  const [home, setHome] = useState(String(match.homeScore ?? 0));
  const [away, setAway] = useState(String(match.awayScore ?? 0));
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: (status: "live" | "ft") => recordScore({ data: { id: match.id, home: Number(home), away: Number(away), status } }),
    onSuccess: async (result) => {
      setError(result.ok ? "" : result.error);
      if (result.ok) await onSaved();
    },
  });
  return (
    <section className="mt-5 rounded-3xl bg-card p-5 ring-1 ring-border">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-pitch uppercase">{match.competition} · {statusLabel(match.status)}</p>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <p className="font-display text-2xl">{match.home}</p>
        <p className="tabular text-3xl font-medium">
          {match.homeScore == null ? "vs" : <>{match.homeScore}<span className="px-1 text-muted-foreground">–</span>{match.awayScore}</>}
        </p>
        <p className="text-right font-display text-2xl">{match.away}</p>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{[match.kickoff, match.venue].filter(Boolean).join(" · ") || "Kickoff not set"}</p>
      {match.mine && match.status !== "ft" ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="text-xs">
            {match.home}
            <input inputMode="numeric" value={home} onChange={(event) => setHome(event.target.value.replace(/\D/g, "").slice(0, 2))} className="mt-1 h-11 w-full rounded-xl bg-background px-3 text-center tabular ring-1 ring-border outline-none" />
          </label>
          <label className="text-xs">
            {match.away}
            <input inputMode="numeric" value={away} onChange={(event) => setAway(event.target.value.replace(/\D/g, "").slice(0, 2))} className="mt-1 h-11 w-full rounded-xl bg-background px-3 text-center tabular ring-1 ring-border outline-none" />
          </label>
          <button type="button" disabled={save.isPending} onClick={() => save.mutate("live")} className={cn("h-11 rounded-full text-sm ring-1 ring-border", save.isPending && "opacity-50")}>Live</button>
          <button type="button" disabled={save.isPending} onClick={() => save.mutate("ft")} className="h-11 rounded-full bg-pitch text-sm font-medium text-pitch-foreground disabled:opacity-50">Full time</button>
          {error ? <p className="col-span-2 text-sm text-muted-foreground" role="status">{error}</p> : null}
        </div>
      ) : null}
      {match.mine && match.status === "ft" ? <p className="mt-3 text-xs text-muted-foreground">You posted this. Full time is locked into the table.</p> : null}
    </section>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block text-xs font-medium">
      {label}
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-xl bg-background px-3 text-sm ring-1 ring-border outline-none" />
    </label>
  );
}

function statusLabel(status: string) {
  if (status === "live") return "Live";
  if (status === "ft") return "Full time";
  return "Fixture";
}
