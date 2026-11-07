import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Search as SearchIcon, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { EDUCATIONAL_NEWS } from "@/lib/unibud/news-data";
import { BOARD_SESSIONS } from "@/lib/unibud/board-data";
import { EDU_PODCASTS } from "@/lib/unibud/podcast-data";
import { COMMUNITIES, PEOPLE, POSTS, SAMPLE_COURSES } from "@/lib/unibud/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/search")({ component: SearchPage });

const FILTERS = ["all", "people", "communities", "classes", "posts", "learning", "news", "live", "podcasts"] as const;

function SearchPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const recent = useCampusStore((s) => s.recentSearches);
  const addSearch = useCampusStore((s) => s.addSearch);
  const clearSearches = useCampusStore((s) => s.clearSearches);
  const removeSearch = useCampusStore((s) => s.removeSearch);

  function commit(term: string) {
    setQ(term);
    addSearch(term);
  }

  const ql = q.trim().toLowerCase();
  const hits = useMemo(() => {
    if (!ql) {
      return {
        people: [],
        communities: [],
        classes: [],
        posts: [],
        courses: [],
        news: [],
        live: [],
        podcasts: [],
      };
    }
    return {
      people: PEOPLE.filter(
        (p) =>
          p.name.toLowerCase().includes(ql) ||
          p.handle.toLowerCase().includes(ql) ||
          p.program.toLowerCase().includes(ql) ||
          (p.faculty ?? "").toLowerCase().includes(ql),
      ),
      communities: COMMUNITIES.filter(
        (c) =>
          c.kind !== "Class" &&
          (c.name.toLowerCase().includes(ql) || c.description.toLowerCase().includes(ql) || c.kind.toLowerCase().includes(ql)),
      ),
      classes: COMMUNITIES.filter(
        (c) => c.kind === "Class" && (c.name.toLowerCase().includes(ql) || c.description.toLowerCase().includes(ql)),
      ),
      posts: POSTS.filter((p) => p.body.toLowerCase().includes(ql)),
      courses: SAMPLE_COURSES.filter(
        (c) => c.code.toLowerCase().includes(ql) || c.title.toLowerCase().includes(ql),
      ),
      news: EDUCATIONAL_NEWS.filter(
        (n) => n.title.toLowerCase().includes(ql) || n.body.toLowerCase().includes(ql),
      ),
      live: BOARD_SESSIONS.filter(
        (s) => s.title.toLowerCase().includes(ql) || s.course.toLowerCase().includes(ql) || s.status.includes(ql),
      ),
      podcasts: EDU_PODCASTS.filter(
        (p) => p.title.toLowerCase().includes(ql) || p.course.toLowerCase().includes(ql) || p.topic.toLowerCase().includes(ql),
      ),
    };
  }, [ql]);

  return (
    <main className="safe-bottom px-5 pt-8">
      <p className="kicker text-center">Discover UNIBUD</p>
      <h1 className="mt-3 text-center font-display text-4xl">What are you looking for?</h1>
      <div className="relative mt-8">
        <SearchIcon className="pointer-events-none absolute top-3.5 left-4 size-4 text-muted-foreground" />
        <Input
          className="pl-10"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(q);
          }}
          placeholder="People, classes, news, live, podcasts"
          autoFocus
        />
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "h-9 shrink-0 rounded-full px-4 text-sm capitalize",
              filter === f ? "bg-ink text-paper" : "bg-card text-muted-foreground ring-1 ring-border",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {!q.trim() ? (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Recent searches</h2>
            {recent.length ? (
              <button type="button" className="text-sm text-muted-foreground" onClick={clearSearches}>
                Clear all
              </button>
            ) : null}
          </div>
          <ul className="mt-2 divide-y divide-border">
            {recent.map((term) => (
              <li key={term} className="flex items-center gap-3 py-3">
                <Clock className="size-4 text-muted-foreground" />
                <button type="button" className="flex-1 text-left text-sm" onClick={() => commit(term)}>
                  {term}
                </button>
                <button type="button" aria-label="Remove" onClick={() => removeSearch(term)}>
                  <X className="size-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="mt-6 space-y-6">
          {(filter === "all" || filter === "people") && hits.people.length ? (
            <Block title="People">
              {hits.people.map((p) => (
                <Link
                  key={p.handle}
                  to="/u/$handle"
                  params={{ handle: p.handle }}
                  onClick={() => addSearch(q)}
                  className="block py-2 text-sm"
                >
                  {p.name} · @{p.handle}
                  <span className="text-muted-foreground"> · {p.program}</span>
                </Link>
              ))}
            </Block>
          ) : null}
          {(filter === "all" || filter === "communities") && hits.communities.length ? (
            <Block title="Communities">
              {hits.communities.map((c) => (
                <Link
                  key={c.id}
                  to="/communities/$id"
                  params={{ id: c.id }}
                  onClick={() => addSearch(q)}
                  className="block py-2 text-sm"
                >
                  {c.name}
                  <span className="text-muted-foreground"> · {c.kind}</span>
                </Link>
              ))}
            </Block>
          ) : null}
          {(filter === "all" || filter === "classes") && hits.classes.length ? (
            <Block title="Classes">
              {hits.classes.map((c) => (
                <Link
                  key={c.id}
                  to="/communities/$id"
                  params={{ id: c.id }}
                  onClick={() => addSearch(q)}
                  className="block py-2 text-sm"
                >
                  {c.name}
                </Link>
              ))}
            </Block>
          ) : null}
          {(filter === "all" || filter === "posts") && hits.posts.length ? (
            <Block title="Posts">
              {hits.posts.map((p) => (
                <Link key={p.id} to="/" onClick={() => addSearch(q)} className="block py-2 text-sm">
                  {p.body.slice(0, 90)}
                </Link>
              ))}
            </Block>
          ) : null}
          {(filter === "all" || filter === "learning") && (hits.courses.length || hits.podcasts.length) ? (
            <Block title="Learning">
              {hits.courses.map((c) => (
                <Link key={c.code} to="/studies" className="block py-2 text-sm">
                  {c.code} · {c.title}
                </Link>
              ))}
              {hits.podcasts.map((p) => (
                <Link key={p.id} to="/podcasts" className="block py-2 text-sm">
                  {p.title}
                </Link>
              ))}
            </Block>
          ) : null}
          {(filter === "all" || filter === "news") && hits.news.length ? (
            <Block title="News">
              {hits.news.map((n) => (
                <Link key={n.id} to="/news" className="block py-2 text-sm">
                  {n.title}
                </Link>
              ))}
            </Block>
          ) : null}
          {(filter === "all" || filter === "live") && hits.live.length ? (
            <Block title="Live · Board">
              {hits.live.map((s) => (
                <Link key={s.id} to="/board" className="block py-2 text-sm">
                  {s.title} · {s.status}
                </Link>
              ))}
            </Block>
          ) : null}
          {(filter === "all" || filter === "podcasts") && hits.podcasts.length ? (
            <Block title="Podcasts">
              {hits.podcasts.map((p) => (
                <Link key={p.id} to="/podcasts" className="block py-2 text-sm">
                  {p.title} · {p.course}
                </Link>
              ))}
            </Block>
          ) : null}
        </div>
      )}
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</p>
      <div className="mt-1">{children}</div>
    </section>
  );
}
