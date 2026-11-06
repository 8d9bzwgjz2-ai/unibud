import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BOARD_SESSIONS } from "@/lib/unibud/board-data";
import { EDU_PODCASTS } from "@/lib/unibud/podcast-data";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { canTeach } from "@/lib/unibud/roles";
import { requireLecturer } from "@/lib/unibud/server";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuthReady } from "@/components/unibud/sign-in-gate";

export const Route = createFileRoute("/_app/tutor")({ component: Tutor });

function Tutor() {
  const role = useCampusStore((s) => s.role ?? "student");
  const tutorMode = useCampusStore((s) => s.tutorMode);
  const setTutorMode = useCampusStore((s) => s.setTutorMode);
  const { user } = useAuthReady();
  const gate = useQuery({
    queryKey: ["tutor-gate"],
    queryFn: () => requireLecturer(),
    enabled: Boolean(user),
    retry: false,
  });
  const allowed = user ? Boolean(gate.data?.ok) : canTeach(role);

  if (user && gate.isPending) {
    return <div className="m-4 h-40 animate-pulse rounded-2xl bg-secondary" />;
  }

  if (!allowed) {
    return (
      <main className="px-5 py-10">
        <p className="kicker">Restricted</p>
        <h1 className="mt-1 font-display text-3xl">Tutor Mode</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Only authorized lecturers can open Tutor Mode. Class Governors stay students with class
          coordination — they do not get lecture creation, attendance authority, or broadcasting.
        </p>
        <Link to="/settings" className="mt-5 inline-block text-sm font-medium">
          Role is set in Settings (demo)
        </Link>
      </main>
    );
  }

  const tiles = [
    { label: "My Classes", hint: "CSC 301 UniBoard", href: "/board/csc301" },
    { label: "Upcoming Sessions", hint: "Board schedule", href: "/board" },
    { label: "Start Live Class", hint: "Open the live UniBoard", href: "/board/csc301" },
    { label: "Create Podcast", hint: "Educational audio", href: "/podcasts" },
    { label: "Attendance", hint: "Live participation only", href: "/board/csc301" },
    { label: "Students", hint: "Class roster", href: "/board/csc301" },
  ];

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Lecturer</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <h1 className="font-display text-4xl">Tutor Mode</h1>
        <Button size="sm" variant={tutorMode ? "primary" : "outline"} onClick={() => setTutorMode(!tutorMode)}>
          {tutorMode ? "Switch to student" : "Enter Tutor"}
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Teaching tools. This is not Square posting and not Class Governor coordination.
      </p>
      {!tutorMode ? (
        <p className="mt-4 rounded-2xl bg-secondary p-4 text-sm">
          You are in student view. Enter Tutor to use broadcasting tools.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {tiles.map((t) =>
            t.href ? (
              <a key={t.label} href={t.href} className="rounded-2xl bg-card p-4 ring-1 ring-border">
                <p className="text-sm font-medium">{t.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.hint}</p>
              </a>
            ) : (
              <button
                key={t.label}
                type="button"
                className="rounded-2xl bg-card p-4 text-left ring-1 ring-border"
                onClick={() => toast.message(`${t.label} is a demo control. No real stream is published.`)}
              >
                <p className="text-sm font-medium">{t.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.hint}</p>
              </button>
            ),
          )}
        </div>
      )}
      <h2 className="mt-8 text-sm font-medium">Your sessions</h2>
      <ul className="mt-2 space-y-2">
        {BOARD_SESSIONS.filter((s) => s.lecturerHandle === "okoro").map((s) => (
          <li key={s.id} className="rounded-xl bg-secondary px-4 py-3 text-sm">
            {s.title}
            <span className="ml-2 text-xs text-muted-foreground">{s.status}</span>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 text-sm font-medium">Educational podcasts</h2>
      <ul className="mt-2 space-y-2">
        {EDU_PODCASTS.filter((p) => p.lecturerHandle === "okoro").map((p) => (
          <li key={p.id} className="rounded-xl bg-secondary px-4 py-3 text-sm">
            {p.title}
            <span className="ml-2 text-xs text-muted-foreground">{p.course}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
