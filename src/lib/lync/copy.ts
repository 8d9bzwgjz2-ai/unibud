/**
 * Lync — the UNIBUD sharing streak. Natural, social language only; never
 * "streak" in user-facing copy. Pure module: shared by server and client.
 */

/**
 * How many consecutive days of qualifying sharing activate a Lync.
 * Configurable product threshold — no invented behavior.
 */
export const LYNC_ACTIVATION_DAYS = 3;

export type LyncView = {
  exists: boolean;
  count: number;
  active: boolean;
  startedOn?: string;
  lastShareOn?: string;
  nextMilestone?: { days: number; label: string } | null;
  rewardReady: boolean;
};

export const NO_LYNC: LyncView = { exists: false, count: 0, active: false, rewardReady: false };

function dayDiff(a: string, b: string) {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
}

/** Natural-language status line for the current real state. */
export function lyncMessage(s: LyncView, today: string): string {
  if (!s.exists) return "Share your day to start a Lync.";
  const last = s.lastShareOn ?? today;
  const gap = dayDiff(today, last);
  if (gap >= 2) return "You broke your Lync. Share today to start a new one.";
  if (!s.active) {
    return s.count <= 1
      ? "Lync started. Share again tomorrow to keep it going."
      : "Your Lync is growing. Keep sharing and it comes alive.";
  }
  if (s.rewardReady) return "Your Lync bonus is ready.";
  const milestone = s.nextMilestone;
  if (milestone) {
    const daysTo = milestone.days - s.count;
    if (daysTo === 0) return "Your Lync reached a milestone.";
    if (daysTo === 1) return "1 day to your first bonus.";
    if (daysTo === 2) return "2 days to your first bonus.";
    if (daysTo <= 14) return `Next Lync bonus: ${daysTo} days away.`;
  }
  return `Your Lync is alive. Day ${s.count}.`;
}
