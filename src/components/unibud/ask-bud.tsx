import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { resolveBudShortcut, useCampusStore } from "@/lib/unibud/campus-store";

/** Bottom Bud shortcut. Hidden when preference is Top or Hidden, and on composers/live. */
export function AskBudFab({ menuOpen }: { menuOpen: boolean }) {
  const shortcut = useCampusStore((s) => resolveBudShortcut(s));
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hide =
    shortcut === "hidden" ||
    menuOpen ||
    pathname.startsWith("/bud") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/studies") ||
    pathname.startsWith("/board") ||
    pathname.startsWith("/tutor") ||
    pathname.startsWith("/live") ||
    pathname.startsWith("/podcasts") ||
    pathname.startsWith("/welcome") ||
    pathname.startsWith("/spill") ||
    pathname.startsWith("/riff") ||
    pathname.startsWith("/fixer");

  if (hide) return null;

  return (
    <Link
      to="/bud"
      aria-label="Ask Bud"
      className="fixed right-4 z-40 flex h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper shadow-soft"
      style={{ bottom: "max(1.25rem, calc(env(safe-area-inset-bottom) + 0.75rem))" }}
    >
      <Sparkles className="size-4" />
      Ask Bud
    </Link>
  );
}
