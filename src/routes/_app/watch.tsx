import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listCinema, publishTitle, setCinemaList } from "@/lib/cinema/server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/watch")({ component: Cinema });

const GENRES = ["Campus", "Sport", "Drama", "Comedy", "Doc"] as const;
const WASH = ["bg-union", "bg-pitch", "bg-brass text-brass-foreground", "bg-bolt", "bg-spark"] as const;

type Title = {
  id: string;
  mine: boolean;
  title: string;
  logline: string;
  genre: string;
  year: string;
  runtime: string;
  handle: string;
  listed: boolean;
  progress: number;
};

function Cinema() {
  const qc = useQueryClient();
  const shelf = useQuery({ queryKey: ["cinema"], queryFn: () => listCinema() });
  const [picked, setPicked] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const titles = shelf.data ?? [];
  const hero = titles.find((title) => title.id === picked) ?? titles.find((title) => title.progress > 0 && title.progress < 100) ?? titles[0];

  const refresh = () => qc.invalidateQueries({ queryKey: ["cinema"] });

  return (
    <main className="min-h-[70dvh] bg-screen pb-10 text-screen-foreground">
      <div className="flex items-center justify-between px-5 pt-5">
        <h1 className="font-display text-3xl text-screen-foreground">Cinema</h1>
        <button type="button" onClick={() => setPublishing((open) => !open)} className="h-10 rounded-full bg-screen-foreground px-4 text-sm font-medium text-screen">
          {publishing ? "Close" : "Publish"}
        </button>
      </div>
      {publishing ? <Publish onDone={() => { setPublishing(false); void refresh(); }} /> : null}
      {shelf.isPending ? <div className="mx-5 mt-5 h-64 animate-pulse rounded-3xl bg-screen-foreground/10" /> : null}
      {!shelf.isPending && !hero ? (
        <p className="px-5 pt-16 text-sm text-screen-foreground/70">Nothing on the shelf. Publish a title you have the right to show. There is no studio catalogue.</p>
      ) : null}
      {hero ? <Stage key={hero.id} title={hero} onChange={refresh} /> : null}
      <Row label="Continue" items={titles.filter((title) => title.progress > 0 && title.progress < 100)} onPick={setPicked} active={hero?.id} />
      <Row label="My list" items={titles.filter((title) => title.listed)} onPick={setPicked} active={hero?.id} />
      {GENRES.map((genre) => (
        <Row key={genre} label={genre} items={titles.filter((title) => title.genre === genre)} onPick={setPicked} active={hero?.id} />
      ))}
    </main>
  );
}

function Stage({ title, onChange }: { title: Title; onChange: () => Promise<void> | void }) {
  const save = useMutation({
    mutationFn: (progress: number | null) => setCinemaList({ data: { id: title.id, progress } }),
    onSuccess: () => onChange(),
  });
  const wash = WASH[title.title.length % WASH.length];
  return (
    <section className="mt-4">
      <div className={cn("relative mx-5 flex min-h-72 flex-col justify-end overflow-hidden rounded-3xl p-5", wash?.includes("text-") ? wash : `${wash} text-screen-foreground`)}>
        <p className="absolute top-4 right-5 font-display text-7xl opacity-20">{title.title.slice(0, 1)}</p>
        <p className="text-[11px] font-semibold tracking-[0.16em] uppercase">{title.genre}</p>
        <h2 className="mt-1 font-display text-4xl">{title.title}</h2>
        <p className="mt-2 max-w-md text-sm opacity-90">{title.logline}</p>
        <p className="mt-2 text-xs opacity-75">{[title.year, title.runtime, `@${title.handle}`].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="mt-4 flex gap-2 px-5">
        <button
          type="button"
          disabled={save.isPending || title.progress >= 100}
          onClick={() => save.mutate(Math.min(100, (title.progress || 0) + 12))}
          className="h-11 rounded-full bg-screen-foreground px-5 text-sm font-medium text-screen disabled:opacity-50"
        >
          {title.progress >= 100 ? "Watched" : title.progress > 0 ? "Continue" : "Start"}
        </button>
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => save.mutate(title.listed ? null : title.progress)}
          className="h-11 rounded-full px-5 text-sm ring-1 ring-screen-foreground/30"
        >
          {title.listed ? "In my list" : "My list"}
        </button>
      </div>
      <label className="mt-4 block px-5 text-xs text-screen-foreground/70">
        Your progress · {title.progress}%
        <input
          type="range"
          min={0}
          max={100}
          value={title.progress}
          onChange={(event) => save.mutate(Number(event.target.value))}
          className="mt-2 w-full accent-brass"
        />
      </label>
      <p className="mt-2 px-5 text-xs text-screen-foreground/55">No video file is attached. Progress is only a mark you keep.</p>
    </section>
  );
}

function Row({ label, items, onPick, active }: { label: string; items: Title[]; onPick: (id: string) => void; active?: string }) {
  if (!items.length) return null;
  return (
    <section className="mt-7">
      <h2 className="px-5 text-sm font-medium">{label}</h2>
      <ul className="mt-2 flex gap-3 overflow-x-auto px-5 pb-1">
        {items.map((item) => {
          const wash = WASH[item.title.length % WASH.length];
          return (
            <li key={item.id}>
              <button type="button" onClick={() => onPick(item.id)} className={cn("w-28 text-left", active === item.id && "outline outline-2 outline-offset-2 outline-brass")}>
                <span className={cn("grid aspect-[2/3] place-items-end overflow-hidden rounded-xl p-2", wash?.includes("text-") ? wash : `${wash} text-screen-foreground`)}>
                  <span className="font-display text-lg leading-tight">{item.title}</span>
                </span>
                {item.progress > 0 ? <span className="mt-1 block h-0.5 rounded-full bg-screen-foreground/20"><span className="block h-full bg-brass" style={{ width: `${item.progress}%` }} /></span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Publish({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ title: "", logline: "", genre: "Campus", year: "", runtime: "" });
  const [error, setError] = useState("");
  const post = useMutation({
    mutationFn: () => publishTitle({ data: form }),
    onSuccess: (result) => {
      if (!result.ok) setError(result.error);
      else onDone();
    },
  });
  return (
    <form
      className="mx-5 mt-4 space-y-2 rounded-3xl bg-screen-foreground/8 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        post.mutate();
      }}
    >
      <DarkField label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} />
      <label className="block text-xs">
        Logline
        <textarea value={form.logline} onChange={(event) => setForm({ ...form, logline: event.target.value })} className="mt-1 min-h-20 w-full rounded-xl bg-screen px-3 py-2 text-sm ring-1 ring-screen-foreground/20 outline-none" />
      </label>
      <label className="block text-xs">
        Genre
        <select value={form.genre} onChange={(event) => setForm({ ...form, genre: event.target.value })} className="mt-1 h-11 w-full rounded-xl bg-screen px-3 text-sm ring-1 ring-screen-foreground/20 outline-none">
          {GENRES.map((genre) => <option key={genre}>{genre}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <DarkField label="Year" value={form.year} onChange={(year) => setForm({ ...form, year })} />
        <DarkField label="Runtime" value={form.runtime} onChange={(runtime) => setForm({ ...form, runtime })} placeholder="18 min" />
      </div>
      <button type="submit" disabled={post.isPending} className="h-11 w-full rounded-full bg-brass text-sm font-semibold text-brass-foreground disabled:opacity-50">
        {post.isPending ? "Publishing…" : "Publish title"}
      </button>
      <p className="text-xs text-screen-foreground/60">Only publish what you have the right to show.</p>
      {error ? <p className="text-sm" role="status">{error}</p> : null}
    </form>
  );
}

function DarkField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block text-xs">
      {label}
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-xl bg-screen px-3 text-sm ring-1 ring-screen-foreground/20 outline-none" />
    </label>
  );
}
