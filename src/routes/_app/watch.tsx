import { createFileRoute, redirect } from "@tanstack/react-router";

/** Peek lives on Square. /watch was a second video surface. */
export const Route = createFileRoute("/_app/watch")({
  beforeLoad: () => {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem("unibud-square-mode", "peek");
    throw redirect({ to: "/" });
  },
});
