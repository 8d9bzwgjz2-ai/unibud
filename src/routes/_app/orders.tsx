import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { advanceOrder, listOrders, respondOffer } from "@/lib/market/server";
import { formatNaira, relativeTime } from "@/lib/unibud/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/orders")({ component: Orders });

const STEPS = ["pending", "accepted", "ready", "completed"] as const;
const LABELS: Record<(typeof STEPS)[number], string> = {
  pending: "Asked",
  accepted: "Accepted",
  ready: "Ready",
  completed: "Collected",
};

type Order = {
  id: string;
  listingId: string;
  title: string;
  priceKobo: number;
  note: string;
  status: string;
  at: string;
  role: "selling" | "buying";
  peerName: string;
  peerHandle: string;
};

function Orders() {
  const qc = useQueryClient();
  const [role, setRole] = useState<"buying" | "selling">("buying");
  const [error, setError] = useState("");
  const orders = useQuery({ queryKey: ["orders"], queryFn: () => listOrders() });
  const refresh = async (result?: { ok: boolean; error?: string }) => {
    if (result && !result.ok) setError(result.error ?? "That did not update.");
    else setError("");
    await qc.invalidateQueries({ queryKey: ["orders"] });
    await qc.invalidateQueries({ queryKey: ["market"] });
  };
  const advance = useMutation({
    mutationFn: (input: { id: string; action: "ready" | "complete" | "cancel" }) => advanceOrder({ data: input }),
    onSuccess: refresh,
  });
  const answer = useMutation({
    mutationFn: (input: { id: string; action: "accept" | "decline" }) => respondOffer({ data: input }),
    onSuccess: refresh,
  });
  const busy = advance.isPending || answer.isPending;
  const rows = (orders.data ?? []).filter((order) => order.role === role);

  return (
    <main className="px-5 pt-6 pb-10">
      <p className="kicker">Handover</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <h1 className="font-display text-4xl">Orders</h1>
        <Link to="/market" className="text-sm text-muted-foreground">Market</Link>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Asked, accepted, ready, collected. Accepting reserves the listing. Collected marks it sold. No payment is taken here.</p>
      <div className="mt-4 grid grid-cols-2 gap-2" role="tablist">
        {(["buying", "selling"] as const).map((id) => (
          <button key={id} type="button" role="tab" aria-selected={role === id} onClick={() => setRole(id)} className={cn("h-11 rounded-full text-sm font-medium capitalize", role === id ? "bg-ink text-paper" : "bg-card ring-1 ring-border")}>
            {id}
          </button>
        ))}
      </div>
      {error ? <p className="mt-3 text-sm text-muted-foreground" role="status">{error}</p> : null}
      {orders.isPending ? <div className="mt-5 h-32 animate-pulse rounded-3xl bg-secondary" /> : null}
      {!orders.isPending && !rows.length ? (
        <p className="mt-8 text-sm text-muted-foreground">
          {role === "buying" ? "You have not asked to buy anything." : "Nobody has an open order with you."} Start from a real listing on Market.
        </p>
      ) : null}
      <ul className="mt-4 space-y-3">
        {rows.map((order) => (
          <li key={order.id} className="rounded-3xl bg-card p-4 ring-1 ring-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link to="/market/$listingId" params={{ listingId: order.listingId }} className="font-medium">{order.title}</Link>
                <p className="mt-1 text-sm text-muted-foreground">{formatNaira(order.priceKobo)} · {order.role === "buying" ? "from" : "to"} {order.peerName} (@{order.peerHandle})</p>
              </div>
              <p className="text-xs text-muted-foreground">{relativeTime(order.at)}</p>
            </div>
            {order.note ? <p className="mt-2 text-sm">{order.note}</p> : null}
            <Rail status={order.status} />
            <Actions order={order} busy={busy} onAdvance={(action) => advance.mutate({ id: order.id, action })} onAnswer={(action) => answer.mutate({ id: order.id, action })} />
          </li>
        ))}
      </ul>
    </main>
  );
}

function Rail({ status }: { status: string }) {
  if (status === "declined" || status === "cancelled") {
    return <p className="mt-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{status}</p>;
  }
  const index = STEPS.indexOf(status as (typeof STEPS)[number]);
  return (
    <ol className="mt-4 grid grid-cols-4 gap-1">
      {STEPS.map((step, i) => (
        <li key={step}>
          <span className={cn("block h-1 rounded-full", i <= index ? "bg-ink" : "bg-border")} />
          <span className={cn("mt-1 block text-[10px]", i === index ? "font-semibold" : "text-muted-foreground")}>{LABELS[step]}</span>
        </li>
      ))}
    </ol>
  );
}

function Actions({
  order,
  busy,
  onAdvance,
  onAnswer,
}: {
  order: Order;
  busy: boolean;
  onAdvance: (action: "ready" | "complete" | "cancel") => void;
  onAnswer: (action: "accept" | "decline") => void;
}) {
  const selling = order.role === "selling";
  if (order.status === "pending" && selling) {
    return (
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={busy} onClick={() => onAnswer("accept")} className="h-11 rounded-full bg-ink px-4 text-sm font-medium text-paper disabled:opacity-50">Accept</button>
        <button type="button" disabled={busy} onClick={() => onAnswer("decline")} className="h-11 rounded-full px-4 text-sm ring-1 ring-border disabled:opacity-50">Decline</button>
      </div>
    );
  }
  if (order.status === "pending" && !selling) {
    return <Act busy={busy} primary={null} onCancel={() => onAdvance("cancel")} cancel="Cancel request" />;
  }
  if (order.status === "accepted" && selling) {
    return <Act busy={busy} primary="Ready for collection" onPrimary={() => onAdvance("ready")} onCancel={() => onAdvance("cancel")} />;
  }
  if ((order.status === "accepted" || order.status === "ready") && !selling) {
    return <Act busy={busy} primary="I’ve collected it" onPrimary={() => onAdvance("complete")} onCancel={() => onAdvance("cancel")} />;
  }
  if (order.status === "ready" && selling) {
    return <Act busy={busy} primary="Mark collected" onPrimary={() => onAdvance("complete")} onCancel={() => onAdvance("cancel")} />;
  }
  return null;
}

function Act({
  busy,
  primary,
  onPrimary,
  onCancel,
  cancel = "Cancel order",
}: {
  busy: boolean;
  primary: string | null;
  onPrimary?: () => void;
  onCancel: () => void;
  cancel?: string;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {primary ? <button type="button" disabled={busy} onClick={onPrimary} className="h-11 rounded-full bg-ink px-4 text-sm font-medium text-paper disabled:opacity-50">{primary}</button> : null}
      <button type="button" disabled={busy} onClick={onCancel} className="h-11 rounded-full px-4 text-sm ring-1 ring-border disabled:opacity-50">{cancel}</button>
    </div>
  );
}
