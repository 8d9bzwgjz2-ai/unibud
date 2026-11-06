import { cn } from "@/lib/utils";
import { initials } from "@/lib/unibud/format";

const TONES = [
  "bg-tone-teal text-paper",
  "bg-tone-warm text-paper",
  "bg-tone-forest text-paper",
  "bg-tone-clay text-paper",
  "bg-tone-night text-paper",
  "bg-tone-ink text-paper",
];

function toneFor(key: string) {
  let n = 0;
  for (let i = 0; i < key.length; i++) n += key.charCodeAt(i);
  return TONES[n % TONES.length];
}

export function PersonMark({
  name,
  handle,
  size = "md",
  verified,
}: {
  name: string;
  handle?: string;
  size?: "sm" | "md" | "lg";
  verified?: boolean;
}) {
  const dim = size === "sm" ? "size-8 text-xs" : size === "lg" ? "size-14 text-lg" : "size-10 text-sm";
  return (
    <span className="relative inline-flex shrink-0">
      <span
        className={cn(
          "grid place-items-center rounded-full font-medium",
          dim,
          toneFor(handle || name),
        )}
      >
        {initials(name)}
      </span>
      {verified ? (
        <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-bud" title="Verified" />
      ) : null}
    </span>
  );
}
