import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Avatar } from "@/components/unibud/person";
import { EmptyState } from "@/components/unibud/empty";
import { useAuthReady } from "@/components/unibud/sign-in-gate";
import { Input } from "@/components/ui/input";
import { relativeTime } from "@/lib/unibud/format";
import { listConversations, openDirect } from "@/lib/social/server";
import { searchConnect } from "@/lib/connect/server";

export const Route = createFileRoute("/_app/messages")({ component: ChatList });

function ChatList() {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { user, isPending } = useAuthReady();
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const convos = useQuery({
    queryKey: ["convos"],
    queryFn: () => listConversations(),
    enabled: Boolean(user),
    refetchInterval: 4000,
  });
  const people = useQuery({
    queryKey: ["chat-people", q],
    queryFn: () => searchConnect({ data: { q: q.replace(/^@+/, ""), kind: "people" } }),
    enabled: Boolean(user) && q.trim().length >= 2,
  });

  async function message(handle: string) {
    setNote("");
    const result = await openDirect({ data: { handle } });
    if (!result.ok) {
      setNote(result.error);
      return;
    }
    await router.navigate({ to: "/messages/$id", params: { id: result.id } });
  }

  if (pathname !== "/messages" && pathname !== "/messages/") return <Outlet />;

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Communication layer</p>
      <h1 className="mt-1 font-display text-4xl">Chat</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Direct messages, plus rooms and plans you have joined. What you send is stored for the other person.
      </p>

      {isPending ? <div className="mt-5 h-40 animate-pulse rounded-2xl bg-secondary" /> : null}

      {!isPending ? (
        <div className="mt-5">
          <Input
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setNote("");
            }}
            placeholder="Search a username"
            aria-label="Search a username"
          />
          {note ? <p className="mt-2 text-sm text-muted-foreground">{note}</p> : null}
          {q.trim().length >= 2 ? (
            <ul className="mt-3 space-y-2">
              {(people.data?.people ?? []).map((person) => (
                <li key={person.userId} className="flex items-center gap-3 rounded-2xl bg-card px-3 py-2 ring-1 ring-border">
                  <Avatar name={person.displayName || person.handle} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{person.displayName || person.handle}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{person.handle}
                      {person.username && person.username !== person.handle ? ` · @${person.username}` : ""}
                    </p>
                  </div>
                  <button type="button" className="h-9 rounded-full px-3 text-sm ring-1 ring-border" onClick={() => void message(person.handle)}>
                    Message
                  </button>
                </li>
              ))}
              {people.data && !people.data.people.length ? (
                <li className="text-sm text-muted-foreground">No one with that username.</li>
              ) : null}
            </ul>
          ) : null}
          <div className="mt-3">
          {(convos.data?.directs ?? []).map((c) => (
            <Link
              key={c.id}
              to="/messages/$id"
              params={{ id: c.id }}
              className="flex items-center gap-3 rounded-2xl px-1 py-3 hover:bg-secondary"
            >
              <Avatar name={c.peerName || c.peerHandle} className="size-12" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{c.peerName || `@${c.peerHandle}`}</p>
                  <span className="text-xs text-muted-foreground">{relativeTime(c.updatedAt)}</span>
                </div>
                <p className="truncate text-sm text-muted-foreground">{c.lastBody || "No messages yet"}</p>
              </div>
            </Link>
          ))}
          </div>
          {(convos.data?.rooms ?? []).length ? (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rooms and plans</p>
              {(convos.data?.rooms ?? []).map((room) => (
                <a key={`${room.kind}-${room.id}`} href={room.href} className="flex items-center gap-3 rounded-2xl px-1 py-3 hover:bg-secondary">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{room.title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {room.lastBody ? `${room.senderName ? `${room.senderName}: ` : ""}${room.lastBody}` : "No messages yet"}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : null}
          {!user || (!(convos.data?.directs.length) && !(convos.data?.rooms.length)) ? (
            <EmptyState
              title="No conversations"
              body="Search a username to message someone you are connected with. Nothing is invented here."
            />
          ) : null}
        </div>
      ) : null}
    </main>
  );
}