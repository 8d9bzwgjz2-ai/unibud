import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/unibud/types";

const tones: Record<Tone, string> = {
  ink: "from-zinc-800 to-zinc-950",
  teal: "from-teal-900 to-zinc-950",
  warm: "from-orange-950 to-zinc-950",
  forest: "from-emerald-950 to-zinc-950",
  clay: "from-stone-800 to-zinc-950",
  night: "from-slate-800 to-zinc-950",
};

export function PhotoPlate({
  src,
  alt,
  tone = "ink",
  title,
  className,
}: {
  src?: string;
  alt: string;
  tone?: Tone;
  title?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-secondary", className)}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className={cn("flex h-full w-full items-end bg-linear-to-br p-4", tones[tone])}>
          <div className="noise-overlay absolute inset-0" />
          {title ? (
            <p className="relative text-sm font-medium text-foreground/90">{title}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
