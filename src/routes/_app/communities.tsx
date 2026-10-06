import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { COMMUNITIES } from "@/lib/unibud/catalog";
import { useCatalog } from "@/lib/unibud/queries";
import { myCommunities } from "@/lib/social/server";
import { createQuad, QUAD_TYPES, type QuadType } from "@/lib/unibud/quad.server";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthReady } from "@/components/unibud/sign-in-gate";
import { canGovernClass } from "@/lib/unibud/roles";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { communityKindLabel } from "@/lib/unibud/community-meta";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/communities")({ component: Communities });

/** Structural campus kinds that exist alongside the open-ended Quad types. */
const STRUCTURAL_KINDS = ["University", "Faculty", "Residence"] as const;
const KIND_FILTERS = ["all", ...STRUCTURAL_KINDS, ...QUAD_TYPES] as const;

function Communities() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/communities" && pathname !== "/communities/") {
    return <Outlet />;
  }
  return <CommunitiesList />;
}

function CommunitiesList() {
  const { data } = useCatalog();
  const qc = useQueryClient();
  const catalogRooms = data?.communities ?? [];
  const allRooms = [
    ...COMMUNITIES.filter((c) => !catalogRooms.some((x) => x.id === c.id)),
    ...catalogRooms,
  ];
  const { user } = useAuthReady();
  const role = useCampusStore((s) => s.role ?? "student");
  const [tab, setTab] = useState<"discover" | "mine">("discover");
  const [kind, setKind] = useState<(typeof KIND_FILTERS)[number]>("all");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createKind, setCreateKind] = useState<QuadType>("Interest");
  const mine = useQuery({
    queryKey: ["my-communities"],
    queryFn: () => myCommunities(),
    enabled: Boolean(user),
  });
  const createMut = useMutation({
    mutationFn: (input: { name: string; kind: string; description: string }) =>
      createQuad({ data: input }),
    onSuccess: () => {
      setName("");
      setDescription("");
      setCreating(false);
      void qc.invalidateQueries({ queryKey: ["catalog"] });
      void qc.invalidateQueries({ queryKey: ["my-communities"] });
      toast.success("Quad created. It's live for anyone to find.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const communities = allRooms.filter(
    (c) =>
      !q.trim() ||
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.description.toLowerCase().includes(q.toLowerCase()),
  );
  const shown = (tab === "mine" ? communities.filter((c) => mine.data?.includes(c.id)) : communities).filter(
    (c) => kind === "all" || c.kind === kind,
  );

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Find your people</p>
      <h1 className="mt-1 font-display text-4xl">Quad</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        App-like community environments — around an interest, a creator, an activity, an experience.
        A Quad can hold people, groups, conversations and content.
      </p>
      <div className="relative mt-5">
        <Search className="pointer-events-none absolute top-3.5 left-4 size-4 text-muted-foreground" />
        <Input
          className="pl-10"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Quads"
        />
      </div>
      <Button className="mt-4 w-full" onClick={() => setCreating((v) => !v)}>
        <Plus className="size-4" />
        Create a Quad
      </Button>
      {creating ? (
        <form
          className="mt-3 rounded-2xl bg-card p-4 ring-1 ring-border"
          onSubmit={(e) => {
            e.preventDefault();
            if (!user) {
              toast.error("Sign in to create a Quad.");
              return;
            }
            if (createKind === "Class" && !canGovernClass(role)) {
              toast.error("Only a class governor can open an official class space.");
              return;
            }
            createMut.mutate({ name: name.trim(), kind: createKind, description });
          }}
        >
          <p className="text-sm text-muted-foreground">
            Any real member can start a Quad around something real — music, sports, a podcast, a
            creator community, a study scene. Official class spaces stay with class governors.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUAD_TYPES.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setCreateKind(k)}
                className={cn(
                  "h-8 rounded-full px-3 text-xs",
                  createKind === k ? "bg-ink text-paper" : "bg-secondary",
                )}
              >
                {k}
              </button>
            ))}
          </div>
          <Input
            className="mt-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={createKind === "Podcast" ? "My podcast community" : "Quad name"}
          />
          <Textarea
            className="mt-2 min-h-16"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this Quad about? (optional)"
          />
          <Button type="submit" className="mt-3 w-full" disabled={!name.trim() || createMut.isPending}>
            {createMut.isPending ? "Creating…" : "Create Quad"}
          </Button>
        </form>
      ) : null}

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {KIND_FILTERS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              "h-9 shrink-0 rounded-full px-4 text-sm",
              kind === k ? "bg-ink text-paper" : "bg-card ring-1 ring-border text-muted-foreground",
            )}
          >
            {k === "all" ? "All" : k === "Class" ? "Classes" : k === "Study" ? "Study" : k}
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
          My Quads
        </button>
      </div>

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
        {shown.length === 0 ? (
          <li className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
            No Quads here yet. This list only shows what actually exists.
          </li>
        ) : null}
      </ul>
    </main>
  );
}
