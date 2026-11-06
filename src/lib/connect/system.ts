/**
 * Connect is a system, not a single page.
 * These are the only places a person can move through. None of them invent people.
 */
export const CONNECT_LANES = [
  {
    id: "connect",
    label: "Connect",
    to: "/connect",
    detail: "Search a real account, follow, or request. Not dating, trips, or classes.",
  },
  {
    id: "soulync",
    label: "SouLync",
    to: "/connect/soulync",
    detail: "Dating cards for accounts that opted in. A match opens Chat.",
  },
  {
    id: "wayward",
    label: "Wayward",
    to: "/connect/wayward",
    detail: "Tours, places, nights, and activities people organize. Each plan has a chat.",
  },
  {
    id: "chat",
    label: "Chat",
    to: "/messages",
    detail: "A sent message is stored for the other account and shows in their Chat.",
  },
  {
    id: "profile",
    label: "Profile",
    to: "/profile",
    detail: "How you appear if someone opens you from Connect.",
  },
  {
    id: "square",
    label: "Square",
    to: "/",
    detail: "Public presence. Connect does not fill Square with people.",
  },
  {
    id: "quad",
    label: "Quad",
    to: "/communities",
    detail: "Social communities and groups. Not classes.",
  },
  {
    id: "bud",
    label: "Bud",
    to: "/bud",
    detail: "Ask about Connect in the same conversation. Bud uses this map.",
  },
] as const;

export type ConnectLane = (typeof CONNECT_LANES)[number];

export function connectSystemBrief() {
  return [
    "CONNECT SYSTEM — real UNIBUD places only. Do not invent students, matches, events, or threads.",
    ...CONNECT_LANES.map((lane) => `${lane.label} ${lane.to}: ${lane.detail}`),
  ].join("\n");
}
