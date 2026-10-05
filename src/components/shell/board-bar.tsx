import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clapperboard, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { listEnrollments } from "@/lib/academic/server";
import { useAuthReady } from "@/components/unibud/sign-in-gate";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "unibud-board-bar-pos";
const HOLD_MS = 350;
const BAR_W = 220;
const BAR_H = 44;
type Pos = { x: number; y: number };

function loadPos(): Pos | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Pos) : null;
  } catch {
    return null;
  }
}

/**
 * Board is a surface at the top of UNIBUD, not a bottom-nav destination.
 * Fixed in the upper layer (feed scrolls underneath), press-and-hold to drag,
 * reset returns it to its default top position. Shows only real enrolment state.
 */
export function BoardBar({ headerHidden }: { headerHidden: boolean }) {
  const { user } = useAuthReady();
  const enrolled = useQuery({ queryKey: ["enroll"], queryFn: () => listEnrollments(), enabled: Boolean(user) });
  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);
  const hold = useRef<number | null>(null);
  const start = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  useEffect(() => setPos(loadPos()), []);

  const clamp = useCallback((p: Pos): Pos => ({
    x: Math.min(Math.max(0, p.x), Math.max(0, window.innerWidth - BAR_W)),
    y: Math.min(Math.max(0, p.y), Math.max(0, window.innerHeight - BAR_H)),
  }), []);

  function clearHold() {
    if (hold.current) window.clearTimeout(hold.current);
    hold.current = null;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const rect = bar.current?.getBoundingClientRect();
    if (!rect) return;
    const target = e.currentTarget;
    const { pointerId, clientX, clientY } = e;
    moved.current = false;
    clearHold();
    hold.current = window.setTimeout(() => {
      start.current = { px: clientX, py: clientY, ox: rect.left, oy: rect.top };
      target.setPointerCapture(pointerId);
      setDragging(true);
    }, HOLD_MS);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !start.current) return;
    moved.current = true;
    setPos(clamp({ x: start.current.ox + e.clientX - start.current.px, y: start.current.oy + e.clientY - start.current.py }));
  }

  function onPointerUp() {
    clearHold();
    if (dragging) {
      setDragging(false);
      start.current = null;
      setPos((p) => {
        if (p) localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
        return p;
      });
    }
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    setPos(null);
  }

  const count = enrolled.data?.length;
  const status = !user ? "Sign in to see your classes" : enrolled.isPending ? "Loading…" : enrolled.isError ? "Unavailable right now" : count ? `${count} class${count === 1 ? "" : "es"}` : "No classes joined yet";

  return (
    <div
      ref={bar}
      role="group"
      aria-label="Board"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "fixed z-40 flex touch-pan-y select-none items-center gap-1 rounded-full bg-ink pl-1 pr-1 text-paper shadow-soft ring-1 ring-border",
        pos ? "" : "left-1/2 -translate-x-1/2 transition-[top] duration-200",
        dragging ? "scale-105 cursor-grabbing" : "",
      )}
      style={{
        height: BAR_H,
        minWidth: BAR_W,
        ...(pos ? { left: pos.x, top: pos.y } : { top: headerHidden ? "calc(env(safe-area-inset-top) + 0.5rem)" : "calc(env(safe-area-inset-top) + 7.5rem)" }),
      }}
    >
      <Link
        to="/board"
        onClick={(e) => { if (moved.current) e.preventDefault(); }}
        draggable={false}
        className="flex h-full flex-1 items-center gap-2 rounded-full px-3 text-sm"
      >
        <Clapperboard className="size-4 shrink-0" />
        <span className="font-semibold">Board</span>
        <span className="truncate text-xs text-paper/70">{status}</span>
      </Link>
      {pos ? (
        <button type="button" aria-label="Return Board to top" title="Return Board to top" onClick={reset} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-paper/10">
          <RotateCcw className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
