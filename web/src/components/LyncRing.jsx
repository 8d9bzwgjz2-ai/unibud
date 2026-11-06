export default function LyncRing({ streak, next, size = 76 }) {
  const target = next?.days ?? Math.max(streak, 1);
  const progress = Math.max(0, Math.min(1, streak / target));
  const degrees = Math.round(progress * 360);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(#B08D4F ${degrees}deg, #E3DCD1 ${degrees}deg 360deg)`,
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-[5px] flex flex-col items-center justify-center rounded-full bg-paper">
        <span className="font-serif text-2xl leading-none">{streak}</span>
        <span className="mt-1 text-[8px] uppercase tracking-[0.2em] text-muted">days</span>
      </div>
    </div>
  );
}
