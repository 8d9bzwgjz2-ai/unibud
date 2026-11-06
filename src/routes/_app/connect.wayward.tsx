import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { EmptyState } from "@/components/unibud/empty";
import { createWayward, listWayward } from "@/lib/places/server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/connect/wayward")({ component: Wayward });

const LANES = [
  ["", "All"],
  ["tour", "Tours"],
  ["place", "Places"],
  ["night", "Nights"],
  ["activity", "Activities"],
] as const;

function Wayward() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/connect/wayward" && pathname !== "/connect/wayward/") return <Outlet />;
  return <WaywardHome />;
}

function WaywardHome() {
  const qc = useQueryClient();
  const [lane, setLane] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ lane: "tour", title: "", place: "", when: "", details: "" });
  const [error, setError] = useState("");
  const plans = useQuery({ queryKey: ["wayward", lane], queryFn: () => listWayward({ data: { lane } }) });
  const create = useMutation({
    mutationFn: () => createWayward({ data: form }),
    onSuccess: async (result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError("");
      setOpen(false);
      setForm({ lane: "tour", title: "", place: "", when: "", details: "" });
      await qc.invalidateQueries({ queryKey: ["wayward"] });
    },
  });

  return (
    <main className="safe-bottom px-5 pt-6">
      <Link to="/connect" className="text-xs text-muted-foreground">Connect</Link>
      <div className="mt-1 flex items-end justify-between gap-3">
        <h1 className="font-display text-4xl">Wayward</h1>
        <button type="button" className="h-11 rounded-full bg-ink px-4 text-sm text-paper" onClick={() => setOpen((value) => !value)}>{open ? "Close" : "Organize"}</button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Tours, places, night parties, and other plans people organize. A plan exists only after someone creates it. Joining opens its chat.</p>
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {LANES.map(([id, label]) => (
          <button key={label} type="button" onClick={() => setLane(id)} className={cn("h-9 shrink-0 rounded-full px-4 text-sm", lane === id ? "bg-ink text-paper" : "bg-card ring-1 ring-border")}>{label}</button>
        ))}
      </div>
      {open ? (
        <form className="mt-4 space-y-2 rounded-2xl bg-card p-4 ring-1 ring-border" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
          <div className="grid grid-cols-2 gap-2">
            {(["tour", "place", "night", "activity"] as const).map((item) => (
              <button key={item} type="button" onClick={() => setForm({ ...form, lane: item })} className={cn("h-10 rounded-full text-sm capitalize", form.lane === item ? "bg-ink text-paper" : "ring-1 ring-border")}>{item}</button>
            ))}
          </div>
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Name the plan" aria-label="Plan name" className="h-11 w-full rounded-xl bg-background px-3 text-sm ring-1 ring-border" />
          <input value={form.place} onChange={(event) => setForm({ ...form, place: event.target.value })} placeholder="Where" aria-label="Where" className="h-11 w-full rounded-xl bg-background px-3 text-sm ring-1 ring-border" />
          <input value={form.when} onChange={(event) => setForm({ ...form, when: event.target.value })} placeholder="When" aria-label="When" className="h-11 w-full rounded-xl bg-background px-3 text-sm ring-1 ring-border" />
          <textarea value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} placeholder="What people should know" aria-label="Details" className="min-h-20 w-full rounded-xl bg-background p-3 text-sm ring-1 ring-border" />
          {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
          <button type="submit" className="h-11 rounded-full bg-ink px-4 text-sm text-paper">Publish plan</button>
        </form>
      ) : null}
      {plans.isPending ? <div className="mt-5 h-28 animate-pulse rounded-3xl bg-secondary" /> : null}
      <ul className="mt-5 space-y-3">
        {(plans.data ?? []).map((plan) => (
          <li key={plan.id}>
            <Link to="/connect/wayward/$id" params={{ id: plan.id }} className="block rounded-2xl bg-card p-4 ring-1 ring-border">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{plan.lane}</p>
              <p className="mt-1 font-medium">{plan.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{[plan.place, plan.when_text].filter(Boolean).join(" · ") || "Details inside"}</p>
              <p className="mt-2 text-xs text-muted-foreground">@{plan.handle} · {plan.members} going{plan.joined ? " · You joined" : ""}</p>
            </Link>
          </li>
        ))}
      </ul>
      {!plans.isPending && !plans.data?.length ? (
        <div className="mt-5"><EmptyState title="No plans yet" body="Organize the first tour, place, night, or activity. Nothing is listed until someone does." /></div>
      ) : null}
    </main>
  );
}
