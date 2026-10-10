import { createFileRoute } from "@tanstack/react-router";

/**
 * OAuth callback for the Google Calendar connection. Verifies the state
 * cookie, exchanges the authorization code for tokens and stores them
 * encrypted server-side — the tokens never reach the browser.
 */
export const Route = createFileRoute("/api/google-calendar/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { requireUserId } = await import("@/lib/auth/verify.server");
        const back = (result: string) =>
          new Response(null, {
            status: 302,
            headers: {
              Location: new URL(`/spark?google=${result}`, request.url).toString(),
              // Clear the one-shot state cookie.
              "Set-Cookie": "gc_oauth_state=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure",
            },
          });

        let userId: string;
        try {
          userId = await requireUserId();
        } catch {
          return back("error");
        }

        const url = new URL(request.url);
        if (url.searchParams.get("error")) return back("denied");
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const cookieState = request.headers
          .get("cookie")
          ?.split(/;\s*/)
          .find((c) => c.startsWith("gc_oauth_state="))
          ?.slice("gc_oauth_state=".length);
        if (!code || !state || !cookieState || state !== cookieState) {
          return back("error");
        }

        const google = await import("@/lib/spark/google.server");
        const redirectUri = `${google.requestOrigin(request)}/api/google-calendar/callback`;
        try {
          const tokens = await google.exchangeCodeForTokens(code, redirectUri);
          const email = await google.fetchUserEmail(tokens.access_token);
          await google.saveConnection(userId, tokens, email);
          return back("connected");
        } catch {
          return back("error");
        }
      },
    },
  },
});
