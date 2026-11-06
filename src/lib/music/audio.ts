/** First-class UNIBUD audio. Licensed music ≠ original audio ≠ user scratch. */

export type AudioSourceType =
  | "LICENSED_MUSIC"
  | "ORIGINAL_AUDIO"
  | "USER_CREATED_AUDIO"
  | "EXTERNAL_MUSIC_REFERENCE"
  | "BUD_ACADEMIC_MEDIA";
export type AudioStatus = "active" | "reported" | "restricted" | "removed";

export type UnibudAudio = {
  audioId: string;
  sourceType: AudioSourceType;
  title: string;
  creatorHandle?: string;
  artistName?: string;
  artistId?: string;
  sourceContentId?: string;
  durationMs?: number;
  artwork?: string;
  providerId?: string;
  trackId?: string;
  src?: string;
  usageCount: number;
  usedBy: string[];
  createdAt: string;
  status: AudioStatus;
  claimedOriginal: boolean;
  listenUrl?: string;
  licensingStatus?: "cleared" | "preview" | "link-only" | "unavailable";
};

export type AudioReport = {
  id: string;
  audioId: string;
  reason: string;
  createdAt: string;
};

export type AudioSearchHit = {
  audio: UnibudAudio;
  label: "MUSIC" | "ORIGINAL AUDIO";
};

export const RightsManagement = {
  report(audio: UnibudAudio, reason: string): { audio: UnibudAudio; report: AudioReport } {
    return {
      audio: { ...audio, status: audio.status === "removed" ? "removed" : "reported" },
      report: { id: `ar-${Date.now()}`, audioId: audio.audioId, reason, createdAt: new Date().toISOString() },
    };
  },
  takedown(audio: UnibudAudio): UnibudAudio {
    return { ...audio, status: "removed", src: undefined };
  },
  restrict(audio: UnibudAudio): UnibudAudio {
    return { ...audio, status: "restricted" };
  },
};

export function originalFromPublish(input: {
  title: string;
  creatorHandle: string;
  sourceContentId: string;
  durationMs?: number;
  src?: string;
}): UnibudAudio {
  return {
    audioId: `oa-${input.sourceContentId}`,
    sourceType: "ORIGINAL_AUDIO",
    title: input.title,
    creatorHandle: input.creatorHandle,
    sourceContentId: input.sourceContentId,
    durationMs: input.durationMs,
    src: input.src,
    usageCount: 1,
    usedBy: [input.sourceContentId],
    createdAt: new Date().toISOString(),
    status: "active",
    claimedOriginal: true,
  };
}

export function searchAudio(q: string, originals: UnibudAudio[], licensed: UnibudAudio[]): AudioSearchHit[] {
  const n = q.trim().toLowerCase();
  const hit = (a: UnibudAudio): AudioSearchHit => ({
    audio: a,
    label: a.sourceType === "LICENSED_MUSIC" ? "MUSIC" : "ORIGINAL AUDIO",
  });
  const match = (a: UnibudAudio) =>
    !n ||
    a.title.toLowerCase().includes(n) ||
    (a.creatorHandle ?? "").includes(n) ||
    (a.artistName ?? "").toLowerCase().includes(n);
  return [...licensed.filter(match).map(hit), ...originals.filter((a) => a.status !== "removed" && match(a)).map(hit)];
}

export const SEED_ORIGINAL_AUDIO: UnibudAudio[] = [
  {
    audioId: "oa-adaeze-morning",
    sourceType: "ORIGINAL_AUDIO",
    title: "Campus morning voiceover",
    creatorHandle: "adaeze",
    sourceContentId: "p1",
    durationMs: 8400,
    usageCount: 1,
    usedBy: ["p1"],
    createdAt: "2026-08-20T07:12:00.000Z",
    status: "active",
    claimedOriginal: true,
  },
  {
    audioId: "oa-tunde-gate",
    sourceType: "ORIGINAL_AUDIO",
    title: "Second gate at 8am",
    creatorHandle: "tunde",
    sourceContentId: "p2",
    durationMs: 11200,
    usageCount: 1,
    usedBy: ["p2"],
    createdAt: "2026-08-21T08:04:00.000Z",
    status: "active",
    claimedOriginal: true,
  },
];
