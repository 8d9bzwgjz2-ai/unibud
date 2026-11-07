import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { getListing, toggleSave } from "@/lib/unibud/server";
import { payListingDemo } from "@/lib/money/server";
import { openConversation } from "@/lib/social/server";
import { formatNaira } from "@/lib/unibud/format";
import { uniById } from "@/lib/unibud/catalog";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ListingCard } from "@/components/listing-card";
import { PersonMark } from "@/components/person-mark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/market/$listingId")({
  loader: ({ params }) => getListing({ data: params.listingId }),
  component: ListingPage,
});

function ListingPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, isPending } = useCurrentUserState();

  const message = useMutation({
    mutationFn: () =>
      openConversation({
        data: {
          handle: data!.listing.sellerHandle,
          listingId: data!.listing.id,
          seed: `Hi — I’m interested in “${data!.listing.title}”.`,
        },
      }),
    onSuccess: (convo) => {
      void router.navigate({ to: "/messages/$id", params: { id: convo.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pay = useMutation({
    mutationFn: () =>
      payListingDemo({
        data: {
          listingId: data!.listing.id,
          kobo: data!.listing.priceKobo,
          sellerHandle: data!.listing.sellerHandle,
          title: data!.listing.title,
        },
      }),
    onSuccess: () => {
      toast.success("Demo payment recorded. No real money moved.");
      void qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () =>
      toggleSave({
        data: {
          kind: "listing",
          itemId: data!.listing.id,
          title: data!.listing.title,
          href: `/market/${data!.listing.id}`,
        },
      }),
    onSuccess: (r) => toast.success(r.saved ? "Saved" : "Removed from saves"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!data) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display text-3xl">Listing gone</h1>
        <Link to="/market" className="mt-4 inline-block text-sm text-bud">
          Back to market
        </Link>
      </div>
    );
  }

  const { listing, seller, related } = data;
  const uni = uniById(listing.universityId);
  const needAuth = !isPending && !user;

  return (
    <div className="grid gap-10 pb-10 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <div
          className={`relative aspect-4/3 overflow-hidden rounded-2xl tone-${listing.tone}`}
        >
          {listing.image ? (
            <img src={listing.image} alt="" className="absolute inset-0 size-full object-cover" />
          ) : null}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {listing.tags.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
        <h1 className="mt-4 font-display text-4xl">{listing.title}</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">{listing.description}</p>
      </div>

      <aside className="space-y-5 lg:col-span-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            {listing.kind} · {listing.category}
          </p>
          <p className="mt-2 tabular font-display text-4xl">{formatNaira(listing.priceKobo)}</p>
          <p className="text-sm text-muted-foreground">{listing.priceNote}</p>
          <p className="mt-3 text-sm">
            {listing.location}
            {uni ? ` · ${uni.shortName}` : ""}
          </p>
          <div className="mt-5 grid gap-2">
            {needAuth ? (
              <Button asChild>
                <Link to="/login">Sign in to message</Link>
              </Button>
            ) : (
              <Button onClick={() => message.mutate()} disabled={message.isPending}>
                <MessageCircle className="size-4" />
                Message seller
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => (needAuth ? router.navigate({ to: "/login" }) : pay.mutate())}
              disabled={pay.isPending}
            >
              Demo pay {formatNaira(listing.priceKobo)}
            </Button>
            <Button
              variant="ghost"
              onClick={() => (needAuth ? router.navigate({ to: "/login" }) : save.mutate())}
            >
              <Bookmark className="size-4" />
              Save
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Demo ledger only. No real money, bank, or NELFUND rail is connected.
          </p>
        </div>

        {seller ? (
          <Link
            to="/u/$handle"
            params={{ handle: seller.handle }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <PersonMark name={seller.name} handle={seller.handle} verified={seller.verified} size="lg" />
            <div>
              <p className="font-medium">{seller.name}</p>
              <p className="text-sm text-muted-foreground">
                @{seller.handle} · {seller.program}
              </p>
            </div>
          </Link>
        ) : null}
      </aside>

      {related.length > 0 ? (
        <div className="lg:col-span-12">
          <h2 className="mb-4 font-display text-2xl">Nearby in this lane</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
