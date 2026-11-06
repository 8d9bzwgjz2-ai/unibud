import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/live")({ component: Live });

function Live() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState(["Amaka: light is good from the second gate.", "Tunde: don’t pay off-platform."]);
  const [draft, setDraft] = useState("");

  return (
    <main className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden bg-tone-night text-paper">
      <img src="/covers/campus-night.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-70" />
      <div className="absolute inset-0 bg-ink/40" />
      <div className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col justify-between px-5 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div>
          <p className="kicker">Live</p>
          <h1 className="mt-2 font-display text-4xl text-paper">Faculty night, from the floor.</h1>
          <p className="mt-2 max-w-sm text-sm text-paper/80">Mock broadcast. Nobody is actually streaming.</p>
        </div>
        <div className="flex items-end justify-between">
          <Button variant="outline" className="border-paper/30 bg-ink/40 text-paper" onClick={() => setOpen(true)}>
            <MessageCircle className="size-4" />
            Live Chat
          </Button>
          <span className="text-xs text-paper/70">Safe-area controls</span>
        </div>
      </div>

      {open ? (
        <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl bg-background text-foreground shadow-soft">
          <div className="flex items-center justify-between px-4 pt-4">
            <p className="text-sm font-semibold">Live Chat</p>
            <button type="button" className="grid size-11 place-items-center" onClick={() => setOpen(false)} aria-label="Close">
              <X className="size-4" />
            </button>
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto px-4 py-2">
            {lines.map((l, i) => (
              <p key={i} className="text-sm">
                {l}
              </p>
            ))}
          </div>
          <form
            className="sheet-safe flex gap-2 px-4 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              setLines((x) => [...x, `You: ${draft.trim()}`]);
              setDraft("");
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Say something…"
              className={cn("h-11 flex-1 rounded-full bg-secondary px-4 text-sm outline-none")}
            />
            <Button type="submit" size="sm">
              Send
            </Button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
