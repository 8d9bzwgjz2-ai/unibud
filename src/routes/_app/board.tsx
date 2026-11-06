import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { boardIdFor } from "@/lib/unibud/academic";
import { listEnrollments } from "@/lib/academic/server";
import { EmptyState } from "@/components/unibud/empty";
import { useAuthReady } from "@/components/unibud/sign-in-gate";
import {
  createBoardNotice,
  createBoardPost,
  createBoardRoom,
  joinBoardRoom,
  listBoardHome,
} from "@/lib/board/server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/board")({ component: Board });

const TABS = ["classes", "study", "posts", "news"] as const;
type Tab = (typeof TABS)[number];

function Board() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuthReady();
  const [tab, setTab] = useState<Tab>("classes");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [find, setFind] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const enrolled = useQuery({
    queryKey: ["enroll"],
    queryFn: () => listEnrollments(),
    enabled: Boolean(user),
  });
  const home = useQuery({
    queryKey: ["board-home"],
    queryFn: () => listBoardHome({ data: { scope: "academic" } }),
    enabled: Boolean(user),
  });

  if (pathname !== "/board" && pathname !== "/board/") return <Outlet />;

  const needle = find.trim().toLowerCase();
  const rooms = (home.data?.rooms ?? []).filter((room) => {
    const kindOk = tab === "classes" ? room.kind === "class" : tab === "study" ? room.kind === "study" : false;
    if (!kindOk) return false;
    if (!needle) return true;
    return `${room.title} ${room.subtitle} ${room.kind}`.toLowerCase().includes(needle);
  });
  const posts = (home.data?.posts ?? []).filter((post) => !needle || `${post.body} ${post.handle}`.toLowerCase().includes(needle));
  const notices = (home.data?.news ?? []).filter((item) => !needle || `${item.title} ${item.body} ${item.handle}`.toLowerCase().includes(needle));

  async function start() {
    setBusy(true);
    setError("");
    try {
      if (tab === "posts") {
        const result = await createBoardPost({ data: { body: title || body } });
        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else if (tab === "news") {
        const result = await createBoardNotice({ data: { title, body } });
        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else {
        const kind = tab === "classes" ? "class" : "study";
        const result = await createBoardRoom({ data: { kind, title, subtitle: body } });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        await router.navigate({ to: "/board/room/$id", params: { id: result.id } });
      }
      setTitle("");
      setBody("");
      await qc.invalidateQueries({ queryKey: ["board-home"] });
      await qc.invalidateQueries({ queryKey: ["social-card"] });
    } catch {
      setError("That could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Guild</p>
      <h1 className="mt-1 font-display text-4xl">Board</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Classes, study rooms, course posts, and notices. Social communities are on Quad.
      </p>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn("h-9 shrink-0 rounded-full px-4 text-sm capitalize", tab === id ? "bg-ink text-paper" : "bg-card ring-1 ring-border")}
          >
            {id}
          </button>
        ))}
      </div>
      <input
        value={find}
        onChange={(event) => setFind(event.target.value)}
        placeholder="Search Board rooms, posts, and news"
        aria-label="Search Board"
        className="mt-3 h-11 w-full rounded-xl bg-card px-3 text-sm ring-1 ring-border outline-none"
      />

      <form
        className="mt-4 space-y-2 rounded-2xl bg-card p-4 ring-1 ring-border"
        onSubmit={(event) => {
          event.preventDefault();
          void start();
        }}
      >
        <p className="text-sm font-medium">{tab === "posts" ? "New post" : tab === "news" ? "New notice" : "Start a room"}</p>
        {tab === "posts" ? (
          <textarea value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Write a post" className="min-h-20 w-full rounded-xl bg-background p-3 text-sm ring-1 ring-border outline-none" />
        ) : (
          <>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={tab === "news" ? "Notice title" : "Room name"} className="h-11 w-full rounded-xl bg-background px-3 text-sm ring-1 ring-border outline-none" />
            <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={tab === "news" ? "What should people know?" : "Optional detail"} className="min-h-16 w-full rounded-xl bg-background p-3 text-sm ring-1 ring-border outline-none" />
          </>
        )}
        {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
        <button type="submit" disabled={busy} className="h-11 rounded-full bg-ink px-4 text-sm font-medium text-paper disabled:opacity-50">
          {busy ? "Saving…" : tab === "posts" || tab === "news" ? "Publish" : "Create"}
        </button>
      </form>

      {tab === "classes" && (enrolled.data ?? []).length ? (
        <ul className="mt-4 grid gap-3">
          {(enrolled.data ?? []).map((course) => (
            <li key={course.id}>
              <Link to="/board/$id" params={{ id: boardIdFor(course.code) }} className="block rounded-2xl bg-card p-4 ring-1 ring-border">
                <p className="text-[11px] font-semibold tracking-wide uppercase text-bud">{course.code}</p>
                <p className="mt-1 font-medium">{course.title}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "posts" ? (
        <ul className="mt-4 space-y-3">
          {(posts).map((post) => (
            <li key={post.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <p className="text-xs text-muted-foreground">@{post.handle}</p>
              <p className="mt-1 text-sm">{post.body}</p>
            </li>
          ))}
          {!posts.length ? <EmptyState title={needle ? "No posts matched" : "No posts yet"} body={needle ? "Nothing on Board matches that search." : "A post you publish here is yours. It also shows on your profile."} /> : null}
        </ul>
      ) : null}

      {tab === "news" ? (
        <ul className="mt-4 space-y-3">
          {notices.map((item) => (
            <li key={item.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">@{item.handle}</p>
            </li>
          ))}
          {!notices.length ? <EmptyState title={needle ? "No notices matched" : "No notices"} body={needle ? "Nothing on Board matches that search." : "Exam dates and announcements show up when someone publishes them."} /> : null}
        </ul>
      ) : null}

      {tab !== "posts" && tab !== "news" ? (
        <ul className="mt-4 space-y-3">
          {rooms.map((room) => (
            <li key={room.id} className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{room.title}</p>
                <p className="truncate text-xs text-muted-foreground">{room.subtitle || room.kind} · {room.members} {room.members === 1 ? "member" : "members"}</p>
                {room.last_body ? <p className="truncate text-xs">{room.last_sender}: {room.last_body}</p> : null}
              </div>
              {room.joined ? (
                <Link to="/board/room/$id" params={{ id: room.id }} className="h-10 rounded-full bg-ink px-4 text-sm leading-10 text-paper">Open</Link>
              ) : (
                <button
                  type="button"
                  className="h-10 rounded-full px-4 text-sm ring-1 ring-border"
                  onClick={() => {
                    void joinBoardRoom({ data: { id: room.id } }).then(() => qc.invalidateQueries({ queryKey: ["board-home"] }));
                  }}
                >
                  Join
                </button>
              )}
            </li>
          ))}
          {!rooms.length && !(tab === "classes" && (enrolled.data ?? []).length && !needle) ? (
            <EmptyState title={needle ? "No rooms matched" : "Nothing started"} body={needle ? "No Board room matches that search." : "Create the first class or study room. Nothing is listed until someone does."} />
          ) : null}
        </ul>
      ) : null}
    </main>
  );
}
