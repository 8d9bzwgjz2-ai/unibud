import type { MixTrack } from "@/lib/studio/types";
import { musicProvider } from "./null-provider";
import type { Entitlement, MusicRef, PlaybackSource, SearchQuery, Track } from "./types";

/** UNIBUD Music Service — Mix never talks to a file picker for commercial tracks. */
export const UnibudMusic = {
  status() {
    return musicProvider().status;
  },
  reason() {
    return musicProvider().reason;
  },
  ready() {
    return musicProvider().status === "ready";
  },
  search(q: SearchQuery) {
    return musicProvider().search(q);
  },
  browse() {
    return musicProvider().browse();
  },
  track(id: string) {
    return musicProvider().track(id);
  },
  preview(trackId: string) {
    return musicProvider().playback(trackId, "preview");
  },
  playable(trackId: string) {
    return musicProvider().playback(trackId, "stream");
  },
  licensing(trackId: string) {
    return musicProvider().licensing(trackId);
  },
  listenLink(trackId: string) {
    return musicProvider().listenLink(trackId);
  },
  capabilities() {
    return musicProvider().capabilities;
  },
  async select(track: Track, startMs = 0): Promise<{ mix: MixTrack; ref: MusicRef; play: PlaybackSource | null }> {
    const play = track.rights.studioUse ? await musicProvider().playback(track.id, "stream") : await musicProvider().playback(track.id, "preview");
    const ref: MusicRef = {
      providerId: track.providerId,
      trackId: track.id,
      title: track.title,
      artistName: track.artistName,
      artwork: track.artwork,
      startMs,
      durationMs: track.durationMs,
      entitlement: track.entitlement,
    };
    const mix: MixTrack = {
      id: `cat-${track.id}`,
      kind: "catalogue",
      name: track.artistName ? `${track.title} · ${track.artistName}` : track.title,
      src: play?.url,
      volume: 0.8,
      mute: false,
      fadeIn: 0,
      fadeOut: 0,
      start: startMs / 1000,
      trackId: track.id,
      providerId: track.providerId,
      artistName: track.artistName,
    };
    return { mix, ref, play };
  },
  entitlementLabel(e: Entitlement) {
    if (e === "unavailable") return "Not available here";
    if (e === "preview") return "Preview only";
    if (e === "premium") return "Needs Music+";
    if (e === "ads") return "With ads";
    return "Licensed";
  },
};
