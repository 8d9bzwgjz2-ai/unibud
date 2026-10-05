/** Spark coordinates real specialist work. It never pretends a capability ran. */
import { inferMode, modeHint, type BudMode } from "./modes";
import type { AgentId } from "@/lib/agents/contracts";

export type SpecialistId = Exclude<AgentId, "bud" | "spark">;

const MODE_ROUTE: Record<BudMode, SpecialistId[]> = {
  academic: ["scholar"],
  research: ["oracle", "scholar"],
  writing: ["scholar", "coach"],
  planning: ["coach", "orbit"],
  campus: ["community"],
  general: [],
};

export function routeSpecialists(prompt: string): SpecialistId[] {
  const mode = inferMode(prompt);
  const extra: SpecialistId[] = [];
  const p = prompt.toLowerCase();
  if (/\b(community|group chat|class group|study group|gist|five-a-side|afrobeats)\b/.test(p)) extra.push("community");
  if (/\b(harass|threat|report|unsafe|scam|bully)\b/.test(p)) extra.push("guardian");
  if (/\b(fixer|stuck in life|life problem|relationship|heartbreak|money problem|work problem|need someone to talk|talk to someone|listen to me|i am struggling)\b/.test(p)) extra.push("fixer");
  if (/\b(reel|clip|create|shoot|edit|post this)\b/.test(p)) extra.push("creator");
  if (/\b(diagram|visual|picture this|draw|show me how it looks)\b/.test(p)) extra.push("vision");
  if (/\b(remember|last time|we were|progress|where did we)\b/.test(p)) extra.push("atlas");
  if (/\b(trending|what.?s happening|gist right now|discover|browse|scroll|show me something new|what.?s new)\b/.test(p)) extra.push("pulse", "browser");
  if (/\b(web|search online|look up|find online|source|article|news)\b/.test(p)) extra.push("browser");
  if (/\b(my (instagram|tiktok|youtube)|my posts|my videos|my social|import my|bring my)\b/.test(p)) extra.push("browser");
  if (/\b(podcast|listen|audio|voice note|read (it|this) (out|aloud))\b/.test(p)) extra.push("voice");
  if (/\b(where in unibud|how do i find|take me to|which tab|open |go to |show my )\b/.test(p)) extra.push("navigator");
  const seen = new Set<SpecialistId>();
  return [...MODE_ROUTE[mode], ...extra].filter((id) => !seen.has(id) && seen.add(id));
}

export function sparkSystemNotes(prompt: string): string[] {
  const specialists = routeSpecialists(prompt);
  const notes = [modeHint(inferMode(prompt))];
  if (specialists.includes("guardian")) notes.push("Safety: de-escalate, do not assist harm, and use real safety capabilities only.");
  if (specialists.includes("fixer")) notes.push("Fixer: understand the real-life problem first. Give practical guidance or use a real human/service connection when one is actually available. Never invent a supporter, match, conversation, or intervention.");
  if (specialists.includes("community")) notes.push("Use real Campus, Connect, Chat, or other existing surfaces. Never invent a group or event.");
  if (specialists.includes("navigator")) notes.push("Navigate to real UNIBUD surfaces only. Bud does not duplicate those surfaces internally.");
  if (specialists.includes("pulse")) notes.push("Use current verified activity only. No fabricated trends, events, or campus activity.");
  if (specialists.includes("browser")) notes.push("Use real connected browsing/discovery sources only. Never fabricate external posts, videos, trends, sources, or imports.");
  if (specialists.includes("atlas")) notes.push("Use retrieved continuity when available. Never invent memory.");
  return notes;
}
