import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Avatar, PersonMeta } from "@/components/unibud/person";
import { RelationActions } from "@/components/unibud/relation-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PEOPLE, uniById } from "@/lib/unibud/catalog";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { academicLine, proximityScore, sharedContext } from "@/lib/unibud/identity";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/connect")({ component: Connect });

type Tab = "discover" | "requests" | "sent" | "connections" | "following" | "followers";

function Connect() {
  const [tab, setTab] = useState<Tab>("discover");
  const [q, setQ] = useState("");
  const incoming = useCampusStore((s) => s.incoming);
  const outgoing = useCampusStore((s) => s.outgoing);
  const connections = useCampusStore((s) => s.connections);
  const following = useCampusStore((s) => s.following);
  const followers = useCampusStore((s) => s.followers);
  const accept = useCampusStore((s) => s.accept);
  const decline = useCampusStore((s) => s.decline);
  const cancelRequest = useCampusStore((s) => s.cancelRequest);
  const homeCampusId = useCampusStore((s) => s.homeCampusId);
  const faculty = useCampusStore((s) => s.faculty);
  const department = useCampusStore((s) => s.department);
  const lens = {
    universityId: homeCampusId || "unilag",
    program: "Computer Engineering",
    year: "300",
    faculty,
    department,
  };

  const filtered = useMemo(
    () =>
      PEOPLE.filter((p) => {
        const hay = `${p.name} ${p.handle} ${p.program} ${p.year} ${p.universityId} ${p.faculty ?? ""} ${p.department ?? ""}`.toLowerCase();
        return !q.trim() || hay.includes(q.toLowerCase());
      }),
    [q],
  );

  const list =
    tab === "requests"
      ? PEOPLE.filter((p) => incoming.includes(p.handle))
      : tab === "sent"
        ? PEOPLE.filter((p) => outgoing.includes(p.handle))
        : tab === "connections"
          ? PEOPLE.filter((p) => connections.includes(p.handle))
          : tab === "following"
            ? PEOPLE.filter((p) => following.includes(p.handle))
            : tab === "followers"
              ? PEOPLE.filter((p) => followers.includes(p.handle))
              : filtered;

  const suggested = [...filtered].sort((a, b) => proximityScore(b, connections, lens) - proximityScore(a, connections, lens));
  const shown = tab === "discover" ? suggested : list;

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">People</p>
      <h1 className="mt-1 font-display text-4xl">Connect</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Find people you would not normally meet — same interests, other cities, other schools.
        Connect is mutual. Follow is one-way.
      </p>
      <div className="mt-5">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people, programmes, places, interests"
          aria-label="Search students"
        />
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["discover", "Discover"],
            ["requests", "Requests"],
            ["sent", "Sent"],
            ["connections", "Connections"],
            ["following", "Following"],
            ["followers", "Followers"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "relative h-9 shrink-0 rounded-full px-4 text-sm font-medium",
              tab === id ? "bg-ink text-paper" : "bg-card text-muted-foreground ring-1 ring-border",
            )}
          >
            {label}
            {id === "requests" && incoming.length ? (
              <span className="ml-1 inline-flex min-w-4 justify-center rounded-full bg-bud px-1 text-[10px] text-bud-foreground">
                {incoming.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "discover" ? (
        <section className="mt-5 rounded-3xl bg-ink px-6 py-7 text-paper">
          <p className="kicker text-bud">People you may never have met</p>
          <h2 className="mt-3 font-display text-3xl text-paper">Same interests beat same postcode.</h2>
          <p className="mt-3 text-sm text-paper/70">
            Robotics in Nairobi. Physics in Johannesburg. Language exchange. Builders, players, and
            people who like the same strange things you like.
          </p>
        </section>
      ) : null}

      {tab === "discover" ? (
        <div className="mt-5 grid gap-3">
          <Lane title="Creators" handles={PEOPLE.filter((p) => p.tags?.includes("creator")).map((p) => p.handle)} />
        </div>
      ) : null}

      <ul className="mt-5 space-y-3">
        {shown.map((p) => {
          const uni = uniById(p.universityId);
          const ctx = sharedContext(p, lens);
          const mutuals = connections.filter((h) => h !== p.handle).slice(0, 2);
          return (
            <li key={p.handle} className="rounded-2xl bg-card p-3 ring-1 ring-border">
              <div className="flex items-center gap-3">
                <Link to="/u/$handle" params={{ handle: p.handle }}>
                  <Avatar name={p.name} className="size-12" />
                </Link>
                <Link to="/u/$handle" params={{ handle: p.handle }} className="min-w-0 flex-1">
                  <PersonMeta person={p} compact />
                  <p className="truncate text-xs text-muted-foreground">
                    {uni?.shortName} · {academicLine(p)}
                  </p>
                  {ctx.items.length ? (
                    <p className="text-[11px] text-muted-foreground">{ctx.items.join(" · ")}</p>
                  ) : null}
                  {mutuals.length ? (
                    <p className="text-[11px] text-muted-foreground">
                      Mutual: {mutuals.map((h) => `@${h}`).join(", ")}
                    </p>
                  ) : null}
                </Link>
              </div>
              <div className="mt-3">
                {tab === "requests" ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => accept(p.handle)}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => decline(p.handle)}>
                      Decline
                    </Button>
                  </div>
                ) : tab === "sent" ? (
                  <Button size="sm" variant="outline" onClick={() => cancelRequest(p.handle)}>
                    Pending · Cancel
                  </Button>
                ) : (
                  <RelationActions handle={p.handle} />
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {shown.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {tab === "discover" || tab === "all"
            ? "No other students have joined yet. People appear here when real accounts sign up."
            : "Nobody in this list yet."}
        </p>
      ) : null}
    </main>
  );
}

function Lane({ title, handles }: { title: string; handles: string[] }) {
  const people = handles.map((h) => PEOPLE.find((p) => p.handle === h)).filter(Boolean);
  if (!people.length) return null;
  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      <ul className="mt-3 space-y-3">
        {people.map((p) => (
          <li key={p!.handle} className="flex items-center gap-3">
            <Link to="/u/$handle" params={{ handle: p!.handle }}>
              <Avatar name={p!.name} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p!.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                @{p!.handle} · {p!.bio}
              </p>
            </div>
            <RelationActions handle={p!.handle} />
          </li>
        ))}
      </ul>
    </section>
  );
}
