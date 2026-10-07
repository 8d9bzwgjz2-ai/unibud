import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/unibud/empty";
import { SignInCard, useAuthReady } from "@/components/unibud/sign-in-gate";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { addCourse, addMaterial, addStudySession, getStudies, seedSampleSemester } from "@/lib/studies/server";
import { dropCourse, enrollCourse, listEnrollments } from "@/lib/academic/server";
import { FACULTIES, LEVELS, PROGRAMMES, boardIdFor, coursesFor } from "@/lib/unibud/academic";
import { UNIVERSITIES } from "@/lib/unibud/catalog";

export const Route = createFileRoute("/_app/studies")({ component: Studies });

function Studies() {
  const { user, isPending } = useAuthReady();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["studies"],
    queryFn: () => getStudies(),
    enabled: Boolean(user),
  });
  const enrolled = useQuery({
    queryKey: ["enroll"],
    queryFn: () => listEnrollments(),
    enabled: Boolean(user),
  });
  const homeCampusId = useCampusStore((s) => s.homeCampusId);
  const setHomeCampusId = useCampusStore((s) => s.setHomeCampusId);
  const faculty = useCampusStore((s) => s.faculty);
  const setFaculty = useCampusStore((s) => s.setFaculty);
  const department = useCampusStore((s) => s.department);
  const setDepartment = useCampusStore((s) => s.setDepartment);
  const programme = useCampusStore((s) => s.programme);
  const setProgramme = useCampusStore((s) => s.setProgramme);
  const level = useCampusStore((s) => s.level);
  const setLevel = useCampusStore((s) => s.setLevel);
  const semester = useCampusStore((s) => s.semester);
  const setSemester = useCampusStore((s) => s.setSemester);
  const enroll = useMutation({
    mutationFn: (code: string) => enrollCourse({ data: { code, semester: `Semester ${semester}` } }),
    onSuccess: (d) => qc.setQueryData(["enroll"], d),
  });
  const drop = useMutation({
    mutationFn: (code: string) => dropCourse({ data: code }),
    onSuccess: (d) => qc.setQueryData(["enroll"], d),
  });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [mat, setMat] = useState("");

  const seed = useMutation({
    mutationFn: () => seedSampleSemester(),
    onSuccess: (d) => {
      qc.setQueryData(["studies"], d);
    },
  });
  const add = useMutation({
    mutationFn: () =>
      addCourse({
        data: {
          title,
          code,
          sessionLabel: "2026/2027 Academic Session",
          semester: "Semester 1",
        },
      }),
    onSuccess: (d) => {
      qc.setQueryData(["studies"], d);
      setTitle("");
      setCode("");
      setOpen(false);
    },
  });
  const addMat = useMutation({
    mutationFn: () => addMaterial({ data: { courseId: active!, title: mat, kind: "note" } }),
    onSuccess: (d) => {
      qc.setQueryData(["studies"], d);
      setMat("");
    },
  });
  const addSess = useMutation({
    mutationFn: () =>
      addStudySession({
        data: {
          courseId: active!,
          title: "Study block",
          startsAt: new Date(Date.now() + 3600000).toISOString(),
          minutes: 90,
        },
      }),
    onSuccess: (d) => qc.setQueryData(["studies"], d),
  });

  if (isPending) return <div className="m-4 h-40 animate-pulse rounded-2xl bg-secondary" />;
  if (!user) {
    return (
      <main className="px-5 py-8">
        <p className="kicker">Personal learning</p>
        <h1 className="mt-1 font-display text-4xl">Studies</h1>
        <div className="mt-6">
          <SignInCard
            title="Organise your semester"
            body="Notes, materials, revision and study blocks. This is not Board and not Bud."
          />
        </div>
      </main>
    );
  }

  const courses = q.data?.courses ?? [];
  const selected = courses.find((c) => c.id === active) ?? courses[0];
  const materials = (q.data?.materials ?? []).filter((m) => m.courseId === selected?.id);
  const sessions = (q.data?.sessions ?? []).filter((s) => s.courseId === selected?.id);

  return (
    <main className="safe-bottom px-5 pt-6 pb-8">
      <p className="kicker">Personal learning</p>
      <h1 className="mt-1 font-display text-4xl">Studies</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your notes, revision and study plan. Board is live class. Bud is the AI platform. Study groups live in Communities.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/communities/$id"
          params={{ id: "night-study" }}
          className="inline-flex h-9 items-center rounded-full bg-secondary px-4 text-sm"
        >
          Study groups
        </Link>
        <Link to="/board" className="inline-flex h-9 items-center rounded-full bg-secondary px-4 text-sm">
          Board
        </Link>
        <Link to="/podcasts" className="inline-flex h-9 items-center rounded-full bg-secondary px-4 text-sm">
          Lectures & podcasts
        </Link>
      </div>
      <section className="mt-6 rounded-3xl bg-card p-5 ring-1 ring-border">
        <p className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">This semester</p>
        <div className="mt-3 grid gap-2">
          <label className="text-xs text-muted-foreground">
            Institution
            <select
              className="mt-1 h-11 w-full rounded-full bg-secondary px-3 text-sm"
              value={homeCampusId}
              onChange={(e) => setHomeCampusId(e.target.value)}
            >
              {UNIVERSITIES.map((u) => (
                <option key={u.id} value={u.id}>{u.shortName} · {u.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Faculty
            <select className="mt-1 h-11 w-full rounded-full bg-secondary px-3 text-sm" value={faculty} onChange={(e) => { setFaculty(e.target.value); setProgramme(PROGRAMMES[e.target.value]?.[0] ?? ""); }}>
              {FACULTIES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Programme
            <select className="mt-1 h-11 w-full rounded-full bg-secondary px-3 text-sm" value={programme} onChange={(e) => { setProgramme(e.target.value); setDepartment(e.target.value); }}>
              {(PROGRAMMES[faculty] ?? []).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">
              Level
              <select className="mt-1 h-11 w-full rounded-full bg-secondary px-3 text-sm" value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Semester
              <select className="mt-1 h-11 w-full rounded-full bg-secondary px-3 text-sm" value={semester} onChange={(e) => setSemester(e.target.value)}>
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </label>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Add only the courses you are taking.</p>
        <ul className="mt-2 space-y-2">
          {coursesFor({ faculty, programme, level, semester }).map((c) => {
            const on = (enrolled.data ?? []).some((e) => e.code === c.code);
            return (
              <li key={c.code} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{c.code} · {c.title}</span>
                {on ? (
                  <span className="flex gap-2">
                    <Link to="/board/$id" params={{ id: boardIdFor(c.code) }} className="text-xs font-medium">Board</Link>
                    <button type="button" className="text-xs" onClick={() => drop.mutate(c.code)}>Remove</button>
                  </span>
                ) : (
                  <button type="button" className="text-xs font-medium" onClick={() => enroll.mutate(c.code)}>Add</button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      {!courses.length ? (
        <div className="mt-6">
          <EmptyState
            title="No semester yet"
            body="Start from a Computer Engineering sample, or add your own courses."
            action={
              <div className="flex justify-center gap-2">
                <Button onClick={() => seed.mutate()} disabled={seed.isPending}>
                  Use sample semester
                </Button>
                <Button variant="outline" onClick={() => setOpen(true)}>
                  Add a course
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {courses.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActive(c.id)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-sm ${
                  selected?.id === c.id ? "bg-ink text-paper" : "bg-secondary"
                }`}
              >
                {c.code}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="shrink-0 rounded-full bg-secondary px-3.5 py-2 text-sm"
            >
              Add
            </button>
          </div>
          {selected ? (
            <section className="mt-5 rounded-3xl bg-card p-5 ring-1 ring-border">
              <p className="text-xs text-muted-foreground">
                {selected.sessionLabel} · {selected.semester}
              </p>
              <h2 className="mt-1 text-xl font-medium">
                {selected.code} · {selected.title}
              </h2>
              <h3 className="mt-5 text-sm font-medium">Materials</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {materials.map((m) => (
                  <li key={m.id}>{m.title}</li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <Input value={mat} onChange={(e) => setMat(e.target.value)} placeholder="Add a note title" />
                <Button
                  size="sm"
                  onClick={() => selected && addMat.mutate()}
                  disabled={!mat.trim() || addMat.isPending}
                >
                  Add
                </Button>
              </div>
              <h3 className="mt-6 text-sm font-medium">Study sessions</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {sessions.map((s) => (
                  <li key={s.id}>
                    {s.title} · {s.minutes} min
                  </li>
                ))}
              </ul>
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                onClick={() => selected && addSess.mutate()}
              >
                Schedule 90 min
              </Button>
              <Link to="/bud" className="mt-4 block text-sm text-bud">
                Ask Bud about {selected.title}
              </Link>
            </section>
          ) : null}
        </>
      )}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/60 md:items-center md:justify-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-t-3xl bg-card p-5 md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-medium">Add a course</h2>
            <Input className="mt-3" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code · PHY 201" />
            <Input className="mt-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title · Physics" />
            <Button className="mt-4 w-full" onClick={() => add.mutate()} disabled={!title.trim() || add.isPending}>
              Save course
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
