import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Avatar } from "@/components/unibud/person";
import { Button } from "@/components/ui/button";
import { personByHandle } from "@/lib/unibud/catalog";
import { relativeTime } from "@/lib/unibud/format";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { SpillReply } from "@/lib/unibud/spill-data";

export const Route = createFileRoute("/_app/riff/$id")({ component: RiffThread });

function RiffThread() {
  const { id } = Route.useParams();
  const { user } = useCurrentUserState();
  const spill = useCampusStore((s) => s.spills.find((x) => x.id === id));
  const replySpill = useCampusStore((s) => s.replySpill);
  const followRiff = useCampusStore((s) => s.followRiff);
  const followed = useCampusStore((s) => (s.followedRiffs ?? []).includes(id));
  const [draft, setDraft] = useState("");
  const [parent, setParent] = useState<string | undefined>();

  if (!spill) {
    return (
      <main className="px-5 py-10">
        <p className="text-sm text-muted-foreground">That Riff is gone.</p>
        <Link to="/riff" className="mt-3 inline-block text-sm font-medium">
          Back to Riff
        </Link>
      </main>
    );
  }

  const person = personByHandle(spill.authorHandle);
  const name = person?.name ?? spill.authorHandle;

  function send() {
    if (!draft.trim()) return;
    const reply: SpillReply = {
      id: `r-${Date.now()}`,
      authorHandle: "you",
      body: draft.trim(),
      parentId: parent,
      createdAt: new Date().toISOString(),
    };
    replySpill(spill!.id, reply);
    setDraft("");
    setParent(undefined);
  }

  return (
    <main className="safe-bottom px-5 pt-6">
      <Link to="/riff" className="text-xs font-medium text-muted-foreground">
        Riff
      </Link>
      <div className="mt-4 flex gap-3">
        <Avatar name={name} className="size-12" />
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">
            @{spill.authorHandle} · {relativeTime(spill.createdAt)}
          </p>
        </div>
      </div>
      <p className="mt-4 text-base leading-relaxed">{spill.body}</p>
      <Button className="mt-4" size="sm" variant={followed ? "outline" : "primary"} onClick={() => followRiff(id)}>
        {followed ? "Following this conversation" : "Follow conversation"}
      </Button>

      <h2 className="mt-8 text-sm font-medium">Conversation</h2>
      <ul className="mt-3 space-y-3">
        {spill.replies.map((r) => {
          const who = personByHandle(r.authorHandle);
          const parentBody = r.parentId ? spill.replies.find((x) => x.id === r.parentId)?.body : null;
          return (
            <li key={r.id} className="rounded-2xl bg-card p-3 ring-1 ring-border">
              <p className="text-xs text-muted-foreground">
                {who?.name ?? r.authorHandle} · {relativeTime(r.createdAt)}
              </p>
              {parentBody ? (
                <p className="mt-1 text-[11px] text-muted-foreground">Replying: {parentBody}</p>
              ) : null}
              <p className="mt-1 text-sm">{r.body}</p>
              <button type="button" className="mt-2 text-xs font-medium" onClick={() => setParent(r.id)}>
                Reply
              </button>
            </li>
          );
        })}
      </ul>

      {user ? (
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          {parent ? (
            <p className="mb-1 text-xs text-muted-foreground">
              Replying to a reply ·{" "}
              <button type="button" onClick={() => setParent(undefined)}>
                cancel
              </button>
            </p>
          ) : null}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Join the conversation"
            className="min-h-16 w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none"
          />
          <Button className="mt-2" size="sm" type="submit" disabled={!draft.trim()}>
            Reply
          </Button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">Sign in to reply.</p>
      )}
    </main>
  );
}
