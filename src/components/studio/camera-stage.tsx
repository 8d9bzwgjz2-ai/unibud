import { useEffect, useRef, useState } from "react";
import { Bolt, FlipHorizontal, Grid2x2, Music, Settings, Sparkles, X } from "lucide-react";
import { effectById, effectsIn, EFFECT_CATEGORIES } from "@/lib/studio/effects";
import { processCanvas } from "@/lib/studio/photo";
import { compositeKey, GREEN_KEY } from "@/lib/studio/chroma";
import { currentDual } from "@/lib/studio/dual";
import { createFaceRuntime, type FaceBox } from "@/lib/studio/face";
import { pickDeviceMedia, filesFromInput, pickReasonCopy } from "@/lib/studio/media";
import { AudioSheet } from "@/components/studio/audio-sheet";
import { evaluate } from "@/lib/studio/eligibility";
import { useStudioStore } from "@/lib/studio/store";
import type { CaptureMode } from "@/lib/studio/types";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MODES: { id: CaptureMode; label: string }[] = [
  { id: "post", label: "Drop" },
  { id: "story", label: "Story" },
  { id: "peek", label: "Peek" },
  { id: "live", label: "Live" },
];

export function CameraStage({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const hold = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [tray, setTray] = useState<"looks" | "lens" | "mix" | "prompt" | null>(null);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const facing = useStudioStore((s) => s.facing);
  const setFacing = useStudioStore((s) => s.setFacing);
  const zoom = useStudioStore((s) => s.zoom);
  const setZoom = useStudioStore((s) => s.setZoom);
  const mode = useStudioStore((s) => s.mode);
  const setMode = useStudioStore((s) => s.setMode);
  const prefs = useStudioStore((s) => s.prefs);
  const patchPrefs = useStudioStore((s) => s.patchPrefs);
  const setImage = useStudioStore((s) => s.setImage);
  const setVideo = useStudioStore((s) => s.setVideo);
  const addClip = useStudioStore((s) => s.addClip);
  const addLibrary = useStudioStore((s) => s.addLibrary);
  const setView = useStudioStore((s) => s.setView);
  const library = useStudioStore((s) => s.library);
  const effectId = useStudioStore((s) => s.effectId);
  const setEffect = useStudioStore((s) => s.setEffect);
  const policy = useStudioStore((s) => s.policy);
  const standing = useStudioStore((s) => s.standing);
  const premium = useStudioStore((s) => s.premium);
  const connections = useCampusStore((s) => s.connections);
  const followers = useCampusStore((s) => s.followers);
  const last = library[0];
  const fx = effectById(effectId);

  const liveOk = evaluate("live", {
    startedAt: standing.startedAt,
    connections: connections.length,
    followers: followers.length,
    verified: standing.verified,
    creator: premium,
    strikes: standing.strikes,
  }, policy);

  useEffect(() => {
    let stop = false;
    async function boot() {
      setDenied(false);
      setReady(false);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: prefs.audio && mode !== "post",
          video: {
            facingMode: facing,
            width: { ideal: prefs.quality === "1080" ? 1920 : 1280 },
            frameRate: { ideal: prefs.fps },
          },
        });
        if (stop) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch {
        setDenied(true);
      }
    }
    void boot();
    return () => {
      stop = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facing, mode, prefs.audio, prefs.fps, prefs.quality]);

  useEffect(() => {
    if (!recording) return;
    const t = window.setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [recording]);

  function snap() {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 1080;
    canvas.height = v.videoHeight || 1440;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facing === "user" && prefs.mirrorFront) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.filter = fx.css === "none" ? "none" : fx.css;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
    processCanvas(ctx, canvas, fx.process);
    const chroma = useStudioStore.getState().chroma;
    if (chroma.on) {
      compositeKey(ctx, canvas.width, canvas.height, chroma.plate, {
        ...GREEN_KEY,
        tolerance: chroma.tolerance,
        feather: chroma.feather,
      });
    }
    const url = canvas.toDataURL("image/jpeg", 0.92);
    addLibrary({ id: `lib-${Date.now()}`, kind: "photo", src: url, createdAt: new Date().toISOString() });
    if (prefs.dual) return;
    setImage(url, url);
  }

  function startRec() {
    const stream = streamRef.current;
    if (!stream) return;
    chunks.current = [];
    const rec = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : undefined,
    });
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunks.current, { type: rec.mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      addLibrary({ id: `lib-${Date.now()}`, kind: "video", src: url, createdAt: new Date().toISOString() });
      addClip({
        id: `c-${Date.now()}`,
        src: url,
        duration: seconds,
        trimStart: 0,
        trimEnd: seconds,
        speed: 1,
        reverse: Boolean(prefs.handsFree && seconds > 0 && seconds < 4),
      });
      setVideo(url);
    };
    rec.start();
    recRef.current = rec;
    setSeconds(0);
    setRecording(true);
  }

  function stopRec() {
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
  }

  function ingestFiles(files: File[]) {
    const list = mode === "story" ? files.slice(0, 1) : files;
    if (mode === "story" && files.length > 1) toast.message("One photo or one video per Story.");
    if (!list.length) return;
    list.forEach((f, i) => {
      const src = URL.createObjectURL(f);
      const kind = f.type.startsWith("video") ? "video" : "photo";
      addLibrary({ id: `lib-${Date.now()}-${i}`, kind, src, createdAt: new Date().toISOString() });
      if (i > 0 && mode !== "story") {
        if (kind === "video") addClip({ id: `c-${Date.now()}-${i}`, src, duration: 8, trimStart: 0, trimEnd: 8, speed: 1 });
        return;
      }
      if (kind === "video") {
        addClip({ id: `c-${Date.now()}`, src, duration: 8, trimStart: 0, trimEnd: 8, speed: 1 });
        setVideo(src);
      } else setImage(src, src);
    });
  }

  function openGallery() {
    void pickDeviceMedia({ multiple: mode !== "story" }).then((r) => {
      if (r.ok) {
        ingestFiles(r.files);
        return;
      }
      if (r.reason === "unavailable" || r.reason === "denied") fileRef.current?.click();
      else toast.message(pickReasonCopy(r.reason));
    });
  }

  async function fire() {
    if (mode === "live") {
      if (!liveOk.ok) {
        setView("locked");
        return;
      }
      setView("live");
      return;
    }
    if (prefs.timer) {
      toast.message(`${prefs.timer}`);
      await new Promise((r) => setTimeout(r, prefs.timer * 1000));
    }
    if (prefs.handsFree && (mode === "peek" || mode === "post" || mode === "story")) {
      startRec();
      window.setTimeout(() => stopRec(), 4000);
      return;
    }
    if (mode === "peek" || recording) {
      if (recording) stopRec();
      else startRec();
      return;
    }
    snap();
  }

  function onShutterDown() {
    if (mode === "live" || mode === "peek") return;
    hold.current = window.setTimeout(() => startRec(), 280);
  }
  function onShutterUp() {
    if (hold.current) {
      window.clearTimeout(hold.current);
      hold.current = null;
      if (!recording && mode !== "peek" && mode !== "live") void fire();
    }
    if (recording && mode !== "peek") stopRec();
  }

  return (
    <div className="flex h-dvh flex-col bg-ink text-paper">
      <div className="relative mx-1.5 mt-[max(0.4rem,env(safe-area-inset-top))] min-h-0 flex-1 overflow-hidden rounded-[2.35rem] bg-ink">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 size-full object-cover"
          style={{
            filter: fx.css === "none" ? undefined : fx.css,
            transform: `scale(${zoom}) ${facing === "user" && prefs.mirrorFront ? "scaleX(-1)" : ""} ${fx.process === "mirror" ? "scaleX(-1)" : ""}`,
          }}
        />
        {prefs.grid !== "off" ? <GridOverlay kind={prefs.grid} /> : null}
        <ChromaLayer videoRef={videoRef} />
        <FaceLayer videoRef={videoRef} />
        <DualLayer />
        {prefs.teleprompter && prompt ? (
          <p className="pointer-events-none absolute inset-x-6 bottom-36 text-center text-lg text-paper/90">{prompt}</p>
        ) : null}

        <div className="relative z-10 flex items-center justify-between px-3 pt-3">
          <button type="button" className="glass-circle" onClick={onClose} aria-label="Close">
            <X className="size-5" />
          </button>
          {mode === "live" ? (
            <p className="glass rounded-full px-3 py-1 text-sm">Everyone</p>
          ) : (
            <div className="flex items-center gap-2">
              <IconBtn on={prefs.flash !== "off"} onClick={() => patchPrefs({ flash: prefs.flash === "off" ? "on" : "off" })}>
                <Bolt className="size-4" />
              </IconBtn>
              {zoom > 1 ? (
                <button type="button" className="glass-circle text-xs font-semibold" onClick={() => setZoom(1)}>
                  {zoom.toFixed(1)}×
                </button>
              ) : null}
            </div>
          )}
          <button type="button" className="glass-circle" aria-label="Lens" onClick={() => setTray(tray === "lens" ? null : "lens")}>
            <Settings className="size-5" />
          </button>
        </div>

        {mode === "live" ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title…"
            className="absolute inset-x-8 bottom-36 z-10 bg-transparent text-center font-display text-2xl text-paper outline-none placeholder:text-paper/50"
          />
        ) : null}

        <div className="absolute top-24 right-3 z-10 flex flex-col gap-3">
          <button type="button" className="glass-circle" aria-label="Looks" onClick={() => setTray("looks")}>
            <Sparkles className="size-[18px]" />
          </button>
          <button type="button" className="glass-circle" aria-label="Mix" onClick={() => setTray("mix")}>
            <Music className="size-[18px]" />
          </button>
        </div>

        {tray === "lens" ? (
          <LensSheet onClose={() => setTray(null)} onWrite={() => setView("write")} onPrompt={() => setTray("prompt")} />
        ) : null}

        <div className="glass-ink absolute right-4 bottom-28 z-10 rounded-lg px-1.5 py-1 text-[10px] font-semibold tracking-wide">
          {prefs.quality === "1080" ? "1080" : "720"}
          <span className="block text-[8px] font-medium text-paper/70">HD</span>
        </div>

        {denied ? (
          <div className="absolute inset-x-8 top-36 z-10 rounded-2xl bg-ink/80 p-5 text-center">
            <p className="text-sm font-semibold">Camera needs permission</p>
            <p className="mt-2 text-sm text-paper/70">Allow camera, or open Media.</p>
            <button type="button" className="mt-3 text-sm font-semibold" onClick={openGallery}>
              Media
            </button>
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-5 z-10 flex items-end justify-center gap-8">
          <button
            type="button"
            aria-label={recording ? "Stop" : mode === "live" ? "Go live" : "Capture"}
            onClick={() => {
              if (mode === "peek" || mode === "live") void fire();
            }}
            onPointerDown={onShutterDown}
            onPointerUp={onShutterUp}
            onPointerCancel={onShutterUp}
            className="shutter"
            data-rec={recording ? "true" : undefined}
            data-live={mode === "live" ? "true" : undefined}
          />
          <button
            type="button"
            className="absolute right-[18%] bottom-1 size-12 overflow-hidden rounded-full shadow-[inset_0_0_0_2px_rgb(255_255_255_/_.85)]"
            aria-label="Media"
            onClick={openGallery}
          >
            {last ? (
              last.kind === "video" ? <video src={last.src} className="size-full object-cover" muted /> : <img src={last.src} alt="" className="size-full object-cover" />
            ) : (
              <span className="grid size-full place-items-center bg-paper/10">
                <Grid2x2 className="size-4" />
              </span>
            )}
          </button>
        </div>
        {recording ? <p className="absolute bottom-28 left-1/2 z-10 -translate-x-1/2 text-xs tabular-nums">{seconds}s</p> : null}
        {ready || denied ? null : <p className="absolute bottom-36 left-1/2 z-10 -translate-x-1/2 text-xs text-paper/60">Starting camera…</p>}
      </div>

      <div className="flex items-center justify-between px-4 py-3 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
        <button type="button" className="glass-circle" aria-label="Media" onClick={openGallery}>
          <Grid2x2 className="size-5" />
        </button>
        <div className="cam-modes glass">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              data-on={mode === m.id ? "true" : undefined}
              onClick={() => {
                if (m.id === "live" && !liveOk.ok) {
                  setMode("live");
                  setView("locked");
                  return;
                }
                setMode(m.id);
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="glass-circle"
          aria-label="Flip camera"
          onClick={() => setFacing(facing === "user" ? "environment" : "user")}
        >
          <FlipHorizontal className="size-5" />
        </button>
      </div>

      {tray === "looks" ? <EffectsSheet onClose={() => setTray(null)} /> : null}
      {tray === "mix" ? <MixSheet onClose={() => setTray(null)} /> : null}
      {tray === "prompt" ? (
        <Sheet onClose={() => setTray(null)} title="Prompt">
          <textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              patchPrefs({ teleprompter: true });
            }}
            placeholder="Words to read while you record…"
            className="min-h-28 w-full rounded-2xl bg-paper/10 p-3 text-sm outline-none"
          />
        </Sheet>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple={mode !== "story"}
        className="hidden"
        onChange={(e) => {
          const r = filesFromInput(e.target.files);
          e.target.value = "";
          if (r.ok) ingestFiles(r.files);
        }}
      />
    </div>
  );
}

function MixSheet({ onClose }: { onClose: () => void }) {
  return <AudioSheet onClose={onClose} />;
}

function EffectsSheet({ onClose }: { onClose: () => void }) {
  const effectId = useStudioStore((s) => s.effectId);
  const setEffect = useStudioStore((s) => s.setEffect);
  const [cat, setCat] = useState(EFFECT_CATEGORIES[0] ?? "Looks");
  return (
    <Sheet onClose={onClose} title="Looks">
      <div className="mb-2 flex gap-3 overflow-x-auto text-[11px] font-semibold">
        {EFFECT_CATEGORIES.map((c) => (
          <button key={c} type="button" className={cn("shrink-0", cat === c ? "text-paper" : "text-paper/40")} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {effectsIn(cat, [], [], "").map((e) => (
          <button
            key={e.id}
            type="button"
            className={cn("h-10 rounded-full px-3 text-xs", effectId === e.id ? "bg-paper text-ink" : "bg-paper/10")}
            onClick={() => setEffect(e.id)}
          >
            {e.name}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function LensSheet({
  onClose,
  onWrite,
  onPrompt,
}: {
  onClose: () => void;
  onWrite: () => void;
  onPrompt: () => void;
}) {
  const prefs = useStudioStore((s) => s.prefs);
  const patch = useStudioStore((s) => s.patchPrefs);
  const chroma = useStudioStore((s) => s.chroma);
  const patchChroma = useStudioStore((s) => s.patchChroma);
  const dualStatus = useStudioStore((s) => s.dualStatus);
  const setDualStatus = useStudioStore((s) => s.setDualStatus);
  const faceOn = useStudioStore((s) => s.faceOn);
  const setFaceOn = useStudioStore((s) => s.setFaceOn);
  const setView = useStudioStore((s) => s.setView);
  const rows = [
    {
      group: "Capture",
      items: [
        { label: "Timer", on: prefs.timer > 0, go: () => patch({ timer: prefs.timer ? 0 : 3 }) },
        { label: "Hands-free", on: prefs.handsFree, go: () => patch({ handsFree: true }) },
        { label: "60 fps", on: prefs.fps === 60, go: () => patch({ fps: prefs.fps === 60 ? 30 : 60 }) },
      ],
    },
    {
      group: "Lens",
      items: [
        { label: "Grid", on: prefs.grid !== "off", go: () => patch({ grid: prefs.grid === "off" ? "rule3" : "off" }) },
        { label: "Level", on: prefs.level, go: () => patch({ level: !prefs.level }) },
        { label: "Stabilise", on: prefs.stabilize, go: () => patch({ stabilize: !prefs.stabilize }) },
        { label: "HD", on: prefs.quality === "1080", go: () => patch({ quality: prefs.quality === "1080" ? "720" : "1080" }) },
        { label: "Mic", on: prefs.audio, go: () => patch({ audio: !prefs.audio }) },
      ],
    },
    {
      group: "Stage",
      items: [
        { label: "Chroma", on: chroma.on, go: () => patchChroma({ on: !chroma.on }) },
        {
          label: "Dual",
          on: dualStatus === "on",
          hint: dualStatus === "unsupported" ? "This device won’t open two cameras" : dualStatus === "denied" ? "Camera permission blocked" : dualStatus === "busy" ? "Camera in use" : undefined,
          go: () => {
            void (async () => {
              const { startDual, stopDual } = await import("@/lib/studio/dual");
              if (dualStatus === "on") {
                stopDual();
                setDualStatus("off");
                return;
              }
              const r = await startDual();
              setDualStatus(r.ok ? "on" : r.reason);
            })();
          },
        },
        {
          label: "Face",
          on: faceOn,
          hint: "Boxes use FaceDetector when the device has it. Mesh/seg need MediaPipe — not faked.",
          go: () => setFaceOn(!faceOn),
        },
        { label: "Prompt", on: prefs.teleprompter, go: onPrompt },
        { label: "Write", on: false, go: onWrite },
        { label: "All lens settings", on: false, go: () => setView("settings") },
      ],
    },
  ];
  return (
    <div className="glass-ink absolute inset-x-3 top-16 z-20 max-h-[70%] overflow-y-auto rounded-[1.5rem] p-3">
      {rows.map((g) => (
        <div key={g.group} className="mb-3">
          <p className="px-2 text-[11px] font-semibold tracking-wide text-paper/50 uppercase">{g.group}</p>
          {g.items.map((r) => (
            <button key={r.label} type="button" onClick={r.go} className="flex min-h-11 w-full items-center justify-between px-2 py-1 text-left text-sm">
              <span>
                {r.label}
                {"hint" in r && r.hint ? <span className="mt-0.5 block text-[11px] text-paper/45">{r.hint}</span> : null}
              </span>
              <span className={r.on ? "text-paper" : "text-paper/35"}>{r.on ? "On" : ""}</span>
            </button>
          ))}
        </div>
      ))}
      {chroma.on ? (
        <label className="flex items-center gap-2 px-2 text-xs">
          Tolerance
          <input type="range" min={0.1} max={0.8} step={0.02} value={chroma.tolerance} onChange={(e) => patchChroma({ tolerance: Number(e.target.value) })} className="flex-1" />
        </label>
      ) : null}
      <button type="button" className="h-10 w-full text-sm text-paper/60" onClick={onClose}>
        Close
      </button>
    </div>
  );
}

function Sheet({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-[1.5rem] bg-ink/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-paper">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <button type="button" className="text-sm text-paper/60" onClick={onClose}>
          Close
        </button>
      </div>
      {children}
    </div>
  );
}

function IconBtn({ on, onClick, children }: { on?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={cn("glass-circle", on && "ring-1 ring-paper")} onClick={onClick}>
      {children}
    </button>
  );
}

function GridOverlay({ kind }: { kind: string }) {
  const cols = kind === "rule4" ? 4 : 3;
  return (
    <div className="pointer-events-none absolute inset-0 grid opacity-30" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols * cols }).map((_, i) => (
        <span key={i} className="border border-paper/30" />
      ))}
    </div>
  );
}

function ChromaLayer({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const chroma = useStudioStore((s) => s.chroma);
  useEffect(() => {
    if (!chroma.on) return;
    let raf = 0;
    const draw = () => {
      const v = videoRef.current;
      const c = canvas.current;
      if (v && c && v.videoWidth) {
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(v, 0, 0);
          compositeKey(ctx, c.width, c.height, chroma.plate, { ...GREEN_KEY, tolerance: chroma.tolerance, feather: chroma.feather });
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [chroma, videoRef]);
  if (!chroma.on) return null;
  return <canvas ref={canvas} className="pointer-events-none absolute inset-0 size-full object-cover" />;
}

function FaceLayer({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const on = useStudioStore((s) => s.faceOn);
  const [boxes, setBoxes] = useState<FaceBox[]>([]);
  useEffect(() => {
    if (!on) return;
    const runtime = createFaceRuntime();
    let stop = false;
    const tick = async () => {
      if (stop) return;
      const v = videoRef.current;
      if (v) setBoxes(await runtime.detect(v));
      window.setTimeout(() => void tick(), 240);
    };
    void tick();
    return () => {
      stop = true;
    };
  }, [on, videoRef]);
  if (!on) return null;
  return (
    <div className="pointer-events-none absolute inset-0">
      {boxes.map((b, i) => (
        <span key={i} className="absolute border border-paper/80" style={{ left: b.x, top: b.y, width: b.width, height: b.height }} />
      ))}
    </div>
  );
}

function DualLayer() {
  const status = useStudioStore((s) => s.dualStatus);
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const d = currentDual();
    if (status !== "on" || !d || !ref.current) return;
    ref.current.srcObject = d.front;
    void ref.current.play().catch(() => {});
  }, [status]);
  if (status !== "on") return null;
  return <video ref={ref} className="absolute right-3 bottom-36 z-10 h-28 w-20 rounded-xl object-cover" muted playsInline />;
}
