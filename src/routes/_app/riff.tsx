import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, Flag, Heart, MessageCircle, Repeat2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/unibud/person";
import { Button } from "@/components/ui/button";
import { communityById, personByHandle } from "@/lib/unibud/catalog";
import { relativeTime } from "@/lib/unibud/format";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import type { SpillPost } from "@/lib/unibud/spill-data";
import { CHALLENGES } from "@/lib/unibud/discover-data";
import { setBudDraft } from "@/lib/bud/draft";

export const Route = createFileRoute("/_app/riff")({ component: Riff });

const TOPICS = ["all", "music", "tech", "games", "culture", "learning", "space"] as const;

function Riff() {
  const { user } = useCurrentUserState();
  const spills = useCampusStore((s) => s.spills);
  const addSpill = useCampusStore((s) => s.addSpill);
  const flagged = useCampusStore((s) => s.flaggedSpills);
  const followed = useCampusStore((s) => s.followedRiffs ?? []);
  const [draft, setDraft] = useState("");
  const [quoting, setQuoting] = useState<string | null>(null);
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>("all");

  const list = useMemo(() => {
    const base = spills.filter((s) => !flagged.includes(s.id));
    if (topic === "all") return base;
    const needle = topic;
    return base.filter((s) => `${s.body} ${s.communityId ?? ""}`.toLowerCase().includes(needle));
  }, [spills, flagged, topic]);

  return (
    <main className="safe-bottom bg-card">
      <header className="px-5 pt-6">
        <p className="kicker">Conversation</p>
        <h1 className="mt-1 font-display text-4xl">Riff</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Short posts that can become a whole conversation. Not Square. Not Chat. Not a profile tab.
        </p>
      </header>

      <div className="mt-4 flex gap-2 overflow-x-auto px-5">
        {TOPICS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTopic(id)}
            className={cn(
              "h-9 shrink-0 rounded-full px-4 text-sm capitalize",
              topic === id ? "bg-ink text-paper" : "bg-card ring-1 ring-border",
            )}
          >
            {id}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto px-5 pb-2">
        {CHALLENGES.map((c) => (
          <button
            key={c.id}
            type="button"
            className="w-44 shrink-0 rounded-2xl bg-secondary p-3 text-left"
            onClick={() => setDraft((d) => d || `${c.title}: ${c.body}`)}
          >
            <p className="text-[11px] font-medium text-bud">{c.joins.toLocaleString()} in</p>
            <p className="mt-1 text-sm font-medium">{c.title}</p>
          </button>
        ))}
      </div>

      {user ? (
        <form
          className="mt-2 border-y border-border px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            addSpill(draft.trim(), "you", quoting ? { quoteId: quoting } : undefined);
            setDraft("");
            setQuoting(null);
          }}
        >
          {quoting ? (
            <p className="mb-2 text-xs text-muted-foreground">
              Quoting a Riff ·{" "}
              <button type="button" className="underline" onClick={() => setQuoting(null)}>
                cancel
              </button>
            </p>
          ) : null}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Start a Riff."
            className="min-h-20 w-full resize-none bg-transparent text-sm outline-none"
          />
          <div className="mt-2 flex justify-end">
            <Button type="submit" size="sm" disabled={!draft.trim()}>
              Drop
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-4 px-5 text-sm text-muted-foreground">Sign in to drop a Riff. You can still read.</p>
      )}

      {followed.length ? (
        <p className="px-5 pt-4 text-xs text-muted-foreground">
          Following {followed.length} conversation{followed.length === 1 ? "" : "s"} on this device.
        </p>
      ) : null}

      <div>
        {list.map((s) => (
          <RiffCard key={s.id} spill={s} onQuote={() => setQuoting(s.id)} />
        ))}
      </div>
    </main>
  );
}

function RiffCard({ spill, onQuote }: { spill: SpillPost; onQuote: () => void }) {
  const person = personByHandle(spill.authorHandle);
  const name = person?.name ?? (spill.authorHandle === "you" ? "You" : spill.authorHandle);
  const community = spill.communityId ? communityById(spill.communityId) : undefined;
  const liked = useCampusStore((s) => s.liked[spill.id]);
  const count = useCampusStore((s) => s.likeCounts[spill.id] ?? 0);
  const toggleLike = useCampusStore((s) => s.toggleLike);
  const flagSpill = useCampusStore((s) => s.flagSpill);
  const followRiff = useCampusStore((s) => s.followRiff);
  const followed = useCampusStore((s) => (s.followedRiffs ?? []).includes(spill.id));
  const quote = spill.quoteId
    ? useCampusStore.getState().spills.find((x) => x.id === spill.quoteId)
    : undefined;

  return (
    <article className="border-b border-border px-5 py-4">
      <div className="flex gap-3">
        <Avatar name={name} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            <Link to="/u/$handle" params={{ handle: spill.authorHandle }} className="hover:underline">
              {name}
            </Link>
            <span className="ml-1 font-normal text-muted-foreground">@{spill.authorHandle}</span>
            <span className="ml-1 font-normal text-muted-foreground">· {relativeTime(spill.createdAt)}</span>
          </p>
          {community ? (
            <Link
              to="/communities/$id"
              params={{ id: community.id }}
              className="text-[11px] font-medium text-bud"
            >
              from {community.name}
            </Link>
          ) : null}
          <p className="mt-2 text-sm leading-relaxed">{spill.body}</p>
          {quote ? (
            <div className="mt-2 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
              @{quote.authorHandle}: {quote.body}
            </div>
          ) : spill.quotedFrom ? (
            <div className="mt-2 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
              From Square · @{spill.quotedFrom.handle}: {spill.quotedFrom.body}
            </div>
          ) : null}
          {spill.video ? (
            <img src={spill.video} alt="" className="mt-3 h-40 w-full rounded-2xl object-cover" />
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-muted-foreground">
            <button
              type="button"
              onClick={() => toggleLike(spill.id)}
              className={cn("inline-flex h-9 items-center gap-1.5 text-sm", liked && "text-bud")}
            >
              <Heart className={cn("size-4", liked && "fill-bud")} />
              {count || ""}
            </button>
            <Link
              to="/riff/$id"
              params={{ id: spill.id }}
              className="inline-flex h-9 items-center gap-1.5 text-sm"
            >
              <MessageCircle className="size-4" />
              {spill.replies.length || ""}
            </Link>
            <button type="button" onClick={onQuote} className="inline-flex h-9 items-center gap-1.5 text-sm" aria-label="Quote">
              <Repeat2 className="size-4" />
            </button>
            <button
              type="button"
              className={cn("inline-flex h-9 items-center gap-1.5 text-sm", followed && "text-ink")}
              onClick={() => followRiff(spill.id)}
              aria-label="Follow conversation"
            >
              <Bookmark className={cn("size-4", followed && "fill-ink")} />
            </button>
            <Link
              to="/bud"
              className="inline-flex h-9 items-center gap-1.5 text-sm"
              aria-label="Ask Bud"
              onClick={() =>
                setBudDraft(`A Riff by @${spill.authorHandle}: “${spill.body}”\nHelp me think about this. Stay as Bud.`)
              }
            >
              <Sparkles className="size-4" />
            </Link>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 text-sm"
              onClick={() => {
                flagSpill(spill.id);
                toast.success("Report noted. This is not The Fixer.");
              }}
              aria-label="Report"
            >
              <Flag className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
