import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BOARD_SESSIONS, SESSION_LIFECYCLE } from "@/lib/unibud/board-data";
import { boardIdFor } from "@/lib/unibud/academic";
import { listEnrollments } from "@/lib/academic/server";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { canTeach } from "@/lib/unibud/roles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/unibud/format";
import { useAuthReady } from "@/components/unibud/sign-in-gate";

export const Route = createFileRoute("/_app/board")({ component: Board });

function Board() {
  const { user } = useAuthReady();
  const role = useCampusStore((s) => s.role ?? "student");
  const liveAttendance = useCampusStore((s) => s.liveAttendance);
  const livePresence = useCampusStore((s) => s.livePresence);
  const recordingWatched = useCampusStore((s) => s.recordingWatched);
  const markLivePresent = useCampusStore((s) => s.markLivePresent);
  const leaveLive = useCampusStore((s) => s.leaveLive);
  const rejoinLive = useCampusStore((s) => s.rejoinLive);
  const markRecordingWatched = useCampusStore((s) => s.markRecordingWatched);
  const enrolled = useQuery({
    queryKey: ["enroll"],
    queryFn: () => listEnrollments(),
    enabled: Boolean(user),
  });
  const mine = enrolled.data ?? [];
  const codes = new Set(mine.map((c) => c.code));
  const sessions = codes.size
    ? BOARD_SESSIONS.filter((s) => codes.has(s.course))
    : BOARD_SESSIONS;

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Board</p>
      <h1 className="mt-1 font-display text-4xl">Your classrooms</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Course rooms, live class, syllabus and attendance. Not Square. Not Chat.
      </p>
      {mine.length ? (
        <ul className="mt-6 grid gap-3">
          {mine.map((c) => (
            <li key={c.id}>
              <Link
                to="/board/$id"
                params={{ id: boardIdFor(c.code) }}
                className="block rounded-2xl bg-card p-4 ring-1 ring-border"
              >
                <p className="text-[11px] font-semibold tracking-wide uppercase text-bud">{c.code}</p>
                <p className="mt-1 font-medium">{c.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.catalog?.lecturer} · {c.catalog?.programme}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          Pick this semester’s courses in <Link to="/studies" className="font-medium">Studies</Link>.
        </p>
      )}

      <ol className="mt-8 flex gap-2 overflow-x-auto text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">
        {SESSION_LIFECYCLE.map((step) => (
          <li key={step} className="shrink-0 rounded-full bg-secondary px-3 py-1">
            {step}
          </li>
        ))}
      </ol>
      {canTeach(role) ? (
        <Link to="/tutor" className="mt-4 inline-block text-sm font-medium">
          Open Tutor Mode
        </Link>
      ) : null}

      {sessions.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-card p-5 ring-1 ring-border">
          <p className="font-medium">No class sessions yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sessions appear here when a lecturer schedules a real class for a course you are enrolled in.
          </p>
        </div>
      ) : null}
      <ul className="mt-6 space-y-3">
        {sessions.map((s) => {
          const present = liveAttendance[s.id] === "present";
          const inRoom = livePresence[s.id] === "in";
          const watched = Boolean(recordingWatched[s.id]);
          return (
            <li key={s.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <p className="text-[11px] font-semibold tracking-wide text-bud uppercase">{s.status}</p>
              <h2 className="mt-1 font-medium">{s.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {s.course} · {s.lecturer} · {s.department}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {s.topic} · {relativeTime(s.startsAt)} · {s.durationMin} min
              </p>
              <p className="mt-3 text-xs">
                Your attendance:{" "}
                <span className={cn(present ? "text-success" : "text-muted-foreground")}>
                  {present ? (inRoom ? "Present" : "Left early") : "Not attended"}
                </span>
                {watched ? " · Recording played (does not change attendance)" : null}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/board/$id" params={{ id: boardIdFor(s.course) }} className="grid h-9 place-items-center rounded-full bg-secondary px-3 text-sm">
                  Open Board
                </Link>
                {s.status === "live" && !inRoom ? (
                  <Button size="sm" onClick={() => (present ? rejoinLive(s.id) : markLivePresent(s.id))}>
                    {present ? "Rejoin live" : "Join live"}
                  </Button>
                ) : null}
                {s.status === "live" && inRoom ? (
                  <Button size="sm" variant="outline" onClick={() => leaveLive(s.id)}>
                    Leave
                  </Button>
                ) : null}
                {s.status === "available" ? (
                  <Button size="sm" variant="outline" onClick={() => markRecordingWatched(s.id)}>
                    Play recording
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}