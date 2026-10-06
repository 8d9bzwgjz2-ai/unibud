import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, MessageCircle, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import "./bud-spark.css";

export const PRIMARY_NAV = [
  { to: "/", label: "Square", icon: LayoutGrid },
  { to: "/connect", label: "Connect", icon: UserPlus },
  { to: "/communities", label: "Quad", icon: Users },
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
      aria-label="Navigator"
      className={cn("fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]", className)}
    >
      <div className="relative mx-auto max-w-3xl px-2 pb-1 pt-3">
        <div className="absolute inset-x-0 bottom-0 h-24 overflow-hidden pointer-events-none">
          <div className="bud-wave-glow bud-wave-glow--left" />
          <div className="bud-wave-glow bud-wave-glow--right" />
        </div>
        <div className="relative mx-auto flex max-w-xl items-end justify-between rounded-[2rem] border border-white/70 bg-white/82 px-1.5 py-1.5 shadow-[0_18px_55px_rgba(17,17,20,0.12)] backdrop-blur-xl">
          {PRIMARY_NAV.slice(0, 2).map((item) => {
            const on = activePath(pathname, item.to);
            const Icon = item.icon;
            return <NavItem key={item.to} item={item} on={on} Icon={Icon} />;
          })}
          <div className="w-12 shrink-0" aria-hidden="true" />
          {PRIMARY_NAV.slice(2).map((item) => {
            const on = activePath(pathname, item.to);
            const Icon = item.icon;
            return <NavItem key={item.to} item={item} on={on} Icon={Icon} />;
          })}
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  item,
  on,
  Icon,
}: {
  item: (typeof PRIMARY_NAV)[number];
  on: boolean;
  Icon: (typeof PRIMARY_NAV)[number]["icon"];
}) {
  return (
    <Link
      to={item.to}
      className={cn(
        "relative flex min-w-[4.2rem] flex-col items-center gap-0.5 rounded-2xl px-1 pb-1 pt-1.5",
        on ? "text-ink" : "text-muted-foreground",
      )}
    >
      <Icon className="size-[18px]" strokeWidth={on ? 2.25 : 1.7} />
      <span className="text-[10px] font-semibold tracking-[0.06em] uppercase">{item.label}</span>
      {on ? <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-ink" /> : null}
    </Link>
  );
}
