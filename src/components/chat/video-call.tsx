import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, FlipHorizontal, PhoneOff, VideoOff } from "lucide-react";
import { createPeer, signalingNeeded, type CallState } from "@/lib/studio/rtc";

/** Private 1:1. Local preview is real. Remote needs signaling — not faked. */
export function VideoCall({ peer, onEnd }: { peer: string; onEnd: () => void }) {
  const mine = useRef<HTMLVideoElement>(null);
  const theirs = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<ReturnType<typeof createPeer> | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [denied, setDenied] = useState(false);
  const [state, setState] = useState<CallState>("getting-media");

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
        if (mine.current) {
          mine.current.srcObject = stream;
          void mine.current.play().catch(() => {});
        }
        const session = createPeer(stream);
        peerRef.current = session;
        session.pc.ontrack = (e) => {
          if (theirs.current) theirs.current.srcObject = e.streams[0] ?? new MediaStream([e.track]);
          setState("connected");
        };
        session.pc.onconnectionstatechange = () => {
          const st = session.pc.connectionState;
          if (st === "connected") setState("connected");
          if (st === "failed") setState("failed");
          if (st === "disconnected" || st === "closed") setState("ended");
        };
        setState("waiting-signal");
      })
      .catch(() => {
        setDenied(true);
        setState("failed");
      });
    return () => {
      stop = true;
      peerRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  return (
    <div className="fixed inset-0 z-[60] bg-ink text-paper">
      <video ref={theirs} className="size-full object-cover" playsInline />
      <video ref={mine} className="absolute right-3 top-[max(3.5rem,env(safe-area-inset-top))] h-36 w-24 rounded-2xl object-cover ring-1 ring-paper/30" playsInline muted />
      <p className="absolute top-[max(1rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 text-sm font-medium">
        {peer}
      </p>
      <p className="absolute inset-x-8 top-16 text-center text-xs text-paper/70">
        {denied
          ? "Camera and mic are needed."
          : state === "waiting-signal"
            ? signalingNeeded()
            : state === "connected"
              ? "Connected"
              : state === "failed"
                ? "Call failed"
                : state === "getting-media"
                  ? "Opening camera…"
                  : "Private call — not Live."}
      </p>
      <div className="absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] flex justify-center gap-4">
        <button
          type="button"
          className="grid size-14 place-items-center rounded-full bg-paper/15"
          aria-label={muted ? "Unmute" : "Mute"}
          onClick={() => {
            const next = !muted;
            streamRef.current?.getAudioTracks().forEach((t) => {
              t.enabled = !next;
            });
            setMuted(next);
          }}
        >
          {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </button>
        <button
          type="button"
          className="grid size-14 place-items-center rounded-full bg-paper/15"
          aria-label={camOff ? "Camera on" : "Camera off"}
          onClick={() => {
            const next = !camOff;
            streamRef.current?.getVideoTracks().forEach((t) => {
              t.enabled = !next;
            });
            setCamOff(next);
          }}
        >
          <VideoOff className="size-5" />
        </button>
        <button
          type="button"
          className="grid size-16 place-items-center rounded-full bg-destructive"
          aria-label="End call"
          onClick={() => {
            peerRef.current?.close();
            streamRef.current?.getTracks().forEach((t) => t.stop());
            onEnd();
          }}
        >
          <PhoneOff className="size-6" />
        </button>
        <button
          type="button"
          className="grid size-14 place-items-center rounded-full bg-paper/15"
          aria-label="Flip camera"
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
        >
          <FlipHorizontal className="size-5" />
        </button>
      </div>
    </div>
  );
}
