import { useEffect, useRef, useState } from "react";
import { FlipHorizontal, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { evaluate } from "@/lib/studio/eligibility";
import { useStudioStore } from "@/lib/studio/store";
import { useCampusStore } from "@/lib/unibud/campus-store";

export function LiveDesk({ kind }: { kind: "live" | "stream" }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const live = useStudioStore((s) => s.live);
  const startLive = useStudioStore((s) => s.startLive);
  const addLiveLine = useStudioStore((s) => s.addLiveLine);
  const endLive = useStudioStore((s) => s.endLive);
  const facing = useStudioStore((s) => s.facing);
  const setFacing = useStudioStore((s) => s.setFacing);
  const setView = useStudioStore((s) => s.setView);
  const setComposeOpen = useCampusStore((s) => s.setComposeOpen);
  const connections = useCampusStore((s) => s.connections);
  const followers = useCampusStore((s) => s.followers);
  const policy = useStudioStore((s) => s.policy);
  const standing = useStudioStore((s) => s.standing);
  const premium = useStudioStore((s) => s.premium);
  const gate = evaluate(kind === "stream" ? "stream" : "live", {
    startedAt: standing.startedAt,
    connections: connections.length,
    followers: followers.length,
    verified: standing.verified,
    creator: premium,
    strikes: standing.strikes,
  }, policy);
  const [title, setTitle] = useState(kind === "stream" ? "UNIBUD stream" : "Live from Square");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let stop = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing }, audio: true })
      .then((stream) => {
        if (stop) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      stop = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  useEffect(() => {
    if (!gate.ok && !live.on) setView("locked");
  }, [gate.ok, live.on, setView]);

  const onAir = live.on;
  if (!gate.ok && !onAir) return null;

  return (
    <div className="relative flex h-dvh flex-col bg-ink text-paper">
      <video ref={videoRef} className="absolute inset-0 size-full object-cover" playsInline muted={!onAir} />
      <div className="relative z-10 flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button type="button" className="h-11 text-sm" onClick={() => (onAir ? endLive() : setView("camera"))}>
          {onAir ? "End" : "Back"}
        </button>
        {onAir ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-destructive px-3 py-1 text-[11px] font-semibold">
            <Radio className="size-3" /> {kind === "stream" ? "STREAM" : "LIVE"} · {1 + live.lines.length}
          </span>
        ) : (
          <p className="text-sm font-semibold">{kind === "stream" ? "Stream setup" : "Go Live"}</p>
        )}
        <button type="button" className="grid size-11 place-items-center" onClick={() => setFacing(facing === "user" ? "environment" : "user")}>
          <FlipHorizontal className="size-4" />
        </button>
      </div>
      {!onAir ? (
        <div className="relative z-10 mx-5 mt-auto mb-8 rounded-2xl bg-ink/70 p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 w-full rounded-xl bg-paper/10 px-3 text-sm outline-none"
            placeholder="Title"
          />
          <p className="mt-2 text-xs text-paper/60">
            Camera and mic stay on this device. This is a UNIBUD live room — not a third-party stream ingest.
          </p>
          <Button className="mt-4 w-full" onClick={() => startLive(title.trim() || "Live")}>
            Start {kind === "stream" ? "stream" : "live"}
          </Button>
        </div>
      ) : (
        <div className="relative z-10 mt-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mb-3 max-h-40 space-y-1 overflow-y-auto">
            {live.lines.map((l, i) => (
              <p key={i} className="text-sm text-paper/90">
                {l}
              </p>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              addLiveLine(`You: ${draft.trim()}`);
              setDraft("");
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Comment…"
              className="h-11 flex-1 rounded-full bg-paper/15 px-4 text-sm outline-none"
            />
            <Button
              type="button"
              variant="outline"
              className="border-paper/30 text-paper"
              onClick={() => {
                endLive();
                streamRef.current?.getTracks().forEach((t) => t.stop());
                setComposeOpen(false);
              }}
            >
              End
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
