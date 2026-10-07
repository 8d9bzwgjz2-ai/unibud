import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar, Clock, GraduationCap, HeartHandshake, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SignInCard, useAuthReady } from "@/components/unibud/sign-in-gate";
import { PEOPLE } from "@/lib/unibud/catalog";
import {
  bookTutoringSession,
  cancelCalendarEvent,
  commitCommunityService,
  getMyCalendar,
  rescheduleCalendarEvent,
} from "@/lib/spark/server";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/spark")({ component: SparkCalendar });

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

function SparkCalendar() {
  const { user } = useAuthReady();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"schedule" | "tutoring" | "service">("schedule");

  const calendar = useQuery({
    queryKey: ["calendar"],
    queryFn: () => getMyCalendar(),
    enabled: Boolean(user),
  });

  if (!user) {
    return (
      <main className="px-5 py-8">
        <SignInCard title="Spark Calendar" body="Sign in to book tutoring sessions and track your schedule." />
      </main>
    );
  }

  const events = calendar.data ?? [];
  const upcoming = events.filter((e) => e.status !== "cancelled" && new Date(e.startsAt) >= new Date(Date.now() - 3600_000));
  const past = events.filter((e) => e.status === "cancelled" || new Date(e.startsAt) < new Date(Date.now() - 3600_000));

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Your schedule</p>
      <h1 className="mt-1 font-display text-4xl">Spark Calendar</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tutoring sessions and community-service commitments land here automatically. No double-booking.
      </p>

      <div className="mt-4 flex gap-2">
        {(["schedule", "tutoring", "service"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "h-9 rounded-full px-4 text-sm font-medium",
              tab === t ? "bg-ink text-paper" : "bg-card ring-1 ring-border text-muted-foreground",
            )}
          >
            {t === "schedule" ? "Schedule" : t === "tutoring" ? "Book Tutoring" : "Community Service"}
          </button>
        ))}
      </div>

      {tab === "schedule" ? (
        <ScheduleView events={upcoming} past={past} />
      ) : tab === "tutoring" ? (
        <TutoringForm onDone={() => void qc.invalidateQueries({ queryKey: ["calendar"] })} />
      ) : (
        <ServiceForm onDone={() => void qc.invalidateQueries({ queryKey: ["calendar"] })} />
      )}
    </main>
  );
}

function ScheduleView({
  events,
  past,
}: {
  events: ReturnType<typeof getMyCalendar> extends Promise<infer T> ? T : never;
  past: ReturnType<typeof getMyCalendar> extends Promise<infer T> ? T : never;
}) {
  const qc = useQueryClient();
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newTime, setNewTime] = useState("");

  const cancelMut = useMutation({
    mutationFn: (eventId: string) => cancelCalendarEvent({ data: eventId }),
    onSuccess: () => {
      toast.success("Event cancelled");
      void qc.invalidateQueries({ queryKey: ["calendar"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rescheduleMut = useMutation({
    mutationFn: ({ eventId, newStartsAt }: { eventId: string; newStartsAt: string }) =>
      rescheduleCalendarEvent({ data: { eventId, newStartsAt } }),
    onSuccess: () => {
      toast.success("Event rescheduled");
      setRescheduleId(null);
      setNewTime("");
      void qc.invalidateQueries({ queryKey: ["calendar"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (events.length === 0 && past.length === 0) {
    return (
      <div className="mt-6 rounded-2xl bg-card p-6 text-center ring-1 ring-border">
        <Calendar className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Your schedule is empty. Book a tutoring session or commit to community service.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3 pb-8">
      <h2 className="text-sm font-medium">Upcoming</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming events.</p>
      ) : null}
      {events.map((e) => {
        const isTutoring = e.sourceType === "tutoring";
        const Icon = isTutoring ? GraduationCap : HeartHandshake;
        const cancelled = e.status === "cancelled";
        return (
          <article
            key={e.id}
            className={cn("rounded-2xl bg-card p-4 ring-1 ring-border", cancelled && "opacity-60")}
          >
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary">
                <Icon className="size-5 text-muted-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{e.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {fmtDateTime(e.startsAt)} · {fmtTime(e.startsAt)}–{fmtTime(e.endsAt)}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      cancelled ? "bg-destructive/10 text-destructive" : "bg-bud/10 text-bud",
                    )}
                  >
                    {cancelled ? "Cancelled" : e.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {isTutoring ? "Tutoring" : "Community Service"}
                  </span>
                  {e.participants.length > 0 ? (
                    <span className="text-[10px] text-muted-foreground">
                      with {e.participants.map((p) => `@${p}`).join(", ")}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            {!cancelled ? (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRescheduleId(rescheduleId === e.id ? null : e.id);
                    setNewTime("");
                  }}
                >
                  Reschedule
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => cancelMut.mutate(e.id)}
                  disabled={cancelMut.isPending}
                >
                  Cancel
                </Button>
              </div>
            ) : null}
            {rescheduleId === e.id ? (
              <div className="mt-3 flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">New date & time</Label>
                  <Input
                    type="datetime-local"
                    value={newTime}
                    onChange={(ev) => setNewTime(ev.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={!newTime || rescheduleMut.isPending}
                  onClick={() => {
                    const iso = new Date(newTime).toISOString();
                    rescheduleMut.mutate({ eventId: e.id, newStartsAt: iso });
                  }}
                >
                  Save
                </Button>
              </div>
            ) : null}
          </article>
        );
      })}

      {past.length > 0 ? (
        <>
          <h2 className="pt-3 text-sm font-medium">Past & cancelled</h2>
          {past.map((e) => {
            const isTutoring = e.sourceType === "tutoring";
            const Icon = isTutoring ? GraduationCap : HeartHandshake;
            return (
              <article key={e.id} className="rounded-2xl bg-card p-3 opacity-50 ring-1 ring-border">
                <div className="flex items-center gap-3">
                  <Icon className="size-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{fmtDateTime(e.startsAt)}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase">{e.status}</span>
                </div>
              </article>
            );
          })}
        </>
      ) : null}
    </div>
  );
}

function TutoringForm({ onDone }: { onDone: () => void }) {
  const tutors = PEOPLE.filter((p) => p.role === "lecturer" || p.verified);
  const [tutorHandle, setTutorHandle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [note, setNote] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      bookTutoringSession({
        data: { tutorHandle, courseCode, title, scheduledAt: new Date(scheduledAt).toISOString(), durationMin, note },
      }),
    onSuccess: () => {
      toast.success("Tutoring session booked and added to your schedule.");
      setTutorHandle("");
      setCourseCode("");
      setTitle("");
      setScheduledAt("");
      setDurationMin(60);
      setNote("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="mt-5 space-y-4 pb-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (!tutorHandle) return toast.error("Pick a tutor");
        if (!title.trim()) return toast.error("Give the session a title");
        if (!scheduledAt) return toast.error("Pick a date and time");
        mut.mutate();
      }}
    >
      <div className="space-y-1.5">
        <Label>Tutor</Label>
        <select
          value={tutorHandle}
          onChange={(e) => setTutorHandle(e.target.value)}
          className="h-12 w-full rounded-full bg-secondary px-4 text-sm"
        >
          <option value="">Select a tutor</option>
          {tutors.map((t) => (
            <option key={t.handle} value={t.handle}>
              {t.name} (@{t.handle}){t.department ? ` · ${t.department}` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Session title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Calculus revision" />
      </div>
      <div className="space-y-1.5">
        <Label>Course code (optional)</Label>
        <Input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="e.g. MTH 101" />
      </div>
      <div className="space-y-1.5">
        <Label>Date & time</Label>
        <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Duration (minutes)</Label>
        <Input
          type="number"
          min={15}
          max={480}
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value))}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Note (optional)</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What do you need help with?" />
      </div>
      <Button type="submit" className="w-full" disabled={mut.isPending}>
        {mut.isPending ? "Booking…" : "Book Session"}
      </Button>
    </form>
  );
}

function ServiceForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMin, setDurationMin] = useState(120);

  const mut = useMutation({
    mutationFn: () =>
      commitCommunityService({
        data: {
          title,
          organization,
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationMin,
        },
      }),
    onSuccess: () => {
      toast.success("Community service committed and added to your schedule.");
      setTitle("");
      setOrganization("");
      setScheduledAt("");
      setDurationMin(120);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="mt-5 space-y-4 pb-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return toast.error("Give the commitment a title");
        if (!scheduledAt) return toast.error("Pick a date and time");
        mut.mutate();
      }}
    >
      <div className="space-y-1.5">
        <Label>What are you committing to?</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Campus clean-up drive" />
      </div>
      <div className="space-y-1.5">
        <Label>Organization (optional)</Label>
        <Input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="e.g. UNILAG SDG Club" />
      </div>
      <div className="space-y-1.5">
        <Label>Date & time</Label>
        <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Duration (minutes)</Label>
        <Input
          type="number"
          min={15}
          max={720}
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value))}
        />
      </div>
      <Button type="submit" className="w-full" disabled={mut.isPending}>
        {mut.isPending ? "Committing…" : "Commit"}
      </Button>
    </form>
  );
}
