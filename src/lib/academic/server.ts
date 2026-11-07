import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { courseByCode } from "@/lib/unibud/academic";
import { notify } from "@/lib/unibud/server";

async function loadEnrollments(userId: string) {
  const sql = await getSql();
  const rows = await sql`select * from enrollments where user_id = ${userId} order by course_code`;
  return rows.map((r) => ({
    id: String(r.id),
    code: String(r.course_code),
    title: String(r.course_title),
    semester: String(r.semester),
    sessionLabel: String(r.session_label),
    catalog: courseByCode(String(r.course_code)),
  }));
}

export const listEnrollments = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => loadEnrollments(context.userId));

export const enrollCourse = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string; semester?: string; sessionLabel?: string }) => input)
  .handler(async ({ context, data }) => {
    const cat = courseByCode(data.code);
    if (!cat) throw new Error("That course is not in the catalogue.");
    const sql = await getSql();
    const semester = data.semester || "Semester 1";
    const existing = await sql`select id from enrollments where user_id = ${context.userId} and course_code = ${cat.code} and semester = ${semester}`;
    if (!existing[0]) {
      await sql`insert into enrollments (id, user_id, course_code, course_title, semester, session_label)
        values (${crypto.randomUUID()}, ${context.userId}, ${cat.code}, ${cat.title}, ${semester}, ${data.sessionLabel || "2026/2027 Academic Session"})`;
    }
    return loadEnrollments(context.userId);
  });

export const dropCourse = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((code: string) => code)
  .handler(async ({ context, data: code }) => {
    const sql = await getSql();
    await sql`delete from enrollments where user_id = ${context.userId} and course_code = ${code}`;
    return loadEnrollments(context.userId);
  });

export const postAnnouncement = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { courseCode: string; title: string; body: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`insert into board_announcements (id, course_code, author_id, title, body)
      values (${crypto.randomUUID()}, ${data.courseCode}, ${context.userId}, ${data.title.trim()}, ${data.body.trim()})`;
    await notify(context.userId, "class", data.title.trim(), data.body.trim(), `/board/${data.courseCode.toLowerCase().replace(/\s+/g, "")}`);
    const rows = await sql`select * from board_announcements where course_code = ${data.courseCode} order by created_at desc`;
    return rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      body: String(r.body),
      createdAt: String(r.created_at),
    }));
  });

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((courseCode: string) => courseCode)
  .handler(async ({ data: courseCode }) => {
    const sql = await getSql();
    const rows = await sql`select * from board_announcements where course_code = ${courseCode} order by created_at desc`;
    return rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      body: String(r.body),
      createdAt: String(r.created_at),
    }));
  });

export const logAttendance = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { sessionId: string; kind: "join" | "leave" }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`insert into attendance_events (id, session_id, user_id, kind)
      values (${crypto.randomUUID()}, ${data.sessionId}, ${context.userId}, ${data.kind})`;
    return { ok: true };
  });

export const listAttendance = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((sessionId: string) => sessionId)
  .handler(async ({ data: sessionId }) => {
    const sql = await getSql();
    const rows = await sql`select user_id, kind, created_at from attendance_events where session_id = ${sessionId} order by created_at`;
    const byUser = new Map<string, { joined?: string; left?: string }>();
    for (const r of rows) {
      const uid = String(r.user_id);
      const cur = byUser.get(uid) ?? {};
      if (String(r.kind) === "join" && !cur.joined) cur.joined = String(r.created_at);
      if (String(r.kind) === "leave") cur.left = String(r.created_at);
      byUser.set(uid, cur);
    }
    return [...byUser.entries()].map(([userId, v]) => ({ userId, ...v }));
  });

export const askInClass = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { sessionId: string; body: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`insert into class_questions (id, session_id, user_id, body)
      values (${crypto.randomUUID()}, ${data.sessionId}, ${context.userId}, ${data.body.trim()})`;
    const rows = await sql`select id, body, created_at from class_questions where session_id = ${data.sessionId} order by created_at`;
    return rows.map((r) => ({ id: String(r.id), body: String(r.body), createdAt: String(r.created_at) }));
  });

export const listClassQuestions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((sessionId: string) => sessionId)
  .handler(async ({ data: sessionId }) => {
    const sql = await getSql();
    const rows = await sql`select id, body, created_at from class_questions where session_id = ${sessionId} order by created_at`;
    return rows.map((r) => ({ id: String(r.id), body: String(r.body), createdAt: String(r.created_at) }));
  });
