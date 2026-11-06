import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/money")({
  beforeLoad: () => {
    throw redirect({ to: "/flow" });
  },
});
