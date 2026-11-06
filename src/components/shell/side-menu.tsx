import { Link, useRouterState } from "@tanstack/react-router";
import { useRef } from "react";
import {
  BadgeHelp,
  BookOpen,
  CircleUser,
  ClipboardList,
  Clapperboard,
  ConciergeBell,
  ExternalLink,
  Film,
  GraduationCap,
  Landmark,
  LogOut,
  Megaphone,
  Newspaper,
  Search,
  ShoppingBag,
  Settings,
  Sparkles,
  Trophy,
  Users,
  Waves,
  Wrench,
  X,
} from "lucide-react";
import { RiffMark } from "@/components/brand/identity-marks";
import { Wordmark } from "@/components/brand/logo";
import { Avatar } from "@/components/unibud/person";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { authEnabled, signOut } from "@/lib/auth/client";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { canTeach, roleLabel } from "@/lib/unibud/roles";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { useDialogFocus } from "./use-dialog-focus";

const guild = [
  { to: "/guild/quarter", label: "The Quarter", icon: Landmark },
  { to: "/guild/concierge", label: "Concierge", icon: ConciergeBell },
  { to: "/board", label: "Board", icon: GraduationCap },
] as const;

const items = [
  { to: "/communities", label: "Quad", icon: Users },
  { to: "/market", label: "Market", icon: ShoppingBag },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/flow", label: "Flow", icon: Waves },
  { to: "/sport", label: "Sport", icon: Trophy },
  { to: "/watch", label: "Cinema", icon: Film },
  { to: "/profile", label: "Profile", icon: CircleUser },
  { to: "/bud", label: "Bud", icon: Sparkles },
  { to: "/riff", label: "Riff", icon: Megaphone },
  { to: "/search", label: "Search", icon: Search },
  { to: "/studies", label: "Studies", icon: BookOpen },
  { to: "/news", label: "Educational News", icon: Newspaper },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/fixer", label: "The Fixer", icon: Wrench },
  { to: "/help", label: "Help & Support", icon: BadgeHelp },
  { to: "/feedback", label: "Feedback", icon: BadgeHelp },
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

/** Secondary menu. Opens from the right edge. Spark is separate. */
export function SideMenu({
  open,
  progress,
  dragging,
  onClose,
  onDrawerPointerDown,
  onPointerMove,
  onPointerUp,
}: Props) {
  const { user, isPending } = useCurrentUserState();
  const role = useCampusStore((s) => s.role ?? "student");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const panel = useRef<HTMLElement>(null);
  const idle = progress <= 0.001 && !dragging;
  useDialogFocus(open, panel, onClose);

  const row = (to: string) =>
    cn(
      "flex h-12 items-center gap-3 rounded-xl px-3 text-sm",
      pathname === to || (to !== "/" && pathname.startsWith(`${to}/`))
        ? "bg-secondary font-medium text-ink"
        : "hover:bg-secondary",
    );

  return (
    <div className={cn("fixed inset-0 z-50", idle && "pointer-events-none")} aria-hidden={idle}>
      <button
        type="button"
        tabIndex={idle ? -1 : 0}
        aria-label="Close menu"
        className="absolute inset-0 bg-ink/40"
        style={{
          opacity: progress,
          transition: dragging ? "none" : "opacity 280ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onClick={onClose}
      />
      <aside
        ref={panel}
        id="side-menu"
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={open ? "Menu" : undefined}
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
        <div className="flex items-center justify-between px-1">
          <Wordmark size="md" />
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full hover:bg-secondary"
            aria-label="Close menu"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-border">
          {isPending ? (
            <span className="size-11 animate-pulse rounded-full bg-secondary" />
          ) : (
            <Avatar name={user?.displayName ?? "Guest"} className="size-11" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.displayName ?? "Guest"}</p>
            <p className="text-xs text-muted-foreground">
              {user ? roleLabel(role) : "Sign in to enter UNIBUD"}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <UserButton />
        </div>
        <nav aria-label="More" className="mt-4 flex-1 space-y-1 overflow-y-auto overscroll-contain">
          <p className="px-3 pb-1 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Guild
          </p>
          {guild.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                tabIndex={idle ? -1 : 0}
                className={row(item.to)}
              >
                <Icon className="size-4 text-muted-foreground" />
                {item.label}
              </Link>
            );
          })}
          <p className="px-3 pt-4 pb-1 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            More
          </p>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                tabIndex={idle ? -1 : 0}
                className={row(item.to)}
              >
                {item.to === "/riff" ? (
                  <RiffMark size={18} className="riff-mark-header" />
                ) : (
                  <Icon className="size-4 text-muted-foreground" />
                )}
                {item.label}
              </Link>
            );
          })}
          {canTeach(role) ? (
            <Link
              to="/tutor"
              onClick={onClose}
              tabIndex={idle ? -1 : 0}
              className={row("/tutor")}
            >
              <Clapperboard className="size-4 text-muted-foreground" />
              Tutor Mode
            </Link>
          ) : null}
          <a
            href="https://myrealmbyoracle.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            tabIndex={idle ? -1 : 0}
            className="flex h-12 items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground hover:bg-secondary"
          >
            <ExternalLink className="size-4" />
            About Oracle
          </a>
        </nav>
        <SignedIn>
          {authEnabled ? (
            <button
              type="button"
              tabIndex={idle ? -1 : 0}
              className="mt-2 flex h-12 items-center gap-3 rounded-xl px-3 text-sm hover:bg-secondary"
              onClick={() => {
                onClose();
                void signOut("/start");
              }}
            >
              <LogOut className="size-4 text-muted-foreground" />
              Logout
            </button>
          ) : null}
        </SignedIn>
        <SignedOut>
          <p className="mt-2 px-3 text-xs text-muted-foreground">
            Sign in to enter UNIBUD.
          </p>
        </SignedOut>
      </aside>
    </div>
  );
}
