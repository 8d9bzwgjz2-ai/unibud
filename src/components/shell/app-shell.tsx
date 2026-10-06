import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Bell, Search } from "lucide-react";

import { Wordmark } from "@/components/brand/logo";
import { AskBudFab } from "@/components/unibud/ask-bud";
import { DropSheet } from "@/components/unibud/drop-sheet";
import { StudioRoot } from "@/components/studio/studio-root";
import { cn } from "@/lib/utils";
import { unreadCount, useCampusStore } from "@/lib/unibud/campus-store";
import { PrimaryNav } from "./primary-nav";
import { SideMenu } from "./side-menu";
import { useRightDrawer } from "./use-right-drawer";

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const notes = useCampusStore((s) => s.notes);
  const unread = unreadCount(notes);
  const drawer = useRightDrawer();
  const dropOpen = useCampusStore((s) => s.dropOpen);
  const setDropOpen = useCampusStore((s) => s.setDropOpen);
  const squareView = useCampusStore((s) => s.squareView);
  const hideTabs = pathname.startsWith("/welcome");

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {hideTabs ? null : (
        <header
          className={cn(
            "fixed inset-x-0 top-0 z-30 bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm",
          )}
        >
          <div className="relative mx-auto flex h-12 max-w-3xl items-center px-3">
            <Link to="/" aria-label="UNIBUD" className="flex items-center">
              <Wordmark size="header" className="object-left" />
            </Link>
            <div className="ml-auto flex items-center">
              <Link
                to="/search"
                aria-label="Search"
                title="Search"
                className="grid size-11 place-items-center rounded-full text-foreground hover:bg-secondary"
              >
                <Search className="size-5" />
              </Link>
              <Link
                to="/notifications"
                aria-label="Notifications"
                title="Notifications"
                className="relative grid size-11 place-items-center rounded-full text-foreground hover:bg-secondary"
              >
                <Bell className="size-5" />
                {unread > 0 ? (
                  <span className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full bg-bud px-1 text-[10px] font-semibold text-bud-foreground">
                    {unread}
                  </span>
                ) : null}
              </Link>
            </div>
          </div>
        </header>
      )}

      <div
        className={cn(
          "mx-auto min-h-dvh max-w-3xl",
          hideTabs || squareView === "peek" ? "" : "pt-[calc(3rem+env(safe-area-inset-top))]",
        )}
        style={{
          paddingBottom: hideTabs
            ? undefined
            : "calc(6.75rem + env(safe-area-inset-bottom))",
        }}
      >
        <Outlet />
      </div>

      {hideTabs ? null : <PrimaryNav />}
      <AskBudFab menuOpen={drawer.open || dropOpen} />
      {dropOpen ? <DropSheet onClose={() => setDropOpen(false)} /> : null}
      <StudioRoot />

      <SideMenu
        open={drawer.open}
        progress={drawer.progress}
        dragging={drawer.dragging}
        onClose={drawer.close}
        onDrawerPointerDown={drawer.onDrawerPointerDown}
        onPointerMove={drawer.onPointerMove}
        onPointerUp={drawer.onPointerUp}
      />
    </div>
  );
}
