/**
 * Server-only Google Calendar integration for Spark.
 *
 * Never import this from client code — it reads GOOGLE_CLIENT_ID/SECRET and the
 * token table. The client only ever sees `getGoogleCalendarStatus()` booleans
 * and the account email; access/refresh tokens never leave the server.
 *
 * OAuth 2.0 flow:
 *   /api/google-calendar/authorize  → Google consent (state cookie CSRF guard)
 *   /api/google-calendar/callback   → code exchange, tokens stored encrypted
 *
 * Tokens are encrypted at rest (AES-256-GCM, key derived from
 * BETTER_AUTH_SECRET). Revoked permissions or sync failures are handled by the
 * callers — every helper here throws, and Spark degrades gracefully.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary";
// calendar.events lets us create/patch events; calendar.readonly powers the
// freeBusy availability check that prevents double-booking.
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

/** Public origin of the incoming request (behind the preview proxy). */
export function requestOrigin(request: Request): string {
  const explicit = process.env.GOOGLE_CALENDAR_REDIRECT_ORIGIN?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

// --- Token encryption (AES-256-GCM, key derived from the auth secret) -------

const globalRef = globalThis as typeof globalThis & { __sparkGoogleKey__?: string };
function encryptionSecret(): string {
  const configured = process.env.BETTER_AUTH_SECRET?.trim();
  if (configured) return configured;
  // Sandbox fallback: process-stable so HMR does not make stored tokens
  // unreadable. A deployed app always configures BETTER_AUTH_SECRET.
  globalRef.__sparkGoogleKey__ ??= randomBytes(32).toString("hex");
  return globalRef.__sparkGoogleKey__;
}
function encryptionKey(): Buffer {
  return createHash("sha256").update(`unibud:google-calendar:${encryptionSecret()}`).digest();
}
function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}
function decryptToken(stored: string): string {
  const [ivB64, tagB64, encB64] = stored.split(":");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encB64, "base64")), decipher.final()]).toString("utf8");
}

// --- Connection storage -------------------------------------------------------

type ConnectionRow = {
  user_id: string;
  google_email: string | null;
  access_token_enc: string;
  refresh_token_enc: string;
  token_expires_at: unknown;
};

export async function getConnection(userId: string): Promise<ConnectionRow | null> {
  const sql = await getSql();
  const rows = await sql<ConnectionRow>`
    select * from google_calendar_connections where user_id = ${userId} limit 1`;
  return rows[0] ?? null;
}

export async function saveConnection(
  userId: string,
  tokens: { access_token: string; refresh_token?: string; expires_in?: number },
  email: string | null,
): Promise<void> {
  const sql = await getSql();
  const expires = tokens.expires_in ? new Date(Date.now() + (tokens.expires_in - 60) * 1000) : null;
  // Google only returns a refresh_token on first consent (prompt=consent keeps
  // it coming); keep the stored one when the response omits it.
  const existing = await getConnection(userId);
  const refreshToken = tokens.refresh_token ?? (existing ? decryptToken(existing.refresh_token_enc) : "");
  await sql`
    insert into google_calendar_connections
      (user_id, google_email, access_token_enc, refresh_token_enc, token_expires_at, updated_at)
    values (${userId}, ${email}, ${encryptToken(tokens.access_token)}, ${encryptToken(refreshToken)}, ${expires}, now())
    on conflict (user_id) do update set
      google_email = ${email},
      access_token_enc = ${encryptToken(tokens.access_token)},
      refresh_token_enc = ${encryptToken(refreshToken)},
      token_expires_at = ${expires},
      updated_at = now()`;
}

export async function clearConnection(userId: string): Promise<void> {
  const sql = await getSql();
  await sql`delete from google_calendar_connections where user_id = ${userId}`;
}

// --- OAuth -------------------------------------------------------------------

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google authorization failed (${res.status})`);
  return (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
}

export async function fetchUserEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(USERINFO_URL, { headers: { authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return null;
    const info = (await res.json()) as { email?: string };
    return info.email ?? null;
  } catch {
    return null;
  }
}

/**
 * Valid access token for the student, refreshing it when expired. Returns null
 * when the student has not connected or the refresh failed (permissions
 * revoked) — callers treat that as "not connected" and degrade gracefully.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const conn = await getConnection(userId);
  if (!conn) return null;
  let accessToken = decryptToken(conn.access_token_enc);
  const expiresAt = conn.token_expires_at ? new Date(String(conn.token_expires_at)).getTime() : 0;
  if (Date.now() < expiresAt - 30_000) return accessToken;

  const refreshToken = decryptToken(conn.refresh_token_enc);
  if (!refreshToken) return null;
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
        client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) {
      if (res.status === 400 || res.status === 401) await clearConnection(userId);
      return null;
    }
    const tokens = (await res.json()) as { access_token: string; expires_in?: number };
    accessToken = tokens.access_token;
    await saveConnection(userId, { ...tokens, refresh_token: refreshToken }, conn.google_email);
    return accessToken;
  } catch {
    return null;
  }
}

// --- Calendar API ------------------------------------------------------------

/**
 * True when the student's primary Google Calendar is busy in [startsAt,
 * endsAt). Throws on API failure — callers catch and skip the check so a
 * Google outage never blocks a UNIBUD booking.
 */
export async function checkGoogleAvailability(
  accessToken: string,
  startsAt: string,
  endsAt: string,
): Promise<boolean> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ timeMin: startsAt, timeMax: endsAt, items: [{ id: "primary" }] }),
  });
  if (!res.ok) throw new Error(`Google freeBusy failed (${res.status})`);
  const data = (await res.json()) as { calendars?: Record<string, { busy?: { start: string; end: string }[] }> };
  const busy = data.calendars?.primary?.busy ?? [];
  return busy.some((b) => new Date(startsAt) < new Date(b.end) && new Date(b.start) < new Date(endsAt));
}

export async function createGoogleEvent(
  accessToken: string,
  event: { summary: string; description?: string; startsAt: string; endsAt: string },
): Promise<{ id: string }> {
  const res = await fetch(`${CALENDAR_BASE}/events`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.startsAt, timeZone: "UTC" },
      end: { dateTime: event.endsAt, timeZone: "UTC" },
    }),
  });
  if (!res.ok) throw new Error(`Google event create failed (${res.status})`);
  return (await res.json()) as { id: string };
}

export async function updateGoogleEvent(
  accessToken: string,
  googleEventId: string,
  patch: { summary?: string; startsAt: string; endsAt: string },
): Promise<void> {
  const res = await fetch(`${CALENDAR_BASE}/events/${encodeURIComponent(googleEventId)}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      ...(patch.summary ? { summary: patch.summary } : {}),
      start: { dateTime: patch.startsAt, timeZone: "UTC" },
      end: { dateTime: patch.endsAt, timeZone: "UTC" },
    }),
  });
  if (!res.ok) throw new Error(`Google event update failed (${res.status})`);
}

export async function cancelGoogleEvent(accessToken: string, googleEventId: string): Promise<void> {
  const res = await fetch(`${CALENDAR_BASE}/events/${encodeURIComponent(googleEventId)}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ status: "cancelled" }),
  });
  if (!res.ok) throw new Error(`Google event cancel failed (${res.status})`);
}
