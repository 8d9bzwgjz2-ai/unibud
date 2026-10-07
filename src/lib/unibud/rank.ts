import { personByHandle } from "./catalog";
import type { FeedPost } from "./types";

export type RankContext = {
  following: string[];
  interests: string[];
  universityId: string;
  likeCounts: Record<string, number>;
  searches: string[];
};

/** Relevance first. Campus/location is a signal, never the whole score. */
export function scorePost(post: FeedPost, ctx: RankContext): number {
  let score = 0;
  const person = personByHandle(post.authorHandle);
  const hay = `${post.body} ${person?.program ?? ""} ${person?.bio ?? ""}`.toLowerCase();
  if (ctx.following.includes(post.authorHandle)) score += 8;
  if (person?.universityId === ctx.universityId) score += 2;
  for (const interest of ctx.interests) {
    if (interest && hay.includes(interest.toLowerCase())) score += 5;
  }
  for (const q of ctx.searches.slice(0, 4)) {
    const t = q.toLowerCase();
    if (t && hay.includes(t)) score += 3;
  }
  score += Math.min(6, (ctx.likeCounts[post.id] ?? 0) / 12);
  const ageH = (Date.now() - new Date(post.createdAt).getTime()) / 36e5;
  score += Math.max(0, 4 - ageH / 18);
  return score;
}

export function rankPosts(posts: FeedPost[], ctx: RankContext): FeedPost[] {
  return [...posts].sort((a, b) => scorePost(b, ctx) - scorePost(a, ctx));
}

export function campusContextual(posts: FeedPost[], ctx: RankContext): FeedPost[] {
  const ranked = rankPosts(posts, ctx);
  const near = ranked.filter((p) => personByHandle(p.authorHandle)?.universityId === ctx.universityId);
  const farButRelevant = ranked.filter((p) => {
    const person = personByHandle(p.authorHandle);
    if (person?.universityId === ctx.universityId) return false;
    return scorePost(p, ctx) >= 8;
  });
  return [...near, ...farButRelevant];
}

export function boiling(posts: FeedPost[], ctx: RankContext): FeedPost[] {
  return [...posts].sort((a, b) => {
    const ea = (ctx.likeCounts[a.id] ?? 0) + scorePost(a, ctx) * 0.2;
    const eb = (ctx.likeCounts[b.id] ?? 0) + scorePost(b, ctx) * 0.2;
    return eb - ea;
  });
}
