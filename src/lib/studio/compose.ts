import { effectById } from "./effects";
import { processCanvas } from "./photo";
import { compositeKey, GREEN_KEY } from "./chroma";
import type { MixTrack, StudioClip, StudioOverlay } from "./types";

function wait(ms: number) {
  return new Promise((r) => window.setTimeout(r, ms));
}

function loadVideo(src: string, muted = true) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const v = document.createElement("video");
    v.src = src;
    v.muted = muted;
    v.playsInline = true;
    v.crossOrigin = "anonymous";
    v.onloadedmetadata = () => resolve(v);
    v.onerror = () => reject(new Error("Clip would not load"));
  });
}

function seek(v: HTMLVideoElement, t: number) {
  return new Promise<void>((resolve) => {
    const on = () => {
      v.removeEventListener("seeked", on);
      resolve();
    };
    v.addEventListener("seeked", on);
    v.currentTime = Math.max(0, Math.min(t, v.duration || t));
  });
}

function drawOverlays(ctx: CanvasRenderingContext2D, w: number, h: number, overlays: StudioOverlay[], t: number) {
  overlays.forEach((o) => {
    if (o.start && t < o.start) return;
    if (o.end && t > o.end) return;
    ctx.save();
    ctx.translate((o.x / 100) * w, (o.y / 100) * h);
    ctx.rotate(((o.rot ?? 0) * Math.PI) / 180);
    const size = (o.scale ?? 1) * (o.kind === "sticker" ? w * 0.08 : w * 0.045);
    ctx.font = `600 ${size}px "DM Sans", sans-serif`;
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.fillStyle = "#fff";
    ctx.strokeText(o.text, 0, 0);
    ctx.fillText(o.text, 0, 0);
    ctx.restore();
  });
}

function mimeWithAudio() {
  const opts = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm",
  ];
  return opts.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

async function attachMix(actx: AudioContext, dest: MediaStreamAudioDestinationNode, mix: MixTrack[]) {
  const nodes: { el: HTMLAudioElement; stop: () => void }[] = [];
  for (const t of mix) {
    if (t.mute || !t.src) continue;
    try {
      const el = new Audio(t.src);
      el.crossOrigin = "anonymous";
      el.loop = true;
      const src = actx.createMediaElementSource(el);
      const g = actx.createGain();
      g.gain.value = t.volume;
      if (t.fadeIn > 0) {
        g.gain.setValueAtTime(0, actx.currentTime);
        g.gain.linearRampToValueAtTime(t.volume, actx.currentTime + t.fadeIn);
      }
      src.connect(g);
      g.connect(dest);
      await el.play().catch(() => {});
      nodes.push({
        el,
        stop: () => {
          el.pause();
          el.src = "";
        },
      });
    } catch {
      /* blob/CORS — skip this bed */
    }
  }
  return nodes;
}

export type ExportBackend = "mediarecorder" | "webcodecs" | "ffmpeg";

export function exportBackend(): ExportBackend {
  return "mediarecorder";
}

/** Canvas video + AudioContext mix. Reverse clips drop original audio. Future backends: WebCodecs / ffmpeg. */
export async function composeTimeline(opts: {
  clips: StudioClip[];
  overlays: StudioOverlay[];
  effectId: string;
  aspect?: string;
  chroma?: { on: boolean; plate: string; tolerance: number; feather: number };
  mix?: MixTrack[];
  originalAudio?: boolean;
}): Promise<{ blob: Blob; backend: ExportBackend; notes: string[] }> {
  const notes: string[] = [];
  const peek = !opts.aspect || opts.aspect === "9:16";
  const w = peek ? 720 : 1280;
  const h = peek ? 1280 : 720;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  const vstream = canvas.captureStream(30);
  const actx = new AudioContext();
  await actx.resume().catch(() => {});
  const dest = actx.createMediaStreamDestination();
  const mixed = dest.stream.getAudioTracks()[0];
  if (mixed) vstream.addTrack(mixed);
  else notes.push("No audio destination track in this browser.");
  const beds = await attachMix(actx, dest, opts.mix ?? []);
  const mime = mimeWithAudio();
  if (!mime) throw new Error("This browser cannot record a composed timeline.");
  const rec = new MediaRecorder(vstream, { mimeType: mime });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const done = new Promise<Blob>((resolve, reject) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    rec.onerror = () => reject(new Error("Compose failed"));
  });
  rec.start(100);
  let clock = 0;

  for (const clip of opts.clips) {
    const fx = effectById(clip.effectId || opts.effectId);
    if (clip.src.startsWith("data:image")) {
      const img = new Image();
      img.src = clip.src;
      await new Promise((r, j) => {
        img.onload = () => r(null);
        img.onerror = j;
      });
      const hold = Math.max(0.4, ((clip.trimEnd || 1) - clip.trimStart) / (clip.speed || 1));
      const frames = Math.ceil(hold * 30);
      for (let i = 0; i < frames; i++) {
        ctx.fillStyle = "#111114";
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = clip.opacity ?? 1;
        ctx.filter = fx.css === "none" ? "none" : fx.css;
        ctx.drawImage(img, 0, 0, w, h);
        ctx.filter = "none";
        ctx.globalAlpha = 1;
        if (fx.process !== "none") processCanvas(ctx, canvas, fx.process);
        if (opts.chroma?.on) compositeKey(ctx, w, h, opts.chroma.plate, { ...GREEN_KEY, tolerance: opts.chroma.tolerance, feather: opts.chroma.feather });
        drawOverlays(ctx, w, h, opts.overlays, clock);
        clock += 1 / 30;
        await wait(33);
      }
      continue;
    }
    const v = await loadVideo(clip.src, true);
    const start = clip.trimStart || 0;
    const end = clip.trimEnd || v.duration || 4;
    const speed = clip.speed || 1;
    let clipAudio: HTMLAudioElement | undefined;
    if (opts.originalAudio !== false && !clip.reverse) {
      try {
        clipAudio = new Audio(clip.src);
        clipAudio.crossOrigin = "anonymous";
        const node = actx.createMediaElementSource(clipAudio);
        const g = actx.createGain();
        g.gain.value = 1;
        node.connect(g);
        g.connect(dest);
        clipAudio.playbackRate = speed;
        clipAudio.currentTime = start;
        await clipAudio.play().catch(() => {
          notes.push("Original clip audio could not play into the mix.");
        });
      } catch {
        notes.push("Original clip audio needs a same-origin blob.");
      }
    } else if (clip.reverse) {
      notes.push("Reverse keeps picture; original audio is not reversed in this browser path.");
    }
    if (clip.reverse) {
      let t = end;
      while (t > start) {
        await seek(v, t);
        ctx.fillStyle = "#111114";
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = clip.opacity ?? 1;
        ctx.filter = fx.css === "none" ? "none" : fx.css;
        ctx.drawImage(v, 0, 0, w, h);
        ctx.filter = "none";
        ctx.globalAlpha = 1;
        if (opts.chroma?.on) compositeKey(ctx, w, h, opts.chroma.plate, { ...GREEN_KEY, tolerance: opts.chroma.tolerance, feather: opts.chroma.feather });
        drawOverlays(ctx, w, h, opts.overlays, clock);
        clock += 0.033;
        t -= 0.033 * speed;
        await wait(33);
      }
    } else {
      v.playbackRate = speed;
      await seek(v, start);
      await v.play().catch(() => {});
      while (!v.ended && v.currentTime < end) {
        ctx.fillStyle = "#111114";
        ctx.fillRect(0, 0, w, h);
        ctx.filter = fx.css === "none" ? "none" : fx.css;
        ctx.drawImage(v, 0, 0, w, h);
        ctx.filter = "none";
        if (opts.chroma?.on) compositeKey(ctx, w, h, opts.chroma.plate, { ...GREEN_KEY, tolerance: opts.chroma.tolerance, feather: opts.chroma.feather });
        drawOverlays(ctx, w, h, opts.overlays, clock);
        clock = v.currentTime;
        await wait(33);
      }
      v.pause();
    }
    clipAudio?.pause();
    if (clipAudio) clipAudio.src = "";
    v.src = "";
    if (clip.transition === "fade") {
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = `rgba(17,17,20,${0.12 * (i + 1)})`;
        ctx.fillRect(0, 0, w, h);
        await wait(33);
      }
    }
  }

  rec.stop();
  beds.forEach((b) => b.stop());
  vstream.getTracks().forEach((t) => t.stop());
  await actx.close().catch(() => {});
  const blob = await done;
  return { blob, backend: "mediarecorder", notes };
}

export async function freezeFrame(src: string, at: number) {
  const v = await loadVideo(src);
  await seek(v, at);
  const canvas = document.createElement("canvas");
  canvas.width = v.videoWidth || 720;
  canvas.height = v.videoHeight || 1280;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}
