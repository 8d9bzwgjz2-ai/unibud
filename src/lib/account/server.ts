import { createServerFn } from "@tanstack/react-start";
import { scryptSync, randomBytes, timingSafeEqual, createHash, randomInt } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  CODE_TTL_MS,
  MAX_CODE_ATTEMPTS,
  RESET_TTL_MS,
  canResend,
  cleanUsername,
  interestsList,
  judgeCode,
  judgeReset,
  nextSetupStep,
  passwordIssues,
  registrationErrors,
  validEmail,
  type AccountStatus,
  type RegistrationInput,
  type SetupStep,
  type UnibudAccount,
} from "./domain";
import { optionalAuthMiddleware } from "./guard";
import { deliverMail } from "./mail";

type AccountRow = {
  user_id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  status: AccountStatus;
  setup_step: SetupStep;
  bio: string;
  photo_url: string;
  interests: string;
  institution: string;
  course: string;
  location: string;
  discoverable: boolean;
  allow_messages: boolean;
  show_institution: boolean;
  show_location: boolean;
};

function mapAccount(row: AccountRow): UnibudAccount {
  return {
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    email: row.email,
    status: row.status,
    setupStep: row.setup_step,
    bio: row.bio,
    photoUrl: row.photo_url,
    interests: row.interests,
    institution: row.institution,
    course: row.course,
    location: row.location,
    discoverable: row.discoverable,
    allowMessages: row.allow_messages,
    showInstitution: row.show_institution,
    showLocation: row.show_location,
  };
}

function hashSecret(value: string, salt: string) {
  return scryptSync(value, salt, 32).toString("hex");
}

function secretMatches(value: string, salt: string, hash: string) {
  const next = Buffer.from(hashSecret(value, salt), "hex");
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sixDigit() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

async function issueCode(email: string) {
  const sql = await getSql();
  const latest = await sql<{ created_at: string }>`
    select created_at from unibud_auth_codes where email = ${email} and purpose = ${"verify"}
    order by created_at desc limit 1`;
  const last = latest[0] ? new Date(latest[0].created_at).getTime() : null;
  const gate = canResend(last, Date.now());
  if (!gate.ok) return { ok: false as const, error: gate.error, waitMs: gate.waitMs };
  const code = sixDigit();
  const salt = randomBytes(16).toString("hex");
  const expires = new Date(Date.now() + CODE_TTL_MS);
  await sql`update unibud_auth_codes set used_at = now() where email = ${email} and purpose = ${"verify"} and used_at is null`;
  await sql`insert into unibud_auth_codes (id, email, purpose, code_hash, salt, expires_at, attempts)
    values (${crypto.randomUUID()}, ${email}, ${"verify"}, ${hashSecret(code, salt)}, ${salt}, ${expires.toISOString()}, ${0})`;
  const delivery = await deliverMail({
    to: email,
    subject: "Your UNIBUD verification code",
    text: `Your UNIBUD verification code is ${code}. It expires in 10 minutes. If you did not create an account, ignore this message.`,
  });
  return {
    ok: true as const,
    delivery,
    retryAt: Date.now() + 60_000,
    ...(delivery === "unavailable" ? { code } : {}),
  };
}

export const prepareRegistration = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: RegistrationInput) => input)
  .handler(async ({ context, data }) => {
    const errors = registrationErrors(data);
    if (errors.length) return { ok: false as const, error: errors[0] };
    const username = cleanUsername(data.username);
    const email = data.email.trim().toLowerCase();
    const sql = await getSql();
    const owner = context.userId ?? "";
    const nameTaken = await sql<{ user_id: string }>`
      select user_id from unibud_accounts where lower(username) = ${username} and user_id <> ${owner} limit 1`;
    if (nameTaken.length) return { ok: false as const, error: "That username is taken." };
    const emailTaken = await sql<{ id: string }>`
      select id from "user" where lower(email) = ${email} and id <> ${owner} limit 1`;
    if (emailTaken.length) return { ok: false as const, error: "That email is already registered." };
    return { ok: true as const, username, email };
  });

export const finalizeRegistration = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: RegistrationInput) => input)
  .handler(async ({ context, data }) => {
    const errors = registrationErrors(data);
    if (errors.length) return { ok: false as const, error: errors[0] };
    const username = cleanUsername(data.username);
    const email = data.email.trim().toLowerCase();
    const sql = await getSql();
    const existing = await sql<AccountRow>`select * from unibud_accounts where user_id = ${context.userId} limit 1`;
    if (existing[0]?.status === "suspended") return { ok: false as const, error: "This account is suspended." };
    if (existing[0]?.status === "complete" || existing[0]?.status === "incomplete") {
      return { ok: true as const, status: existing[0].status, delivery: "sent" as const };
    }
    const nameTaken = await sql<{ user_id: string }>`
      select user_id from unibud_accounts where lower(username) = ${username} and user_id <> ${context.userId} limit 1`;
    if (nameTaken.length) return { ok: false as const, error: "That username is taken." };
    const emailTaken = await sql<{ id: string }>`
      select id from "user" where lower(email) = ${email} and id <> ${context.userId} limit 1`;
    if (emailTaken.length) return { ok: false as const, error: "That email is already registered." };
    const credential = await sql<{ id: string }>`
      select id from "account" where "userId" = ${context.userId} and "providerId" = ${"credential"} limit 1`;
    if (!credential.length) {
      const issues = passwordIssues(data.password);
      if (issues.length) return { ok: false as const, error: issues[0] };
      const password = await hashPassword(data.password);
      await sql`insert into "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
        values (${crypto.randomUUID()}, ${context.userId}, ${"credential"}, ${context.userId}, ${password}, now(), now())`;
    }
    await sql`update "user" set email = ${email}, name = ${`${data.firstName.trim()} ${data.lastName.trim()}`}, "emailVerified" = false, "updatedAt" = now()
      where id = ${context.userId}`;
    if (!existing[0]) {
      await sql`insert into unibud_accounts (
        user_id, first_name, last_name, username, email, terms_accepted_at, status, setup_step
      ) values (
        ${context.userId}, ${data.firstName.trim()}, ${data.lastName.trim()}, ${username}, ${email}, now(), ${"unverified"}, ${"photo"}
      )`;
    }
    const issued = await issueCode(email);
    if (!issued.ok) return issued;
    return { ok: true as const, status: "unverified" as const, delivery: issued.delivery, code: issued.code, retryAt: issued.retryAt };
  });

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<AccountRow>`select * from unibud_accounts where user_id = ${context.userId} limit 1`;
    return rows[0] ? mapAccount(rows[0]) : null;
  });

export const verifyEmailCode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string }) => input)
  .handler(async ({ context, data }) => {
    const code = data.code.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) return { ok: false as const, error: "Enter the 6-digit code." };
    const sql = await getSql();
    const accounts = await sql<AccountRow>`select * from unibud_accounts where user_id = ${context.userId} limit 1`;
    const account = accounts[0];
    if (!account) return { ok: false as const, error: "Create an account first." };
    if (account.status === "suspended") return { ok: false as const, error: "This account is suspended." };
    if (account.status !== "unverified") return { ok: true as const, status: account.status };
    const rows = await sql<{ code_hash: string; salt: string; expires_at: string; attempts: number; used_at: string | null }>`
      select code_hash, salt, expires_at, attempts, used_at from unibud_auth_codes
      where email = ${account.email} and purpose = ${"verify"}
      order by created_at desc limit 1`;
    const row = rows[0];
    if (!row) return { ok: false as const, error: "Send a new code." };
    const decision = judgeCode({
      matches: secretMatches(code, row.salt, row.code_hash),
      expiresAt: new Date(row.expires_at).getTime(),
      now: Date.now(),
      attempts: row.attempts,
      used: Boolean(row.used_at),
    });
    if (!decision.ok) {
      if (!decision.lock) {
        const next = row.attempts + 1;
        await sql`update unibud_auth_codes set attempts = ${next} where email = ${account.email} and purpose = ${"verify"} and used_at is null`;
        if (next >= MAX_CODE_ATTEMPTS) return { ok: false as const, error: "Too many attempts. Send a new code." };
      }
      return { ok: false as const, error: decision.error };
    }
    await sql`update unibud_auth_codes set used_at = now() where email = ${account.email} and purpose = ${"verify"} and used_at is null`;
    await sql`update unibud_accounts set status = ${"incomplete"}, setup_step = ${"photo"}, updated_at = now() where user_id = ${context.userId}`;
    await sql`update "user" set "emailVerified" = true, "updatedAt" = now() where id = ${context.userId}`;
    return { ok: true as const, status: "incomplete" as const };
  });

export const resendEmailCode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const accounts = await sql<{ email: string; status: string }>`select email, status from unibud_accounts where user_id = ${context.userId} limit 1`;
    if (!accounts[0]) return { ok: false as const, error: "Create an account first." };
    if (accounts[0].status !== "unverified") return { ok: false as const, error: "This email is already verified." };
    return issueCode(accounts[0].email);
  });

export const saveSetup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    step: SetupStep;
    photoUrl?: string;
    bio?: string;
    interests?: string[];
    institution?: string;
    course?: string;
    location?: string;
    discoverable?: boolean;
    allowMessages?: boolean;
    showInstitution?: boolean;
    showLocation?: boolean;
    finish?: boolean;
  }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<AccountRow>`select * from unibud_accounts where user_id = ${context.userId} limit 1`;
    const account = rows[0] ? mapAccount(rows[0]) : null;
    if (!account) return { ok: false as const, error: "Create an account first." };
    if (account.status === "suspended") return { ok: false as const, error: "This account is suspended." };
    if (account.status === "unverified") return { ok: false as const, error: "Verify your email first." };
    const incomingPhoto = (data.photoUrl ?? "").trim();
    const photoUrl = (incomingPhoto || account.photoUrl).slice(0, 400_000);
    const bio = (data.bio ?? account.bio).trim().slice(0, 280);
    const interests = interestsList(data.interests ? data.interests.join(",") : account.interests).join(", ");
    const institution = (data.institution ?? account.institution).trim().slice(0, 80);
    const course = (data.course ?? account.course).trim().slice(0, 80);
    const location = (data.location ?? account.location).trim().slice(0, 80);
    const discoverable = data.discoverable ?? account.discoverable;
    const allowMessages = data.allowMessages ?? account.allowMessages;
    const showInstitution = data.showInstitution ?? account.showInstitution;
    const showLocation = data.showLocation ?? account.showLocation;
    if (data.step === "bio" && bio.length < 1) return { ok: false as const, error: "Add a short biography." };
    if (data.step === "interests" && interestsList(interests).length < 1) {
      return { ok: false as const, error: "Choose at least one interest." };
    }
    if (data.finish) {
      if (!photoUrl || bio.length < 1 || interestsList(interests).length < 1) {
        return { ok: false as const, error: "Finish your photo, biography, and interests first." };
      }
      await sql`update unibud_accounts set
        photo_url = ${photoUrl}, bio = ${bio}, interests = ${interests}, institution = ${institution}, course = ${course},
        location = ${location}, discoverable = ${discoverable}, allow_messages = ${allowMessages},
        show_institution = ${showInstitution}, show_location = ${showLocation},
        status = ${"complete"}, setup_step = ${"preview"}, updated_at = now()
        where user_id = ${context.userId}`;
      await sql`insert into connect_profiles (
        user_id, display_name, handle, bio, institution, course, location, interests,
        show_institution, show_location, show_interests, discoverable, allow_messages, verified
      ) values (
        ${context.userId}, ${`${account.firstName} ${account.lastName}`}, ${account.username}, ${bio}, ${institution}, ${course},
        ${location}, ${interests}, ${showInstitution}, ${showLocation}, ${true}, ${discoverable}, ${allowMessages}, ${false}
      ) on conflict (user_id) do update set
        display_name = excluded.display_name, handle = excluded.handle, bio = excluded.bio,
        institution = excluded.institution, course = excluded.course, location = excluded.location,
        interests = excluded.interests, show_institution = excluded.show_institution,
        show_location = excluded.show_location, discoverable = excluded.discoverable,
        allow_messages = excluded.allow_messages, verified = false, updated_at = now()`;
      return { ok: true as const, status: "complete" as const, setupStep: "preview" as const };
    }
    const setupStep = nextSetupStep(data.step);
    await sql`update unibud_accounts set
      photo_url = ${photoUrl}, bio = ${bio}, interests = ${interests}, institution = ${institution}, course = ${course},
      location = ${location}, discoverable = ${discoverable}, allow_messages = ${allowMessages},
      show_institution = ${showInstitution}, show_location = ${showLocation},
      status = ${"incomplete"}, setup_step = ${setupStep}, updated_at = now()
      where user_id = ${context.userId}`;
    return { ok: true as const, status: "incomplete" as const, setupStep };
  });

export const resolveLogin = createServerFn({ method: "POST" })
  .validator((input: { identifier: string }) => input)
  .handler(async ({ data }) => {
    const identifier = data.identifier.trim().toLowerCase();
    if (!identifier) return { ok: false as const, error: "Enter your email or username." };
    const sql = await getSql();
    const rows = await sql<{ email: string; status: AccountStatus }>`
      select email, status from unibud_accounts
      where lower(email) = ${identifier} or lower(username) = ${identifier}
      limit 1`;
    if (!rows[0]) return { ok: false as const, error: "Incorrect email, username, or password." };
    if (rows[0].status === "suspended") return { ok: false as const, error: "This account is suspended." };
    return { ok: true as const, email: rows[0].email, status: rows[0].status };
  });

export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator((input: { email: string }) => input)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!validEmail(email)) return { ok: false as const, error: "Enter the email on your account." };
    const sql = await getSql();
    const rows = await sql<{ email: string; status: string }>`
      select email, status from unibud_accounts where lower(email) = ${email} limit 1`;
    if (!rows[0] || rows[0].status === "suspended") {
      return { ok: true as const, delivery: "sent" as const };
    }
    const token = randomBytes(32).toString("base64url");
    const expires = new Date(Date.now() + RESET_TTL_MS);
    await sql`update unibud_reset_tokens set used_at = now() where email = ${email} and used_at is null`;
    await sql`insert into unibud_reset_tokens (id, email, token_hash, expires_at)
      values (${crypto.randomUUID()}, ${email}, ${hashToken(token)}, ${expires.toISOString()})`;
    const delivery = await deliverMail({
      to: email,
      subject: "Reset your UNIBUD password",
      text: `Use this one-time link to choose a new UNIBUD password. It expires in 30 minutes and works once: /reset/${token}`,
    });
    return {
      ok: true as const,
      delivery,
      ...(delivery === "unavailable" ? { token } : {}),
    };
  });

export const resetPassword = createServerFn({ method: "POST" })
  .validator((input: { token: string; password: string; confirm: string }) => input)
  .handler(async ({ data }) => {
    const issues = passwordIssues(data.password);
    if (issues.length) return { ok: false as const, error: issues[0] };
    if (data.password !== data.confirm) return { ok: false as const, error: "Passwords do not match." };
    const sql = await getSql();
    const rows = await sql<{ email: string; expires_at: string; used_at: string | null }>`
      select email, expires_at, used_at from unibud_reset_tokens where token_hash = ${hashToken(data.token)} limit 1`;
    const row = rows[0];
    if (!row) return { ok: false as const, error: "This reset link is not valid." };
    const decision = judgeReset({
      used: Boolean(row.used_at),
      expiresAt: new Date(row.expires_at).getTime(),
      now: Date.now(),
    });
    if (!decision.ok) return decision;
    const people = await sql<{ user_id: string }>`select user_id from unibud_accounts where email = ${row.email} limit 1`;
    if (!people[0]) return { ok: false as const, error: "This reset link is not valid." };
    const password = await hashPassword(data.password);
    const updated = await sql`update "account" set "password" = ${password}, "updatedAt" = now()
      where "userId" = ${people[0].user_id} and "providerId" = ${"credential"} returning id`;
    if (!updated.length) return { ok: false as const, error: "This account has no password to reset." };
    await sql`update unibud_reset_tokens set used_at = now() where token_hash = ${hashToken(data.token)}`;
    await sql`delete from "session" where "userId" = ${people[0].user_id}`;
    return { ok: true as const };
  });
