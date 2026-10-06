import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * Bud's persistent intelligence signature. This is a visual layer behind the
 * bottom navigator, not a second navigation product or a fake activity signal.
 */
export function BudWave({ active = false }: { active?: boolean }) {
  return (
    <Link
      to="/bud"
      aria-label="Open Bud"
      className={cn("bud-wave", active && "bud-wave--active")}
    >
      <span className="bud-wave__core" aria-hidden="true">
        <span className="bud-wave__speaker" />
        <span className="bud-wave__arc bud-wave__arc--1" />
        <span className="bud-wave__arc bud-wave__arc--2" />
        <span className="bud-wave__arc bud-wave__arc--3" />
      </span>
    </Link>
  );
}
