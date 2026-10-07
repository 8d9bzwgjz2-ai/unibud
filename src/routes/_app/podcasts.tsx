import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { EDU_PODCASTS } from "@/lib/unibud/podcast-data";
import { relativeTime } from "@/lib/unibud/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/podcasts")({ component: Podcasts });

function Podcasts() {
  const [playing, setPlaying] = useState<string | null>(null);

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Educational audio</p>
      <h1 className="mt-1 font-display text-4xl">Podcasts</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Lecturer-created audio lessons. Listening later does not affect Board attendance.
      </p>
      <ul className="mt-5 space-y-3">
        {EDU_PODCASTS.map((p) => {
          const on = playing === p.id;
          return (
            <li key={p.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <p className="text-[11px] font-semibold tracking-wide text-bud uppercase">
                {p.course} · Episode {p.episode}
              </p>
              <h2 className="mt-1 font-medium">{p.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {p.lecturer} · {p.subject} · {p.topic}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {p.programme} · {p.duration} · {relativeTime(p.publishedAt)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant={on ? "outline" : "primary"} onClick={() => setPlaying(on ? null : p.id)}>
                  {on ? "Pause" : "Listen"}
                </Button>
                {p.classId ? (
                  <Link
                    to="/communities/$id"
                    params={{ id: p.classId }}
                    className="inline-flex h-8 items-center rounded-full px-3 text-xs ring-1 ring-border"
                  >
                    Class space
                  </Link>
                ) : null}
              </div>
              {on ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Demo playback. This is recorded access — not live attendance.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
