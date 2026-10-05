import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BOARD_SESSIONS } from "@/lib/unibud/board-data";
import { courseByCode, boardIdFor, COURSE_CATALOGUE } from "@/lib/unibud/academic";
import { EDU_PODCASTS } from "@/lib/unibud/podcast-data";
import { BUD_MEDIA } from "@/lib/media/bud-media";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { canTeach } from "@/lib/unibud/roles";
import { askInClass, listAnnouncements, listAttendance, listClassQuestions, logAttendance, postAnnouncement } from "@/lib/academic/server";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/board/$id")({ component: UniBoard });

function UniBoard() {
  const { id } = Route.useParams();
  const course = COURSE_CATALOGUE.find((c) => boardIdFor(c.code) === id) ?? courseByCode(id);
  const role = useCampusStore((s) => s.role ?? "student");
  const liveAttendance = useCampusStore((s) => s.liveAttendance);
  const livePresence = useCampusStore((s) => s.livePresence);
  const markLivePresent = useCampusStore((s) => s.markLivePresent);
  const leaveLive = useCampusStore((s) => s.leaveLive);
  const rejoinLive = useCampusStore((s) => s.rejoinLive);
  const lecturer = canTeach(role);
  const [q, setQ] = useState("");
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [inClass, setInClass] = useState(false);
  const qc = useQueryClient();

  const session = BOARD_SESSIONS.find((s) => s.id === course?.boardSessionId || s.course === course?.code);
  const present = session ? liveAttendance[session.id] === "present" : false;
  const inRoom = session ? livePresence[session.id] === "in" : false;
  const pods = EDU_PODCASTS.filter((p) => p.course === course?.code);
  const budMedia = BUD_MEDIA.filter((m) => m.title.includes(course?.code ?? ""));

  const anns = useQuery({
    queryKey: ["anns", course?.code],
    queryFn: () => listAnnouncements({ data: course!.code }),
    enabled: Boolean(course),
  });
  const questions = useQuery({
    queryKey: ["q", session?.id],
    queryFn: () => listClassQuestions({ data: session!.id }),
    enabled: Boolean(session),
  });
  const roster = useQuery({
    queryKey: ["att", session?.id],
    queryFn: () => listAttendance({ data: session!.id }),
    enabled: Boolean(lecturer && session),
  });

  const sendQ = useMutation({
    mutationFn: () => askInClass({ data: { sessionId: session!.id, body: q } }),
    onSuccess: (d) => {
      setQ("");
      qc.setQueryData(["q", session?.id], d);
    },
  });
  const sendAnn = useMutation({
    mutationFn: () => postAnnouncement({ data: { courseCode: course!.code, title: annTitle, body: annBody } }),
    onSuccess: (d) => {
      setAnnTitle("");
      setAnnBody("");
      qc.setQueryData(["anns", course?.code], d);
    },
  });

  async function join() {
    if (!session) return;
    if (present) rejoinLive(session.id);
    else markLivePresent(session.id);
    await logAttendance({ data: { sessionId: session.id, kind: "join" } });
    setInClass(true);
  }
  async function leave() {
    if (!session) return;
    leaveLive(session.id);
    await logAttendance({ data: { sessionId: session.id, kind: "leave" } });
    setInClass(false);
  }

  const late = present && session?.status === "live";

  if (!course) {
    return (
      <main className="px-5 py-10">
        <p className="text-sm text-muted-foreground">That UniBoard is not in the catalogue.</p>
        <Link to="/board" className="mt-3 inline-block text-sm font-medium">Back to Board</Link>
      </main>
    );
  }

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Board</p>
      <h1 className="mt-1 font-display text-4xl">{course.code}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {course.title} · {course.lecturer} · {course.programme}
      </p>
      <p className="mt-3 max-w-xl text-sm leading-relaxed">{course.description}</p>

      {session?.status === "live" ? (
        <section className="mt-6 rounded-3xl bg-ink px-5 py-5 text-paper">
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-paper/60">Live class</p>
          <p className="mt-1 font-display text-2xl">{session.topic}</p>
          <p className="mt-1 text-sm text-paper/70">{session.lecturer} is in session · {session.durationMin} min</p>
          <p className="mt-3 text-xs text-paper/60">
            Your attendance: {present ? (inRoom || inClass ? "Present" : "Left early") : "Not marked"}
            {late && !inRoom ? " · you can rejoin" : ""}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {!inRoom && !inClass ? (
              <Button size="sm" onClick={() => void join()}>{present ? "Rejoin" : "Join class"}</Button>
            ) : (
              <Button size="sm" variant="outline" className="border-paper/30 text-paper" onClick={() => void leave()}>
                Leave
              </Button>
            )}
            <Link to="/bud" className="grid h-9 place-items-center rounded-full px-3 text-sm">Ask Bud privately</Link>
          </div>
          {(inRoom || inClass) ? (
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (q.trim()) sendQ.mutate();
              }}
            >
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="A question for the class…" className="h-11 flex-1 rounded-full bg-paper/10 px-4 text-sm outline-none" />
              <Button size="sm" type="submit">Ask</Button>
            </form>
          ) : null}
        </section>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          {session?.status === "scheduled" ? `Next class ${session.topic}.` : "No live class right now."}
        </p>
      )}

      <section className="mt-8">
        <h2 className="font-display text-2xl">Syllabus</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {course.topics.map((t) => (
            <li key={t} className="text-muted-foreground">{t}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs font-semibold tracking-wide uppercase text-muted-foreground">You should be able to</p>
        <ul className="mt-1 space-y-1 text-sm">
          {course.objectives.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl">Assessments & exam</h2>
        <ul className="mt-3 space-y-2">
          {course.assessments.map((a) => (
            <li key={a.title} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <p className="text-[11px] font-semibold tracking-wide uppercase text-bud">{a.kind}</p>
              <p className="mt-1 text-sm font-medium">{a.title}</p>
              <p className="text-xs text-muted-foreground">Due {a.due}</p>
            </li>
          ))}
          {course.exam ? (
            <li className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <p className="text-[11px] font-semibold tracking-wide uppercase text-bud">Examination</p>
              <p className="mt-1 text-sm font-medium">{course.exam.date}</p>
              <p className="text-xs text-muted-foreground">{course.exam.note}</p>
            </li>
          ) : null}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl">Materials</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {course.materials.map((m) => (
            <li key={m} className="text-muted-foreground">{m}</li>
          ))}
          {pods.map((p) => (
            <li key={p.id} className="rounded-2xl bg-card p-3 ring-1 ring-border">
              <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-bud">Bud · Educational</p>
              <p className="mt-1 font-medium">{p.title}</p>
              <p className="text-xs text-muted-foreground">{p.lecturer} · {p.duration}</p>
            </li>
          ))}
          {budMedia.map((m) => (
            <li key={m.id} className="text-sm">{m.title} · {m.durationMin} min</li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl">Announcements</h2>
        {lecturer ? (
          <form
            className="mt-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (annTitle.trim() && annBody.trim()) sendAnn.mutate();
            }}
          >
            <input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="Title" className="h-11 w-full rounded-full bg-secondary px-4 text-sm outline-none" />
            <textarea value={annBody} onChange={(e) => setAnnBody(e.target.value)} placeholder="For the class…" className="min-h-20 w-full rounded-2xl bg-secondary p-3 text-sm outline-none" />
            <Button size="sm" type="submit">Post to class</Button>
          </form>
        ) : null}
        <ul className="mt-3 space-y-2">
          {(anns.data ?? []).map((a) => (
            <li key={a.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <p className="text-sm font-medium">{a.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {lecturer && session ? (
        <section className="mt-8">
          <h2 className="font-display text-2xl">Lecturer view</h2>
          <p className="mt-1 text-xs text-muted-foreground">Attendance is from join/leave in this live session. Recordings never rewrite it.</p>
          <ul className="mt-3 space-y-1 text-sm">
            {(roster.data ?? []).map((r) => (
              <li key={r.userId} className="flex justify-between">
                <span className="truncate text-muted-foreground">{r.userId.slice(0, 8)}</span>
                <span>{r.left ? "Left early" : r.joined ? "Present" : "Absent"}</span>
              </li>
            ))}
            {!roster.data?.length ? <li className="text-muted-foreground">Nobody has joined yet.</li> : null}
          </ul>
          <ul className="mt-4 space-y-1 text-sm">
            {(questions.data ?? []).map((item) => (
              <li key={item.id}>{item.body}</li>
            ))}
          </ul>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => toast.message(session.status === "live" ? "This session is already live." : "Go live from Tutor Mode when a stream is connected.")}
          >
            Start live class
          </Button>
        </section>
      ) : null}

      {course.communityId ? (
        <Link to="/communities/$id" params={{ id: course.communityId }} className="mt-8 mb-8 inline-block text-sm font-medium">
          Class community
        </Link>
      ) : null}
    </main>
  );
}
