import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

export type ReportKind = "problem" | "bug" | "content" | "feedback";
const KINDS: ReportKind[] = ["problem", "bug", "content", "feedback"];

/** Persists a report. Resolves only after the row is written; throws otherwise. */
export const submitReport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { kind: ReportKind; body: string }) => input)
  .handler(async ({ context, data }) => {
    const body = data.body.trim().slice(0, 4000);
    if (!body) throw new Error("Report is empty");
    if (!KINDS.includes(data.kind)) throw new Error("Unknown report type");
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`insert into user_reports (id, reporter_id, kind, body) values (${id}, ${context.userId}, ${data.kind}, ${body})`;
    return { id };
  });
