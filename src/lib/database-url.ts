/**
 * Single place that resolves the server-side PostgreSQL connection string.
 *
 * `DATABASE_URL` is the canonical application contract. Netlify's managed
 * PostgreSQL integration injects its own variables instead, so those are
 * accepted as fallbacks.
 *
 * Server-only: the browser bundle must never import this.
 */
const CANDIDATES = [
  "DATABASE_URL",
  "NETLIFY_DB_URL",
  "NETLIFY_DATABASE_URL",
  "NETLIFY_DATABASE_URL_UNPOOLED",
] as const;

export function resolveDatabaseUrl(): string | undefined {
  if (typeof process === "undefined") return undefined;
  for (const key of CANDIDATES) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function databaseConfigured(): boolean {
  return Boolean(resolveDatabaseUrl());
}

/** True on Netlify/Vercel/Lambda. Those runtimes must not open PGlite files. */
export function isServerlessRuntime(): boolean {
  if (typeof process === "undefined") return false;
  return Boolean(
    process.env.NETLIFY ||
      process.env.NETLIFY_DEV ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT ||
      process.env.VERCEL,
  );
}

export const DATABASE_URL_VARS = CANDIDATES.join(" or ");
