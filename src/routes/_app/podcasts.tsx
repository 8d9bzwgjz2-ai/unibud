import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/unibud/empty";

export const Route = createFileRoute("/_app/podcasts")({ component: Podcasts });

function Podcasts() {
  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Educational audio</p>
      <h1 className="mt-1 font-display text-4xl">Podcasts</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Lecturer audio is not connected. Playback here would not be a real lesson, so there is nothing to play.
      </p>
      <div className="mt-6">
        <EmptyState title="No episodes" body="A catalogue has not been connected. Listening is not available." />
      </div>
    </main>
  );
}
