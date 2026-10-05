import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EDUCATIONAL_NEWS } from "@/lib/unibud/news-data";
import { relativeTime } from "@/lib/unibud/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/news")({ component: News });

const CATS = ["all", "exams", "scholarship", "admission", "deadline", "campus", "opportunity"] as const;

function News() {
  const [cat, setCat] = useState<(typeof CATS)[number]>("all");
  const items = EDUCATIONAL_NEWS.filter((n) => cat === "all" || n.category === cat);

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Academic information</p>
      <h1 className="mt-1 font-display text-4xl">Educational News</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Campus and academic notices from official sources. This is not the Square feed.
      </p>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {CATS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={cn(
              "h-9 shrink-0 rounded-full px-4 text-sm capitalize",
              cat === c ? "bg-ink text-paper" : "bg-card text-muted-foreground ring-1 ring-border",
            )}
          >
            {c}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-card p-5 ring-1 ring-border">
          <p className="font-medium">Current news is unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No news source is connected to UNIBUD yet, so there is nothing real to show. Nothing here is invented.
          </p>
        </div>
      ) : null}
      <ul className="mt-5 space-y-3">
        {items.map((n) => (
          <li key={n.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase">
              <span className="text-bud">{n.category}</span>
              {n.importance === "high" ? <span className="text-destructive">Important</span> : null}
            </div>
            <h2 className="mt-1 font-medium">{n.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              {n.source} · {n.institution} · {n.audience} · {relativeTime(n.date)}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
