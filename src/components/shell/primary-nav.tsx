import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, MessageCircle, Sparkles, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const PRIMARY_NAV = [
  { to: "/", label: "Square", icon: LayoutGrid },
  { to: "/connect", label: "Connect", icon: UserPlus },
  { to: "/communities", label: "Quad", icon: Users },
  { to: "/messages", label: "Chat", icon: MessageCircle },
  { to: "/spark", label: "Spark", icon: Sparkles, iconOnly: true },
] as const satisfies readonly { to: string; label: string; icon: unknown; iconOnly?: boolean }[];

function activePath(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function PrimaryNav({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav aria-label="Primary" className={cn("flex items-end justify-between px-3 pt-1 pb-1", className)}>
      {PRIMARY_NAV.map((item) => {
        const on = activePath(pathname, item.to);
        const Icon = item.icon;
        const iconOnly = "iconOnly" in item && item.iconOnly;
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-label={item.label}
            className={cn(
              "relative flex min-w-[3.5rem] flex-col items-center justify-end gap-1 px-1 pb-2 pt-1",
              on ? "text-ink" : "text-muted-foreground",
            )}
          >
            <Icon className={iconOnly ? "size-6" : "size-5"} strokeWidth={on ? 2.25 : 1.75} />
            {iconOnly ? null : <span className="text-[11px] font-semibold tracking-[0.08em] uppercase">{item.label}</span>}
            {on ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-ink" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}