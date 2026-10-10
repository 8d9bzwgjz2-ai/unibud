import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bookmark, Flag, MessageCircle, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DemoCallout } from "@/components/unibud/demo-callout";
import { ListingCard } from "@/components/unibud/listing-card";
import { Avatar, PersonMeta } from "@/components/unibud/person";
import { PhotoPlate } from "@/components/unibud/photo-plate";
import { SignInCard, useAuthReady } from "@/components/unibud/sign-in-gate";
import { uniById } from "@/lib/unibud/catalog";
import { formatNaira } from "@/lib/unibud/format";
import { getListing, toggleSave } from "@/lib/unibud/server";
import { payListingDemo } from "@/lib/money/server";
import { openConversation } from "@/lib/social/server";
import { isUnauthorized } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/market/$id")({
  component: ListingPage,
});

function ListingPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { user, isPending: authPending } = useAuthReady();
  const { data, isPending } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => getListing({ data: id }),
  });
  const [busy, setBusy] = useState(false);

  if (isPending) {
    return <div className="m-4 h-80 animate-pulse rounded-3xl bg-secondary" />;
  }
  if (!data?.listing) {
    return (
      <main className="px-4 py-16 text-center">
        <p>That listing is gone.</p>
        <Link to="/market" className="mt-3 inline-block text-sm text-bud">
          Back to market
        </Link>
      </main>
    );
  }

  const { listing, seller, related } = data;
  const uni = uniById(listing.universityId);

  async function onMessage() {
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    setBusy(true);
    try {
      const convo = await openConversation({
        data: {
          handle: listing.sellerHandle,
          listingId: listing.id,
          seed: `Hi, I’m interested in “${listing.title}”.`,
        },
      });
      nav({ to: "/messages/$id", params: { id: convo.id } });
    } catch (e) {
      if (isUnauthorized(e)) nav({ to: "/login" });
      else toast.error(e instanceof Error ? e.message : "Could not open chat");
    } finally {
      setBusy(false);
    }
  }

  async function onPay() {
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    setBusy(true);
    try {
      await payListingDemo({
        data: {
          listingId: listing.id,
          kobo: listing.priceKobo,
          sellerHandle: listing.sellerHandle,
          title: listing.title,
        },
      });
      toast.message("Demo payment recorded", {
        description: "No real money moved. Check your Money ledger.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Demo pay failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    try {
      const r = await toggleSave({
        data: {
          kind: "listing",
          itemId: listing.id,
          title: listing.title,
          href: `/market/${listing.id}`,
        },
      });
      toast.success(r.saved ? "Saved" : "Removed from saved");
    } catch (e) {
      if (isUnauthorized(e)) nav({ to: "/login" });
    }
  }

  return (
    <main className="px-4 pb-10 md:px-6">
      <PhotoPlate
        src={listing.image}
        alt={listing.title}
        tone={listing.tone}
        title={listing.title}
        className="mt-2 aspect-video rounded-3xl md:aspect-4/3"
      />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {listing.category} · {uni?.shortName} · {listing.location}
          </p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight">{listing.title}</h1>
        </div>
        <button
          type="button"
          onClick={onSave}
          className="grid size-11 place-items-center rounded-full bg-secondary"
          aria-label="Save listing"
        >
          <Bookmark className="size-4" />
        </button>
      </div>
      <p className="mt-3 tabular text-xl text-bud">
        {formatNaira(listing.priceKobo)}
        <span className="ml-2 text-sm text-muted-foreground">{listing.priceNote}</span>
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{listing.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {listing.tags.map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </div>

      {seller ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
          <Avatar name={seller.name} />
          <PersonMeta person={seller} />
        </div>
      ) : null}

      <div className="mt-4 flex items-start gap-2 rounded-2xl bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
        <Shield className="mt-0.5 size-4 shrink-0 text-bud" />
        Meet on campus when you can. Keep chat here. Report anything that feels off. University
        affiliation is a trust signal, not a guarantee.
      </div>

      <DemoCallout>
        Paying here records a demo ledger entry only. No card, bank, or payout is connected.
      </DemoCallout>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button onClick={onMessage} disabled={busy || authPending}>
          <MessageCircle className="size-4" />
          Message
        </Button>
        <Button variant="bud" onClick={onPay} disabled={busy || authPending}>
          Pay (demo)
        </Button>
      </div>
      <button type="button" className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Flag className="size-3.5" />
        Report listing
      </button>

      {!user && !authPending ? (
        <div className="mt-6">
          <SignInCard
            title="Sign in to message or pay"
            body="Browsing is open. Wallet, chat, and saves need an account."
          />
        </div>
      ) : null}

      {related.length ? (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-medium">Related</h2>
          <div className="grid grid-cols-2 gap-3">
            {related.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
