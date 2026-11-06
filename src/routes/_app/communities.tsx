import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { EmptyState } from "@/components/unibud/empty";
import { createBoardRoom, joinBoardRoom, listBoardHome } from "@/lib/board/server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/communities")({ component: Communities });

function Communities() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/communities" && pathname !== "/communities/") return <Outlet />;
  return <Quad />;
}

function Quad() {
  const router = useRouter();
  const qc = useQueryClient();
  const [kind, setKind] = useState<"community" | "group">("community");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const home = useQuery({ queryKey: ["quad-home"], queryFn: () => listBoardHome({ data: { scope: "social" } }) });

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Social</p>
      <h1 className="mt-1 font-display text-4xl">Quad</h1>
      <p className="mt-2 text-sm text-muted-foreground">Communities and groups people start. Academic rooms stay on Board. A message in a room reaches the other members.</p>
      <div className="mt-4 flex gap-2">
        <Link to="/connect/soulync" className="inline-flex h-10 items-center rounded-full px-4 text-sm ring-1 ring-border">SouLync</Link>
        <Link to="/connect/wayward" className="inline-flex h-10 items-center rounded-full px-4 text-sm ring-1 ring-border">Wayward</Link>
        <Link to="/market" className="inline-flex h-10 items-center rounded-full px-4 text-sm ring-1 ring-border">Market</Link>
      </div>
      <form
        className="mt-5 space-y-2 rounded-2xl bg-card p-4 ring-1 ring-border"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          void createBoardRoom({ data: { kind, title, subtitle: body } }).then(async (result) => {
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setTitle("");
            setBody("");
            await qc.invalidateQueries({ queryKey: ["quad-home"] });
            await router.navigate({ to: "/board/room/$id", params: { id: result.id } });
          });
        }}
      >
        <div className="flex gap-2">
          {(["community", "group"] as const).map((item) => (
            <button key={item} type="button" onClick={() => setKind(item)} className={cn("h-10 rounded-full px-4 text-sm capitalize", kind === item ? "bg-ink text-paper" : "ring-1 ring-border")}>{item}</button>
          ))}
        </div>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Name" aria-label="Name" className="h-11 w-full rounded-xl bg-background px-3 text-sm ring-1 ring-border" />
        <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="What this is for" aria-label="Detail" className="min-h-16 w-full rounded-xl bg-background p-3 text-sm ring-1 ring-border" />
        {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
        <button type="submit" className="h-11 rounded-full bg-ink px-4 text-sm text-paper">Start</button>
      </form>
      <ul className="mt-5 space-y-3">
        {(home.data?.rooms ?? []).map((room) => (
          <li key={room.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{room.kind}</p>
            <p className="mt-1 font-medium">{room.title}</p>
            <p className="text-xs text-muted-foreground">{room.members} {room.members === 1 ? "member" : "members"}</p>
            {room.last_body ? <p className="mt-2 truncate text-sm">{room.last_sender}: {room.last_body}</p> : null}
            <div className="mt-3">
              {room.joined ? (
                <Link to="/board/room/$id" params={{ id: room.id }} className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm text-paper">Open</Link>
              ) : (
                <button type="button" className="h-10 rounded-full px-4 text-sm ring-1 ring-border" onClick={() => { void joinBoardRoom({ data: { id: room.id } }).then(() => qc.invalidateQueries({ queryKey: ["quad-home"] })); }}>Join</button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!home.isPending && !home.data?.rooms.length ? (
        <div className="mt-5"><EmptyState title="No communities yet" body="Start the first one. Nothing social is copied from Board." /></div>
      ) : null}
    </main>
  );
}
