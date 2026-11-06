import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { flowHome, fundShare, moveSavings, payMember } from "@/lib/flow/server";
import { formatNaira, koboFromNairaInput, relativeTime } from "@/lib/unibud/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/flow")({ component: Flow });

const CHIPS = ["500", "2000", "10000"];

function Flow() {
  const qc = useQueryClient();
  const home = useQuery({ queryKey: ["flow"], queryFn: () => flowHome() });
  const [panel, setPanel] = useState<"add" | "move" | "pay" | null>("add");
  const [amount, setAmount] = useState("2000");
  const [direction, setDirection] = useState<"to-savings" | "to-share">("to-savings");
  const [handle, setHandle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const refresh = async (result: { ok: boolean; error?: string }) => {
    setError(result.ok ? "" : result.error ?? "That did not post.");
    if (result.ok) await qc.invalidateQueries({ queryKey: ["flow"] });
  };
  const add = useMutation({
    mutationFn: () => fundShare({ data: { kobo: koboFromNairaInput(amount) ?? 0 } }),
    onSuccess: refresh,
  });
  const move = useMutation({
    mutationFn: () => moveSavings({ data: { kobo: koboFromNairaInput(amount) ?? 0, direction } }),
    onSuccess: refresh,
  });
  const pay = useMutation({
    mutationFn: () => payMember({ data: { handle, kobo: koboFromNairaInput(amount) ?? 0, note } }),
    onSuccess: (result) => {
      if (result.ok) {
        setHandle("");
        setNote("");
      }
      return refresh(result);
    },
  });
  const busy = add.isPending || move.isPending || pay.isPending;

  if (home.isPending) return <div className="m-5 h-56 animate-pulse rounded-3xl bg-union/20" />;
  if (home.isError || !home.data) {
    return <main className="px-5 pt-6 text-sm">Flow could not open the member ledger.</main>;
  }
  const data = home.data;

  return (
    <main className="bg-union px-5 pt-6 pb-10 text-union-foreground">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-brass uppercase">Member ledger</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <h1 className="font-display text-4xl text-union-foreground">Flow</h1>
        <p className="text-right text-xs text-union-foreground/70">@{data.handle}</p>
      </div>

      <section className="mt-5 rounded-[28px] bg-union-foreground/6 p-5 ring-1 ring-brass/70">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.16em] text-brass uppercase">Share account</p>
            <p className="mt-2 font-display text-5xl tabular text-union-foreground">{formatNaira(data.shareKobo)}</p>
          </div>
          <p className="rounded-full bg-brass px-3 py-1 text-[11px] font-semibold tracking-wide text-brass-foreground">{data.memberNo}</p>
        </div>
        <p className="mt-4 text-sm">{data.name}</p>
        <div className="mt-4 flex items-center justify-between border-t border-union-foreground/10 pt-3 text-sm">
          <span className="text-union-foreground/70">Savings</span>
          <span className="tabular font-medium">{formatNaira(data.savingsKobo)}</span>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-3 gap-2" role="tablist" aria-label="Ledger actions">
        {(
          [
            ["add", "Add"],
            ["move", "Move"],
            ["pay", "Pay"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={panel === id}
            onClick={() => {
              setPanel(id);
              setError("");
            }}
            className={cn(
              "h-11 rounded-full text-sm font-medium",
              panel === id ? "bg-brass text-brass-foreground" : "bg-union-foreground/10 text-union-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (panel === "move") move.mutate();
          else if (panel === "pay") pay.mutate();
          else add.mutate();
        }}
      >
        <label className="block text-xs font-medium text-union-foreground/80">
          Amount in naira
          <input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="mt-1 h-12 w-full rounded-xl bg-union-foreground/10 px-3 text-base text-union-foreground ring-1 ring-union-foreground/15 outline-none"
          />
        </label>
        <div className="flex gap-2">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setAmount(chip)}
              className={cn(
                "h-9 rounded-full px-3 text-xs",
                amount === chip ? "bg-brass text-brass-foreground" : "bg-union-foreground/10",
              )}
            >
              {formatNaira(Number(chip) * 100)}
            </button>
          ))}
        </div>
        {panel === "move" ? (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setDirection("to-savings")} className={cn("h-11 rounded-xl text-sm", direction === "to-savings" ? "bg-brass text-brass-foreground" : "bg-union-foreground/10")}>
              Shares → savings
            </button>
            <button type="button" onClick={() => setDirection("to-share")} className={cn("h-11 rounded-xl text-sm", direction === "to-share" ? "bg-brass text-brass-foreground" : "bg-union-foreground/10")}>
              Savings → shares
            </button>
          </div>
        ) : null}
        {panel === "pay" ? (
          <>
            <label className="block text-xs font-medium text-union-foreground/80">
              Member @handle
              <input
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                placeholder="their handle"
                autoCapitalize="none"
                className="mt-1 h-12 w-full rounded-xl bg-union-foreground/10 px-3 text-base ring-1 ring-union-foreground/15 outline-none placeholder:text-union-foreground/40"
              />
            </label>
            <label className="block text-xs font-medium text-union-foreground/80">
              Note
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="What this is for"
                className="mt-1 h-12 w-full rounded-xl bg-union-foreground/10 px-3 text-base ring-1 ring-union-foreground/15 outline-none placeholder:text-union-foreground/40"
              />
            </label>
          </>
        ) : null}
        <button type="submit" disabled={busy} className="h-12 w-full rounded-full bg-brass text-sm font-semibold text-brass-foreground disabled:opacity-50">
          {busy ? "Posting…" : panel === "move" ? "Move" : panel === "pay" ? "Pay member" : "Add to shares"}
        </button>
        <p className="text-xs leading-relaxed text-union-foreground/65">
          {panel === "pay"
            ? "This credits their share account and debits yours. It does not leave UNIBUD."
            : panel === "move"
              ? "Moves between your two accounts. Both stay on the member ledger."
              : "Records an amount on your share account. It is not pulled from a bank."}
        </p>
        {error ? <p className="text-sm text-brass" role="status">{error}</p> : null}
      </form>

      <h2 className="mt-8 text-sm font-medium">Activity</h2>
      {!data.activity.length ? <p className="mt-2 text-sm text-union-foreground/65">No movement yet.</p> : null}
      <ul className="mt-2 divide-y divide-union-foreground/10">
        {data.activity.map((row) => (
          <li key={row.id} className="flex items-start justify-between gap-3 py-3">
            <div>
              <p className="text-sm">{labelTx(row.type)}</p>
              <p className="text-xs text-union-foreground/60">{row.counterparty} · {row.note}</p>
            </div>
            <div className="text-right">
              <p className={cn("tabular text-sm font-medium", row.type === "pay" || row.type === "to_savings" ? "text-union-foreground/80" : "text-brass")}>
                {row.type === "pay" || row.type === "to_savings" ? "−" : "+"}
                {formatNaira(Math.abs(row.amountKobo))}
              </p>
              <p className="text-[11px] text-union-foreground/50">{relativeTime(row.at)}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs leading-relaxed text-union-foreground/55">
        Member ledger inside UNIBUD. Payments move between members. This is not a bank and nothing here is a licensed deposit.
      </p>
    </main>
  );
}

function labelTx(type: string) {
  if (type === "deposit") return "Added to shares";
  if (type === "to_savings") return "Moved to savings";
  if (type === "to_share") return "Moved to shares";
  if (type === "pay") return "Paid a member";
  if (type === "receive") return "Received";
  return type.replaceAll("_", " ");
}
