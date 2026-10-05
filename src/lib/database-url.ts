/**
 * Single place that resolves the server-side PostgreSQL connection string.
 *
 * `DATABASE_URL` is the canonical application contract. Netlify's managed
 * PostgreSQL integration injects its own variables instead, so those are
 * accepted as fallbacks. This keeps the application database layer provider-
 * neutral while supporting both manually configured and platform-provisioned
 * PostgreSQL connections.
 *
 * Server-only: the browser bundle must never import this.
 */
const CANDIDATES = [
  "DATABASE_URL",
  "NETLIFY_DB_URL",
  "NETLIFY_DATABASE_URL",
  "NETLIFY_DATABASE_URL_UNPOOLED",
] as const;

/** Resolve the connection string, treating empty/whitespace as unset. */
export function resolveDatabaseUrl(): string | undefined {
  if (typeof process === "undefined") return undefined;
  for (const key of CANDIDATES) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

/** True when any PostgreSQL connection string is configured. */
export function databaseConfigured(): boolean {
  return Boolean(resolveDatabaseUrl());
}

/** Human-readable list of the accepted variables, for error messages. */
export const DATABASE_URL_VARS = CANDIDATES.join(" or ");
