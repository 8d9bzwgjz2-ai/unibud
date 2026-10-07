import { createFileRoute } from "@tanstack/react-router";
import { randomBytes } from "node:crypto";

/**
 * Starts the Google Calendar OAuth consent flow for the signed-in student.
 * A short-lived state cookie guards the callback against CSRF; the redirect
 * URI is the app's own /api/google-calendar/callback on the same origin.
 */
export const Route = createFileRoute("/api/google-calendar/authorize")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { requireUserId } = await import("@/lib/auth/verify.server");
        await requireUserId();

        const google = await import("@/lib/spark/google.server");
        if (!google.googleConfigured()) {
          return Response.redirect(new URL("/spark?google=unconfigured", request.url), 302);
        }

        const state = randomBytes(16).toString("hex");
        const redirectUri = `${google.requestOrigin(request)}/api/google-calendar/callback`;
        const authorizeUrl = google.buildAuthorizeUrl(redirectUri, state);

        const cookie = `gc_oauth_state=${state}; Max-Age=600; Path=/; HttpOnly; SameSite=Lax; Secure`;
        return new Response(null, {
          status: 302,
          headers: { Location: authorizeUrl, "Set-Cookie": cookie },
        });
      },
    },
  },
});
