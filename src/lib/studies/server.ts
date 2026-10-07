import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { mapCourse, mapMaterial, mapSession } from "@/lib/unibud/map";
import { SAMPLE_COURSES } from "@/lib/unibud/catalog";

async function loadStudies(userId: string) {
  const sql = await getSql();
  const courses = (await sql`select * from courses where user_id = ${userId} order by code`).map(
    mapCourse,
  );
  const materials = (await sql`select * from study_materials where user_id = ${userId}`).map(
    mapMaterial,
  );
  const sessions = (
    await sql`select * from study_sessions where user_id = ${userId} order by starts_at`
  ).map(mapSession);
  return { courses, materials, sessions };
}

export const getStudies = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => loadStudies(context.userId));

export const seedSampleSemester = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const existing = await sql`select id from courses where user_id = ${context.userId} limit 1`;
    if (existing[0]) return loadStudies(context.userId);
    for (const c of SAMPLE_COURSES) {
      const id = crypto.randomUUID();
      await sql`insert into courses (id, user_id, session_label, semester, title, code)
        values (${id}, ${context.userId}, ${"2026/2027 Academic Session"}, ${"Semester 1"}, ${c.title}, ${c.code})`;
      await sql`insert into study_materials (id, user_id, course_id, title, kind)
        values (${crypto.randomUUID()}, ${context.userId}, ${id}, ${`${c.title} — week 1 notes`}, ${"note"})`;
    }
    return loadStudies(context.userId);
  });

export const addCourse = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { title: string; code: string; sessionLabel: string; semester: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`insert into courses (id, user_id, session_label, semester, title, code)
      values (${crypto.randomUUID()}, ${context.userId}, ${data.sessionLabel || "2026/2027 Academic Session"}, ${data.semester || "Semester 1"}, ${data.title.trim()}, ${data.code.trim()})`;
    return loadStudies(context.userId);
  });

export const addMaterial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { courseId: string; title: string; kind: "note" | "file" | "link" }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const owned = await sql`select id from courses where id = ${data.courseId} and user_id = ${context.userId}`;
    if (!owned[0]) throw new Error("Course not found");
    await sql`insert into study_materials (id, user_id, course_id, title, kind)
      values (${crypto.randomUUID()}, ${context.userId}, ${data.courseId}, ${data.title.trim()}, ${data.kind})`;
    return loadStudies(context.userId);
  });

export const addStudySession = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { courseId: string; title: string; startsAt: string; minutes: number }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const owned = await sql`select id from courses where id = ${data.courseId} and user_id = ${context.userId}`;
    if (!owned[0]) throw new Error("Course not found");
    await sql`insert into study_sessions (id, user_id, course_id, title, starts_at, minutes)
      values (${crypto.randomUUID()}, ${context.userId}, ${data.courseId}, ${data.title.trim()}, ${data.startsAt}, ${data.minutes})`;
    return loadStudies(context.userId);
  });
