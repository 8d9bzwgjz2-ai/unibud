import { createFileRoute, Link } from "@tanstack/react-router";
import { Banknote, CalendarDays, Megaphone, Newspaper, Sparkles, Store, Tag } from "lucide-react";

export const Route = createFileRoute("/_app/spark")({ component: SparkGateway });

/** Spark gateway: wider student-life services. Only capabilities that exist are linked. */
const AVAILABLE = [
  { to: "/market", label: "Marketplace", note: "Buy and browse listings", icon: Store },
  { to: "/sell", label: "Sell", note: "List something of yours", icon: Tag },
  { to: "/money", label: "Money", note: "Your wallet and requests", icon: Banknote },
  { to: "/live", label: "Live", note: "Live sessions", icon: CalendarDays },
  { to: "/riff", label: "Riff", note: "Campus conversations", icon: Megaphone },
  { to: "/news", label: "Opportunities & notices", note: "Deadlines, scholarships, admissions", icon: Newspaper },
] as const;

const NOT_CONNECTED = ["Food", "Transport", "Services", "Shopping partners"];

function SparkGateway() {
  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker flex items-center gap-1.5">
        <Sparkles className="size-3.5" aria-hidden /> Spark
      </p>
      <h1 className="mt-1 font-display text-4xl">Everything else in student life</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Not everything needs to be visible. Everything needs to be reachable.
      </p>
      <ul className="mt-6 grid gap-2">
        {AVAILABLE.map(({ to, label, note, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
              <Icon className="size-5 text-muted-foreground" />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{note}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <details className="mt-6 text-sm">
        <summary className="cursor-pointer text-muted-foreground">Not connected yet</summary>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {NOT_CONNECTED.join(", ")} need real providers that aren’t connected to this build, so they aren’t offered here.
        </p>
      </details>
    </main>
  );
}
