import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/brand/logo";
import { getMyAccount } from "@/lib/account/server";
import { routeForAccount } from "@/lib/account/domain";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/start")({ component: Start });

function Start() {
  const [phase, setPhase] = useState<"splash" | "welcome">("splash");
  const { user, isPending } = useCurrentUserState();
  const account = useQuery({
    queryKey: ["unibud-account", user?.id],
    queryFn: () => getMyAccount(),
    enabled: !isPending && Boolean(user),
  });

  useEffect(() => {
    if (sessionStorage.getItem("unibud-splash")) {
      setPhase("welcome");
      return;
    }
    const timer = window.setTimeout(() => {
      sessionStorage.setItem("unibud-splash", "1");
      setPhase("welcome");
    }, 1400);
    return () => window.clearTimeout(timer);
  }, []);

  if (!isPending && user && !account.isPending && account.data) {
    const dest = routeForAccount(account.data.status);
    if (dest !== "/join") return <Navigate to={dest} />;
  }

  if (phase === "splash") {
    return (
      <main className="grid min-h-dvh place-items-center bg-background px-6">
        <div className="text-center">
          <Wordmark size="hero" />
          <p className="kicker mt-6">UNIBUD</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-background px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-12">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <Wordmark size="sm" />
        <div className="mt-16">
          <p className="kicker">Welcome</p>
          <h1 className="mt-3 font-display text-5xl leading-none">Your campus, with a name on it.</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Create a verified account to enter UNIBUD. There is no guest entry, and no social sign-in.
          </p>
        </div>
        <div className="mt-auto flex flex-col gap-3 pt-12">
          <Link to="/onboarding" className="grid h-12 place-items-center rounded-full bg-ink text-sm font-medium text-paper">
            Create account
          </Link>
          <Link to="/login" className="grid h-12 place-items-center rounded-full text-sm font-medium ring-1 ring-border">
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
