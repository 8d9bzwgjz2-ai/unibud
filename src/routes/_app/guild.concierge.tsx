import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CONCIERGE_ACTIONS, CONCIERGE_DUTY } from "@/lib/places/reply";
import { askConcierge, listConcierge } from "@/lib/places/server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/guild/concierge")({ component: Concierge });

function Concierge() {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const thread = useQuery({ queryKey: ["concierge"], queryFn: () => listConcierge() });
  const ask = useMutation({
    mutationFn: (text: string) => askConcierge({ data: { body: text } }),
    onSuccess: async (result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError("");
      setBody("");
      await qc.invalidateQueries({ queryKey: ["concierge"] });
    },
  });

  return (
    <main className="thread-screen">
      <div className="shrink-0 px-5 pt-6">
        <p className="kicker">Guild</p>
        <h1 className="mt-1 font-display text-4xl">Concierge</h1>
        <p className="mt-2 text-sm text-muted-foreground">This desk is not Bud. Its duty stays here.</p>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
          <h2 className="font-display text-2xl">On duty</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {CONCIERGE_DUTY.map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className="tabular text-muted-foreground">{index + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
          <h3 className="mt-5 text-sm font-medium">Actions</h3>
          <p className="mt-1 text-xs text-muted-foreground">Each one opens that place. Nothing is booked or paid from here.</p>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {CONCIERGE_ACTIONS.map((action) => (
              <li key={action.to}>
                <Link to={action.to} className="block rounded-2xl bg-secondary px-3 py-3">
                  <span className="block text-sm font-medium">{action.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{action.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-4 h-11 w-full rounded-full bg-ink text-sm font-medium text-paper disabled:opacity-50"
            disabled={ask.isPending}
            onClick={() => ask.mutate("What is your duty, and which actions can you take?")}
          >
            Ask it to state its duty
          </button>
        </section>
        {(thread.data ?? []).map((message) => (
          <div key={message.id} className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm", message.role === "user" ? "ml-auto bg-ink text-paper" : "bg-card ring-1 ring-border")}>
            {message.body}
          </div>
        ))}
        {!thread.isPending && !thread.data?.length ? <p className="text-sm text-muted-foreground">The thread stays empty until you ask. The duty above is always on this desk, not in Bud.</p> : null}
      </div>
      {error ? <p className="px-5 text-sm text-muted-foreground">{error}</p> : null}
      <form className="sheet-safe flex shrink-0 gap-2 border-t border-border px-3 pt-3" onSubmit={(event) => { event.preventDefault(); ask.mutate(body); }}>
        <input value={body} onChange={(event) => setBody(event.target.value)} placeholder="What do you need?" aria-label="Request" className="h-11 min-w-0 flex-1 rounded-full bg-secondary px-4 text-sm outline-none" />
        <button type="submit" disabled={ask.isPending || !body.trim()} className="h-11 rounded-full bg-ink px-4 text-sm text-paper disabled:opacity-50">Send</button>
      </form>
    </main>
  );
}