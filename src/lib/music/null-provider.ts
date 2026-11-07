import type { MusicBusiness, MusicProvider, SearchQuery } from "./types";
import { UNPROVISIONED_CAPABILITIES } from "./types";

const EMPTY = { tracks: [] as const, artists: [] as const, albums: [] as const };

/** Honest empty catalogue. No fabricated licensed tracks. */
export const NULL_PROVIDER: MusicProvider = {
  id: "unibud-none",
  name: "UNIBUD Music",
  status: "unprovisioned",
  reason:
    "UNIBUD attaches licensed music to posts. It is not a streaming app. A catalogue partner (Apple Music, Spotify, or another licensed provider) is not connected yet — search stays empty. You can still sample original audio from other people.",
  async search(_q: SearchQuery) {
    return [];
  },
  async browse() {
    return { tracks: [], artists: [], albums: [] };
  },
  async artist() {
    return null;
  },
  async album() {
    return null;
  },
  async track() {
    return null;
  },
  async playback() {
    return null;
  },
  async licensing() {
    return null;
  },
  async listenLink() {
    return null;
  },
  capabilities: UNPROVISIONED_CAPABILITIES,
};

export const MUSIC_BUSINESS: MusicBusiness = {
  adsSupported: false,
  premiumSubscription: false,
  creatorPayout: false,
  royaltyAccounting: false,
};

let active: MusicProvider = NULL_PROVIDER;

export function musicProvider() {
  return active;
}

/** Swap in a licensed partner when an agreement exists. */
export function setMusicProvider(next: MusicProvider) {
  active = next;
}

void EMPTY;
