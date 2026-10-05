import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DemoCallout } from "@/components/unibud/demo-callout";
import { EmptyState } from "@/components/unibud/empty";
import { SignInCard, useAuthReady } from "@/components/unibud/sign-in-gate";
import { PEOPLE } from "@/lib/unibud/catalog";
import { formatNaira, koboFromNairaInput, relativeTime } from "@/lib/unibud/format";
import {
  addDemoFunds,
  createMoneyRequest,
  getWallet,
  saveFundingNotes,
  sendDemoMoney,
  updateMoneyRequest,
  withdrawDemo,
} from "@/lib/money/server";
import { cn } from "@/lib/utils";
import { BudNudge } from "@/components/unibud/bud-nudge";
import type { RequestStatus } from "@/lib/unibud/types";

export const Route = createFileRoute("/_app/money")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: typeof s.tab === "string" ? s.tab : "wallet",
  }),
  component: Money,
});

function Money() {
  const { tab } = Route.useSearch();
  const { user, isPending } = useAuthReady();
  const qc = useQueryClient();
  const wallet = useQuery({
    queryKey: ["wallet"],
    queryFn: () => getWallet(),
    enabled: Boolean(user),
  });

  if (isPending) return <div className="m-4 h-48 animate-pulse rounded-3xl bg-secondary" />;
  if (!user) {
    return (
      <main className="px-4 py-8 md:px-6">
        <h1 className="text-2xl font-medium">Money</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Student money — send, request, split, withdraw — without looking like a bank.
        </p>
        <div className="mt-6">
          <SignInCard
            title="Open your demo wallet"
            body="The ledger is simulated. Sign in so your demo balance and requests stay on your account."
          />
        </div>
      </main>
    );
  }

  const data = wallet.data;
  const active = tab === "requests" || tab === "funding" ? tab : "wallet";

  return (
    <main className="px-4 pb-10 md:px-6">
      <p className="pt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Wallet
      </p>
      <h1 className="mt-1 text-2xl font-medium tracking-tight">Your pocket</h1>
      <div className="mt-4 flex gap-2">
        {[
          ["wallet", "Wallet"],
          ["requests", "Requests"],
          ["funding", "Funding"],
        ].map(([id, label]) => (
          <Link
            key={id}
            to="/money"
            search={{ tab: id }}
            className={cn(
              "rounded-full px-4 py-2 text-sm",
              active === id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl bg-card p-5 ring-1 ring-border">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Demo balance</p>
          <Badge tone="warn">Demo</Badge>
        </div>
        <p className="mt-2 tabular text-4xl font-medium tracking-tight">
          {formatNaira(data?.balanceKobo ?? 0)}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{data?.disclaimer}</p>
      </div>
      <BudNudge draft="Explain this demo wallet: balance, add, send, withdraw. It is not a bank. Stay as Bud.">
        What does this wallet actually do?
      </BudNudge>

      {active === "wallet" ? (
        <WalletPane
          data={data}
          onRefresh={() => qc.invalidateQueries({ queryKey: ["wallet"] })}
        />
      ) : null}
      {active === "requests" ? (
        <RequestsPane
          data={data}
          onRefresh={() => qc.invalidateQueries({ queryKey: ["wallet"] })}
        />
      ) : null}
      {active === "funding" ? (
        <FundingPane
          data={data}
          onRefresh={() => qc.invalidateQueries({ queryKey: ["wallet"] })}
        />
      ) : null}
    </main>
  );
}

function WalletPane({
  data,
  onRefresh,
}: {
  data: Awaited<ReturnType<typeof getWallet>> | undefined;
  onRefresh: () => void;
}) {
  const [sheet, setSheet] = useState<"add" | "send" | "withdraw" | null>(null);
  return (
    <div className="mt-5 space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" onClick={() => setSheet("add")}>
          Add
        </Button>
        <Button variant="secondary" onClick={() => setSheet("send")}>
          Send
        </Button>
        <Button variant="secondary" onClick={() => setSheet("withdraw")}>
          Withdraw
        </Button>
      </div>
      <DemoCallout>
        Add, send, and withdraw only write to your UNIBUD demo ledger. They cannot be mistaken for a
        real bank movement.
      </DemoCallout>
      <h2 className="text-sm font-medium">Activity</h2>
      <ul className="space-y-2">
        {(data?.tx ?? []).map((t) => (
          <li key={t.id} className="flex items-start justify-between rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
            <div>
              <p className="text-sm font-medium capitalize">{t.type.replace("_", " ")}</p>
              <p className="text-xs text-muted-foreground">
                {t.counterparty} · {relativeTime(t.createdAt)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t.note}</p>
            </div>
            <div className="text-right">
              <p className={cn("tabular text-sm", t.type === "send" || t.type === "withdraw" || t.type === "market_pay" ? "text-foreground" : "text-bud")}>
                {t.type === "send" || t.type === "withdraw" || t.type === "market_pay" ? "−" : "+"}
                {formatNaira(t.amountKobo)}
              </p>
              <Badge tone="warn">{t.status.replace("_", " ")}</Badge>
            </div>
          </li>
        ))}
      </ul>
      {!data?.tx.length ? (
        <EmptyState
          title="No movement yet"
          body="Add demo funds to try send, request, and marketplace pay."
        />
      ) : null}
      {sheet === "add" ? <AddSheet onClose={() => setSheet(null)} onDone={onRefresh} /> : null}
      {sheet === "send" ? <SendSheet onClose={() => setSheet(null)} onDone={onRefresh} /> : null}
      {sheet === "withdraw" ? <WithdrawSheet onClose={() => setSheet(null)} onDone={onRefresh} /> : null}
    </div>
  );
}

function AddSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const mut = useMutation({
    mutationFn: (kobo: number) => addDemoFunds({ data: kobo }),
    onSuccess: () => {
      toast.message("Demo funds added", { description: "Not a real deposit." });
      onDone();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Sheet title="Add demo funds" onClose={onClose}>
      <p className="text-sm text-muted-foreground">Simulated naira for trying the product. Not a deposit.</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[200000, 500000, 1000000].map((k) => (
          <Button key={k} variant="outline" onClick={() => mut.mutate(k)} disabled={mut.isPending}>
            {formatNaira(k)}
          </Button>
        ))}
      </div>
    </Sheet>
  );
}

function SendSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [handle, setHandle] = useState(PEOPLE[0]?.handle ?? "");
  const noPeople = PEOPLE.length === 0;
  const [amount, setAmount] = useState("2000");
  const [note, setNote] = useState("");
  const mut = useMutation({
    mutationFn: () => {
      const kobo = koboFromNairaInput(amount);
      if (!kobo) throw new Error("Enter an amount");
      return sendDemoMoney({ data: { handle, kobo, note } });
    },
    onSuccess: () => {
      toast.message("Demo send recorded", { description: "No real money moved." });
      onDone();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Sheet title="Send (demo)" onClose={onClose}>
      <label className="text-xs text-muted-foreground">To</label>
      <select
        className="mt-1 h-11 w-full rounded-xl border border-input bg-secondary px-3 text-sm"
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
      >
        {noPeople ? <option value="">No registered students yet</option> : null}
        {PEOPLE.map((p) => (
          <option key={p.handle} value={p.handle}>
            {p.name} (@{p.handle})
          </option>
        ))}
      </select>
      <Input className="mt-3" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount in naira" />
      <Input className="mt-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" />
      <Button className="mt-4 w-full" onClick={() => mut.mutate()} disabled={mut.isPending || noPeople || !handle}>
        Record demo send
      </Button>
    </Sheet>
  );
}

function WithdrawSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState("5000");
  const [dest, setDest] = useState("Linked bank (not connected)");
  const mut = useMutation({
    mutationFn: () => {
      const kobo = koboFromNairaInput(amount);
      if (!kobo) throw new Error("Enter an amount");
      return withdrawDemo({ data: { kobo, destination: dest } });
    },
    onSuccess: () => {
      toast.message("Demo withdrawal recorded", { description: "No payout rail is connected." });
      onDone();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Sheet title="Withdraw (demo)" onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        No bank, card, or mobile-money rail is integrated. This only writes a demo ledger line.
      </p>
      <Input className="mt-3" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Input className="mt-2" value={dest} onChange={(e) => setDest(e.target.value)} />
      <Button className="mt-4 w-full" onClick={() => mut.mutate()} disabled={mut.isPending}>
        Record demo withdrawal
      </Button>
    </Sheet>
  );
}

function RequestsPane({
  data,
  onRefresh,
}: {
  data: Awaited<ReturnType<typeof getWallet>> | undefined;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const mut = useMutation({
    mutationFn: (input: { id: string; status: RequestStatus }) => updateMoneyRequest({ data: input }),
    onSuccess: onRefresh,
  });
  return (
    <div className="mt-5 space-y-4">
      <Button className="w-full" onClick={() => setOpen(true)}>
        Request or split
      </Button>
      {(data?.requests ?? []).map((r) => (
        <div key={r.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium">
                {r.direction === "out" ? "You requested" : "Request"} @{r.peerHandle}
              </p>
              <p className="text-xs text-muted-foreground">{r.note}</p>
            </div>
            <p className="tabular text-sm">{formatNaira(r.amountKobo)}</p>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Badge tone={r.status === "pending" ? "warn" : "muted"}>{r.status}</Badge>
            {r.status === "pending" ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => mut.mutate({ id: r.id, status: "cancelled" })}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => mut.mutate({ id: r.id, status: "paid" })}>
                  Mark paid (demo)
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ))}
      {!data?.requests.length ? (
        <EmptyState title="No requests" body="Ask a roommate for their share, or split a food run." />
      ) : null}
      {open ? <RequestSheet onClose={() => setOpen(false)} onDone={onRefresh} /> : null}
    </div>
  );
}

function RequestSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [amount, setAmount] = useState("5000");
  const [note, setNote] = useState("Roommate share");
  const [split, setSplit] = useState(false);
  const mut = useMutation({
    mutationFn: () => {
      const kobo = koboFromNairaInput(amount);
      if (!kobo) throw new Error("Enter an amount");
      return createMoneyRequest({ data: { handles: selected, kobo, note, split } });
    },
    onSuccess: () => {
      toast.message("Demo request created");
      onDone();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Sheet title="Request money" onClose={onClose}>
      {PEOPLE.length === 0 ? (
        <p className="text-sm text-muted-foreground">No registered students to request from yet.</p>
      ) : null}
      <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
        {PEOPLE.map((p) => (
          <label key={p.handle} className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-secondary">
            <input
              type="checkbox"
              checked={selected.includes(p.handle)}
              onChange={(e) =>
                setSelected((cur) =>
                  e.target.checked ? [...cur, p.handle] : cur.filter((h) => h !== p.handle),
                )
              }
            />
            {p.name}
          </label>
        ))}
      </div>
      <Input className="mt-3" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount ₦" />
      <Input className="mt-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What’s this for?" />
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={split} onChange={(e) => setSplit(e.target.checked)} />
        Split equally between selected
      </label>
      <Button className="mt-4 w-full" onClick={() => mut.mutate()} disabled={mut.isPending}>
        Create demo request
      </Button>
    </Sheet>
  );
}

function FundingPane({
  data,
  onRefresh,
}: {
  data: Awaited<ReturnType<typeof getWallet>> | undefined;
  onRefresh: () => void;
}) {
  const [notes, setNotes] = useState(data?.funding.notes ?? "");
  const [status, setStatus] = useState(data?.funding.status ?? "exploring");
  const mut = useMutation({
    mutationFn: () => saveFundingNotes({ data: { program: "nelfund", status, notes } }),
    onSuccess: () => {
      toast.success("Saved your notes — not an official application");
      onRefresh();
    },
  });
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-3xl bg-card p-5 ring-1 ring-border">
        <Badge>From UNIBUD</Badge>
        <h2 className="mt-3 text-lg font-medium">Student funding</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          UNIBUD is not NELFUND. We do not approve loans, invent eligibility, or disburse government
          funds. This page is guidance plus a private tracker for your own notes.
        </p>
        <a
          href="https://nelf.gov.ng/"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex text-sm text-bud underline-offset-4 hover:underline"
        >
          Official NELFUND site — nelf.gov.ng
        </a>
      </div>
      <div className="rounded-2xl bg-card p-5 ring-1 ring-border">
        <h3 className="font-medium">NELFUND, in plain language</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>Interest-free education loans administered by the Nigerian Education Loan Fund.</li>
          <li>Institutional charges and upkeep are separate conversations on the official portal.</li>
          <li>Application, eligibility, and disbursement happen on the government system — not here.</li>
          <li>If a future official integration exists, status will be labelled as verified from the provider.</li>
        </ul>
      </div>
      <div className="rounded-2xl bg-card p-5 ring-1 ring-border">
        <h3 className="font-medium">My notes</h3>
        <p className="mt-1 text-xs text-muted-foreground">Private to you. Not submitted anywhere.</p>
        <select
          className="mt-3 h-11 w-full rounded-xl border border-input bg-secondary px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="exploring">Exploring</option>
          <option value="gathering_docs">Gathering documents</option>
          <option value="applied_official">Applied on official portal</option>
          <option value="waiting">Waiting on official status</option>
        </select>
        <Textarea className="mt-3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Matric number, school, questions for the bursary…" />
        <Button className="mt-3" size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
          Save notes
        </Button>
      </div>
    </div>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/60 md:items-center md:justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-card p-5 md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-medium">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
