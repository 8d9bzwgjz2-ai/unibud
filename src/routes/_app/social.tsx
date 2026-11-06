import { createFileRoute, redirect } from "@tanstack/react-router";

/** Square is the social feed. This path used to be a second feed. */
export const Route = createFileRoute("/_app/social")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
