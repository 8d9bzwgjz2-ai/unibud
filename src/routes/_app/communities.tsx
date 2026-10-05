import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COMMUNITIES } from "@/lib/unibud/catalog";
import { useCatalog } from "@/lib/unibud/queries";
import { myCommunities } from "@/lib/social/server";
import { useQuery } from "@tanstack/react-query";
import { useAuthReady } from "@/components/unibud/sign-in-gate";
import { canGovernClass } from "@/lib/unibud/roles";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { communityKindLabel } from "@/lib/unibud/community-meta";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/communities")({ component: Communities });

function Communities() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/communities" && pathname !== "/communities/") {
    return <Outlet />;
  }
  return <CommunitiesList />;
}

function CommunitiesList() {
  const { data } = useCatalog();
  const catalogRooms = data?.communities ?? [];
  const allRooms = [
    ...COMMUNITIES.filter((c) => !catalogRooms.some((x) => x.id === c.id)),
    ...catalogRooms,
  ];
  const { user } = useAuthReady();
  const role = useCampusStore((s) => s.role ?? "student");
  const [tab, setTab] = useState<"discover" | "mine">("discover");
  const [kind, setKind] = useState<"all" | "Class" | "Study" | "University" | "Faculty" | "Interest">("all");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [createKind, setCreateKind] = useState<"Study" | "Interest" | "Class">("Study");
  const mine = useQuery({
    queryKey: ["my-communities"],
    queryFn: () => myCommunities(),
    enabled: Boolean(user),
  });
  const communities = allRooms.filter(
    (c) =>
      !q.trim() ||
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.description.toLowerCase().includes(q.toLowerCase()),
  );
  const shown = (tab === "mine" ? communities.filter((c) => mine.data?.includes(c.id)) : communities).filter(
    (c) => kind === "all" || c.kind === kind || (kind === "Interest" && ["Interest", "Music", "Sports", "Career"].includes(c.kind)),
  );

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Find your people</p>
      <h1 className="mt-1 font-display text-4xl">Communities</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Structured shared spaces. Class groups are academic cohorts. Study groups are student-run.
        Chat lives in Chat — a community is not a thread.
      </p>
      <div className="relative mt-5">
        <Search className="pointer-events-none absolute top-3.5 left-4 size-4 text-muted-foreground" />
        <Input
          className="pl-10"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search communities"
        />
      </div>
      <Button className="mt-4 w-full" onClick={() => setCreating((v) => !v)}>
        <Plus className="size-4" />
        Create
      </Button>
      {creating ? (
        <form
          className="mt-3 rounded-2xl bg-card p-4 ring-1 ring-border"
          onSubmit={(e) => {
            e.preventDefault();
            if (createKind === "Class" && !canGovernClass(role)) {
              toast.error("Only a class governor can open an official class group.");
              return;
            }
            toast.success(
              createKind === "Study"
                ? "Study group drafted. Students can join without lecturer permission."
                : "Community drafted in this demo.",
            );
            setCreating(false);
            setName("");
          }}
        >
          <p className="text-sm text-muted-foreground">
            Students can start study groups. Official class groups stay with class governors. Lecturers teach on Board.
          </p>
          <div className="mt-3 flex gap-2">
            {(["Study", "Interest", "Class"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setCreateKind(k)}
                className={cn(
                  "h-8 rounded-full px-3 text-xs",
                  createKind === k ? "bg-ink text-paper" : "bg-secondary",
                )}
              >
                {k === "Study" ? "Study group" : k === "Class" ? "Class group" : "Interest"}
              </button>
            ))}
          </div>
          <Input
            className="mt-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={createKind === "Study" ? "Night calculus group" : "Community name"}
          />
          <Button type="submit" className="mt-3 w-full" disabled={!name.trim()}>
            Save draft
          </Button>
        </form>
      ) : null}

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {(["all", "Class", "Study", "University", "Faculty", "Interest"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              "h-9 shrink-0 rounded-full px-4 text-sm",
              kind === k ? "bg-ink text-paper" : "bg-card ring-1 ring-border text-muted-foreground",
            )}
          >
            {k === "all" ? "All" : k === "Class" ? "Classes" : k === "Study" ? "Study groups" : k === "Interest" ? "Scenes" : k}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("discover")}
          className={cn(
            "h-9 rounded-full px-4 text-sm font-medium",
            tab === "discover" ? "bg-ink text-paper" : "bg-card ring-1 ring-border text-muted-foreground",
          )}
        >
          Discover
        </button>
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={cn(
            "h-9 rounded-full px-4 text-sm font-medium",
            tab === "mine" ? "bg-ink text-paper" : "bg-card ring-1 ring-border text-muted-foreground",
          )}
        >
          My Communities
        </button>
      </div>

      <Link
        to="/communities/$id"
        params={{ id: data?.communities[0]?.id ?? "unilag-campus" }}
        className="relative mt-5 block overflow-hidden rounded-3xl"
      >
        <img src="/covers/campus-night.jpg" alt="" className="h-56 w-full object-cover" />
        <div className="absolute inset-0 bg-ink/45" />
        <div className="absolute inset-0 flex flex-col justify-end p-5 text-paper">
          <span className="self-start rounded-full bg-paper/15 px-3 py-1 text-[10px] font-semibold tracking-widest uppercase">
            Community spotlight
          </span>
          <h2 className="mt-3 font-display text-3xl text-paper">Make something worth sharing.</h2>
          <p className="mt-2 text-sm text-paper/80">
            Campus Entrepreneurs brings student ideas, feedback and collaboration into one room.
          </p>
          <span className="mt-4 inline-flex h-10 w-fit items-center rounded-full bg-paper px-4 text-sm font-medium text-ink">
            Visit community
          </span>
        </div>
      </Link>

      <ul className="mt-5 space-y-3 pb-8">
        {shown.map((c) => (
          <li key={c.id}>
            <Link
              to="/communities/$id"
              params={{ id: c.id }}
              className="flex overflow-hidden rounded-2xl bg-card ring-1 ring-border"
            >
              {c.cover ? (
                <img src={c.cover} alt="" className="h-24 w-24 shrink-0 object-cover" />
              ) : (
                <div className="h-24 w-24 shrink-0 bg-secondary" />
              )}
              <div className="p-3">
                <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                  {communityKindLabel(c.kind)}
                </p>
                <h2 className="font-display text-lg">{c.name}</h2>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
