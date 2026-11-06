import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/unibud/empty";
import { SignInCard, useAuthReady } from "@/components/unibud/sign-in-gate";
import { listSaves } from "@/lib/unibud/server";
import { POSTS } from "@/lib/unibud/catalog";
import { useCampusStore } from "@/lib/unibud/campus-store";

export const Route = createFileRoute("/_app/saved")({ component: Saved });

function Saved() {
  const { user, isPending } = useAuthReady();
  const savedIds = useCampusStore((s) => s.savedPosts ?? []);
  const savedAudioIds = useCampusStore((s) => s.savedAudioIds ?? []);
  const originals = useCampusStore((s) => s.originalAudios ?? []);
  const localPosts = useCampusStore((s) => s.localPosts);
  const toggleSavePost = useCampusStore((s) => s.toggleSavePost);
  const savedFeed = savedIds
    .map((id) => localPosts.find((p) => p.id === id) ?? POSTS.find((p) => p.id === id))
    .filter(Boolean);
  const q = useQuery({
    queryKey: ["saves"],
    queryFn: () => listSaves(),
    enabled: Boolean(user),
  });
  if (isPending) return <div className="m-4 h-32 animate-pulse rounded-2xl bg-secondary" />;
  if (!user) {
    return (
      <main className="px-4 py-8 md:px-6">
        <h1 className="text-2xl font-medium">Saved</h1>
        <div className="mt-6">
          <SignInCard title="Keep a trail" body="Listings, posts, and Bud threads you want again." />
        </div>
      </main>
    );
  }
  return (
    <main className="px-4 pb-8 md:px-6">
      <h1 className="pt-2 text-2xl font-medium tracking-tight">Saved</h1>
      <p className="mt-1 text-sm text-muted-foreground">Videos and posts you kept. Saved audio is separate.</p>
      {savedAudioIds.length ? (
        <div className="mt-5">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Saved audio</p>
          <ul className="mt-2 space-y-2">
            {originals.filter((a) => savedAudioIds.includes(a.audioId)).map((a) => (
              <li key={a.audioId}>
                <Link to="/audio/$id" params={{ id: a.audioId }} className="text-sm font-medium">
                  Original audio · @{a.creatorHandle} — {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-5 space-y-2">
        {savedFeed.map((p) =>
          p ? (
            <div key={p.id} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Post · @{p.authorHandle}</p>
              <p className="text-sm font-medium">{p.body}</p>
              <button
                type="button"
                className="mt-2 text-xs font-medium"
                onClick={() => toggleSavePost(p.id)}
              >
                Unsave
              </button>
            </div>
          ) : null,
        )}
        {(q.data ?? []).map((s) => (
          <Link
            key={`${s.kind}-${s.item_id}`}
            to={s.href}
            className="block rounded-2xl bg-card px-4 py-3 ring-1 ring-border"
          >
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.kind}</p>
            <p className="text-sm font-medium">{s.title}</p>
          </Link>
        ))}
      </div>
      {!savedFeed.length && !q.data?.length ? (
        <EmptyState title="Nothing saved" body="Bookmark a post on Square or a listing in Market." />
      ) : null}
    </main>
  );
}
