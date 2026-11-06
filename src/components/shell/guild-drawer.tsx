import { Link } from "@tanstack/react-router";
import { Clapperboard, ConciergeBell, Store, X } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useDialogFocus } from "./use-dialog-focus";

export const GUILD_NAV = [
  {
    to: "/guild/quarter",
    label: "The Quarter",
    detail: "Commerce and marketplace",
    icon: Store,
  },
  {
    to: "/guild/concierge",
    label: "Concierge",
    detail: "Service assistance",
    icon: ConciergeBell,
  },
  {
    to: "/board",
    label: "Board",
    detail: "Classes and academic workspace",
    icon: Clapperboard,
  },
] as const;

type Props = {
  open: boolean;
  progress: number;
  dragging: boolean;
  onClose: () => void;
  onDrawerPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
};

export function GuildDrawer({
  open,
  progress,
  dragging,
  onClose,
  onDrawerPointerDown,
  onPointerMove,
  onPointerUp,
}: Props) {
  const panel = useRef<HTMLElement>(null);
  const idle = progress <= 0.001 && !dragging;
  useDialogFocus(open, panel, onClose);

  return (
    <div className={cn("fixed inset-0 z-50", idle && "pointer-events-none")} aria-hidden={idle}>
      <button
        type="button"
        tabIndex={idle ? -1 : 0}
        aria-label="Close Guild"
        className="absolute inset-0 bg-ink/40"
        style={{
          opacity: progress,
          transition: dragging ? "none" : "opacity 280ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onClick={onClose}
      />
      <aside
        ref={panel}
        id="guild-drawer"
        role={idle ? undefined : "dialog"}
        aria-modal={idle ? undefined : true}
        aria-label={idle ? undefined : "Guild"}
        tabIndex={-1}
        className="absolute top-0 right-0 flex h-full w-[min(100%,20rem)] flex-col bg-background px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-soft outline-none"
        style={{
          transform: `translateX(${(1 - progress) * 100}%)`,
          transition: dragging ? "none" : "transform 280ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onPointerDown={onDrawerPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="flex items-start justify-between gap-3 px-1">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">Guild</p>
            <h2 className="mt-1 font-display text-3xl">Practical tools</h2>
          </div>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full hover:bg-secondary"
            aria-label="Close Guild"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-3 px-1 text-sm text-muted-foreground">
          The Quarter, Concierge, and Board. Nothing else lives in this drawer.
        </p>
        <nav aria-label="Guild" className="mt-5 space-y-2">
          {GUILD_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                tabIndex={idle ? -1 : 0}
                className="flex items-center gap-3 rounded-2xl bg-card px-3 py-3 ring-1 ring-border hover:bg-secondary"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-secondary text-ink">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.detail}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
