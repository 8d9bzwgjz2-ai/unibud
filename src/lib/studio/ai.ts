import { rasterize } from "./photo";
import { NEUTRAL_ADJUST, type StudioAdjust } from "./types";

export type AiJob =
  | { id: string; kind: "local"; label: string; prompt: string; patch: Partial<StudioAdjust>; filterId?: string }
  | { id: string; kind: "cloud"; label: string; prompt: string; needs: string };

export const AI_PRESETS: AiJob[] = [
  { id: "enhance", kind: "local", label: "Enhance", prompt: "Enhance this photo.", patch: { exposure: 0.12, contrast: 0.18, clarity: 0.2, saturation: 0.08 } },
  { id: "brighter", kind: "local", label: "Brighter", prompt: "Make this brighter.", patch: { exposure: 0.35, shadows: 0.2 } },
  { id: "cinematic", kind: "local", label: "Cinematic", prompt: "Make this look cinematic.", patch: { contrast: 0.28, saturation: -0.15, fade: 0.1, vignette: 0.35 }, filterId: "cine" },
  { id: "warm-film", kind: "local", label: "Warm film", prompt: "Give this a warm film look.", patch: { temperature: 0.4, fade: 0.12, grain: 0.25 }, filterId: "film" },
  { id: "portrait", kind: "local", label: "Portrait", prompt: "Make this look like a professional portrait.", patch: { contrast: 0.12, shadows: 0.15, clarity: 0.1 }, filterId: "studio" },
  { id: "bw", kind: "local", label: "Mono", prompt: "Make this black and white.", patch: {}, filterId: "mono" },
  { id: "remove-person", kind: "cloud", label: "Remove person", prompt: "Remove the person in the background.", needs: "A connected image editor for object removal." },
  { id: "replace-bg", kind: "cloud", label: "Background", prompt: "Change the background.", needs: "A connected image editor for background replacement." },
  { id: "expand", kind: "cloud", label: "Expand", prompt: "Expand the image.", needs: "A connected image editor for outpainting." },
];

export function matchPrompt(text: string): AiJob {
  const q = text.toLowerCase();
  return (
    AI_PRESETS.find((p) => q.includes(p.id) || p.prompt.toLowerCase().includes(q) || q.includes(p.label.toLowerCase())) ??
    AI_PRESETS.find((p) => q.includes("bright") && p.id === "brighter") ??
    AI_PRESETS.find((p) => (q.includes("cinematic") || q.includes("cinema")) && p.id === "cinematic") ??
    AI_PRESETS.find((p) => (q.includes("remove") || q.includes("person") || q.includes("object")) && p.id === "remove-person") ??
    AI_PRESETS[0]
  );
}

export async function runLocalAi(src: string, job: Extract<AiJob, { kind: "local" }>) {
  const adjust: StudioAdjust = { ...NEUTRAL_ADJUST, ...job.patch };
  const out = await rasterize(src, adjust, job.filterId ?? "original", 1);
  return { image: out, adjust, filterId: job.filterId ?? "original" };
}
