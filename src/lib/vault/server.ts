import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { appAccessMiddleware } from "@/lib/account/guard";
import { getSql } from "@/lib/db";

const PIN_RE = /^\d{4}$/;
const attempts = new Map<string, { n: number; until: number }>();

function hashPin(pin: string, salt: string) {
  return scryptSync(pin, salt, 32).toString("hex");
}

async function ensureTable() {
  const sql = await getSql();
  await sql.query(`create table if not exists user_vault (
    user_id text primary key,
    pin_hash text,
    pin_salt text,
    passkey_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
  return sql;
}

function guardAttempts(userId: string) {
  const now = Date.now();
  const row = attempts.get(userId);
  if (row && row.until > now && row.n >= 5) {
    throw new Error("Too many tries. Wait a minute.");
  }
}

export const vaultStatus = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .handler(async ({ context }) => {
    const sql = await ensureTable();
    const rows = await sql<{ pin_hash: string | null; passkey_id: string | null }>`
      select pin_hash, passkey_id from user_vault where user_id = ${context.userId} limit 1`;
    const row = rows[0];
    return {
      hasPin: Boolean(row?.pin_hash),
      hasPasskey: Boolean(row?.passkey_id),
    };
  });

export const setVaultPin = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((d: { pin: string }) => d)
  .handler(async ({ context, data }) => {
    if (!PIN_RE.test(data.pin)) throw new Error("Use a 4-digit passcode.");
    const sql = await ensureTable();
    const salt = randomBytes(16).toString("hex");
    const pin_hash = hashPin(data.pin, salt);
    await sql`
      insert into user_vault (user_id, pin_hash, pin_salt, updated_at)
      values (${context.userId}, ${pin_hash}, ${salt}, now())
      on conflict (user_id) do update set pin_hash = excluded.pin_hash, pin_salt = excluded.pin_salt, updated_at = now()`;
    return { ok: true as const };
  });

export const verifyVaultPin = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((d: { pin: string }) => d)
  .handler(async ({ context, data }) => {
    guardAttempts(context.userId);
    if (!PIN_RE.test(data.pin)) throw new Error("Use a 4-digit passcode.");
    const sql = await ensureTable();
    const rows = await sql<{ pin_hash: string; pin_salt: string }>`
      select pin_hash, pin_salt from user_vault where user_id = ${context.userId} limit 1`;
    const row = rows[0];
    if (!row?.pin_hash) throw new Error("Set a passcode first.");
    const got = hashPin(data.pin, row.pin_salt);
    const a = Buffer.from(got, "hex");
    const b = Buffer.from(row.pin_hash, "hex");
    const ok = a.length === b.length && timingSafeEqual(a, b);
    const rec = attempts.get(context.userId) ?? { n: 0, until: Date.now() + 60_000 };
    if (!ok) {
      rec.n += 1;
      rec.until = Date.now() + 60_000;
      attempts.set(context.userId, rec);
      throw new Error("Wrong passcode.");
    }
    attempts.delete(context.userId);
    return { ok: true as const };
  });

export const vaultPasskeyChallenge = createServerFn({ method: "GET" })
  .middleware([appAccessMiddleware])
  .handler(async () => {
    return { challenge: randomBytes(32).toString("base64url") };
  });

export const saveVaultPasskey = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((d: { credentialId: string }) => d)
  .handler(async ({ context, data }) => {
    if (!data.credentialId.trim()) throw new Error("Passkey was empty.");
    const sql = await ensureTable();
    await sql`
      insert into user_vault (user_id, passkey_id, updated_at)
      values (${context.userId}, ${data.credentialId}, now())
      on conflict (user_id) do update set passkey_id = excluded.passkey_id, updated_at = now()`;
    return { ok: true as const };
  });

export const verifyVaultPasskey = createServerFn({ method: "POST" })
  .middleware([appAccessMiddleware])
  .validator((d: { credentialId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await ensureTable();
    const rows = await sql<{ passkey_id: string | null }>`
      select passkey_id from user_vault where user_id = ${context.userId} limit 1`;
    if (!rows[0]?.passkey_id || rows[0].passkey_id !== data.credentialId) {
      throw new Error("That passkey is not registered on this account.");
    }
    return { ok: true as const };
  });
