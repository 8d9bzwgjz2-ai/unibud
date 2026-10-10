import { createFileRoute, Link, useLoaderData, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Bookmark, Heart, MessageCircle, MoreHorizontal, Play, Share2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/unibud/person";
import { CampusMoments } from "@/components/unibud/campus-moments";
import { ReelsStage } from "@/components/unibud/reels-stage";
import { EmptyState } from "@/components/unibud/empty";
import { communityById, personByHandle, POSTS } from "@/lib/unibud/catalog";
import { relativeTime } from "@/lib/unibud/format";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { useStudioStore } from "@/lib/studio/store";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { isVideoPost, likeKey, loopStream, postsForLane, SQUARE_LANES, type SquareLane } from "@/lib/unibud/square-stream";
import { addSquareReply, getMyProfile, toggleCommentLike as toggleDbCommentLike, togglePostLike, toggleSave } from "@/lib/unibud/server";
import { deleteMyPost, editMyPost } from "@/lib/social/server";
import { toast } from "sonner";
import type { DiscoveryItem, FeedPost } from "@/lib/unibud/types";

const EMPTY_REPLIES: import("@/lib/unibud/spill-data").SpillReply[] = [];

export const Route = createFileRoute("/_app/")({ component: Square });

function Square() {
  const catalog = useLoaderData({ from: "/_app" });
  const [lane, setLane] = useState<SquareLane>("on-stream");
  const [peekStart, setPeekStart] = useState<string | undefined>();
  const [shown, setShown] = useState(10);
  const localPosts = useCampusStore((s) => s.localPosts);
  const { user } = useCurrentUserState();
  const myProfile = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getMyProfile(),
    enabled: Boolean(user),
  });
  const myHandle = myProfile.data?.handle;
  const following = useCampusStore((s) => s.following);
  const connections = useCampusStore((s) => s.connections);
  const interests = useCampusStore((s) => s.interests);
  const likeCounts = useCampusStore((s) => s.likeCounts);
  const searches = useCampusStore((s) => s.recentSearches);
  const homeCampusId = useCampusStore((s) => s.homeCampusId);
  const hiddenPosts = useCampusStore((s) => s.hiddenPosts);
  const setComposeOpen = useCampusStore((s) => s.setComposeOpen);
  const setDropOpen = useCampusStore((s) => s.setDropOpen);
  const setSquareView = useCampusStore((s) => s.setSquareView);

  const catalogPosts: FeedPost[] = catalog.posts.map((p) => {
    const seed = POSTS.find((x) => x.id === p.id);
    return seed ? { ...p, video: seed.video ?? p.video, kind: seed.kind ?? p.kind, image: p.image ?? seed.image } : p;
  });
  const extra = POSTS.filter((p) => !catalogPosts.some((c) => c.id === p.id));
  const merged = [
    ...localPosts.map((p) => ({
      id: p.id,
      communityId: p.communityId ?? "unilag-campus",
      authorHandle: p.authorHandle,
      body: p.body,
      createdAt: p.createdAt,
      image: p.image,
      video: p.video,
      kind: p.kind,
      audioId: p.audioId,
    })),
    ...catalogPosts,
    ...extra,
  ].filter((p) => !hiddenPosts.includes(p.id) && !hiddenPosts.includes(likeKey(p.id)));
  const rankCtx = {
    following,
    interests,
    universityId: homeCampusId || "unilag",
    likeCounts,
    searches,
  };
  const lanePosts = postsForLane(merged, lane, rankCtx, connections);
  const stream = useMemo(() => loopStream(lanePosts, shown), [lanePosts, shown]);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    const saved = sessionStorage.getItem("unibud-square-mode");
    if (saved === "peek" || saved === "reels") {
      sessionStorage.removeItem("unibud-square-mode");
      setLane("peek");
      setSquareView("peek");
    }
  }, [setSquareView]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || lane === "peek") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setShown((n) => n + 12);
      },
      { rootMargin: "1200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [lane, stream.length]);

  function openPeek(id: string) {
    setPeekStart(id);
    setLane("peek");
    setSquareView("peek");
  }

  function chooseLane(v: SquareLane) {
    setLane(v);
    setSquareView(v === "peek" ? "peek" : "feed");
    if (v !== "peek") setPeekStart(undefined);
    setShown(10);
  }

  return (
    <main className="bg-card">
      {lane === "peek" ? (
        <div className="relative bg-ink">
          <div className="absolute top-0 right-0 left-0 z-20 px-4 py-3">
            <StreamPicker lane={lane} onChange={chooseLane} dark />
          </div>
          <ReelsStage source={lanePosts.length ? lanePosts : merged} startId={peekStart} />
        </div>
      ) : (
        <>
          <div className="px-4 pt-3">
            <p className="kicker">The UNIBUD world</p>
            <div className="mt-1 flex items-start justify-between gap-3">
              <h1 className="font-display text-5xl font-medium">Square</h1>
              <button
                type="button"
                className="grid size-11 place-items-center text-2xl leading-none text-ink"
                aria-label="Drop"
                onClick={() => setDropOpen(true)}
              >
                +
              </button>
            </div>
          </div>
          <div className="mt-3">
            <CampusMoments
              signedIn
              onCreate={() => {
                const studio = useStudioStore.getState();
                studio.setIntent("story");
                studio.setMode("story");
                studio.setDest("story");
                studio.setView("camera");
                setComposeOpen(true);
              }}
            />
          </div>
          <StreamPicker lane={lane} onChange={chooseLane} />
          <LaneFeed
            lane={lane}
            stream={stream}
            discovery={lane === "off-rails" ? (catalog.discovery ?? []) : []}
            sentinel={sentinel}
            onOpenPeek={openPeek}
            myHandle={myHandle}
          />
        </>
      )}
    </main>
  );
}

function StreamPicker({
  lane,
  onChange,
  dark,
}: {
  lane: SquareLane;
  onChange: (v: SquareLane) => void;
  dark?: boolean;
}) {
  const [busy, setBusy] = useState<SquareLane | null>(null);

  function pick(id: SquareLane) {
    if (id === lane) return;
    setBusy(id);
    onChange(id);
    window.setTimeout(() => setBusy(null), 180);
  }

  return (
    <nav
      className={cn("square-lanes", !dark && "mt-3")}
      aria-label="Square feeds"
      data-dark={dark ? "true" : undefined}
    >
      {SQUARE_LANES.map((item) => {
        const on = lane === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className="square-lane"
            data-on={on ? "true" : undefined}
            data-busy={busy === item.id ? "true" : undefined}
            aria-current={on ? "page" : undefined}
            onClick={() => pick(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function LaneFeed({
  lane,
  stream,
  discovery,
  sentinel,
  onOpenPeek,
  myHandle,
}: {
  lane: SquareLane;
  stream: FeedPost[];
  discovery: DiscoveryItem[];
  sentinel: React.RefObject<HTMLDivElement | null>;
  onOpenPeek: (id: string) => void;
  myHandle?: string;
}) {
  if (!stream.length) {
    const copy =
      lane === "buddies"
        ? { title: "Buddies is quiet", body: "Connect with people and follow a few voices. Their posts land here." }
        : lane === "quad-drop"
          ? { title: "Nothing on Quad Drop yet", body: "Campus and university activity will gather here as people post." }
          : { title: "Square is still waking up", body: "Drop something, or come back as the world starts moving." };
    return (
      <div className="px-4 py-8">
        <EmptyState title={copy.title} body={copy.body} />
      </div>
    );
  }

  return (
    <div className="mt-1">
      {stream.map((p, i) => {
        const spark = lane === "off-rails" && discovery.length ? discovery[i % discovery.length] : null;
        const showSpark = Boolean(spark) && i > 0 && i % 5 === 0 && !p.id.includes("~");
        return (
          <div key={p.id}>
            {showSpark && spark ? <DiscoveryCard item={spark} /> : null}
            <FeedItem post={p} onOpenPeek={onOpenPeek} myHandle={myHandle} />
          </div>
        );
      })}
      <div ref={sentinel} className="h-16" aria-hidden />
    </div>
  );
}

function DiscoveryCard({ item }: { item: DiscoveryItem }) {
  return (
    <article className="border-b border-border px-5 py-4">
      <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">{item.kicker}</p>
      <p className="mt-1 text-sm font-semibold">{item.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
    </article>
  );
}

function postUrl(id: string) {
  if (typeof window === "undefined") return `/?p=${id}`;
  return `${window.location.origin}/?p=${likeKey(id)}`;
}

async function sharePost(post: FeedPost) {
  const url = postUrl(post.id);
  try {
    if (navigator.share) {
      await navigator.share({ title: "UNIBUD", text: post.body, url });
      return;
    }
  } catch {
    /* cancelled */
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied.");
  } catch {
    toast.message(url);
  }
}

function FeedItem({ post, onOpenPeek, myHandle }: { post: FeedPost; onOpenPeek: (id: string) => void; myHandle?: string }) {
  const router = useRouter();
  const isMine = Boolean(myHandle) && post.authorHandle === myHandle;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body);
  const [saving, setSaving] = useState(false);
  const person = personByHandle(post.authorHandle);
  const community = communityById(post.communityId);
  const key = likeKey(post.id);
  const liked = useCampusStore((s) => s.liked[key]);
  const count = useCampusStore((s) => s.likeCounts[key] ?? 0);
  const toggleLike = useCampusStore((s) => s.toggleLike);
  const localReplies = useCampusStore((s) => s.postReplies[key] ?? EMPTY_REPLIES);
  const addPostReply = useCampusStore((s) => s.addPostReply);
  const hidePost = useCampusStore((s) => s.hidePost);
  const saved = useCampusStore((s) => (s.savedPosts ?? []).includes(key));
  const toggleSavePost = useCampusStore((s) => s.toggleSavePost);
  const { user } = useCurrentUserState();
  const catalog = useLoaderData({ from: "/_app" });
  const dbReplies = (catalog.replies ?? [])
    .filter((r) => r.postId === key)
    .map((r) => ({
      id: r.id,
      authorHandle: r.authorHandle,
      body: r.body,
      parentId: r.parentId,
      createdAt: r.createdAt,
    }));
  const localIds = new Set(localReplies.map((r) => r.id));
  const replies = [...dbReplies.filter((r) => !localIds.has(r.id)), ...localReplies];
  const following = useCampusStore((s) => s.following);
  const follow = useCampusStore((s) => s.follow);
  const unfollow = useCampusStore((s) => s.unfollow);
  const reportPost = useCampusStore((s) => s.reportPost);
  const originals = useCampusStore((s) => s.originalAudios ?? []);
  const commentLikes = useCampusStore((s) => s.commentLikes ?? {});
  const toggleCommentLike = useCampusStore((s) => s.toggleCommentLike);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [reply, setReply] = useState("");
  const [parent, setParent] = useState<string | undefined>();
  const name = person?.name ?? post.authorHandle;
  const isFollowed = following.includes(post.authorHandle);
  const audio = originals.find((a) => a.audioId === post.audioId || a.sourceContentId === key);

  async function saveEdit() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await editMyPost({ data: { postId: key, body: draft.trim() } });
      setEditing(false);
      void router.invalidate();
      toast.success("Post updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update this post.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await deleteMyPost({ data: key });
      hidePost(key);
      void router.invalidate();
      toast.success("Post deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete this post.");
    }
  }

  return (
    <article className="border-b border-border px-5 py-4">
      <div className="flex gap-3">
        <Link to="/u/$handle" params={{ handle: post.authorHandle }}>
          <Avatar name={name} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                <Link to="/u/$handle" params={{ handle: post.authorHandle }} className="hover:underline">
                  {name}
                </Link>
                {person?.verified ? (
                  <BadgeCheck className="ml-1 inline size-3.5 text-bud" />
                ) : null}
                <span className="ml-1 font-normal text-muted-foreground">@{post.authorHandle}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {community ? (
                  <Link
                    to="/communities/$id"
                    params={{ id: community.id }}
                    className="font-medium text-bud"
                  >
                    {community.name}
                  </Link>
                ) : null}
                {community ? " · " : null}
                {relativeTime(post.createdAt)}
              </p>
            </div>
            <div className="relative">
              <button
                type="button"
                className="grid size-9 place-items-center text-muted-foreground"
                aria-label="More"
                onClick={() => setMenu((v) => !v)}
              >
                <MoreHorizontal className="size-4" />
              </button>
              {menu ? (
                <div className="absolute top-9 right-0 z-10 w-44 rounded-xl bg-card p-1 ring-1 ring-border">
                  {isMine ? (
                    <>
                      <button
                        type="button"
                        className="block w-full rounded-lg px-3 py-2 text-left text-xs"
                        onClick={() => {
                          setEditing(true);
                          setMenu(false);
                        }}
                      >
                        Edit post
                      </button>
                      <button
                        type="button"
                        className="block w-full rounded-lg px-3 py-2 text-left text-xs text-destructive"
                        onClick={() => {
                          setMenu(false);
                          void remove();
                        }}
                      >
                        Delete post
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="block w-full rounded-lg px-3 py-2 text-left text-xs"
                    onClick={() => {
                      if (isFollowed) unfollow(post.authorHandle);
                      else follow(post.authorHandle);
                      setMenu(false);
                    }}
                  >
                    {isFollowed ? "Unfollow" : "Follow"} @{post.authorHandle}
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded-lg px-3 py-2 text-left text-xs"
                    onClick={() => {
                      void navigator.clipboard.writeText(postUrl(post.id)).then(
                        () => toast.success("Link copied."),
                        () => toast.message(postUrl(post.id)),
                      );
                      setMenu(false);
                    }}
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded-lg px-3 py-2 text-left text-xs"
                    onClick={() => {
                      hidePost(key);
                      setMenu(false);
                      toast.success("Hidden from Feed on this device.");
                    }}
                  >
                    Hide this
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded-lg px-3 py-2 text-left text-xs text-destructive"
                    onClick={() => {
                      reportPost(key);
                      setMenu(false);
                      toast.success("Reported. It won’t show here again.");
                    }}
                  >
                    Report
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          {editing ? (
            <div className="mt-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="h-20 w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none"
                aria-label="Edit post"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={saving || !draft.trim()}
                  onClick={() => void saveEdit()}
                  className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setDraft(post.body);
                  }}
                  className="rounded-full bg-secondary px-4 py-2 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-relaxed">{post.body}</p>
          )}
          {audio ? (
            <Link
              to="/audio/$id"
              params={{ id: audio.audioId }}
              className="mt-2 block text-xs text-muted-foreground"
            >
              ♪ {audio.sourceType === "LICENSED_MUSIC" ? "Music" : "Original audio"} · {audio.title}
              {audio.creatorHandle ? ` · @${audio.creatorHandle}` : ""}
            </Link>
          ) : null}
          {isVideoPost(post) ? (
            <ReelMedia post={post} onOpen={() => onOpenPeek(key)} />
          ) : post.image ? (
            <img src={post.image} alt="" className="mt-3 h-52 w-full rounded-2xl object-cover" />
          ) : null}
          <div className="mt-3 flex items-center gap-4 text-muted-foreground">
            <button
              type="button"
              onClick={() => {
                toggleLike(key);
                if (user) void togglePostLike({ data: key }).catch(() => {});
              }}
              className={cn("inline-flex h-9 items-center gap-1.5 text-sm", liked && "text-bud")}
            >
              <Heart className={cn("size-4", liked && "fill-bud")} />
              {count || ""}
            </button>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-9 items-center gap-1.5 text-sm"
            >
              <MessageCircle className="size-4" />
              {replies.length || ""}
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 text-sm"
              onClick={() => void sharePost(post)}
              aria-label="Share"
            >
              <Share2 className="size-4" />
            </button>
            <button
              type="button"
              className={cn("inline-flex h-9 items-center gap-1.5 text-sm", saved && "text-ink")}
              onClick={() => {
                toggleSavePost(key);
                if (user) {
                  void toggleSave({
                    data: { kind: "post", itemId: key, title: post.body.slice(0, 80), href: "/" },
                  }).catch(() => {});
                }
                toast.success(saved ? "Removed from Saved." : "Saved.");
              }}
              aria-label={saved ? "Unsave" : "Save"}
            >
              <Bookmark className={cn("size-4", saved && "fill-ink")} />
            </button>
          </div>
          {open ? (
            <div className="mt-3 space-y-2">
              {replies.map((r) => {
                const parentBody = r.parentId ? replies.find((x) => x.id === r.parentId)?.body : null;
                return (
                  <div key={r.id} className="rounded-xl bg-secondary px-3 py-2 text-xs">
                    {parentBody ? (
                      <p className="mb-1 text-[11px] text-muted-foreground">Replying: {parentBody}</p>
                    ) : null}
                    <p>
                      <Link
                        to="/u/$handle"
                        params={{ handle: r.authorHandle }}
                        className="font-medium"
                      >
                        @{r.authorHandle}
                      </Link>{" "}
                      {r.body}
                    </p>
                    <div className="mt-1 flex gap-3">
                      <button type="button" className="font-medium" onClick={() => setParent(r.id)}>
                        Reply
                      </button>
                      <button
                        type="button"
                        className={cn("font-medium", commentLikes[r.id] && "text-bud")}
                        onClick={() => {
                          toggleCommentLike(r.id);
                          if (user) void toggleDbCommentLike({ data: r.id }).catch(() => {});
                        }}
                      >
                        {commentLikes[r.id] ? "Liked" : "Like"}
                      </button>
                    </div>
                  </div>
                );
              })}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!reply.trim()) return;
                  addPostReply(key, {
                    id: `pr-${Date.now()}`,
                    authorHandle: "you",
                    body: reply.trim(),
                    parentId: parent,
                    createdAt: new Date().toISOString(),
                  });
                  if (user) {
                    void addSquareReply({
                      data: { postId: key, body: reply.trim(), parentId: parent },
                    }).catch(() => {});
                  }
                  setReply("");
                  setParent(undefined);
                }}
              >
                {parent ? (
                  <p className="mb-1 text-[11px] text-muted-foreground">
                    Replying to a reply ·{" "}
                    <button type="button" onClick={() => setParent(undefined)}>
                      cancel
                    </button>
                  </p>
                ) : null}
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Reply to this post"
                  className="h-10 w-full rounded-full bg-secondary px-4 text-sm outline-none"
                />
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ReelMedia({ post, onOpen }: { post: FeedPost; onOpen: () => void }) {
  const wrap = useRef<HTMLButtonElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting && e.intersectionRatio > 0.5),
      { threshold: [0, 0.5, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v || !post.video) return;
    if (inView) void v.play().catch(() => {});
    else v.pause();
  }, [inView, post.video]);

  return (
    <button
      ref={wrap}
      type="button"
      className="relative mt-3 block w-full overflow-hidden rounded-2xl"
      onClick={onOpen}
      aria-label="Open in Peek"
    >
      {post.video ? (
        <video
          ref={video}
          src={post.video}
          poster={post.image}
          className="aspect-[3/4] max-h-[28rem] w-full object-cover"
          muted
          playsInline
          loop
        />
      ) : (
        <img src={post.image} alt="" className="aspect-[3/4] max-h-[28rem] w-full object-cover" />
      )}
      <span className="absolute inset-0 grid place-items-center bg-ink/10">
        <span className="grid size-12 place-items-center rounded-full bg-ink/70 text-paper">
          <Play className="size-5 fill-paper" />
        </span>
      </span>
    </button>
  );
}
