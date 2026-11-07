import { createFileRoute } from "@tanstack/react-router";
import { CommunitySpace } from "@/components/unibud/community-space";

export const Route = createFileRoute("/_app/communities/$id")({ component: CommunityPage });

function CommunityPage() {
  const { id } = Route.useParams();
  return <CommunitySpace id={id} />;
}
