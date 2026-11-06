import { createFileRoute, redirect } from "@tanstack/react-router";

/** Discovery is mixed into Square. This was a second destination. */
export const Route = createFileRoute("/_app/discovery")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
