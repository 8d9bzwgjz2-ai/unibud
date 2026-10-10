import { composeTimeline, type ExportBackend } from "../compose";
import type { MixTrack, StudioClip, StudioOverlay } from "../types";

export type ExportContainer = "webm" | "mp4" | "unknown";

export type ExportResult = {
  blob: Blob;
  mime: string;
  container: ExportContainer;
  videoCodec: string;
  audioCodec: string;
  engine: ExportBackend;
  notes: string[];
};

export type ExportJob = {
  clips: StudioClip[];
  overlays: StudioOverlay[];
  effectId: string;
  aspect?: string;
  chroma?: { on: boolean; plate: string; tolerance: number; feather: number };
  mix?: MixTrack[];
  originalAudio?: boolean;
};

function sniffContainer(mime: string, blob: Blob): ExportContainer {
  if (mime.includes("mp4") || mime.includes("m4a")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (blob.type.includes("mp4")) return "mp4";
  if (blob.type.includes("webm")) return "webm";
  return "unknown";
}

export function webCodecsSupport() {
  const video = typeof VideoEncoder !== "undefined";
  const audio = typeof AudioEncoder !== "undefined";
  return {
    videoEncoder: video,
    audioEncoder: audio,
    /** Chunk encode ≠ MP4 file. Muxer is a separate dependency. */
    mp4Muxer: false,
  };
}

export function pickExportEngine(): ExportBackend {
  const wc = webCodecsSupport();
  if (wc.videoEncoder && wc.mp4Muxer) return "webcodecs";
  if (typeof MediaRecorder !== "undefined") return "mediarecorder";
  return "ffmpeg";
}

async function mediaRecorderEngine(job: ExportJob): Promise<ExportResult> {
  const out = await composeTimeline(job);
  const mime = out.blob.type || "video/webm";
  return {
    blob: out.blob,
    mime,
    container: sniffContainer(mime, out.blob),
    videoCodec: mime.includes("vp9") ? "vp9" : mime.includes("vp8") ? "vp8" : "unknown",
    audioCodec: mime.includes("opus") ? "opus" : "unknown",
    engine: "mediarecorder",
    notes: [
      ...out.notes,
      "Container is WebM from MediaRecorder, not MP4.",
      "WebCodecs VideoEncoder may exist on this device but no MP4 muxer is bundled.",
    ],
  };
}

async function webCodecsEngine(job: ExportJob): Promise<ExportResult> {
  const wc = webCodecsSupport();
  if (!wc.videoEncoder || !wc.mp4Muxer) {
    const fallback = await mediaRecorderEngine(job);
    fallback.notes = [
      wc.videoEncoder
        ? "VideoEncoder is present. MP4 muxing (mp4box / fmp4) is not in this build."
        : "WebCodecs VideoEncoder is unavailable here.",
      ...fallback.notes,
    ];
    return fallback;
  }
  throw new Error("WebCodecs muxer not wired");
}

async function ffmpegEngine(_job: ExportJob): Promise<ExportResult> {
  throw new Error("Server FFmpeg export is not connected.");
}

export async function runExport(job: ExportJob): Promise<ExportResult> {
  const engine = pickExportEngine();
  if (engine === "webcodecs") return webCodecsEngine(job);
  if (engine === "ffmpeg") return ffmpegEngine(job);
  return mediaRecorderEngine(job);
}
