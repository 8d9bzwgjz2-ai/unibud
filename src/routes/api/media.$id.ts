import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { readMediaBytes } from "@/lib/media/store.server";

export const Route = createFileRoute("/api/media/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id;
        const sql = await getSql();
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
