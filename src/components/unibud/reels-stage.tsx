import { useEffect, useMemo, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { personByHandle } from "@/lib/unibud/catalog";
import { isVideoPost, likeKey, loopStream } from "@/lib/unibud/square-stream";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { Link } from "@tanstack/react-router";
import type { FeedPost } from "@/lib/unibud/types";
import { cn } from "@/lib/utils";

export function ReelsStage({ source, startId }: { source: FeedPost[]; startId?: string }) {
  const reels = useMemo(() => source.filter(isVideoPost), [source]);
  const [n, setN] = useState(() => Math.max(16, reels.length * 3));
  const items = useMemo(() => loopStream(reels, n), [reels, n]);
  const scroller = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    started.current = false;
  }, [startId]);

  useEffect(() => {
    const root = scroller.current;
    const el = sentinel.current;
    if (!root || !el || !reels.length) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setN((v) => v + Math.max(reels.length, 6));
      },
      { root, rootMargin: "1200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reels.length, items.length]);

  useEffect(() => {
    if (!startId || started.current || !scroller.current) return;
    const node = scroller.current.querySelector(`[data-reel="${CSS.escape(startId)}"]`);
    if (node) {
      node.scrollIntoView();
      started.current = true;
    }
  }, [startId, items.length]);

  function goNext(from: number) {
    const root = scroller.current;
    if (!root) return;
    const slides = root.querySelectorAll<HTMLElement>("[data-reel]");
    const next = slides[from + 1];
    if (next) next.scrollIntoView({ behavior: "smooth", block: "start" });
    if (from > items.length - 5) setN((v) => v + Math.max(reels.length, 6));
  }

  if (!reels.length) {
    return <p className="px-5 py-12 text-center text-sm text-muted-foreground">No video posts yet.</p>;
  }

  return (
    <div
      ref={scroller}
      className="h-dvh snap-y snap-mandatory overflow-y-auto overscroll-y-contain bg-ink"
    >
      {items.map((p, i) => (
        <ReelSlide key={p.id} post={p} onEnded={() => goNext(i)} />
      ))}
      <div ref={sentinel} className="h-24 snap-start" aria-hidden />
    </div>
  );
}

function ReelSlide({ post, onEnded }: { post: FeedPost; onEnded: () => void }) {
  const wrap = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  const person = personByHandle(post.authorHandle);
  const key = likeKey(post.id);
  const liked = useCampusStore((s) => s.liked[key]);
  const count = useCampusStore((s) => s.likeCounts[key] ?? 0);
  const toggleLike = useCampusStore((s) => s.toggleLike);
  const originals = useCampusStore((s) => s.originalAudios ?? []);
  const audio = originals.find((a) => a.audioId === post.audioId || a.sourceContentId === key);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        const vis = e.isIntersecting && e.intersectionRatio >= 0.65;
        setOn(vis);
      },
      { threshold: [0.2, 0.65, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (on) void v.play().catch(() => {});
    else v.pause();
  }, [on]);

  useEffect(() => {
    if (post.video || !on) return;
    const t = window.setTimeout(() => onEnded(), 7000);
    return () => window.clearTimeout(t);
  }, [on, post.video, post.id]);

  return (
    <section
      ref={wrap}
      data-reel={post.id}
      className="relative flex h-dvh snap-start snap-always flex-col justify-end"
    >
      {post.video ? (
        <video
          ref={video}
          src={post.video}
          poster={post.image}
          className="absolute inset-0 size-full object-cover"
          muted
          playsInline
          onEnded={onEnded}
        />
      ) : (
        <img src={post.image} alt="" className="absolute inset-0 size-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-ink/20" />
      <div className="relative z-10 flex items-end justify-between px-5 pb-6">
        <div className="min-w-0 pr-4">
          <p className="text-sm font-semibold text-paper">
            {person?.name ?? post.authorHandle}
            <span className="ml-1 font-normal text-paper/70">@{post.authorHandle}</span>
          </p>
          <p className="mt-1 text-sm leading-relaxed text-paper">{post.body}</p>
          {audio ? (
            <Link to="/audio/$id" params={{ id: audio.audioId }} className="mt-2 block text-xs text-paper/80">
              Original audio · {audio.creatorHandle ? `${audio.creatorHandle} · ` : ""}
              {audio.title}
              {audio.usageCount > 1 ? ` · ${audio.usageCount} uses` : ""}
            </Link>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => toggleLike(key)}
          className={cn("grid size-11 place-items-center text-paper", liked && "text-bud")}
          aria-label="Like"
        >
          <Heart className={cn("size-6", liked && "fill-bud")} />
          <span className="text-[11px]">{count || ""}</span>
        </button>
      </div>
    </section>
  );
}
