import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/spill")({
  beforeLoad: () => {
    throw redirect({ to: "/riff" });
  },
});
