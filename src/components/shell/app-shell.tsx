import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Bell, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const composeOpen = useCampusStore((s) => s.composeOpen);
  const dropOpen = useCampusStore((s) => s.dropOpen);
  const setDropOpen = useCampusStore((s) => s.setDropOpen);
  const squareView = useCampusStore((s) => s.squareView);
  const setSquareView = useCampusStore((s) => s.setSquareView);
  const hideTabs = pathname.startsWith("/bud") || pathname.startsWith("/welcome");
  const [away, setAway] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    if (!pathname.startsWith("/bud")) sessionStorage.setItem("unibud-last-path", pathname);
    if (pathname !== "/") setSquareView("feed");
  }, [pathname, setSquareView]);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const down = y > lastY.current + 6;
      const up = y < lastY.current - 6;
      if (down && y > 24) setAway(true);
      else if (up || y < 16) setAway(false);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  const hidden = hideTabs ? false : away || squareView === "peek";
  const showPrimary = !hideTabs && squareView !== "peek";

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {hideTabs ? null : (
        <header
          className={cn(
            "fixed inset-x-0 top-0 z-30 bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm transition-transform duration-200",
            hidden ? "-translate-y-full" : "translate-y-0",
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
          {hideTabs || squareView === "peek" ? null : (
            <PrimaryNav className="mx-auto mt-2 max-w-3xl" />
          )}
        </header>
      )}

      <div
        className={cn(
          "mx-auto min-h-dvh max-w-3xl",
          hideTabs || squareView === "peek"
            ? ""
            : showPrimary
              ? "pt-[calc(7.25rem+env(safe-area-inset-top))]"
              : "pt-[calc(3rem+env(safe-area-inset-top))]",
        )}
      >
        <Outlet />
      </div>

      <AskBudFab menuOpen={drawer.open || hidden || composeOpen || dropOpen} />
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
