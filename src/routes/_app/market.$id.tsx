import { createFileRoute } from "@tanstack/react-router";
import { MarketListing } from "@/components/unibud/market-listing";

export const Route = createFileRoute("/_app/market/$id")({
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return <MarketListing id={id} />;
}
