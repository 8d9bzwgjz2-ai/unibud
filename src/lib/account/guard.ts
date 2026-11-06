import { createMiddleware } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

/** Session if there is one. Signed-out callers continue with a null user id. */
export const optionalAuthMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser(context.bearerToken);
    return next({ context: { userId: user?.id ?? null, email: user?.email ?? null } });
  });

/** Signed-in, verified, and finished with profile setup. Suspended accounts stop here. */
export const appAccessMiddleware = createMiddleware({ type: "function" })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ status: string }>`select status from unibud_accounts where user_id = ${context.userId} limit 1`;
    if (rows[0]?.status !== "complete") {
      throw new Error("A verified UNIBUD account is required.");
    }
    return next();
  });
