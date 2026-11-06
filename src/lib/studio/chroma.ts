/** Real chroma-key. Not a color wash. Keyed pixels become transparent; caller composites a plate. */

export type ChromaKey = {
  r: number;
  g: number;
  b: number;
  tolerance: number;
  feather: number;
};

export const GREEN_KEY: ChromaKey = { r: 48, g: 178, b: 72, tolerance: 0.38, feather: 0.16 };

export function keyFrame(data: ImageData, key: ChromaKey) {
  const d = data.data;
  const kr = key.r / 255;
  const kg = key.g / 255;
  const kb = key.b / 255;
  const t0 = Math.max(0.04, key.tolerance - key.feather);
  const t1 = key.tolerance + key.feather;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255;
    const g = d[i + 1] / 255;
    const b = d[i + 2] / 255;
    const dist = Math.hypot(r - kr, g - kg, b - kb);
    let a = 1;
    if (dist < t0) a = 0;
    else if (dist < t1) a = (dist - t0) / (t1 - t0);
    d[i + 3] = Math.round(d[i + 3] * a);
  }
  return data;
}

export function compositeKey(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  plate: CanvasImageSource | string,
  key: ChromaKey = GREEN_KEY,
) {
  const fg = ctx.getImageData(0, 0, w, h);
  keyFrame(fg, key);
  ctx.clearRect(0, 0, w, h);
  if (typeof plate === "string") {
    ctx.fillStyle = plate;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.drawImage(plate, 0, 0, w, h);
  }
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext("2d");
  if (!tctx) return;
  tctx.putImageData(fg, 0, 0);
  ctx.drawImage(tmp, 0, 0);
}
