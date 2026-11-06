import { createFileRoute } from "@tanstack/react-router";
import { MarketListing } from "@/components/unibud/market-listing";

export const Route = createFileRoute("/_app/market/$listingId")({
  component: Page,
});

function Page() {
  const { listingId } = Route.useParams();
  return <MarketListing id={listingId} />;
}
