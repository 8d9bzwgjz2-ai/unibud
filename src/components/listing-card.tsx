import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { formatNaira } from "@/lib/unibud/format";
import { uniById } from "@/lib/unibud/catalog";
import type { Listing } from "@/lib/unibud/types";
import { Badge } from "@/components/ui/badge";

const TONE: Record<Listing["tone"], string> = {
  ink: "tone-ink",
  teal: "tone-teal",
  warm: "tone-warm",
  forest: "tone-forest",
  clay: "tone-clay",
  night: "tone-night",
};

export function ListingCard({
  listing,
  featured = false,
}: {
  listing: Listing;
  featured?: boolean;
}) {
  const uni = uniById(listing.universityId);
  return (
    <Link
      to="/market/$listingId"
      params={{ listingId: listing.id }}
      className={cn(
        "group block overflow-hidden rounded-xl border border-border bg-card transition-opacity hover:opacity-95",
        featured && "rounded-2xl",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden",
          featured ? "aspect-16/10" : "aspect-4/3",
          TONE[listing.tone],
        )}
      >
        {listing.image ? (
          <img
            src={listing.image}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-linear-to-t from-ink/70 via-ink/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="text-xs font-medium tracking-wide text-paper/80 uppercase">
            {listing.category} · {uni?.shortName ?? listing.universityId}
          </p>
          <h3
            className={cn(
              "font-display font-medium text-paper",
              featured ? "mt-1 text-2xl" : "mt-1 text-lg",
            )}
          >
            {listing.title}
          </h3>
        </div>
      </div>
      <div className="flex items-end justify-between gap-3 p-4">
        <div>
          <p className="tabular text-base font-medium">{formatNaira(listing.priceKobo)}</p>
          <p className="text-xs text-muted-foreground">{listing.priceNote}</p>
        </div>
        <Badge>{listing.location}</Badge>
      </div>
    </Link>
  );
}

export function ListingRail({ listings }: { listings: Listing[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {listings.map((l) => (
        <div key={l.id} className="w-64 shrink-0">
          <ListingCard listing={l} />
        </div>
      ))}
    </div>
  );
}
