import type { TrackRights } from "./types";
import type { UnibudAudio } from "./audio";

export type ContentSurface = "DROP" | "STORY" | "PEAK" | "CHAT" | "COMMUNITY";

export type RightsDecision = {
  useAudio: boolean;
  preview: boolean;
  share: boolean;
  listenExternal: boolean;
  reason?: string;
};

export function rightsForTrack(rights: TrackRights | null, surface: ContentSurface): RightsDecision {
  if (!rights) {
    return { useAudio: false, preview: false, share: false, listenExternal: false, reason: "provider-unprovisioned" };
  }
  if (rights.expiresAt && Date.parse(rights.expiresAt) < Date.now()) {
    return { useAudio: false, preview: false, share: false, listenExternal: true, reason: "expired" };
  }
  const syncSurfaces: ContentSurface[] = ["DROP", "STORY", "PEAK"];
  const useAudio = rights.studioUse && syncSurfaces.includes(surface);
  return {
    useAudio,
    preview: rights.previewSeconds > 0 || rights.stream,
    share: rights.stream || rights.previewSeconds > 0,
    listenExternal: !useAudio,
    reason: useAudio ? undefined : "no-synchronization",
  };
}

export function rightsForOriginal(audio: UnibudAudio, _surface: ContentSurface): RightsDecision {
  if (audio.status === "removed" || audio.status === "restricted") {
    return { useAudio: false, preview: false, share: false, listenExternal: false, reason: audio.status };
  }
  if (audio.sourceType === "LICENSED_MUSIC" && audio.licensingStatus !== "cleared") {
    return { useAudio: false, preview: audio.licensingStatus === "preview", share: true, listenExternal: true, reason: "not-cleared" };
  }
  return { useAudio: true, preview: Boolean(audio.src), share: true, listenExternal: Boolean(audio.listenUrl) };
}
