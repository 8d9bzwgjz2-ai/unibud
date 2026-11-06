import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, MessageCircle, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

/** Permanent navigator — icons only. Labels stay in aria-label for accessibility. */
export const PRIMARY_NAV = [
  { to: "/", label: "Square", icon: LayoutGrid },
  { to: "/connect", label: "Connect", icon: UserPlus },
  { to: "/board", label: "Board", icon: Users },
  { to: "/messages", label: "Chat", icon: MessageCircle },
] as const;

function activePath(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function PrimaryNav({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Primary"
      className={cn("flex items-center justify-around px-2 py-1", className)}
    >
      {PRIMARY_NAV.map((item) => {
        const on = activePath(pathname, item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-label={item.label}
            title={item.label}
            className={cn(
              "relative grid size-11 place-items-center rounded-full transition-colors",
              on ? "text-ink" : "text-muted-foreground hover:text-ink",
            )}
          >
            <Icon className="size-6" strokeWidth={on ? 2.25 : 1.75} />
            {on ? (
              <span className="absolute bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-ink" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
