import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/u/$handle")({ component: PublicProfile });

function PublicProfile() {
  const { handle } = Route.useParams();
  return <Navigate to="/connect/people/$handle" params={{ handle }} />;
}
