import { createFileRoute, Navigate, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCampusCatalog } from "@/lib/unibud/server";
import { AppShell } from "@/components/shell/app-shell";
import { OrbitLoading } from "@/components/brand/identity-marks";
import { routeForAccount } from "@/lib/account/domain";
import { getMyAccount } from "@/lib/account/server";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    let account: Awaited<ReturnType<typeof getMyAccount>> | null = null;
    try {
      account = await getMyAccount();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "Unauthorized" || message.includes("Unauthorized")) {
        throw redirect({ to: "/start" });
      }
      throw error;
    }
    const dest = routeForAccount(account?.status ?? null);
    if (dest !== "/") throw redirect({ to: dest });
  },
  loader: () => getCampusCatalog(),
  component: GuardedApp,
  pendingComponent: Pending,
});

function Pending() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <OrbitLoading label="Opening UNIBUD" />
    </div>
  );
}

function GuardedApp() {
  const { user, isPending } = useCurrentUserState();
  const account = useQuery({
    queryKey: ["unibud-account", user?.id],
    queryFn: () => getMyAccount(),
    enabled: !isPending && Boolean(user),
  });
  if (isPending || (user && account.isPending)) return <Pending />;
  if (!user) return <Navigate to="/start" />;
  const dest = routeForAccount(account.data?.status ?? null);
  if (dest !== "/") return <Navigate to={dest} />;
  return <AppShell />;
}
