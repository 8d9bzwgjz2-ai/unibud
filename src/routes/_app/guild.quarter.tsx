import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Compass, ShoppingBag, Wallet } from "lucide-react";

export const Route = createFileRoute("/_app/guild/quarter")({ component: Quarter });

function Quarter() {
  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Guild</p>
      <h1 className="mt-1 font-display text-4xl">The Quarter</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Buy and sell with other accounts. A listing appears when someone publishes it. No payment is taken here.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Link to="/market" className="rounded-2xl bg-card p-4 ring-1 ring-border">
          <ShoppingBag className="size-4 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Marketplace</p>
          <p className="mt-1 text-xs text-muted-foreground">Goods, food, services, and stays</p>
        </Link>
        <Link to="/market" className="rounded-2xl bg-card p-4 ring-1 ring-border">
          <Building2 className="size-4 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Stays</p>
          <p className="mt-1 text-xs text-muted-foreground">Rooms people have listed</p>
        </Link>
        <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
          <Compass className="size-4 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Discover</p>
          <p className="mt-1 text-xs text-muted-foreground">Search what is actually for sale</p>
        </div>
        <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
          <Wallet className="size-4 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Money</p>
          <p className="mt-1 text-xs text-muted-foreground">Payments are not connected</p>
        </div>
      </div>
      <Link to="/market" className="mt-5 inline-flex h-11 items-center rounded-full bg-ink px-4 text-sm font-medium text-paper">
        Open Market
      </Link>
    </main>
  );
}
