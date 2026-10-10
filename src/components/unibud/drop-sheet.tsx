import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Image, Play, Radio } from "lucide-react";
import { evaluate } from "@/lib/studio/eligibility";
import { useStudioStore } from "@/lib/studio/store";
import { useCampusStore } from "@/lib/unibud/campus-store";

type Kind = "post" | "story" | "peek" | "live";

const ITEMS: { id: Kind; name: string; blurb: string; icon: typeof Image }[] = [
  { id: "post", name: "Drop", blurb: "Share with Square — photo or video.", icon: Image },
  { id: "story", name: "Story", blurb: "One photo or one video. Gone soon.", icon: Image },
  { id: "peek", name: "Peek", blurb: "Short vertical video. Same Studio.", icon: Play },
  { id: "live", name: "Live", blurb: "Public broadcast. Policy decides if you’re open.", icon: Radio },
];

export function DropSheet({ onClose }: { onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  const setComposeOpen = useCampusStore((s) => s.setComposeOpen);
  const connections = useCampusStore((s) => s.connections);
  const followers = useCampusStore((s) => s.followers);
  const policy = useStudioStore((s) => s.policy);
  const standing = useStudioStore((s) => s.standing);
  const premium = useStudioStore((s) => s.premium);
  const setMode = useStudioStore((s) => s.setMode);
  const setIntent = useStudioStore((s) => s.setIntent);
  const setView = useStudioStore((s) => s.setView);
  const setDest = useStudioStore((s) => s.setDest);

  const live = evaluate("live", {
    startedAt: standing.startedAt,
    connections: connections.length,
    followers: followers.length,
    verified: standing.verified,
    creator: premium,
    strikes: standing.strikes,
  }, policy);

  useEffect(() => {
    first.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function openStudio(kind: Kind) {
    if (kind === "live") {
      onClose();
      setComposeOpen(true);
      setMode("live");
      setDest("live");
      setView(live.ok ? "camera" : "locked");
      return;
    }
    onClose();
    setIntent(kind === "peek" ? "peek" : kind === "story" ? "story" : "post");
    setMode(kind === "story" ? "story" : kind === "peek" ? "peek" : "post");
    setDest(kind === "story" ? "story" : kind === "peek" ? "peek" : "square");
    setView("camera");
    setComposeOpen(true);
  }

  const sheet = (
    <div
      className="fixed inset-0 z-[200] flex flex-col justify-end bg-ink/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drop-sheet-title"
        className="rounded-t-[1.5rem] bg-paper px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="drop-sheet-title" className="font-display text-2xl">
          Drop
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Create and share something with your UNIBUD world.</p>
        <ul className="mt-4">
          {ITEMS.map((item, i) => {
            const why = item.id === "live" && !live.ok ? live.missing[0]?.need : undefined;
            return (
              <li key={item.id}>
                <button
                  ref={i === 0 ? first : undefined}
                  type="button"
                  className="flex min-h-14 w-full items-center gap-3 rounded-[1rem] px-2 py-2 text-left focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => openStudio(item.id)}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-ink">
                    <item.icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{item.name}</span>
                    <span className="block text-xs text-muted-foreground">{why ? `Needs ${why}` : item.blurb}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" className="mt-2 h-11 w-full text-sm text-muted-foreground" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );

  if (typeof document === "undefined") return sheet;
  return createPortal(sheet, document.body);
}
