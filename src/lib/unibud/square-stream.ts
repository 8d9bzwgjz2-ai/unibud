import { boiling, campusContextual, rankPosts, type RankContext } from "./rank";
import type { FeedPost } from "./types";

export type SquareLane = "on-stream" | "quad-drop" | "buddies" | "peek" | "off-rails";

export const SQUARE_LANES: { id: SquareLane; label: string }[] = [
  { id: "on-stream", label: "On Stream" },
  { id: "quad-drop", label: "Quad Drop" },
  { id: "buddies", label: "Buddies" },
  { id: "peek", label: "Peek" },
  { id: "off-rails", label: "Off the Rails" },
];

export function isVideoPost(post: FeedPost) {
  return post.kind === "reel" || Boolean(post.video);
}

export function likeKey(id: string) {
  return id.split("~")[0] ?? id;
}

/** Repeat a finite catalog so Square never hits an artificial end. */
export function loopStream<T extends { id: string }>(source: T[], count: number): T[] {
  if (!source.length || count <= 0) return [];
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    const src = source[i % source.length];
    const lap = Math.floor(i / source.length);
    out.push(lap === 0 ? src : { ...src, id: `${src.id}~${lap}` });
  }
  return out;
}

export function postsForLane(
  posts: FeedPost[],
  lane: SquareLane,
  ctx: RankContext,
  connections: string[],
): FeedPost[] {
  if (lane === "on-stream") return rankPosts(posts, ctx);
  if (lane === "quad-drop") return campusContextual(posts, ctx);
  if (lane === "buddies") {
    const circle = new Set([...ctx.following, ...connections]);
    return rankPosts(
      posts.filter((p) => circle.has(p.authorHandle)),
      ctx,
    );
  }
  if (lane === "peek") return rankPosts(posts.filter(isVideoPost), ctx);
  return boiling(posts, ctx);
}
