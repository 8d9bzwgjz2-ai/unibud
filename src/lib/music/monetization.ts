/** Partner money. Revenue stays 0 until a real contract is connected. */

export type Campaign = {
  id: string;
  provider?: string;
  artistId?: string;
  trackId?: string;
  territory?: string;
  label?: string;
  startAt?: string;
  endAt?: string;
  status: "draft" | "live" | "ended";
};

export const REVENUE_POLICY = {
  affiliateLive: false,
  campaignsLive: false,
  creatorPayoutsLive: false,
  revenueKobo: 0,
} as const;
