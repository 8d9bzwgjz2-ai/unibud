import { createFileRoute } from "@tanstack/react-router";
import { getCampusCatalog } from "@/lib/unibud/server";
import { registerDirectory } from "@/lib/unibud/catalog";
import { AppShell } from "@/components/shell/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app")({
  loader: () => getCampusCatalog(),
  component: AppLayout,
  pendingComponent: Pending,
});

function AppLayout() {
  // Hydrate the in-memory directory with the real registered accounts (never invented people).
  registerDirectory(Route.useLoaderData().people);
  return <AppShell />;
}

function Pending() {
  return (
    <div className="min-h-dvh bg-background p-6">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="mt-6 h-48 w-full rounded-2xl" />
      <Skeleton className="mt-4 h-32 w-full rounded-2xl" />
    </div>
  );
}
