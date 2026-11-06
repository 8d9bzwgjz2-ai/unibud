import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { EmptyState } from "@/components/unibud/empty";
import { useAuthReady } from "@/components/unibud/sign-in-gate";
import { createBoardNotice, listBoardHome } from "@/lib/board/server";

export const Route = createFileRoute("/_app/news")({ component: News });

function News() {
  const { user } = useAuthReady();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const home = useQuery({
    queryKey: ["board-home"],
    queryFn: () => listBoardHome(),
    enabled: Boolean(user),
  });

  async function publish() {
    setBusy(true);
    setError("");
    const result = await createBoardNotice({ data: { title, body } });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTitle("");
    setBody("");
    await qc.invalidateQueries({ queryKey: ["board-home"] });
  }

  const news = home.data?.news ?? [];

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Academic information</p>
      <h1 className="mt-1 font-display text-4xl">Educational News</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Notices published on Board show up here. Nothing is listed until someone writes one.
      </p>
      <form
        className="mt-4 space-y-2 rounded-2xl bg-card p-4 ring-1 ring-border"
        onSubmit={(event) => {
          event.preventDefault();
          void publish();
        }}
      >
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Notice title" className="h-11 w-full rounded-xl bg-background px-3 text-sm ring-1 ring-border outline-none" />
        <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="What should people know?" className="min-h-20 w-full rounded-xl bg-background p-3 text-sm ring-1 ring-border outline-none" />
        {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
        <button type="submit" disabled={busy} className="h-11 rounded-full bg-ink px-4 text-sm font-medium text-paper disabled:opacity-50">
          {busy ? "Publishing…" : "Publish notice"}
        </button>
      </form>
      <ul className="mt-4 space-y-3">
        {news.map((item) => (
          <li key={item.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
            <p className="font-medium">{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
            <p className="mt-2 text-xs text-muted-foreground">@{item.handle}</p>
          </li>
        ))}
      </ul>
      {!home.isPending && !news.length ? (
        <div className="mt-4">
          <EmptyState title="No notices" body="Exam dates and announcements appear after they are published on Board." action={<Link to="/board" className="text-sm font-medium">Open Board</Link>} />
        </div>
      ) : null}
    </main>
  );
}
