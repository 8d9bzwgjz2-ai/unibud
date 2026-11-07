import type { StudioAdjust, StudioFilter } from "./types";

export const FILTERS: StudioFilter[] = [
  { id: "original", name: "Original", category: "Original", css: "none" },
  { id: "natural", name: "Natural", category: "Natural", css: "saturate(1.08) contrast(1.04)" },
  { id: "soft", name: "Soft light", category: "Portrait", css: "contrast(0.94) saturate(1.06) brightness(1.06)" },
  { id: "studio", name: "Studio", category: "Portrait", css: "contrast(1.12) saturate(0.92) brightness(1.04)" },
  { id: "cine", name: "Cine", category: "Cinematic", css: "contrast(1.18) saturate(0.86) brightness(0.96)" },
  { id: "noir-teal", name: "Teal night", category: "Cinematic", css: "contrast(1.2) saturate(0.8) hue-rotate(-12deg)" },
  { id: "film", name: "Film", category: "Vintage", css: "contrast(1.08) sepia(0.18) saturate(0.9)" },
  { id: "fade", name: "Fade", category: "Vintage", css: "contrast(0.9) brightness(1.08) saturate(0.85)" },
  { id: "mono", name: "Mono", category: "Black & White", css: "grayscale(1) contrast(1.1)" },
  { id: "silver", name: "Silver", category: "Black & White", css: "grayscale(1) contrast(0.92) brightness(1.08)" },
  { id: "warm", name: "Warm", category: "Warm", css: "sepia(0.22) saturate(1.15) brightness(1.04)" },
  { id: "honey", name: "Honey", category: "Warm", css: "sepia(0.35) saturate(1.2) contrast(1.05)" },
  { id: "cool", name: "Cool", category: "Cool", css: "hue-rotate(12deg) saturate(0.95) brightness(1.02)" },
  { id: "night", name: "Night", category: "Night", css: "brightness(0.88) contrast(1.22) saturate(0.8)" },
  { id: "urban", name: "Urban", category: "Urban", css: "contrast(1.16) saturate(0.78)" },
  { id: "food", name: "Food", category: "Food", css: "saturate(1.28) contrast(1.08) brightness(1.04)" },
  { id: "minimal", name: "Minimal", category: "Minimal", css: "saturate(0.7) contrast(1.04) brightness(1.06)" },
  { id: "lux", name: "Lux", category: "Premium", premium: true, css: "contrast(1.14) saturate(1.1) brightness(1.05)" },
  { id: "opal", name: "Opal", category: "Premium", premium: true, css: "contrast(1.08) saturate(0.7) brightness(1.1)" },
];

export const FILTER_CATEGORIES = [...new Set(FILTERS.map((f) => f.category))];

export function filterById(id: string) {
  return FILTERS.find((f) => f.id === id) ?? FILTERS[0];
}

export function adjustCss(a: StudioAdjust) {
  const bright = 1 + a.exposure * 0.35 + a.highlights * 0.08 - a.shadows * 0.04;
  const contrast = 1 + a.contrast * 0.4 + a.clarity * 0.15;
  const sat = 1 + a.saturation * 0.5 + a.vibrance * 0.25;
  const hue = a.temperature * -12 + a.tint * 8;
  const blur = a.sharpness < 0 ? `${Math.abs(a.sharpness) * 1.4}px` : "0px";
  return `brightness(${bright}) contrast(${contrast}) saturate(${sat}) hue-rotate(${hue}deg) blur(${blur}) opacity(${1 - a.fade * 0.25})`;
}

export function composedCss(a: StudioAdjust, filterId: string, amount: number) {
  const f = filterById(filterId);
  const mix = Math.max(0, Math.min(1, amount));
  if (f.id === "original" || mix === 0) return adjustCss(a);
  return `${adjustCss(a)} ${f.css}`;
}
