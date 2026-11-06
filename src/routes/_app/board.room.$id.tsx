import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getBoardRoom, joinBoardRoom, sendBoardMessage } from "@/lib/board/server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/board/room/$id")({ component: BoardRoom });

function BoardRoom() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const room = useQuery({
    queryKey: ["board-room", id],
    queryFn: () => getBoardRoom({ data: id }),
    refetchInterval: 4000,
  });

  async function send() {
    try {
      const result = await sendBoardMessage({ data: { roomId: id, body } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      setError("");
      await qc.invalidateQueries({ queryKey: ["board-room", id] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That message was not sent.");
    }
  }

  if (room.isPending) return <div className="m-5 h-40 animate-pulse rounded-3xl bg-secondary" />;
  if (!room.data?.ok) {
    return (
      <main className="px-5 py-8">
        <p className="text-sm text-muted-foreground">{room.data?.error ?? "This room could not be opened."}</p>
        <Link to="/board" className="mt-3 inline-block text-sm font-medium">Back to Board</Link>
      </main>
    );
  }

  const data = room.data;
  return (
    <main className="thread-screen">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <Link to={data.room.kind === "group" || data.room.kind === "community" ? "/communities" : "/board"} className="text-xs text-muted-foreground">
          {data.room.kind === "group" || data.room.kind === "community" ? "Quad" : "Board"}
        </Link>
        <h1 className="font-display text-2xl">{data.room.title}</h1>
        <p className="text-xs capitalize text-muted-foreground">{data.room.kind} · {data.members} {data.members === 1 ? "member" : "members"}</p>
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
            {!data.messages.length ? <p className="text-center text-sm text-muted-foreground">No messages yet. The first one starts the room.</p> : null}
          </div>
          {error ? <p className="shrink-0 px-4 pt-2 text-sm text-muted-foreground">{error}</p> : null}
          <form
            className="sheet-safe flex shrink-0 gap-2 border-t border-border px-3 pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Message the room" aria-label="Message" className="h-11 min-w-0 flex-1 rounded-full bg-secondary px-4 text-sm outline-none" />
            <button type="submit" className="h-11 shrink-0 rounded-full bg-ink px-4 text-sm font-medium text-paper">Send</button>
          </form>
        </>
      ) : (
        <div className="px-5 py-8">
          <p className="text-sm text-muted-foreground">Join to read and send messages. Nothing from this room is shown before you do.</p>
          <button
            type="button"
            className="mt-4 h-11 rounded-full bg-ink px-4 text-sm text-paper"
            onClick={() => {
              void joinBoardRoom({ data: { id } }).then(() => qc.invalidateQueries({ queryKey: ["board-room", id] }));
            }}
          >
            Join room
          </button>
        </div>
      )}
    </main>
  );
}
