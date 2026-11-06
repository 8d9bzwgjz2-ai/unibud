import { createFileRoute } from "@tanstack/react-router";
import { getSessionUser } from "@/lib/auth/verify.server";
import { getSql } from "@/lib/db";
import { readMediaBytes } from "@/lib/media/store.server";

export const Route = createFileRoute("/api/media/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const user = await getSessionUser();
        if (!user) return new Response("Unauthorized", { status: 401 });
        const id = params.id;
        const sql = await getSql();
        const access = await sql<{ status: string }>`select status from unibud_accounts where user_id = ${user.id} limit 1`;
        if (access[0]?.status !== "complete") return new Response("Unauthorized", { status: 401 });
        const rows = await sql`select mime_type, status, visibility from media_assets where id = ${id} limit 1`;
        const row = rows[0];
        if (!row || String(row.status) === "deleted") {
          return new Response("Gone", { status: 404 });
        }
        if (String(row.status) !== "ready") {
          return new Response("Not ready", { status: 409 });
        }
        try {
          const bytes = await readMediaBytes(id);
          return new Response(bytes, {
            headers: {
              "Content-Type": String(row.mime_type),
              "Cache-Control": "private, max-age=3600",
              "X-Content-Type-Options": "nosniff",
            },
          });
        } catch {
          return new Response("Missing file", { status: 404 });
        }
      },
    },
  },
});
