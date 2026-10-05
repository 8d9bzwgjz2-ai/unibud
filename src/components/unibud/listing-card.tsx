import { Link } from "@tanstack/react-router";
import { PhotoPlate } from "./photo-plate";
import { formatNaira } from "@/lib/unibud/format";
import { uniById } from "@/lib/unibud/catalog";
import type { Listing } from "@/lib/unibud/types";

export function ListingCard({ listing }: { listing: Listing }) {
  const uni = uniById(listing.universityId);
  return (
    <Link
      to="/market/$id"
      params={{ id: listing.id }}
      className="group block overflow-hidden rounded-2xl bg-card ring-1 ring-border transition-transform duration-200 hover:-translate-y-0.5"
    >
      <PhotoPlate
        src={listing.image}
        alt={listing.title}
        tone={listing.tone}
        title={listing.title}
        className="aspect-4/3"
      />
      <div className="space-y-1 p-3.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {listing.category} · {uni?.shortName}
        </p>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{listing.title}</h3>
        <p className="tabular text-sm text-bud">
          {formatNaira(listing.priceKobo)}
          <span className="ml-1 text-xs text-muted-foreground">{listing.priceNote}</span>
        </p>
      </div>
    </Link>
  );
}
