import { useEffect, useMemo, useState } from "react";
import { RotateCcw, RotateCw, Sparkles, Undo2 } from "lucide-react";
import { AI_PRESETS, matchPrompt, runLocalAi } from "@/lib/studio/ai";
import { EFFECTS, effectById } from "@/lib/studio/effects";
import { FILTER_CATEGORIES, FILTERS, composedCss } from "@/lib/studio/filters";
import { flipDataUrl, rasterize, rotateDataUrl } from "@/lib/studio/photo";
import { useStudioStore } from "@/lib/studio/store";
import type { StudioAdjust } from "@/lib/studio/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ADJUST_KEYS: { key: keyof StudioAdjust; label: string }[] = [
  { key: "exposure", label: "Exposure" },
  { key: "contrast", label: "Contrast" },
  { key: "highlights", label: "Highlights" },
  { key: "shadows", label: "Shadows" },
  { key: "saturation", label: "Saturation" },
  { key: "vibrance", label: "Vibrance" },
  { key: "temperature", label: "Temp" },
  { key: "tint", label: "Tint" },
  { key: "sharpness", label: "Sharp" },
  { key: "clarity", label: "Clarity" },
  { key: "vignette", label: "Vignette" },
  { key: "grain", label: "Grain" },
  { key: "fade", label: "Fade" },
];

export function PhotoDesk() {
  const image = useStudioStore((s) => s.image);
  const original = useStudioStore((s) => s.originalImage);
  const setImage = useStudioStore((s) => s.setImage);
  const adjust = useStudioStore((s) => s.adjust);
  const patchAdjust = useStudioStore((s) => s.patchAdjust);
  const filterId = useStudioStore((s) => s.filterId);
  const filterAmount = useStudioStore((s) => s.filterAmount);
  const setFilter = useStudioStore((s) => s.setFilter);
  const resetEdit = useStudioStore((s) => s.resetEdit);
  const setView = useStudioStore((s) => s.setView);
  const premium = useStudioStore((s) => s.premium);
  const effectId = useStudioStore((s) => s.effectId);
  const setEffect = useStudioStore((s) => s.setEffect);
  const overlays = useStudioStore((s) => s.overlays);
  const addOverlay = useStudioStore((s) => s.addOverlay);
  const removeOverlay = useStudioStore((s) => s.removeOverlay);
  const [tab, setTab] = useState<"adjust" | "filters" | "effects" | "text" | "ai">("filters");
  const [prompt, setPrompt] = useState("");
  const [words, setWords] = useState("");
  const [busy, setBusy] = useState(false);
  const [cat, setCat] = useState("Original");
  const css = useMemo(() => {
    const base = composedCss(adjust, filterId, filterAmount);
    const e = effectById(effectId).css;
    return e === "none" ? base : `${base} ${e}`;
  }, [adjust, filterId, filterAmount, effectId]);

  useEffect(() => {
    if (!image) setView("camera");
  }, [image, setView]);

  if (!image) return null;
  const src = image;
  const orig = original ?? image;

  async function applyAi() {
    const job = matchPrompt(prompt || "enhance");
    if (job.kind === "cloud") {
      toast.message(job.needs);
      return;
    }
    setBusy(true);
    try {
      const r = await runLocalAi(orig, job);
      setImage(r.image, orig);
      patchAdjust(r.adjust);
      setFilter(r.filterId, 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not edit.");
    } finally {
      setBusy(false);
    }
  }

  async function bake() {
    setBusy(true);
    try {
      const out = await rasterize(orig, adjust, filterId, filterAmount, effectId, overlays);
      setImage(out, orig);
      setView("publish");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not export.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-ink text-paper">
      <div className="flex h-12 items-center justify-between px-2 pt-[env(safe-area-inset-top)]">
        <button type="button" className="grid size-11 place-items-center" onClick={() => setView("camera")}>
          Back
        </button>
        <p className="text-sm font-semibold">Studio</p>
        <Button size="sm" disabled={busy} onClick={() => void bake()}>
          Next
        </Button>
      </div>
      <div className="relative min-h-0 flex-1">
        <img src={image} alt="" className="size-full object-contain" style={{ filter: css }} />
        {overlays.map((o) => (
          <span key={o.id} className="absolute text-sm font-semibold drop-shadow" style={{ left: `${o.x}%`, top: `${o.y}%` }}>
            {o.text}
          </span>
        ))}
      </div>
      <div className="border-t border-paper/10 bg-ink pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around px-2 pt-2">
          {(["filters", "effects", "text", "adjust", "ai"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn("h-10 text-xs font-semibold tracking-wide uppercase", tab === id ? "text-paper" : "text-paper/45")}
            >
              {id === "ai" ? "AI" : id}
            </button>
          ))}
        </div>
        {tab === "filters" ? (
          <div>
            <div className="flex gap-3 overflow-x-auto px-4 py-2">
              {FILTER_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={cn("shrink-0 text-[11px]", cat === c ? "text-paper" : "text-paper/45")}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-3">
              {FILTERS.filter((f) => f.category === cat).map((f) => {
                const locked = f.premium && !premium;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      if (locked) {
                        toast.message("Lux filters are in Creator pack. Turn it on in Studio settings.");
                        return;
                      }
                      setFilter(f.id, 1);
                    }}
                    className={cn("w-16 shrink-0", filterId === f.id && "text-paper")}
                  >
                    <span
                      className="block aspect-square overflow-hidden rounded-lg ring-1 ring-paper/20"
                      style={{ filter: f.css }}
                    >
                      <img src={image} alt="" className="size-full object-cover" />
                    </span>
                    <p className="mt-1 truncate text-[10px]">
                      {f.name}
                      {f.premium ? " ·" : ""}
                    </p>
                  </button>
                );
              })}
            </div>
            <label className="flex items-center gap-3 px-4 pb-3 text-xs">
              Intensity
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={filterAmount}
                onChange={(e) => setFilter(filterId, Number(e.target.value))}
                className="flex-1"
              />
            </label>
          </div>
        ) : null}
        {tab === "effects" ? (
          <div className="flex gap-3 overflow-x-auto px-4 py-3">
            {EFFECTS.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEffect(e.id)}
                className={cn("w-16 shrink-0", effectId === e.id && "text-paper")}
              >
                <span className="block aspect-square overflow-hidden rounded-lg ring-1 ring-paper/20" style={{ filter: e.css }}>
                  <img src={image} alt="" className="size-full object-cover" />
                </span>
                <p className="mt-1 truncate text-[10px]">{e.name}</p>
              </button>
            ))}
          </div>
        ) : null}
        {tab === "text" ? (
          <div className="px-4 py-3">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!words.trim()) return;
                addOverlay({ id: `o-${Date.now()}`, kind: "text", text: words.trim(), x: 50, y: 40, start: 0, end: 0 });
                setWords("");
              }}
            >
              <input value={words} onChange={(e) => setWords(e.target.value)} placeholder="Only what you type is drawn" className="h-11 flex-1 rounded-full bg-paper/10 px-4 text-sm outline-none" />
              <Button size="sm" type="submit">Add</Button>
            </form>
            <div className="mt-2 flex gap-2 text-xl">
              {["🔥", "💛", "😭", "🎓"].map((e) => (
                <button key={e} type="button" onClick={() => addOverlay({ id: `o-${Date.now()}`, kind: "sticker", text: e, x: 50, y: 55, start: 0, end: 0 })}>{e}</button>
              ))}
            </div>
            {overlays.map((o) => (
              <button key={o.id} type="button" className="mt-1 block text-xs" onClick={() => removeOverlay(o.id)}>Remove {o.text}</button>
            ))}
          </div>
        ) : null}
        {tab === "adjust" ? (
          <div className="max-h-48 space-y-2 overflow-y-auto px-4 py-2">
            <div className="flex gap-2">
              <button
                type="button"
                className="grid size-10 place-items-center"
                onClick={() => void rotateDataUrl(image, -90).then((u) => setImage(u, original))}
                aria-label="Rotate left"
              >
                <RotateCcw className="size-4" />
              </button>
              <button
                type="button"
                className="grid size-10 place-items-center"
                onClick={() => void rotateDataUrl(image, 90).then((u) => setImage(u, original))}
                aria-label="Rotate right"
              >
                <RotateCw className="size-4" />
              </button>
              <button
                type="button"
                className="h-10 px-2 text-xs"
                onClick={() => void flipDataUrl(image).then((u) => setImage(u, original))}
              >
                Flip
              </button>
              <button type="button" className="ml-auto grid size-10 place-items-center" onClick={resetEdit} aria-label="Reset">
                <Undo2 className="size-4" />
              </button>
            </div>
            {ADJUST_KEYS.map((row) => (
              <label key={row.key} className="flex items-center gap-3 text-xs">
                <span className="w-20 text-paper/70">{row.label}</span>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.01}
                  value={adjust[row.key]}
                  onChange={(e) => patchAdjust({ [row.key]: Number(e.target.value) })}
                  className="flex-1"
                />
              </label>
            ))}
          </div>
        ) : null}
        {tab === "ai" ? (
          <div className="px-4 py-3">
            <div className="flex gap-2">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Make this cinematic…"
                className="h-11 flex-1 rounded-full bg-paper/10 px-4 text-sm outline-none"
              />
              <Button size="sm" disabled={busy} onClick={() => void applyAi()}>
                <Sparkles className="size-4" />
              </Button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {AI_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="h-9 shrink-0 rounded-full bg-paper/10 px-3 text-xs"
                  onClick={() => {
                    setPrompt(p.prompt);
                    if (p.kind === "cloud") toast.message(p.needs);
                    else void (async () => {
                      setBusy(true);
                      try {
                        const r = await runLocalAi(orig, p);
                        setImage(r.image, orig);
                        patchAdjust(r.adjust);
                        setFilter(r.filterId, 1);
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-paper/50">
              Local looks run on this device. Object removal and background replace wait for a connected editor.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
