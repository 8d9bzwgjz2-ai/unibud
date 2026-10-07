import { createFileRoute } from "@tanstack/react-router";
import { CommunitySpace } from "@/components/unibud/community-space";

export const Route = createFileRoute("/_app/communities/$communityId")({
  component: CommunityPage,
});

function CommunityPage() {
  const { communityId } = Route.useParams();
  return <CommunitySpace id={communityId} />;
}
