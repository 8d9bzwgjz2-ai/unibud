import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/unibud/empty";
import { approveConnectService, getConnectService, revokeConnectService } from "@/lib/connect/server";

export const Route = createFileRoute("/_app/connect/services/$id")({ component: Service });

function Service() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const service = useQuery({ queryKey: ["connect-service", id], queryFn: () => getConnectService({ data: { id } }) });
  const approve = useMutation({
    mutationFn: () => approveConnectService({ data: { id } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["connect-service", id] });
      await qc.invalidateQueries({ queryKey: ["connect-search"] });
    },
  });
  const revoke = useMutation({
    mutationFn: () => revokeConnectService({ data: { id } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["connect-service", id] });
    },
  });
  if (service.isPending) return <div className="m-5 h-40 animate-pulse rounded-3xl bg-secondary" />;
  if (!service.data?.ok) {
    return (
      <main className="px-5 pt-6">
        <EmptyState title="Service unavailable" body={service.data?.error ?? "This service is not registered."} action={<Link to="/connect" className="text-sm font-medium">Back to Connect</Link>} />
      </main>
    );
  }
  const card = service.data.service;
  const integration = card.integration as "available" | "unavailable";
  const unavailable = integration !== "available";
  return (
    <main className="safe-bottom px-5 pt-6">
      <Link to="/connect" className="text-sm text-muted-foreground">Connect</Link>
      <p className="kicker mt-4">{card.category}</p>
      <h1 className="mt-1 font-display text-4xl">{card.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
      <p className="mt-4 text-sm">Provided by {card.provider}</p>
      <p className="mt-1 text-sm font-medium">{card.status}</p>
      <section className="mt-6 rounded-2xl bg-card p-4 ring-1 ring-border">
        <p className="text-sm font-medium">What connecting means</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Connecting does not share your whole profile. A service only receives the scopes you approve, and only when that service is actually available.
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {card.scopes.map((scope) => (
            <li key={scope}>{scope}</li>
          ))}
        </ul>
        {unavailable ? (
          <p className="mt-4 text-sm text-muted-foreground">This service is not available to connect yet. Opening it does not grant access.</p>
        ) : (
          <button type="button" className="mt-4 h-11 rounded-full bg-ink px-4 text-sm font-medium text-paper" onClick={() => approve.mutate()} disabled={approve.isPending}>
            Approve and connect
          </button>
        )}
        {approve.data && !approve.data.ok ? <p className="mt-3 text-sm text-muted-foreground">{approve.data.error}</p> : null}
        {card.status === "Connected" ? (
          <button type="button" className="mt-3 h-11 rounded-full px-4 text-sm ring-1 ring-border" onClick={() => revoke.mutate()}>Revoke access</button>
        ) : null}
        <OpenService route={card.route} name={card.name} />
      </section>
    </main>
  );
}

function OpenService({ route, name }: { route: string; name: string }) {
  const className = "mt-4 block text-sm font-medium";
  const label = `Open ${name}`;
  if (route === "/connect/soulync") return <Link to="/connect/soulync" className={className}>{label}</Link>;
  if (route === "/connect/wayward") return <Link to="/connect/wayward" className={className}>{label}</Link>;
  if (route === "/flow") return <Link to="/flow" className={className}>{label}</Link>;
  if (route === "/communities") return <Link to="/communities" className={className}>{label}</Link>;
  return <Link to="/connect" className={className}>Back to Connect</Link>;
}
