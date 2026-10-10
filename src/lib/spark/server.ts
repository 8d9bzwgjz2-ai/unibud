import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { notify } from "@/lib/unibud/server";

export type CalendarEvent = {
  id: string;
  sourceType: "tutoring" | "community_service";
  sourceId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
  participants: string[];
  /** True when the event is mirrored in the student's Google Calendar. */
  googleSynced: boolean;
};

/** Outcome of mirroring a confirmed booking/commitment to Google Calendar. */
export type GoogleSyncResult = "synced" | "failed" | "skipped";

/**
 * Google availability check before confirming a booking. Blocking when
 * Google answers with a conflict; silently skipped when the student has not
 * connected, Google is not configured, or the check itself fails.
 */
async function assertGoogleFree(userId: string, startsAt: string, endsAt: string): Promise<void> {
  try {
    const google = await import("./google.server");
    if (!google.googleConfigured()) return;
    const token = await google.getValidAccessToken(userId);
    if (!token) return;
    const conflict = await google.checkGoogleAvailability(token, startsAt, endsAt);
    if (conflict) {
      throw new Error("That time overlaps with an event in your Google Calendar. Pick a different time.");
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("Google Calendar")) throw e;
    // Revoked permissions / network failure — degrade to UNIBUD-only checks.
  }
}

/** Mirror a confirmed booking/commitment into Google Calendar (best-effort). */
async function pushEventToGoogle(
  userId: string,
  sourceType: "tutoring" | "community_service",
  sourceId: string,
  event: { title: string; startsAt: string; endsAt: string; description: string },
): Promise<GoogleSyncResult> {
  try {
    const google = await import("./google.server");
    if (!google.googleConfigured()) return "skipped";
    const token = await google.getValidAccessToken(userId);
    if (!token) return "skipped";
    const created = await google.createGoogleEvent(token, {
      summary: event.title,
      description: event.description,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
    });
    const sql = await getSql();
    await sql`update calendar_events set google_event_id = ${created.id}
      where user_id = ${userId} and source_type = ${sourceType} and source_id = ${sourceId}`;
    return "synced";
  } catch {
    return "failed";
  }
}

/** Keep the Google copy in step with a cancellation (best-effort, never blocks). */
async function cancelGoogleEventFor(userId: string, googleEventId: string | null): Promise<void> {
  if (!googleEventId) return;
  try {
    const google = await import("./google.server");
    const token = await google.getValidAccessToken(userId);
    if (token) await google.cancelGoogleEvent(token, googleEventId);
  } catch {
    // Revoked permissions / network failure — the UNIBUD cancellation stands.
  }
}

/** Keep the Google copy in step with a reschedule (best-effort, never blocks). */
async function rescheduleGoogleEventFor(
  userId: string,
  googleEventId: string | null,
  startsAt: string,
  endsAt: string,
): Promise<void> {
  if (!googleEventId) return;
  try {
    const google = await import("./google.server");
    const token = await google.getValidAccessToken(userId);
    if (token) await google.updateGoogleEvent(token, googleEventId, { startsAt, endsAt });
  } catch {
    // Revoked permissions / network failure — the UNIBUD reschedule stands.
  }
}

export type BookTutoringInput = {
  tutorHandle: string;
  courseCode?: string;
  title: string;
  scheduledAt: string;
  durationMin: number;
  note?: string;
};

export type CommitServiceInput = {
  title: string;
  organization: string;
  scheduledAt: string;
  durationMin: number;
  hours?: number;
};

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

async function checkDoubleBooking(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  startsAt: string,
  endsAt: string,
  excludeEventId?: string,
): Promise<void> {
  const existing = await sql<{ id: string; starts_at: string; ends_at: string; status: string }>`
    select id, starts_at, ends_at, status from calendar_events
    where user_id = ${userId} and status = 'confirmed'`;
  for (const e of existing) {
    if (excludeEventId && e.id === excludeEventId) continue;
    if (overlaps(startsAt, endsAt, e.starts_at, e.ends_at)) {
      throw new Error("That time overlaps with another event in your schedule. Pick a different time.");
    }
  }
}

async function syncCalendarEvent(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  sourceType: "tutoring" | "community_service",
  sourceId: string,
  title: string,
  startsAt: string,
  endsAt: string,
  status: string,
  participants: string[],
): Promise<void> {
  const existing = await sql`select id from calendar_events where user_id = ${userId} and source_type = ${sourceType} and source_id = ${sourceId}`;
  if (existing[0]) {
    await sql`update calendar_events set title = ${title}, starts_at = ${startsAt}, ends_at = ${endsAt},
      status = ${status}, participants = ${JSON.stringify(participants)}
      where user_id = ${userId} and source_type = ${sourceType} and source_id = ${sourceId}`;
  } else {
    await sql`insert into calendar_events (id, user_id, source_type, source_id, title, starts_at, ends_at, status, participants)
      values (${crypto.randomUUID()}, ${userId}, ${sourceType}, ${sourceId}, ${title}, ${startsAt}, ${endsAt}, ${status}, ${JSON.stringify(participants)})
      on conflict (user_id, source_type, source_id) do update set title = ${title}, starts_at = ${startsAt}, ends_at = ${endsAt}, status = ${status}, participants = ${JSON.stringify(participants)}`;
  }
}

function mapEvent(r: {
  id: string;
  source_type: string;
  source_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  participants: string;
  google_event_id?: string | null;
}): CalendarEvent {
  let participants: string[] = [];
  try {
    participants = JSON.parse(r.participants) as string[];
  } catch {
    participants = [];
  }
  return {
    id: r.id,
    sourceType: r.source_type as "tutoring" | "community_service",
    sourceId: r.source_id,
    title: r.title,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    status: r.status,
    participants,
    googleSynced: Boolean(r.google_event_id),
  };
}

/**
 * Book a tutoring session. Creates the booking, prevents double-booking, and
 * automatically places the confirmed session into the student's calendar.
 */
export const bookTutoringSession = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: BookTutoringInput) => input)
  .handler(async ({ context, data }) => {
    const title = data.title.trim();
    if (!title) throw new Error("Give the session a title");
    const tutorHandle = data.tutorHandle.trim().replace(/^@/, "").toLowerCase();
    if (!tutorHandle) throw new Error("Pick a tutor");
    const startsAt = new Date(data.scheduledAt);
    if (Number.isNaN(startsAt.getTime())) throw new Error("Pick a valid date and time");
    if (startsAt.getTime() < Date.now() - 60_000) throw new Error("Pick a future date and time");
    const durationMin = Math.max(15, Math.min(480, data.durationMin || 60));
    const endsAt = new Date(startsAt.getTime() + durationMin * 60_000).toISOString();

    const sql = await getSql();
    const startsAtIso = startsAt.toISOString();

    await checkDoubleBooking(sql, context.userId, startsAtIso, endsAt);
    // Google Calendar availability too (when connected) — blocks on a real conflict.
    await assertGoogleFree(context.userId, startsAtIso, endsAt);

    const id = `tb_${crypto.randomUUID().slice(0, 10)}`;
    await sql`insert into tutoring_bookings (id, student_id, tutor_handle, course_code, title, scheduled_at, duration_min, status, note)
      values (${id}, ${context.userId}, ${tutorHandle}, ${data.courseCode?.trim() || null}, ${title},
      ${startsAtIso}, ${durationMin}, ${"confirmed"}, ${data.note?.trim() || ""})`;

    // Automatically place the confirmed session into the calendar
    await syncCalendarEvent(sql, context.userId, "tutoring", id, title, startsAtIso, endsAt, "confirmed", [tutorHandle]);

    // Mirror the confirmed session into the student's Google Calendar
    const googleSync = await pushEventToGoogle(context.userId, "tutoring", id, {
      title,
      startsAt: startsAtIso,
      endsAt,
      description: `Tutoring with @${tutorHandle}${data.courseCode?.trim() ? ` · ${data.courseCode.trim()}` : ""} — booked via UNIBUD Spark.`,
    });

    await notify(context.userId, "class", "Tutoring session booked", `${title} with @${tutorHandle}`, "/spark");

    return { id, tutorHandle, title, startsAt: startsAtIso, durationMin, googleSync };
  });

/**
 * Commit to a community-service opportunity. Creates the commitment and
 * automatically shows it in the student's calendar.
 */
export const commitCommunityService = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: CommitServiceInput) => input)
  .handler(async ({ context, data }) => {
    const title = data.title.trim();
    if (!title) throw new Error("Give the commitment a title");
    const startsAt = new Date(data.scheduledAt);
    if (Number.isNaN(startsAt.getTime())) throw new Error("Pick a valid date and time");
    if (startsAt.getTime() < Date.now() - 60_000) throw new Error("Pick a future date and time");
    const durationMin = Math.max(15, Math.min(720, data.durationMin || 120));
    const hours = data.hours || Math.round((durationMin / 60) * 10) / 10;
    const endsAt = new Date(startsAt.getTime() + durationMin * 60_000).toISOString();

    const sql = await getSql();
    const startsAtIso = startsAt.toISOString();

    await checkDoubleBooking(sql, context.userId, startsAtIso, endsAt);
    // Google Calendar availability too (when connected) — blocks on a real conflict.
    await assertGoogleFree(context.userId, startsAtIso, endsAt);

    const id = `cs_${crypto.randomUUID().slice(0, 10)}`;
    await sql`insert into community_service_commitments (id, student_id, title, organization, scheduled_at, duration_min, hours, status)
      values (${id}, ${context.userId}, ${title}, ${data.organization.trim()}, ${startsAtIso}, ${durationMin}, ${hours}, ${"confirmed"})`;

    await syncCalendarEvent(sql, context.userId, "community_service", id, title, startsAtIso, endsAt, "confirmed", []);

    // Mirror the confirmed commitment into the student's Google Calendar
    const googleSync = await pushEventToGoogle(context.userId, "community_service", id, {
      title,
      startsAt: startsAtIso,
      endsAt,
      description: `Community service${data.organization.trim() ? ` · ${data.organization.trim()}` : ""} — committed via UNIBUD Spark.`,
    });

    await notify(context.userId, "events", "Community service committed", `${title}${data.organization.trim() ? ` · ${data.organization.trim()}` : ""}`, "/spark");

    return { id, title, startsAt: startsAtIso, durationMin, hours, googleSync };
  });

/** Get all calendar events for the signed-in student, sorted by start time. */
export const getMyCalendar = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql`select * from calendar_events where user_id = ${context.userId} order by starts_at asc`;
    return rows.map(mapEvent);
  });

/** Cancel a calendar event and its underlying booking or commitment. */
export const cancelCalendarEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((eventId: string) => eventId)
  .handler(async ({ context, data: eventId }) => {
    const sql = await getSql();
    const events = await sql`select * from calendar_events where id = ${eventId} and user_id = ${context.userId} limit 1`;
    const event = events[0];
    if (!event) throw new Error("Event not found");
    if (event.status === "cancelled") throw new Error("Already cancelled");

    // Cancel the underlying booking/commitment
    if (event.source_type === "tutoring") {
      await sql`update tutoring_bookings set status = 'cancelled' where id = ${event.source_id} and student_id = ${context.userId}`;
    } else {
      await sql`update community_service_commitments set status = 'cancelled' where id = ${event.source_id} and student_id = ${context.userId}`;
    }
    // Sync the calendar event
    await sql`update calendar_events set status = 'cancelled' where id = ${eventId} and user_id = ${context.userId}`;
    // Keep the Google Calendar copy in step (best-effort)
    await cancelGoogleEventFor(context.userId, event.google_event_id ?? null);
    return { cancelled: true as const };
  });

/** Reschedule a calendar event and its underlying booking or commitment. */
export const rescheduleCalendarEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { eventId: string; newStartsAt: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const events = await sql`select * from calendar_events where id = ${data.eventId} and user_id = ${context.userId} limit 1`;
    const event = events[0];
    if (!event) throw new Error("Event not found");
    if (event.status === "cancelled") throw new Error("Cannot reschedule a cancelled event");

    const newStart = new Date(data.newStartsAt);
    if (Number.isNaN(newStart.getTime())) throw new Error("Pick a valid date and time");
    if (newStart.getTime() < Date.now() - 60_000) throw new Error("Pick a future date and time");

    // Preserve the original duration
    const oldDuration = new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime();
    const newEnd = new Date(newStart.getTime() + oldDuration).toISOString();
    const newStartIso = newStart.toISOString();

    // Check double-booking (excluding this event)
    await checkDoubleBooking(sql, context.userId, newStartIso, newEnd, data.eventId);

    // Reschedule the underlying booking/commitment
    if (event.source_type === "tutoring") {
      await sql`update tutoring_bookings set scheduled_at = ${newStartIso} where id = ${event.source_id} and student_id = ${context.userId}`;
    } else {
      await sql`update community_service_commitments set scheduled_at = ${newStartIso} where id = ${event.source_id} and student_id = ${context.userId}`;
    }
    // Sync the calendar event
    await sql`update calendar_events set starts_at = ${newStartIso}, ends_at = ${newEnd}, status = 'confirmed'
      where id = ${data.eventId} and user_id = ${context.userId}`;
    // Keep the Google Calendar copy in step (best-effort)
    await rescheduleGoogleEventFor(context.userId, event.google_event_id ?? null, newStartIso, newEnd);

    return { rescheduled: true as const, startsAt: newStartIso };
  });

/**
 * Google Calendar connection state for the signed-in student. Only booleans
 * and the account email are exposed — tokens and credentials never leave the
 * server.
 */
export const getGoogleCalendarStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const google = await import("./google.server");
    const configured = google.googleConfigured();
    if (!configured) return { configured: false as const, connected: false as const, email: null };
    const conn = await google.getConnection(context.userId);
    return {
      configured: true as const,
      connected: Boolean(conn),
      email: conn?.google_email ?? null,
    };
  });

/** Disconnect the student's Google Calendar (drops the stored tokens). */
export const disconnectGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const google = await import("./google.server");
    await google.clearConnection(context.userId);
    return { disconnected: true as const };
  });
