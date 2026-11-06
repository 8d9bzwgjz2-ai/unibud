import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/communities/$id")({ component: CommunityPage });

function CommunityPage() {
  return (
    <main className="safe-bottom px-5 py-8">
      <h1 className="font-display text-3xl">This room is on Board</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Class, study, group, and community rooms are live chats. Open Board, start one, and the first message is yours.
      </p>
      <Link to="/board" className="mt-4 inline-flex h-11 items-center rounded-full bg-ink px-4 text-sm text-paper">
        Open Board
      </Link>
    </main>
  );
}
