import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/spill/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/riff/$id", params: { id: params.id } });
  },
});
