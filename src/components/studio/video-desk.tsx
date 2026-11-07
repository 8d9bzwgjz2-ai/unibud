import { useEffect, useRef, useState } from "react";
import { Pause, Play, Scissors, Trash2, Undo2 } from "lucide-react";
import { EFFECTS } from "@/lib/studio/effects";
import { freezeFrame } from "@/lib/studio/compose";
import { AudioSheet } from "@/components/studio/audio-sheet";
import { useStudioStore } from "@/lib/studio/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TOOLS = ["Cut", "Mix", "Type", "Looks", "Stickers", "Captions", "Grade", "AI", "Frame"] as const;

export function VideoDesk() {
  const video = useStudioStore((s) => s.video);
  const clips = useStudioStore((s) => s.clips);
  const patchClip = useStudioStore((s) => s.patchClip);
  const removeClip = useStudioStore((s) => s.removeClip);
  const addClip = useStudioStore((s) => s.addClip);
  const moveClip = useStudioStore((s) => s.moveClip);
  const setView = useStudioStore((s) => s.setView);
  const overlays = useStudioStore((s) => s.overlays);
  const addOverlay = useStudioStore((s) => s.addOverlay);
  const removeOverlay = useStudioStore((s) => s.removeOverlay);
  const effectId = useStudioStore((s) => s.effectId);
  const setEffect = useStudioStore((s) => s.setEffect);
  const snapshot = useStudioStore((s) => s.snapshot);
  const undoLast = useStudioStore((s) => s.undoLast);
  const redoLast = useStudioStore((s) => s.redoLast);
  const mix = useStudioStore((s) => s.mix);
  const clipVolume = useStudioStore((s) => s.clipVolume);
  const clipMute = useStudioStore((s) => s.clipMute);
  const setClipVolume = useStudioStore((s) => s.setClipVolume);
  const setClipMute = useStudioStore((s) => s.setClipMute);
  const patchMix = useStudioStore((s) => s.patchMix);
  const intent = useStudioStore((s) => s.intent);
  const [active, setActive] = useState(clips[0]?.id);
  const clip = clips.find((c) => c.id === active) ?? clips[0];
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [tool, setTool] = useState<(typeof TOOLS)[number]>("Cut");
  const [aspect, setAspect] = useState("9:16");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const v = ref.current;
    if (!v || !clip) return;
    const on = () => setT(v.currentTime);
    v.addEventListener("timeupdate", on);
    return () => v.removeEventListener("timeupdate", on);
  }, [clip]);

  useEffect(() => {
    if (!clip || clip.duration) return;
    const v = document.createElement("video");
    v.src = clip.src;
    v.onloadedmetadata = () => {
      const d = v.duration || 8;
      patchClip(clip.id, { duration: d, trimEnd: clip.trimEnd || d });
    };
  }, [clip, patchClip]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.volume = clipMute ? 0 : clipVolume;
  }, [clipVolume, clipMute, clip?.src, video]);

  useEffect(() => {
    if (!video && !clips.length) setView("camera");
  }, [video, clips.length, setView]);

  useEffect(() => {
    const v = ref.current;
    if (!v || !clip) return;
    v.playbackRate = clip.speed || 1;
    const loop = () => {
      if (!clip.reverse) {
        if (clip.trimEnd && v.currentTime >= clip.trimEnd) {
          v.pause();
          setPlaying(false);
        }
        return;
      }
      if (!v.paused) {
        v.currentTime = Math.max(clip.trimStart, v.currentTime - 0.04 * clip.speed);
        if (v.currentTime <= clip.trimStart + 0.05) {
          v.pause();
          setPlaying(false);
        }
      }
    };
    const id = window.setInterval(loop, 40);
    return () => window.clearInterval(id);
  }, [clip, playing]);

  if (!video && !clips.length) return null;
  const src = clip?.src ?? video;
  const dur = Math.max(clip?.duration || 12, 1);
  const span = Math.max((clip?.trimEnd || dur) - (clip?.trimStart || 0), 0.1);

  function splitAt() {
    if (!clip || !ref.current) return;
    snapshot();
    const at = ref.current.currentTime;
    patchClip(clip.id, { trimEnd: at });
    addClip({ ...clip, id: `c-${Date.now()}`, trimStart: at, trimEnd: clip.trimEnd || dur });
  }

  return (
    <div className="flex h-dvh flex-col bg-ink text-paper">
      <div className="flex h-12 items-center justify-between px-2 pt-[env(safe-area-inset-top)]">
        <button type="button" className="h-11 px-3 text-sm" onClick={() => setView("camera")}>
          Back
        </button>
        <p className="text-sm font-semibold">{intent === "peek" || intent === "reel" ? "Studio · Peek" : intent === "story" ? "Studio · Story" : "Studio"}</p>
        <div className="flex items-center gap-1">
          <button type="button" className="grid size-11 place-items-center" aria-label="Undo" onClick={undoLast}>
            <Undo2 className="size-4" />
          </button>
          <button type="button" className="h-11 px-2 text-xs" onClick={redoLast}>
            Redo
          </button>
          <Button size="sm" onClick={() => setView("publish")}>
            Next
          </Button>
        </div>
      </div>
      <div className={cn("relative min-h-0 flex-1 bg-ink", aspect === "1:1" && "mx-auto aspect-square max-h-full", aspect === "16:9" && "mx-auto aspect-video max-h-full")}>
        {src ? (
          <video
            ref={ref}
            src={src}
            className="size-full object-contain"
            playsInline
            muted={clipMute}
            onEnded={() => setPlaying(false)}
            style={{ filter: EFFECTS.find((e) => e.id === (clip?.effectId || effectId))?.css }}
          />
        ) : null}
        {overlays.map((o) => (
          <span
            key={o.id}
            className="absolute text-sm font-semibold drop-shadow"
            style={{ left: `${o.x}%`, top: `${o.y}%` }}
          >
            {o.text}
          </span>
        ))}
        <button
          type="button"
          className="absolute bottom-4 left-1/2 grid size-12 -translate-x-1/2 place-items-center rounded-full bg-paper text-ink"
          onClick={() => {
            const v = ref.current;
            if (!v) return;
            if (v.paused) {
              if (clip && clip.trimStart && v.currentTime < clip.trimStart) v.currentTime = clip.trimStart;
              void v.play();
              setPlaying(true);
            } else {
              v.pause();
              setPlaying(false);
            }
          }}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="size-4 fill-ink" /> : <Play className="size-4 fill-ink" />}
        </button>
      </div>

      <div className="border-t border-paper/10 px-3 py-2">
        <div className="relative h-16 overflow-x-auto">
          <div className="flex h-full min-w-full gap-1">
            {clips.map((c) => {
              const w = Math.max(56, ((c.trimEnd || c.duration || 8) - c.trimStart) * 28);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActive(c.id)}
                  className={cn("relative h-full shrink-0 overflow-hidden rounded-lg", c.id === clip?.id ? "ring-2 ring-paper" : "ring-1 ring-paper/20")}
                  style={{ width: w }}
                >
                  <video src={c.src} className="size-full object-cover" muted />
                </button>
              );
            })}
          </div>
          <span
            className="pointer-events-none absolute top-0 h-full w-0.5 bg-paper"
            style={{ left: `${Math.min(98, (t / dur) * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] tabular-nums text-paper/55">
          {t.toFixed(1)}s · {span.toFixed(1)}s in timeline
          {mix[0] ? ` · ${mix[0].name}` : ""}
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto px-3 pb-1">
        {TOOLS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTool(id)}
            className={cn("shrink-0 pb-2 text-[11px] font-semibold", tool === id ? "text-paper" : "text-paper/40")}
          >
            {id}
          </button>
        ))}
      </div>

      <div className="min-h-28 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {tool === "Cut" && clip ? (
          <div className="space-y-2">
            <label className="flex items-center gap-3 text-xs">
              In
              <input type="range" min={0} max={dur} step={0.1} value={clip.trimStart} onChange={(e) => patchClip(clip.id, { trimStart: Number(e.target.value) })} className="flex-1" />
            </label>
            <label className="flex items-center gap-3 text-xs">
              Out
              <input type="range" min={0} max={dur} step={0.1} value={clip.trimEnd || dur} onChange={(e) => patchClip(clip.id, { trimEnd: Number(e.target.value) })} className="flex-1" />
            </label>
            <label className="flex items-center gap-3 text-xs">
              Speed
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={clip.speed}
                onChange={(e) => {
                  patchClip(clip.id, { speed: Number(e.target.value) });
                  if (ref.current) ref.current.playbackRate = Number(e.target.value);
                }}
                className="flex-1"
              />
              <span>{clip.speed.toFixed(1)}×</span>
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              <button type="button" className="h-10" onClick={splitAt}><Scissors className="mr-1 inline size-3.5" />Split</button>
              <button type="button" className="h-10" onClick={() => { snapshot(); patchClip(clip.id, { reverse: !clip.reverse }); }}>Reverse</button>
              <button
                type="button"
                className="h-10"
                onClick={() => {
                  if (!clip || !ref.current) return;
                  snapshot();
                  void freezeFrame(clip.src, ref.current.currentTime).then((src) =>
                    addClip({ id: `c-${Date.now()}`, src, duration: 1.2, trimStart: 0, trimEnd: 1.2, speed: 1 }),
                  );
                }}
              >
                Freeze
              </button>
              <button type="button" className="h-10" onClick={() => { snapshot(); addClip({ ...clip, id: `c-${Date.now()}` }); }}>Duplicate</button>
              <button type="button" className="h-10" onClick={() => moveClip(clip.id, -1)}>Left</button>
              <button type="button" className="h-10" onClick={() => moveClip(clip.id, 1)}>Right</button>
              <button type="button" className="h-10" onClick={() => { snapshot(); removeClip(clip.id); }}><Trash2 className="mr-1 inline size-3.5" />Delete</button>
              <button type="button" className="h-10" onClick={() => setView("library")}>Add from Media</button>
              <button type="button" className="h-10" onClick={() => { snapshot(); patchClip(clip.id, { transition: clip.transition === "fade" ? "cut" : "fade" }); }}>
                {clip.transition === "fade" ? "Fade" : "Cut"}
              </button>
              <button type="button" className="h-10" onClick={() => { snapshot(); patchClip(clip.id, { opacity: clip.opacity === 0.5 ? 1 : 0.5 }); }}>
                Opacity
              </button>
            </div>
          </div>
        ) : null}
        {tool === "Mix" ? (
          <div>
            <AudioSheet embedded />
            <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] text-paper/70">
              <label>
                Original
                <input type="range" min={0} max={1} step={0.05} value={clipMute ? 0 : clipVolume} onChange={(e) => { setClipMute(false); setClipVolume(Number(e.target.value)); }} className="mt-1 w-full" />
                <button type="button" className="mt-1" onClick={() => setClipMute(!clipMute)}>{clipMute ? "Muted" : "On"}</button>
              </label>
              <label>
                Added audio
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={mix[0]?.volume ?? 0.8}
                  onChange={(e) => mix[0] && patchMix(mix[0].id, { volume: Number(e.target.value), mute: false })}
                  className="mt-1 w-full"
                />
              </label>
            </div>
          </div>
        ) : null}
        {tool === "Type" || tool === "Captions" || tool === "Stickers" ? (
          <div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                addOverlay({
                  id: `o-${Date.now()}`,
                  kind: tool === "Stickers" ? "sticker" : "text",
                  text: draft.trim(),
                  x: 50,
                  y: tool === "Captions" ? 82 : 40,
                  start: clip?.trimStart ?? 0,
                  end: clip?.trimEnd ?? 12,
                });
                setDraft("");
              }}
            >
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={tool === "Stickers" ? "Emoji…" : "Your words…"} className="h-11 flex-1 rounded-full bg-paper/10 px-4 text-sm outline-none" />
              <Button size="sm" type="submit">Add</Button>
            </form>
            {tool === "Stickers" ? (
              <div className="mt-2 flex gap-2 text-xl">
                {["🔥", "💛", "😭", "🎓", "⚽"].map((e) => (
                  <button key={e} type="button" onClick={() => addOverlay({ id: `o-${Date.now()}`, kind: "sticker", text: e, x: 50, y: 50, start: 0, end: 12 })}>
                    {e}
                  </button>
                ))}
              </div>
            ) : null}
            <ul className="mt-2 space-y-1">
              {overlays.map((o) => (
                <li key={o.id} className="flex items-center justify-between text-xs">
                  {o.text}
                  <button type="button" onClick={() => removeOverlay(o.id)}>Remove</button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {tool === "Looks" ? (
          <div className="flex gap-2 overflow-x-auto">
            {EFFECTS.slice(0, 16).map((e) => (
              <button
                key={e.id}
                type="button"
                className={cn("h-10 shrink-0 rounded-full px-3 text-xs", (clip?.effectId || effectId) === e.id ? "bg-paper text-ink" : "bg-paper/10")}
                onClick={() => {
                  if (clip) patchClip(clip.id, { effectId: e.id });
                  setEffect(e.id);
                }}
              >
                {e.name}
              </button>
            ))}
          </div>
        ) : null}
        {tool === "AI" ? (
          <p className="text-xs text-paper/60">Enhance, cinematic, and local looks run on this clip. Cloud removal waits for a connected editor. Nothing is stamped onto the export.</p>
        ) : null}
        {tool === "Frame" ? (
          <div className="flex gap-2">
            {["9:16", "1:1", "16:9", "4:5"].map((a) => (
              <button key={a} type="button" className={cn("h-10 rounded-full px-3 text-xs", aspect === a ? "bg-paper text-ink" : "bg-paper/10")} onClick={() => setAspect(a)}>
                {a}
              </button>
            ))}
          </div>
        ) : null}
        {tool === "Grade" ? (
          <p className="text-xs text-paper/60">Looks grade the clip. Nothing is printed onto the file.</p>
        ) : null}
      </div>
    </div>
  );
}
