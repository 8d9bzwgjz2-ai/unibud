import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { EmptyState } from "@/components/unibud/empty";
import { CATEGORIES } from "@/lib/unibud/catalog";
import { formatNaira, koboFromNairaInput } from "@/lib/unibud/format";
import type { ListingCategory, ListingKind } from "@/lib/unibud/types";
import { createMarketListing, listMarket } from "@/lib/market/server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/market")({ component: MarketLayout });

function MarketLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/market" && pathname !== "/market/") return <Outlet />;
  return <MarketHome />;
}

function MarketHome() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<ListingCategory | "all">("all");
  const [selling, setSelling] = useState(false);
  const list = useQuery({
    queryKey: ["market", q.trim(), category],
    queryFn: () => listMarket({ data: { q: q.trim(), category } }),
  });

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Commerce</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <h1 className="font-display text-4xl">Market</h1>
        <div className="flex gap-2">
          <Link to="/orders" className="inline-flex h-11 items-center rounded-full px-4 text-sm ring-1 ring-border">Orders</Link>
          <button type="button" onClick={() => setSelling((open) => !open)} className="h-11 shrink-0 rounded-full bg-ink px-4 text-sm font-medium text-paper">
            {selling ? "Close" : "Sell"}
          </button>
        </div>
      </div>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Buy and sell with other accounts. Asking to buy does not take a payment. You arrange the handover with the seller.
      </p>
      <input
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="Search listings"
        aria-label="Search listings"
        className="mt-5 h-12 w-full rounded-xl bg-card px-4 text-sm ring-1 ring-border outline-none"
      />
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setCategory("all")} className={cn("h-9 shrink-0 rounded-full px-4 text-sm", category === "all" ? "bg-ink text-paper" : "bg-card ring-1 ring-border")}>
          All
        </button>
        {CATEGORIES.map((item) => (
          <button key={item.id} type="button" onClick={() => setCategory(item.id)} className={cn("h-9 shrink-0 rounded-full px-4 text-sm", category === item.id ? "bg-ink text-paper" : "bg-card ring-1 ring-border")}>
            {item.label}
          </button>
        ))}
      </div>
      {selling ? (
        <SellForm
          onDone={async () => {
            setSelling(false);
            await qc.invalidateQueries({ queryKey: ["market"] });
          }}
        />
      ) : null}
      {list.isPending ? <div className="mt-5 h-40 animate-pulse rounded-3xl bg-secondary" /> : null}
      {list.isError ? (
        <div className="mt-5">
          <EmptyState title="Market unavailable" body="Listings could not be loaded." />
        </div>
      ) : null}
      {!list.isPending && !list.isError && !list.data?.length ? (
        <div className="mt-5">
          <EmptyState title={q.trim() ? "Nothing matched" : "Nothing for sale yet"} body={q.trim() ? "No listing uses those words." : "Sell is how the first item gets here. Nothing is invented."} />
        </div>
      ) : null}
      <ul className="mt-5 grid grid-cols-2 gap-3">
        {(list.data ?? []).map((item) => (
          <li key={item.id}>
            <Link to="/market/$listingId" params={{ listingId: item.id }} className="block overflow-hidden rounded-2xl bg-card ring-1 ring-border">
              {item.image ? (
                <img src={item.image} alt="" className="aspect-4/3 w-full object-cover" />
              ) : (
                <div className="grid aspect-4/3 place-items-center bg-secondary text-xs uppercase tracking-wide text-muted-foreground">{item.category}</div>
              )}
              <div className="space-y-1 p-3">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="text-sm">{formatNaira(item.priceKobo)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  @{item.sellerHandle}
                  {item.status === "sold" ? " · Sold" : ""}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function SellForm({ onDone }: { onDone: () => Promise<void> }) {
  const [kind, setKind] = useState<ListingKind>("goods");
  const [category, setCategory] = useState<ListingCategory>("other");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [naira, setNaira] = useState("");
  const [priceNote, setPriceNote] = useState("asking");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const publish = useMutation({
    mutationFn: () => {
      const priceKobo = koboFromNairaInput(naira);
      if (priceKobo == null) throw new Error("Enter a price in naira.");
      return createMarketListing({
        data: { kind, category, title, description, priceKobo, priceNote, location, image: image || undefined },
      });
    },
    onSuccess: async (result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError("");
      await onDone();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "That listing was not published."),
  });

  return (
    <form
      className="mt-5 space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border"
      onSubmit={(event) => {
        event.preventDefault();
        publish.mutate();
      }}
    >
      <p className="text-sm font-medium">What are you selling?</p>
      <div className="grid grid-cols-3 gap-2">
        {(["goods", "service", "stay"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setKind(item)} className={cn("h-10 rounded-full text-sm capitalize", kind === item ? "bg-ink text-paper" : "ring-1 ring-border")}>
            {item}
          </button>
        ))}
      </div>
      <label className="block text-xs font-medium">
        Category
        <select value={category} onChange={(event) => setCategory(event.target.value as ListingCategory)} className="mt-1 h-11 w-full rounded-xl bg-background px-3 text-sm ring-1 ring-border">
          {CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium">
        Title
        <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 h-11 w-full rounded-xl bg-background px-3 text-sm ring-1 ring-border" />
      </label>
      <label className="block text-xs font-medium">
        Description
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-20 w-full rounded-xl bg-background p-3 text-sm ring-1 ring-border" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-medium">
          Price (₦)
          <input value={naira} inputMode="decimal" onChange={(event) => setNaira(event.target.value)} placeholder="15000" className="mt-1 h-11 w-full rounded-xl bg-background px-3 text-sm ring-1 ring-border" />
        </label>
        <label className="block text-xs font-medium">
          Note
          <input value={priceNote} onChange={(event) => setPriceNote(event.target.value)} className="mt-1 h-11 w-full rounded-xl bg-background px-3 text-sm ring-1 ring-border" />
        </label>
      </div>
      <label className="block text-xs font-medium">
        Location
        <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Campus, or where you can meet" className="mt-1 h-11 w-full rounded-xl bg-background px-3 text-sm ring-1 ring-border" />
      </label>
      <label className="block text-xs font-medium">
        Photo, optional
        <input
          type="file"
          accept="image/*"
          className="mt-1 block w-full text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (file.size > 350_000) {
              setError("Use a photo under 350KB.");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => setImage(typeof reader.result === "string" ? reader.result : "");
            reader.readAsDataURL(file);
          }}
        />
      </label>
      {image ? <img src={image} alt="" className="h-28 rounded-xl object-cover" /> : null}
      {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
      <button type="submit" disabled={publish.isPending} className="h-11 rounded-full bg-ink px-4 text-sm font-medium text-paper disabled:opacity-50">
        {publish.isPending ? "Publishing…" : "Publish listing"}
      </button>
    </form>
  );
}
