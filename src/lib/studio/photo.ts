import { composedCss } from "./filters";
import { effectById, type EffectProcess } from "./effects";
import { compositeKey, GREEN_KEY } from "./chroma";
import type { StudioAdjust, StudioOverlay } from "./types";

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

export function processCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, process: EffectProcess) {
  if (process === "none") return;
  const w = canvas.width;
  const h = canvas.height;
  if (process === "rgb-split") {
    const src = ctx.getImageData(0, 0, w, h);
    const out = ctx.createImageData(w, h);
    const s = src.data;
    const d = out.data;
    const ox = 6;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = ((y * w + Math.min(w - 1, x + ox)) * 4);
        const b = ((y * w + Math.max(0, x - ox)) * 4);
        d[i] = s[r];
        d[i + 1] = s[i + 1];
        d[i + 2] = s[b + 2];
        d[i + 3] = s[i + 3];
      }
    }
    ctx.putImageData(out, 0, 0);
    return;
  }
  if (process === "pixel") {
    const s = 18;
    ctx.imageSmoothingEnabled = false;
    const tmp = document.createElement("canvas");
    tmp.width = Math.max(1, Math.floor(w / s));
    tmp.height = Math.max(1, Math.floor(h / s));
    const tctx = tmp.getContext("2d");
    if (!tctx) return;
    tctx.drawImage(canvas, 0, 0, tmp.width, tmp.height);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(tmp, 0, 0, w, h);
    return;
  }
  if (process === "scan" || process === "vhs") {
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    if (process === "vhs") {
      ctx.fillStyle = "rgba(0,180,255,0.06)";
      ctx.fillRect(0, 0, w, h);
    }
    return;
  }
  if (process === "mirror" || process === "clone-split") {
    const half = Math.floor(w / 2);
    const left = ctx.getImageData(0, 0, half, h);
    ctx.putImageData(left, 0, 0);
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(canvas, 0, 0, half, h, 0, 0, half, h);
    ctx.restore();
    return;
  }
  if (process === "clone-echo") {
    ctx.globalAlpha = 0.35;
    ctx.drawImage(canvas, 18, 0);
    ctx.globalAlpha = 0.2;
    ctx.drawImage(canvas, 36, 0);
    ctx.globalAlpha = 1;
    return;
  }
  if (process === "bloom") {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.filter = "blur(8px) brightness(1.15)";
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
    ctx.filter = "none";
    return;
  }
  if (process === "fisheye") {
    const src = ctx.getImageData(0, 0, w, h);
    const out = ctx.createImageData(w, h);
    const cx = w / 2;
    const cy = h / 2;
    const max = Math.hypot(cx, cy);
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const dx = (x - cx) / cx;
        const dy = (y - cy) / cy;
        const r = Math.hypot(dx, dy);
        const nr = r * r;
        const sx = Math.round(cx + dx * nr * cx);
        const sy = Math.round(cy + dy * nr * cy);
        if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
        const si = (sy * w + sx) * 4;
        const di = (y * w + x) * 4;
        out.data[di] = src.data[si];
        out.data[di + 1] = src.data[si + 1];
        out.data[di + 2] = src.data[si + 2];
        out.data[di + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
    return;
  }
  if (process === "clone-quad") {
    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    tmp.getContext("2d")?.drawImage(canvas, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const tw = w / 2;
    const th = h / 2;
    for (const [dx, dy, fx, fy] of [
      [0, 0, 1, 1],
      [tw, 0, -1, 1],
      [0, th, 1, -1],
      [tw, th, -1, -1],
    ] as const) {
      ctx.save();
      ctx.translate(dx + (fx < 0 ? tw : 0), dy + (fy < 0 ? th : 0));
      ctx.scale(fx, fy);
      ctx.drawImage(tmp, 0, 0, w, h, 0, 0, tw, th);
      ctx.restore();
    }
    return;
  }
  if (process === "ghost") {
    ctx.globalAlpha = 0.45;
    ctx.drawImage(canvas, 12, 8);
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.25;
    ctx.drawImage(canvas, -10, -6);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    return;
  }
  if (process === "motion") {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.drawImage(canvas, 10, 0);
    ctx.drawImage(canvas, 20, 0);
    ctx.restore();
    return;
  }
  if (process === "kaleido") {
    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    tmp.getContext("2d")?.drawImage(canvas, 0, 0);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 3);
      ctx.drawImage(tmp, -w / 4, -h / 4, w / 2, h / 2);
      ctx.restore();
    }
    ctx.restore();
    return;
  }
  if (process === "posterize") {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const steps = 5;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.round(d[i] / (255 / steps)) * (255 / steps);
      d[i + 1] = Math.round(d[i + 1] / (255 / steps)) * (255 / steps);
      d[i + 2] = Math.round(d[i + 2] / (255 / steps)) * (255 / steps);
    }
    ctx.putImageData(img, 0, 0);
    return;
  }
  if (process === "duotone") {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
      d[i] = Math.round(40 + l * 200);
      d[i + 1] = Math.round(20 + l * 90);
      d[i + 2] = Math.round(80 + l * 140);
    }
    ctx.putImageData(img, 0, 0);
    return;
  }
  if (process === "leak") {
    const g = ctx.createRadialGradient(w * 0.15, h * 0.1, 10, w * 0.15, h * 0.1, w * 0.55);
    g.addColorStop(0, "rgba(255,160,60,0.45)");
    g.addColorStop(1, "rgba(255,160,60,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (process === "tunnel") {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(1.25, 1.25);
    ctx.drawImage(canvas, -w / 2, -h / 2);
    ctx.restore();
  }
}

export function drawOverlays(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, overlays: StudioOverlay[]) {
  ctx.filter = "none";
  ctx.textAlign = "center";
  overlays.forEach((o) => {
    const x = (o.x / 100) * canvas.width;
    const y = (o.y / 100) * canvas.height;
    ctx.font = o.kind === "sticker" ? `${Math.round(canvas.width * 0.08)}px sans-serif` : `600 ${Math.round(canvas.width * 0.045)}px "DM Sans", sans-serif`;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 4;
    ctx.strokeText(o.text, x, y);
    ctx.fillText(o.text, x, y);
  });
}

export async function rasterize(
  src: string,
  adjust: StudioAdjust,
  filterId: string,
  amount: number,
  effectId = "none",
  overlays: StudioOverlay[] = [],
  chroma?: { on: boolean; plate: string; tolerance: number; feather: number },
): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  const max = 1600;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  const fx = effectById(effectId);
  ctx.filter = composedCss(adjust, filterId, amount);
  if (fx.css !== "none") ctx.filter = `${ctx.filter} ${fx.css}`;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.filter = "none";
  processCanvas(ctx, canvas, fx.process);
  if (adjust.vignette > 0.02) {
    const g = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      canvas.width * 0.2,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width * 0.75,
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${0.55 * adjust.vignette})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (adjust.grain > 0.05) {
    const n = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = n.data;
    const str = adjust.grain * 28;
    for (let i = 0; i < d.length; i += 16) {
      const v = (Math.random() - 0.5) * str;
      d[i] = Math.max(0, Math.min(255, d[i] + v));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + v));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + v));
    }
    ctx.putImageData(n, 0, 0);
  }
  if (chroma?.on) {
    compositeKey(ctx, canvas.width, canvas.height, chroma.plate, {
      ...GREEN_KEY,
      tolerance: chroma.tolerance,
      feather: chroma.feather,
    });
  }
  if (overlays.length) drawOverlays(ctx, canvas, overlays);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export function rotateDataUrl(src: string, deg: 90 | -90 | 180) {
  return loadImage(src).then((img) => {
    const canvas = document.createElement("canvas");
    const swap = Math.abs(deg) === 90;
    canvas.width = swap ? img.height : img.width;
    canvas.height = swap ? img.width : img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas");
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    return canvas.toDataURL("image/jpeg", 0.92);
  });
}

export function flipDataUrl(src: string) {
  return loadImage(src).then((img) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.92);
  });
}
