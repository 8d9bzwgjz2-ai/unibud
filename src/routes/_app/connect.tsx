import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Compass, MessageCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/unibud/person";
import { EmptyState } from "@/components/unibud/empty";
import { MessageLink } from "@/components/unibud/message-link";
import { Input } from "@/components/ui/input";
import {
  getMyConnectProfile,
  listConnectRelations,
  respondConnection,
  saveConnectProfile,
  searchConnect,
  type ConnectProfile,
} from "@/lib/connect/server";
import { relativeTime } from "@/lib/unibud/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/connect")({ component: Connect });

type Tab = "explore" | "requests" | "sent" | "connections";
type Filter = "all" | "campus" | "photo" | "open";

const EMPTY_PROFILE: Omit<ConnectProfile, "userId" | "verified"> = {
  displayName: "",
  handle: "",
  bio: "",
  institution: "",
  course: "",
  roleTitle: "",
  location: "",
  interests: "",
  skills: "",
  showInstitution: true,
  showCourse: true,
  showLocation: false,
  showInterests: true,
  discoverable: false,
  followerApproval: false,
  allowRequests: true,
  allowMessages: true,
  notifyRequests: true,
  notifyFollows: true,
};

function Connect() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [tab, setTab] = useState<Tab>("explore");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const relations = useQuery({ queryKey: ["connect-relations"], queryFn: () => listConnectRelations() });
  const incoming = relations.data?.incoming.length ?? 0;
  if (pathname !== "/connect" && pathname !== "/connect/") return <Outlet />;

  return (
    <main className="safe-bottom bg-paper px-4 pt-4 text-ink">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-blush">Explore</p>
          <h1 className="font-sans text-4xl font-semibold tracking-tight">Connect</h1>
        </div>
        <button type="button" className="h-10 rounded-full bg-secondary px-4 text-sm font-semibold" onClick={() => setEditing((value) => !value)}>{editing ? "Close" : "You"}</button>
      </div>
      <SearchBox q={q} setQ={setQ} setDebounced={setDebounced} />
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Connect">
        {(
          [
            ["explore", "Explore"],
            ["requests", incoming ? `Requests ${incoming}` : "Requests"],
            ["sent", "Sent"],
            ["connections", "Connections"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn("h-9 shrink-0 rounded-full px-4 text-sm font-semibold", tab === id ? "bg-ink text-paper" : "bg-secondary text-muted-foreground")}
          >
            {label}
          </button>
        ))}
      </div>
      {editing ? <ProfileCard /> : null}
      {tab === "explore" && !editing ? <Discover q={debounced} filter={filter} setFilter={setFilter} /> : null}
      {tab === "requests" ? <RelationList mode="incoming" /> : null}
      {tab === "sent" ? <RelationList mode="sent" /> : null}
      {tab === "connections" ? <RelationList mode="connections" query={debounced} /> : null}
    </main>
  );
}

function SearchBox({ q, setQ, setDebounced }: { q: string; setQ: (value: string) => void; setDebounced: (value: string) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(q.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [q, setDebounced]);
  return (
    <div className="relative mt-5">
      <Search className="pointer-events-none absolute top-3.5 left-4 size-4 text-muted-foreground" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people by name or @handle" aria-label="Search people" className="h-12 pl-11" />
    </div>
  );
}

function Discover({ q, filter, setFilter }: { q: string; filter: Filter; setFilter: (value: Filter) => void }) {
  const mine = useQuery({ queryKey: ["connect-me"], queryFn: () => getMyConnectProfile() });
  const search = useQuery({
    queryKey: ["connect-search", q, "people"],
    queryFn: () => searchConnect({ data: { q, kind: "people" } }),
  });
  const people = (search.data?.people ?? []).filter((person) => {
    if (filter === "campus") return Boolean(mine.data?.institution) && person.institution.toLowerCase() === mine.data?.institution.toLowerCase();
    if (filter === "photo") return Boolean(person.photo);
    if (filter === "open") return person.allowMessages;
    return true;
  });
  const filters = [
    ["all", "Everyone"],
    ["campus", "Your campus"],
    ["photo", "With a photo"],
    ["open", "Open to chat"],
  ] as const;
  return (
    <section className="mt-4">
      {!q ? (
        <div className="grid grid-cols-2 gap-3">
          <Link to="/connect/soulync" className="col-span-2 flex h-36 flex-col justify-end rounded-3xl bg-ink p-4 text-paper ring-1 ring-brass/60">
            <span className="text-[10px] font-semibold tracking-[0.22em] text-brass uppercase">Discreet</span>
            <span className="soul-word mt-1 text-5xl leading-none text-brass">SouLync</span>
            <span className="text-sm text-paper/75">Only people who turn it on. A match is both of you.</span>
          </Link>
          <Link to="/connect/wayward" className="flex h-28 flex-col justify-end rounded-3xl bg-ink p-4 text-paper">
            <Compass className="size-5" />
            <span className="mt-2 font-sans text-lg font-semibold">Wayward</span>
          </Link>
          <Link to="/messages" className="flex h-28 flex-col justify-end rounded-3xl bg-bolt p-4 text-spark-foreground">
            <MessageCircle className="size-5" />
            <span className="mt-2 font-sans text-lg font-semibold">Chat</span>
          </Link>
        </div>
      ) : null}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {filters.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setFilter(id)} className={cn("h-9 shrink-0 rounded-full px-4 text-sm font-semibold", filter === id ? "bg-spark text-spark-foreground" : "bg-secondary text-ink")}>
            {label}
          </button>
        ))}
      </div>
      <h2 className="mt-5 font-sans text-xl font-semibold tracking-tight">{q ? `Results for “${q}”` : "People"}</h2>
      {search.isPending ? <div className="mt-3 h-48 animate-pulse rounded-3xl bg-secondary" /> : null}
      {search.isError ? <EmptyState title="Search is unavailable" body="The directory could not be reached. Nothing was invented in its place." /> : null}
      {search.data ? (
        people.length ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {people.map((person) => (
              <Link key={person.userId} to="/connect/people/$handle" params={{ handle: person.handle }} className="relative aspect-3/4 overflow-hidden rounded-3xl bg-blush-soft">
                {person.photo ? <img src={person.photo} alt="" className="absolute inset-0 size-full object-cover" /> : (
                  <span className="grid size-full place-items-center font-sans text-5xl font-semibold text-ink">{(person.displayName || person.handle).slice(0, 1)}</span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/30 to-transparent p-3 text-paper">
                  <span className="block truncate font-sans text-lg font-semibold">{person.displayName || person.handle}</span>
                  <span className="block truncate text-xs text-paper/80">@{person.handle}{person.institution ? ` · ${person.institution}` : ""}</span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-3">
            <EmptyState
              title={q ? "No people found" : filter === "all" ? "No one to discover yet" : "No people in this lane"}
              body={filter === "campus" && !mine.data?.institution ? "Add your institution on your profile to see the same campus." : q ? "No discoverable profile matched that search." : "Turn on discovery in your profile, or search someone by name or @handle."}
            />
          </div>
        )
      ) : null}
    </section>
  );
}

function ProfileCard() {
  const qc = useQueryClient();
  const mine = useQuery({ queryKey: ["connect-me"], queryFn: () => getMyConnectProfile() });
  const [open, setOpen] = useState(true);
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!mine.data) return;
    const { userId: _user, verified: _verified, ...rest } = mine.data;
    setForm(rest);
  }, [mine.data]);
  const save = useMutation({
    mutationFn: () => saveConnectProfile({ data: form }),
    onSuccess: async (result) => {
      setNote(result.ok ? (form.discoverable ? "Saved. People can discover this profile." : "Saved. You stay hidden until discovery is turned on.") : result.error);
      if (result.ok) await qc.invalidateQueries({ queryKey: ["connect-me"] });
    },
  });
  return (
    <section className="mt-6 rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Your directory profile</p>
          <p className="mt-1 text-xs text-muted-foreground">{mine.data?.discoverable ? "You can be discovered." : "You are hidden from discovery."}</p>
        </div>
        <button type="button" className="h-10 rounded-full px-4 text-sm ring-1 ring-border" onClick={() => setOpen((value) => !value)}>{open ? "Close" : "Edit"}</button>
      </div>
      {open ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="Name" aria-label="Name" className="h-11 w-full rounded-xl bg-background px-3 text-sm ring-1 ring-border" />
          <input value={form.handle} onChange={(event) => setForm({ ...form, handle: event.target.value })} placeholder="Handle" aria-label="Handle" className="h-11 w-full rounded-xl bg-background px-3 text-sm ring-1 ring-border" />
          <textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} placeholder="Bio" aria-label="Bio" className="min-h-20 w-full rounded-xl bg-background p-3 text-sm ring-1 ring-border" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.discoverable} onChange={(event) => setForm({ ...form, discoverable: event.target.checked })} /> People can find me</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allowRequests} onChange={(event) => setForm({ ...form, allowRequests: event.target.checked })} /> Allow connection requests</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allowMessages} onChange={(event) => setForm({ ...form, allowMessages: event.target.checked })} /> Allow messages from connections</label>
          {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
          <button type="submit" className="h-11 rounded-full bg-ink px-4 text-sm font-medium text-paper">Save</button>
        </form>
      ) : null}
    </section>
  );
}

function RelationList({ mode, query = "" }: { mode: "incoming" | "sent" | "connections"; query?: string }) {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["connect-relations"], queryFn: () => listConnectRelations() });
  const act = useMutation({
    mutationFn: (input: { id: string; action: "accept" | "decline" | "cancel" | "remove" }) => respondConnection({ data: input }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["connect-relations"] });
    },
  });
  const needle = query.trim().toLowerCase();
  const rows = (list.data?.[mode] ?? []).filter((row) => !needle || `${row.name} ${row.handle}`.toLowerCase().includes(needle));
  if (list.isPending) return <div className="mt-5 h-28 animate-pulse rounded-3xl bg-secondary" />;
  if (!rows.length) {
    const title = mode === "incoming" ? "No requests" : mode === "sent" ? "Nothing sent" : "No connections";
    return <div className="mt-5"><EmptyState title={title} body="Only real accounts show up here." /></div>;
  }
  return (
    <ul className="mt-5 space-y-3">
      {rows.map((row) => (
        <li key={row.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
          <Link to="/connect/people/$handle" params={{ handle: row.handle }} className="flex items-center gap-3">
            <Avatar name={row.name || row.handle} className="size-12" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{(row.name || "Member") + (row.handle ? ` (@${row.handle})` : "")}</p>
              <p className="truncate text-xs text-muted-foreground">
                {mode === "incoming" ? "Asked to connect" : mode === "sent" ? "You asked to connect" : "Connected"}
                {" · "}
                {relativeTime(row.at)}
              </p>
            </div>
          </Link>
          <div className="mt-3 flex gap-2">
            {mode === "incoming" ? (
              <>
                <button type="button" className="h-10 rounded-full bg-spark px-4 text-sm font-semibold text-spark-foreground" onClick={() => act.mutate({ id: row.id, action: "accept" })}>Accept</button>
                <button type="button" className="h-10 rounded-full px-4 text-sm ring-1 ring-border" onClick={() => act.mutate({ id: row.id, action: "decline" })}>Decline</button>
              </>
            ) : null}
            {mode === "sent" ? <button type="button" className="h-10 rounded-full px-4 text-sm ring-1 ring-border" onClick={() => act.mutate({ id: row.id, action: "cancel" })}>Cancel</button> : null}
            {mode === "connections" ? (
              <>
                {row.allowMessages ? <MessageLink handle={row.handle} className="h-10 rounded-full bg-ink px-4 text-sm text-paper" /> : <span className="text-xs text-muted-foreground">Not taking messages</span>}
                <button type="button" className="h-10 rounded-full px-4 text-sm ring-1 ring-border" onClick={() => act.mutate({ id: row.id, action: "remove" })}>Remove</button>
              </>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
