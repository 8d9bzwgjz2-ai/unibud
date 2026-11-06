import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getWayward, joinWayward, sendWayward } from "@/lib/places/server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/connect/wayward/$id")({ component: PlanPage });

function PlanPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const plan = useQuery({ queryKey: ["wayward-plan", id], queryFn: () => getWayward({ data: id }), refetchInterval: 3000 });

  async function send() {
    const result = await sendWayward({ data: { id, body } });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBody("");
    setError("");
    await qc.invalidateQueries({ queryKey: ["wayward-plan", id] });
    await qc.invalidateQueries({ queryKey: ["convos"] });
  }

  if (plan.isPending) return <div className="m-5 h-40 animate-pulse rounded-3xl bg-secondary" />;
  if (!plan.data?.ok) {
    return (
      <main className="px-5 py-8">
        <p className="text-sm text-muted-foreground">{plan.data?.error ?? "This plan could not be opened."}</p>
        <Link to="/connect/wayward" className="mt-3 inline-block text-sm">Back to Wayward</Link>
      </main>
    );
  }
  const data = plan.data;
  return (
    <main className="thread-screen">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <Link to="/connect/wayward" className="text-xs text-muted-foreground">Wayward</Link>
        <h1 className="font-display text-2xl">{data.plan.title}</h1>
        <p className="text-xs capitalize text-muted-foreground">{data.plan.lane} · {data.plan.place} · {data.plan.when_text} · {data.members} going</p>
        <p className="mt-1 text-sm">{data.plan.details}</p>
        <p className="mt-1 text-xs text-muted-foreground">Organized by {data.plan.name} (@{data.plan.handle})</p>
      </div>
      {data.joined ? (
        <>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5">
            {data.messages.map((message) => (
              <div key={message.id} className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm", message.mine ? "ml-auto bg-ink text-paper" : "bg-secondary")}>
                {!message.mine ? <p className="mb-1 text-[11px] font-medium text-muted-foreground">{message.sender}</p> : null}
                {message.body}
              </div>
            ))}
            {!data.messages.length ? <p className="text-center text-sm text-muted-foreground">No messages yet. The first one reaches everyone who joined.</p> : null}
          </div>
          {error ? <p className="shrink-0 px-4 text-sm text-muted-foreground">{error}</p> : null}
          <form className="sheet-safe flex shrink-0 gap-2 border-t border-border px-3 pt-3" onSubmit={(event) => { event.preventDefault(); void send(); }}>
            <input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Message the plan" aria-label="Message" className="h-11 min-w-0 flex-1 rounded-full bg-secondary px-4 text-sm outline-none" />
            <button type="submit" className="h-11 rounded-full bg-ink px-4 text-sm text-paper">Send</button>
          </form>
        </>
      ) : (
        <div className="px-5 py-8">
          <p className="text-sm text-muted-foreground">Join to read the chat and to be counted as going.</p>
          <button type="button" className="mt-4 h-11 rounded-full bg-ink px-4 text-sm text-paper" onClick={() => { void joinWayward({ data: { id } }).then(() => qc.invalidateQueries({ queryKey: ["wayward-plan", id] })); }}>Join</button>
        </div>
      )}
    </main>
  );
}
