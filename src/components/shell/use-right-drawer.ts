import { useCallback, useEffect, useRef, useState } from "react";

const EDGE = 22;
const DRAWER = 320;
const COMMIT = 0.32;

function scrollerX(target: EventTarget | null) {
  let n = target instanceof Element ? target : null;
  while (n && n !== document.body) {
    const { overflowX } = getComputedStyle(n);
    if (overflowX === "auto" || overflowX === "scroll") return true;
    n = n.parentElement;
  }
  return false;
}

export function useRightDrawer() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const session = useRef<{
    startX: number;
    startY: number;
    from: "closed" | "open";
    locked: "h" | "v" | null;
    lastX: number;
    lastT: number;
    vx: number;
    pointerId: number;
  } | null>(null);
  const progressRef = useRef(0);
  const openRef = useRef(false);

  const setP = useCallback((v: number) => {
    const n = Math.max(0, Math.min(1, v));
    progressRef.current = n;
    setProgress(n);
  }, []);

  const close = useCallback(() => {
    openRef.current = false;
    setOpen(false);
    setP(0);
    setDragging(false);
    session.current = null;
  }, [setP]);

  const openMenu = useCallback(() => {
    openRef.current = true;
    setOpen(true);
    setP(1);
    setDragging(false);
    session.current = null;
  }, [setP]);

  const finish = useCallback(() => {
    const s = session.current;
    session.current = null;
    setDragging(false);
    const p = progressRef.current;
    const vx = s?.vx ?? 0;
    const shouldOpen = vx < -0.55 || (vx <= 0.45 && p >= COMMIT);
    if (shouldOpen) openMenu();
    else close();
  }, [close, openMenu]);

  useEffect(() => {
    function down(e: PointerEvent) {
      if (openRef.current) return;
      if (e.pointerType === "mouse") return;
      if (e.button !== 0) return;
      if (window.innerWidth - e.clientX > EDGE) return;
      if (scrollerX(e.target)) return;
      session.current = {
        startX: e.clientX,
        startY: e.clientY,
        from: "closed",
        locked: null,
        lastX: e.clientX,
        lastT: performance.now(),
        vx: 0,
        pointerId: e.pointerId,
      };
    }

    function move(e: PointerEvent) {
      const s = session.current;
      if (!s || s.pointerId !== e.pointerId) return;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      const now = performance.now();
      const dt = Math.max(1, now - s.lastT);
      s.vx = (e.clientX - s.lastX) / dt;
      s.lastX = e.clientX;
      s.lastT = now;

      if (!s.locked) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx) * 1.15) {
          s.locked = "v";
          session.current = null;
          setDragging(false);
          setP(openRef.current ? 1 : 0);
          return;
        }
        s.locked = "h";
        setDragging(true);
      }
      if (s.locked !== "h") return;
      e.preventDefault();
      if (s.from === "closed") setP(-dx / DRAWER);
      else setP(1 - dx / DRAWER);
    }

    function up(e: PointerEvent) {
      const s = session.current;
      if (!s || s.pointerId !== e.pointerId) return;
      if (s.locked === "h") finish();
      else session.current = null;
    }

    window.addEventListener("pointerdown", down, { capture: true, passive: true });
    window.addEventListener("pointermove", move, { capture: true, passive: false });
    window.addEventListener("pointerup", up, { capture: true });
    window.addEventListener("pointercancel", up, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", up, true);
    };
  }, [finish, setP]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && openRef.current) close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const onDrawerPointerDown = useCallback((e: React.PointerEvent) => {
    if (!openRef.current) return;
    if (e.button !== 0) return;
    session.current = {
      startX: e.clientX,
      startY: e.clientY,
      from: "open",
      locked: null,
      lastX: e.clientX,
      lastT: performance.now(),
      vx: 0,
      pointerId: e.pointerId,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = session.current;
      if (!s || s.pointerId !== e.pointerId || s.from !== "open") return;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      const now = performance.now();
      const dt = Math.max(1, now - s.lastT);
      s.vx = (e.clientX - s.lastX) / dt;
      s.lastX = e.clientX;
      s.lastT = now;
      if (!s.locked) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx) * 1.15) {
          s.locked = "v";
          session.current = null;
          return;
        }
        s.locked = "h";
        setDragging(true);
      }
      if (s.locked !== "h") return;
      setP(1 - dx / DRAWER);
    },
    [setP],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const s = session.current;
      if (!s || s.pointerId !== e.pointerId || s.from !== "open") return;
      if (s.locked === "h") finish();
      else session.current = null;
    },
    [finish],
  );

  return {
    open,
    progress,
    dragging,
    openMenu,
    close,
    onDrawerPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
