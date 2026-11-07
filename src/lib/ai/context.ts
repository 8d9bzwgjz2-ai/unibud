/**
 * Conversation context budgeting for every Oracle Arc call.
 *
 * Models are sent a bounded window, not an unbounded transcript: newest turns
 * win, and a trimmed window never starts on an assistant turn (an orphaned
 * reply reads as a request to continue it).
 */
import type { ArcMessage } from "./oracle-arc";

export const DEFAULT_CONTEXT_CHARS = 12_000;
export const DEFAULT_CONTEXT_TURNS = 24;

export function trimHistory(
  history: ArcMessage[],
  opts: { maxChars?: number; maxTurns?: number } = {},
): ArcMessage[] {
  const maxChars = opts.maxChars ?? DEFAULT_CONTEXT_CHARS;
  const maxTurns = opts.maxTurns ?? DEFAULT_CONTEXT_TURNS;
  const kept: ArcMessage[] = [];
  let used = 0;

  for (let i = history.length - 1; i >= 0 && kept.length < maxTurns; i -= 1) {
    const turn = history[i];
    if (!turn) continue;
    const size = turn.content.length;
    if (used + size > maxChars) break;
    kept.push(turn);
    used += size;
  }

  kept.reverse();
  while (kept.length && kept[0]?.role === "assistant") kept.shift();
  return kept;
}
