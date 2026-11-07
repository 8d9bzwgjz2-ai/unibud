import { cn } from "@/lib/utils";
import { initials } from "@/lib/unibud/format";
import { uniById } from "@/lib/unibud/catalog";
import { roleLabel } from "@/lib/unibud/roles";
import type { DirectoryPerson } from "@/lib/unibud/types";

const hues = [
  "bg-bud-dim text-bud",
  "bg-secondary text-foreground",
  "bg-tone-warm text-ink",
  "bg-tone-forest text-ink",
];

export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const hue = hues[name.length % hues.length];
  return (
    <span
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        hue,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function PersonMeta({
  person,
  compact,
}: {
  person: DirectoryPerson;
  compact?: boolean;
}) {
  const uni = uniById(person.universityId);
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <p className="truncate text-sm font-medium">{person.name}</p>
        {person.verified ? (
          <span className="grid size-4 place-items-center rounded-full bg-bud text-[9px] font-bold text-bud-foreground">
            ✓
          </span>
        ) : null}
      </div>
      <p className="truncate text-xs text-muted-foreground">
        @{person.handle}
        {compact ? null : ` · ${uni?.shortName ?? ""} · ${person.program}`}
      </p>
      {person.role && person.role !== "student" ? (
        <p className="truncate text-[11px] text-muted-foreground">{roleLabel(person.role, person.program)}</p>
      ) : null}
    </div>
  );
}
