import { createFileRoute } from "@tanstack/react-router";
import { BudWorkspace } from "@/components/bud/workspace";

export const Route = createFileRoute("/_app/bud")({ component: Bud });

function Bud() {
  return <BudWorkspace />;
}
