import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { EmptyState } from "@/components/unibud/empty";
import { formatNaira, relativeTime } from "@/lib/unibud/format";
import { getMarketListing, offerToBuy, respondOffer, setListingStatus } from "@/lib/market/server";

export function MarketListing({ id }: { id: string }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const listing = useQuery({
    queryKey: ["market-listing", id],
    queryFn: () => getMarketListing({ data: id }),
  });
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["market-listing", id] });
    await qc.invalidateQueries({ queryKey: ["market"] });
  };
  const ask = useMutation({
    mutationFn: () => offerToBuy({ data: { id, note } }),
    onSuccess: async (result) => {
      setError(result.ok ? "" : result.error);
      if (result.ok) setNote("");
      await refresh();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "That request was not sent."),
  });
  const answer = useMutation({
    mutationFn: (input: { id: string; action: "accept" | "decline" }) => respondOffer({ data: input }),
    onSuccess: async (result) => {
      setError(result.ok ? "" : result.error);
      await refresh();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "That request could not be answered."),
  });
  const status = useMutation({
    mutationFn: (next: "available" | "sold") => setListingStatus({ data: { id, status: next } }),
    onSuccess: async (result) => {
      setError(result.ok ? "" : result.error);
      await refresh();
    },
  });

  if (listing.isPending) return <div className="m-5 h-40 animate-pulse rounded-3xl bg-secondary" />;
  if (!listing.data?.ok) {
    return (
      <main className="safe-bottom px-5 pt-6">
        <EmptyState title="Listing unavailable" body={listing.data?.error ?? "This listing could not be loaded."} action={<Link to="/market" className="text-sm font-medium">Back to Market</Link>} />
      </main>
    );
  }
  const { item, offers, myOffer } = listing.data;
  return (
    <main className="safe-bottom px-5 pt-6">
      <Link to="/market" className="text-sm text-muted-foreground">Market</Link>
      {item.image ? <img src={item.image} alt="" className="mt-4 aspect-4/3 w-full rounded-3xl object-cover" /> : null}
      <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">{item.category} · {item.kind}{item.status === "sold" ? " · Sold" : ""}</p>
      <h1 className="mt-1 font-display text-4xl">{item.title}</h1>
      <p className="mt-2 text-lg">{formatNaira(item.priceKobo)} <span className="text-sm text-muted-foreground">{item.priceNote}</span></p>
      <p className="mt-4 text-sm leading-relaxed">{item.description}</p>
      <p className="mt-3 text-sm text-muted-foreground">{item.location}</p>
      <p className="mt-2 text-sm">
        <Link to="/connect/people/$handle" params={{ handle: item.sellerHandle }} className="font-medium">
          {item.sellerName} (@{item.sellerHandle})
        </Link>
      </p>
      {error ? <p className="mt-4 text-sm text-muted-foreground">{error}</p> : null}
      {item.mine ? (
        <div className="mt-5">
          {item.status === "reserved" ? (
            <Link to="/orders" className="inline-flex h-11 items-center rounded-full bg-ink px-4 text-sm font-medium text-paper">Finish in Orders</Link>
          ) : (
            <button
              type="button"
              className="h-11 rounded-full px-4 text-sm ring-1 ring-border"
              onClick={() => status.mutate(item.status === "sold" ? "available" : "sold")}
            >
              {item.status === "sold" ? "Mark available" : "Mark sold"}
            </button>
          )}
          <h2 className="mt-6 text-sm font-medium">Buy requests</h2>
          {!offers.length ? <p className="mt-2 text-sm text-muted-foreground">Nobody has asked yet.</p> : null}
          <ul className="mt-3 space-y-3">
            {offers.map((offer) => (
              <li key={offer.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
                <p className="text-sm font-medium">{offer.buyerName} (@{offer.buyerHandle})</p>
                <p className="mt-1 text-sm">{offer.note || "Wants to buy this."}</p>
                <p className="mt-1 text-xs capitalize text-muted-foreground">{offer.status} · {relativeTime(offer.createdAt)}</p>
                {offer.status === "pending" && item.status === "available" ? (
                  <div className="mt-3 flex gap-2">
                    <button type="button" className="h-11 rounded-full bg-ink px-4 text-sm font-medium text-paper" onClick={() => answer.mutate({ id: offer.id, action: "accept" })}>Accept</button>
                    <button type="button" className="h-11 rounded-full px-4 text-sm ring-1 ring-border" onClick={() => answer.mutate({ id: offer.id, action: "decline" })}>Decline</button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : myOffer && (myOffer.status === "accepted" || myOffer.status === "ready") ? (
        <p className="mt-5 text-sm">This order is {myOffer.status}. Follow the handover in <Link to="/orders" className="font-medium">Orders</Link>. No payment was taken here.</p>
      ) : item.status === "reserved" ? (
        <p className="mt-5 text-sm text-muted-foreground">Reserved for another order.</p>
      ) : item.status === "sold" ? (
        <p className="mt-5 text-sm text-muted-foreground">Sold. This listing is no longer for sale.</p>
      ) : myOffer?.status === "pending" ? (
        <p className="mt-5 text-sm text-muted-foreground">You asked to buy this. The seller has not answered yet.</p>
      ) : (
        <form
          className="mt-5 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            ask.mutate();
          }}
        >
          <label className="block text-xs font-medium">
            Note to the seller
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="When you can meet, or what you want to know" className="mt-1 min-h-20 w-full rounded-xl bg-card p-3 text-sm ring-1 ring-border" />
          </label>
          <button type="submit" disabled={ask.isPending} className="h-11 rounded-full bg-ink px-4 text-sm font-medium text-paper disabled:opacity-50">
            {ask.isPending ? "Sending…" : "Ask to buy"}
          </button>
        </form>
      )}
    </main>
  );
}
