/** Extensible effect catalog. Names are UI metadata only — never drawn onto media. */

export type EffectKind = "filter" | "beauty" | "visual" | "clone" | "ai" | "interactive" | "backdrop";

export type EffectProcess =
  | "none"
  | "rgb-split"
  | "pixel"
  | "vhs"
  | "scan"
  | "mirror"
  | "clone-split"
  | "clone-echo"
  | "clone-quad"
  | "fisheye"
  | "bloom"
  | "kaleido"
  | "ghost"
  | "motion"
  | "posterize"
  | "duotone"
  | "leak"
  | "tunnel";

export type StudioEffect = {
  id: string;
  name: string;
  category: string;
  kind: EffectKind;
  css: string;
  process: EffectProcess;
  live: boolean;
  interactive?: "touch" | "motion" | "audio";
  creator?: string;
};

export const EFFECTS: StudioEffect[] = [
  { id: "none", name: "Clear", category: "Original", kind: "filter", css: "none", process: "none", live: true },
  { id: "soft", name: "Soft", category: "Beauty", kind: "beauty", css: "brightness(1.08) saturate(1.06) contrast(0.96)", process: "none", live: true },
  { id: "glow", name: "Glow", category: "Beauty", kind: "beauty", css: "brightness(1.12) contrast(1.04) saturate(1.08)", process: "bloom", live: true },
  { id: "touch", name: "Touch-up", category: "Beauty", kind: "beauty", css: "brightness(1.1) contrast(0.94) saturate(1.04) blur(0.35px)", process: "none", live: true },
  { id: "warm", name: "Warm", category: "Aesthetic", kind: "filter", css: "sepia(0.22) saturate(1.12) brightness(1.04)", process: "none", live: true },
  { id: "cool", name: "Cool", category: "Aesthetic", kind: "filter", css: "hue-rotate(12deg) saturate(0.95)", process: "none", live: true },
  { id: "food", name: "Food", category: "Aesthetic", kind: "filter", css: "saturate(1.3) contrast(1.08)", process: "none", live: true },
  { id: "cine", name: "Cine", category: "Cinematic", kind: "filter", css: "contrast(1.18) saturate(0.84) brightness(0.96)", process: "none", live: true },
  { id: "night", name: "Night", category: "Cinematic", kind: "filter", css: "brightness(0.86) contrast(1.22) saturate(0.8)", process: "none", live: true },
  { id: "film", name: "Film", category: "Cinematic", kind: "filter", css: "contrast(1.08) sepia(0.18) saturate(0.9)", process: "none", live: true },
  { id: "fade", name: "Fade", category: "Aesthetic", kind: "filter", css: "contrast(0.9) brightness(1.08) saturate(0.85)", process: "none", live: true },
  { id: "mono", name: "Mono", category: "Aesthetic", kind: "filter", css: "grayscale(1) contrast(1.1)", process: "none", live: true },
  { id: "vhs", name: "Tape", category: "Visual", kind: "visual", css: "contrast(1.2) saturate(1.3) hue-rotate(-8deg)", process: "vhs", live: true },
  { id: "glitch", name: "Glitch", category: "Visual", kind: "visual", css: "contrast(1.35) saturate(1.5) hue-rotate(20deg)", process: "rgb-split", live: true },
  { id: "rgb", name: "Split", category: "Visual", kind: "visual", css: "contrast(1.1) saturate(1.4)", process: "rgb-split", live: true },
  { id: "pixel", name: "Pixel", category: "Visual", kind: "visual", css: "contrast(1.2) saturate(1.1)", process: "pixel", live: false },
  { id: "scan", name: "Scan", category: "Visual", kind: "visual", css: "contrast(1.15) grayscale(0.2)", process: "scan", live: true },
  { id: "fish", name: "Fish", category: "Visual", kind: "visual", css: "contrast(1.08)", process: "fisheye", live: false },
  { id: "bloom", name: "Bloom", category: "Visual", kind: "visual", css: "brightness(1.18) contrast(1.08) saturate(1.2)", process: "bloom", live: true },
  { id: "mirror", name: "Mirror", category: "Clone", kind: "clone", css: "none", process: "mirror", live: true },
  { id: "twin", name: "Twin", category: "Clone", kind: "clone", css: "none", process: "clone-split", live: true },
  { id: "echo", name: "Echo", category: "Clone", kind: "clone", css: "none", process: "clone-echo", live: false },
  { id: "quad", name: "Quad", category: "Clone", kind: "clone", css: "none", process: "clone-quad", live: false },
  { id: "ghost", name: "Ghost", category: "Motion", kind: "visual", css: "contrast(1.08)", process: "ghost", live: false },
  { id: "smear", name: "Smear", category: "Motion", kind: "visual", css: "blur(1.2px)", process: "motion", live: true },
  { id: "kaleido", name: "Kaleido", category: "Distortion", kind: "visual", css: "saturate(1.2)", process: "kaleido", live: false },
  { id: "portrait", name: "Portrait", category: "Portrait", kind: "beauty", css: "brightness(1.06) contrast(1.04) saturate(1.05)", process: "none", live: true },
  { id: "key", name: "Key light", category: "Light", kind: "filter", css: "brightness(1.14) contrast(1.08)", process: "none", live: true },
  { id: "poster", name: "Poster", category: "Experimental", kind: "visual", css: "contrast(1.4) saturate(1.3)", process: "posterize", live: false },
  { id: "duo", name: "Duo", category: "Color", kind: "visual", css: "contrast(1.1) saturate(0.4)", process: "duotone", live: false },
  { id: "leak", name: "Leak", category: "Light", kind: "visual", css: "brightness(1.08) saturate(1.2)", process: "leak", live: true },
  { id: "tunnel", name: "Tunnel", category: "Distortion", kind: "visual", css: "contrast(1.12)", process: "tunnel", live: false },
  { id: "dream", name: "Dream", category: "Portrait", kind: "beauty", css: "brightness(1.08) contrast(0.92) blur(0.4px) saturate(1.08)", process: "bloom", live: true },
  { id: "studio-back", name: "Studio", category: "Backdrop", kind: "backdrop", css: "contrast(1.1)", process: "none", live: true },
  { id: "paper-back", name: "Paper", category: "Backdrop", kind: "backdrop", css: "contrast(1.04)", process: "none", live: true },
  { id: "enhance-ai", name: "Enhance", category: "AI", kind: "ai", css: "contrast(1.12) saturate(1.08) brightness(1.04)", process: "none", live: true },
  { id: "depth-ai", name: "Depth", category: "AI", kind: "ai", css: "contrast(1.16) brightness(0.98)", process: "bloom", live: true },
  { id: "harmattan", name: "Harmattan", category: "Season", kind: "filter", css: "sepia(0.35) contrast(1.05) brightness(1.06)", process: "none", live: true },
  { id: "rain", name: "Rain", category: "Season", kind: "filter", css: "contrast(1.12) saturate(0.7) brightness(0.92)", process: "none", live: true },
];

export const EFFECT_CATEGORIES = [
  "For you",
  "Trending",
  "New",
  "Color",
  "Cinematic",
  "Portrait",
  "Beauty",
  "Cinematic",
  "Aesthetic",
  "Light",
  "Motion",
  "Distortion",
  "Visual",
  "Clone",
  "AI",
  "Experimental",
  "Season",
  "Backdrop",
];

export function effectById(id: string) {
  return EFFECTS.find((e) => e.id === id) ?? EFFECTS[0];
}

export function effectsIn(cat: string, recent: string[], favs: string[], q: string) {
  let list = EFFECTS;
  if (cat === "Recents") list = EFFECTS.filter((e) => recent.includes(e.id));
  else if (cat === "Favourites") list = EFFECTS.filter((e) => favs.includes(e.id));
  else if (cat === "For you" || cat === "Trending" || cat === "New" || cat === "Popular") list = EFFECTS;
  else if (cat === "Color") list = EFFECTS.filter((e) => e.category === "Aesthetic" || e.category === "Color" || e.kind === "filter");
  else if (cat === "Funny") list = EFFECTS.filter((e) => e.kind === "visual" || e.id === "glitch");
  else list = EFFECTS.filter((e) => e.category === cat || e.kind === cat.toLowerCase());
  if (q.trim()) list = list.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()) || e.category.toLowerCase().includes(q.toLowerCase()));
  return list;
}
