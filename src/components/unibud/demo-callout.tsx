export function DemoCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3">
      <span className="inline-flex h-6 items-center rounded-full bg-warn/20 px-2 text-[11px] font-semibold text-ink">
        Demo
      </span>
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
