import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Internal Bud workspace chrome — not primary UNIBUD navigation.
 * Future Oracle knowledge/identity capabilities attach through Bud Chat,
 * never as a Square/Connect tab or a specialist picker.
 */
const TABS = [
  { to: "/bud", label: "Chat" },
  { to: "/studies", label: "Studies" },
  { to: "/bud/communities", label: "Communities" },
  { to: "/bud/fixer", label: "Fixer" },
] as const;

export function BudShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div>
      <nav className="flex gap-1 overflow-x-auto px-4 pt-3">
        {TABS.map((t) => {
          const on = t.to === "/bud" ? pathname === "/bud" : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "h-9 shrink-0 rounded-full px-3 text-sm font-medium",
                on ? "bg-ink text-paper" : "text-muted-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
