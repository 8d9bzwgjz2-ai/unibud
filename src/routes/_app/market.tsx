import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListingCard } from "@/components/unibud/listing-card";
import { CATEGORIES } from "@/lib/unibud/catalog";
import type { ListingCategory } from "@/lib/unibud/types";
import { useCatalog } from "@/lib/unibud/queries";
import { cn } from "@/lib/utils";
import { BudNudge } from "@/components/unibud/bud-nudge";

type Search = { cat?: ListingCategory | "all" };

export const Route = createFileRoute("/_app/market")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    cat: typeof s.cat === "string" ? (s.cat as Search["cat"]) : "all",
  }),
  component: Market,
});

function Market() {
  const { cat = "all" } = Route.useSearch();
  const { data, isPending } = useCatalog();
  const [q, setQ] = useState("");
  const [sellOpen, setSellOpen] = useState(false);
  const listings = data?.listings ?? [];

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      const catOk = cat === "all" || l.category === cat;
      const qOk =
        !q.trim() ||
        `${l.title} ${l.description} ${l.location}`.toLowerCase().includes(q.toLowerCase());
      return catOk && qOk;
    });
  }, [listings, cat, q]);

  return (
    <main className="px-4 pb-8 md:px-6">
      <div className="flex items-end justify-between gap-3 pt-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Marketplace
          </p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight">Market</h1>
        </div>
        <Button size="sm" onClick={() => setSellOpen(true)}>
          Sell / offer
        </Button>
      </div>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Hostels, food, thrift, gear, and skills — listed by people, not a generic store.
      </p>
      <Input
        className="mt-4"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search listings"
      />
      <BudNudge draft={`Help me find a listing. Query: “${q || "something useful"}”. Stay as Bud.`}>
        Need a hand finding this?
      </BudNudge>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <Chip to="all" active={cat === "all"}>
          All
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.id} to={c.id} active={cat === c.id}>
            {c.label}
          </Chip>
        ))}
      </div>
      {isPending ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-4/3 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
      {sellOpen ? <SellSheet onClose={() => setSellOpen(false)} /> : null}
    </main>
  );
}

function Chip({
  to,
  active,
  children,
}: {
  to: ListingCategory | "all";
  active: boolean;
  children: string;
}) {
  return (
    <Link
      to="/market"
      search={{ cat: to }}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-2 text-sm",
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function SellSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/60 md:items-center md:justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-card p-5 md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-medium">List something</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Goods, a service, or a room. Sign in first so the listing is yours.
        </p>
        <div className="mt-4 grid gap-2">
          <Link to="/creator" onClick={onClose}>
            <Button className="w-full">Offer a service</Button>
          </Link>
          <Link to="/profile" onClick={onClose}>
            <Button variant="outline" className="w-full">
              List from your profile
            </Button>
          </Link>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
