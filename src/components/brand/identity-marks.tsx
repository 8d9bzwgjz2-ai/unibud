import { cn } from "@/lib/utils";

/** LIFE — infinity signal. Used for Spark. */
export function LifeMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 36"
      fill="none"
      aria-hidden
      className={cn("life-mark", className)}
    >
      <defs>
        <linearGradient id="lifeGrad" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#ff4ecd" />
          <stop offset="45%" stopColor="#7b6cff" />
          <stop offset="100%" stopColor="#3ecbff" />
        </linearGradient>
        <filter id="lifeGlow">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M18 18 C10 6, 2 10, 2 18 C2 26, 10 30, 18 18 C26 6, 34 10, 34 18 C34 26, 26 30, 18 18
           M46 18 C38 6, 30 10, 30 18 C30 26, 38 30, 46 18 C54 6, 62 10, 62 18 C62 26, 54 30, 46 18"
        stroke="url(#lifeGrad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        filter="url(#lifeGlow)"
        className="life-mark-path"
      />
      <circle cx="10" cy="12" r="0.9" fill="#ff4ecd" opacity="0.7" />
      <circle cx="54" cy="24" r="0.8" fill="#3ecbff" opacity="0.65" />
      <circle cx="32" cy="18" r="1.1" fill="#a78bfa" opacity="0.8" />
      <circle cx="22" cy="10" r="0.6" fill="#c4b5fd" opacity="0.5" />
      <circle cx="42" cy="26" r="0.6" fill="#67e8f9" opacity="0.5" />
    </svg>
  );
}

/** RIFF — particle mesh. Used for Riff surface. */
export function RiffMark({ className, size = 40 }: { className?: string; size?: number }) {
  const dots: { x: number; y: number; r: number; o: number }[] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const rad = 10 + (i % 5) * 2.2 + (i % 3);
    dots.push({
      x: 24 + Math.cos(a) * rad * (0.7 + (i % 4) * 0.08),
      y: 24 + Math.sin(a * 1.3) * rad * (0.65 + (i % 3) * 0.1),
      r: 0.55 + (i % 4) * 0.18,
      o: 0.35 + (i % 5) * 0.12,
    });
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={cn("riff-mark", className)}
    >
      <defs>
        <radialGradient id="riffCore" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#818cf8" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#c084fc" stopOpacity="0.35" />
        </radialGradient>
      </defs>
      <ellipse cx="24" cy="24" rx="16" ry="14" fill="url(#riffCore)" opacity="0.25" className="riff-mark-core" />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#a5b4fc" opacity={d.o} />
      ))}
      <circle cx="24" cy="22" r="1.6" fill="#e0e7ff" opacity="0.9" />
      <circle cx="18" cy="28" r="1.1" fill="#c4b5fd" opacity="0.7" />
      <circle cx="30" cy="18" r="1.2" fill="#67e8f9" opacity="0.75" />
    </svg>
  );
}

/** ORBIT — ringed loading mark. */
export function OrbitMark({
  className,
  size = 40,
  spinning = true,
}: {
  className?: string;
  size?: number;
  spinning?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={cn("orbit-mark", spinning && "orbit-mark-spin", className)}
    >
      <defs>
        <linearGradient id="orbitRing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="40%" stopColor="#f97316" />
          <stop offset="70%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="5" fill="#0f172a" stroke="url(#orbitRing)" strokeWidth="1.2" />
      <ellipse
        cx="24"
        cy="24"
        rx="18"
        ry="7"
        stroke="url(#orbitRing)"
        strokeWidth="1.6"
        opacity="0.95"
        transform="rotate(-18 24 24)"
        className="orbit-ring-a"
      />
      <ellipse
        cx="24"
        cy="24"
        rx="15"
        ry="5.5"
        stroke="url(#orbitRing)"
        strokeWidth="1"
        opacity="0.55"
        transform="rotate(12 24 24)"
        className="orbit-ring-b"
      />
      <circle cx="40" cy="20" r="1.1" fill="#fbbf24" opacity="0.9" />
      <circle cx="10" cy="30" r="0.8" fill="#60a5fa" opacity="0.8" />
      <circle cx="32" cy="34" r="0.6" fill="#f97316" opacity="0.7" />
    </svg>
  );
}

/** Full-screen / inline Orbit loading state. */
export function OrbitLoading({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("grid place-items-center gap-3 py-10", className)}
    >
      <OrbitMark size={48} spinning />
      <span className="sr-only">{label}</span>
    </div>
  );
}
