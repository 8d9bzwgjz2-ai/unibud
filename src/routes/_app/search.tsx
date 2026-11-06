import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Search as SearchIcon, X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/unibud/empty";
import { Avatar } from "@/components/unibud/person";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { searchConnect } from "@/lib/connect/server";
import { searchBoard } from "@/lib/board/server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/search")({ component: SearchPage });

const FILTERS = ["all", "people", "classes", "groups", "study", "communities", "posts", "news"] as const;

function SearchPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const recent = useCampusStore((s) => s.recentSearches);
  const addSearch = useCampusStore((s) => s.addSearch);
  const clearSearches = useCampusStore((s) => s.clearSearches);
  const removeSearch = useCampusStore((s) => s.removeSearch);
  const lookingForPeople = filter === "all" || filter === "people";
  const lookingOnBoard = filter !== "people";
  const people = useQuery({
    queryKey: ["directory-search", q],
    queryFn: () => searchConnect({ data: { q: q.replace(/^@+/, ""), kind: "people" } }),
    enabled: lookingForPeople && q.trim().length > 0,
  });
  const board = useQuery({
    queryKey: ["board-search", q, filter],
    queryFn: () => searchBoard({ data: { q, filter } }),
    enabled: lookingOnBoard && q.trim().length > 0,
  });

  function commit(term: string) {
    setQ(term);
    addSearch(term);
  }

  const matches = people.data?.people ?? [];

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
          placeholder="Search people, classes, posts, and news"
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
        <div className="mt-6 space-y-3">
          {lookingForPeople && people.isError ? (
            <EmptyState title="People search failed" body={people.error instanceof Error ? people.error.message : "Usernames could not be searched."} />
          ) : null}
          {lookingOnBoard && board.isError ? (
            <EmptyState title="Board search failed" body={board.error instanceof Error ? board.error.message : "Classes, posts, and news could not be searched."} />
          ) : null}
          {lookingForPeople && people.isPending ? <div className="h-24 animate-pulse rounded-2xl bg-secondary" /> : null}
          {lookingOnBoard && (board.data?.rooms.length ?? 0) > 0 ? <p className="pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Board rooms</p> : null}
          {(board.data?.rooms ?? []).map((room) => (
            <Link key={room.id} to="/board/room/$id" params={{ id: room.id }} className="block rounded-2xl bg-card p-4 ring-1 ring-border">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{room.kind}</p>
              <p className="mt-1 font-medium">{room.title}</p>
              {room.subtitle ? <p className="text-sm text-muted-foreground">{room.subtitle}</p> : null}
            </Link>
          ))}
          {(board.data?.posts ?? []).length ? <p className="pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Posts</p> : null}
          {(board.data?.posts ?? []).map((post) => (
            <Link key={post.id} to="/board" className="block rounded-2xl bg-card p-4 ring-1 ring-border">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Post · @{post.handle}</p>
              <p className="mt-1 text-sm">{post.body}</p>
            </Link>
          ))}
          {(board.data?.news ?? []).length ? <p className="pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">News</p> : null}
          {(board.data?.news ?? []).map((item) => (
            <Link key={item.id} to="/news" className="block rounded-2xl bg-card p-4 ring-1 ring-border">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">News · @{item.handle}</p>
              <p className="mt-1 font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.body}</p>
            </Link>
          ))}
          {lookingForPeople && matches.length ? <p className="pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">People</p> : null}
          {lookingForPeople
            ? matches.map((person) => (
                <Link
                  key={person.userId}
                  to="/connect/people/$handle"
                  params={{ handle: person.handle }}
                  className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border"
                >
                  <Avatar name={person.displayName || person.handle} className="size-12" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{person.displayName || person.handle}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{person.handle}
                      {person.username && person.username !== person.handle ? ` · @${person.username}` : ""}
                    </p>
                  </div>
                </Link>
              ))
            : null}
          {lookingForPeople && people.data && !matches.length && filter === "people" ? (
            <EmptyState title="No people found" body="No discoverable account matched that username." />
          ) : null}
          {filter === "all" && people.data && board.data && !matches.length && !board.data.rooms.length && !board.data.posts.length && !board.data.news.length ? (
            <EmptyState title="No matches" body="No person, room, post, or notice matched that search." />
          ) : null}
          {lookingOnBoard && board.data && !board.data.rooms.length && !board.data.posts.length && !board.data.news.length && !lookingForPeople ? (
            <EmptyState title="Nothing on Board" body="Classes, communities, posts, and news only appear after someone starts them on Board." />
          ) : null}
        </div>
      )}
    </main>
  );
}