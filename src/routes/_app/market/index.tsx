import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import { CATEGORIES } from "@/lib/unibud/catalog";
import type { ListingCategory } from "@/lib/unibud/types";
import { ListingCard } from "@/components/listing-card";
import { cn } from "@/lib/utils";

type Search = { cat?: ListingCategory | "all" };

export const Route = createFileRoute("/_app/market/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    cat: typeof s.cat === "string" ? (s.cat as Search["cat"]) : "all",
  }),
  component: Market,
});

function Market() {
  const catalog = useLoaderData({ from: "/_app" });
  const { cat = "all" } = Route.useSearch();
  const listings =
    cat === "all" ? catalog.listings : catalog.listings.filter((l) => l.category === cat);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-widest text-bud uppercase">Marketplace</p>
          <h1 className="mt-1 font-display text-4xl">What campus is selling</h1>
        </div>
        <Link
          to="/sell"
          className="inline-flex h-11 items-center rounded-md bg-paper px-4 text-sm font-medium text-ink"
        >
          List something
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip to="/market" search={{ cat: "all" }} active={cat === "all"}>
          All
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.id} to="/market" search={{ cat: c.id }} active={cat === c.id}>
            {c.label}
          </Chip>
        ))}
      </div>

      {listings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing in this lane yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  children,
  active,
  to,
  search,
}: {
  children: string;
  active: boolean;
  to: "/market";
  search: Search;
}) {
  return (
    <Link
      to={to}
      search={search}
      className={cn(
        "inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium",
        active ? "bg-paper text-ink" : "border border-border text-muted-foreground hover:bg-secondary",
      )}
    >
      {children}
    </Link>
  );
}
