import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type BudWaveState =
  | "idle"
  | "listening"
  | "processing"
  | "responding"
  | "unavailable"
  | "error";

/**
 * Bud intelligence signal — deep particle band under the header.
 * No "Bud" label. Opens Bud. Calm when idle; motion for real activity.
 */
export function BudWave({
  state = "idle",
  className,
  interactive = true,
}: {
  state?: BudWaveState;
  className?: string;
  /** False when the wave is already inside Bud. It must not act as navigation. */
  interactive?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onBud = pathname.startsWith("/bud");
  const live = state !== "idle" && state !== "unavailable" && state !== "error";
  const body = (
    <>
      <span
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[color:var(--color-bud)]/[0.07] via-transparent to-transparent"
        aria-hidden
      />
      <svg
        viewBox="0 0 720 72"
        preserveAspectRatio="xMidYMid slice"
        className={cn(
          "absolute inset-0 h-full w-full",
          live || onBud ? "bud-wave-live" : "bud-wave-idle",
        )}
        aria-hidden
      >
        <defs>
          <linearGradient id="budParticleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff4ecd" stopOpacity="0" />
            <stop offset="15%" stopColor="#c084fc" stopOpacity="0.45" />
            <stop offset="40%" stopColor="#6d5ef6" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#6d5ef6" stopOpacity="1" />
            <stop offset="85%" stopColor="#38bdf8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="budRibbonDeep" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6d5ef6" stopOpacity="0" />
            <stop offset="50%" stopColor="#6d5ef6" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#6d5ef6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="budRibbonSoft" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0" />
            <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
          </linearGradient>
          <filter id="budGlowDeep" x="-15%" y="-60%" width="130%" height="220%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M0 40 C60 18, 120 58, 180 40 S300 16, 360 40 S480 62, 540 40 S660 20, 720 40
             L720 58 C660 70, 540 50, 420 58 S240 40, 120 58 S40 68, 0 58 Z"
          fill="url(#budRibbonDeep)"
          opacity={0.85}
        />
        <path
          d="M0 36 C70 52, 140 20, 210 36 S350 56, 420 36 S560 14, 630 36 S690 50, 720 36
             L720 48 C660 40, 540 58, 420 48 S240 28, 120 48 S40 56, 0 48 Z"
          fill="url(#budRibbonSoft)"
          opacity={0.7}
        />

        <path
          d="M0 36 C55 16, 110 54, 165 36 S275 12, 330 36 S440 58, 495 36 S605 16, 660 36 S690 48, 720 36"
          fill="none"
          stroke="url(#budParticleGrad)"
          strokeWidth="2.4"
          strokeLinecap="round"
          filter="url(#budGlowDeep)"
          className="bud-stroke-main"
          opacity={onBud ? 1 : 0.92}
        />
        <path
          d="M0 36 C65 48, 130 20, 195 36 S325 54, 390 36 S520 16, 585 36 S660 50, 720 36"
          fill="none"
          stroke="url(#budParticleGrad)"
          strokeWidth="1.4"
          strokeLinecap="round"
          className="bud-stroke-sub"
          opacity={0.75}
        />
        <path
          d="M0 36 C45 28, 90 44, 135 36 S225 24, 290 36 S380 48, 450 36 S540 26, 610 36 S670 42, 720 36"
          fill="none"
          stroke="#6d5ef6"
          strokeWidth="1"
          strokeLinecap="round"
          opacity={0.4}
        />

        <g fill="#c4b5fd" className="bud-particles">
          {[
            [24, 28, 1.0, 0.55],
            [48, 44, 0.7, 0.4],
            [72, 22, 1.2, 0.5],
            [96, 40, 0.8, 0.45],
            [120, 26, 0.6, 0.35],
            [148, 48, 1.1, 0.5],
            [172, 20, 0.7, 0.4],
            [200, 38, 1.3, 0.55],
            [228, 30, 0.8, 0.45],
            [256, 50, 0.7, 0.4],
            [284, 18, 1.0, 0.5],
            [312, 42, 0.9, 0.45],
            [340, 28, 0.6, 0.35],
            [368, 46, 1.2, 0.5],
            [396, 24, 0.7, 0.4],
            [424, 36, 0.9, 0.48],
            [452, 52, 0.8, 0.42],
            [480, 22, 1.1, 0.5],
            [508, 40, 0.7, 0.4],
            [536, 30, 1.0, 0.52],
            [564, 48, 0.6, 0.35],
            [592, 26, 0.9, 0.45],
            [620, 38, 0.8, 0.42],
            [648, 20, 1.1, 0.48],
            [676, 44, 0.7, 0.4],
            [700, 32, 0.9, 0.45],
          ].map(([cx, cy, r, o], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} opacity={o} />
          ))}
        </g>
      </svg>
    </>
  );

  const classNameAll = cn(
    "bud-wave-band group relative flex h-[3.25rem] w-full items-center justify-center overflow-hidden",
    interactive && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-bud)]/40 focus-visible:ring-inset",
    className,
  );

  if (!interactive) {
    return (
      <div className={classNameAll} aria-hidden>
        {body}
      </div>
    );
  }

  return (
    <Link to="/bud" aria-label="Open Bud" title="Bud" className={classNameAll}>
      {body}
    </Link>
  );
}
