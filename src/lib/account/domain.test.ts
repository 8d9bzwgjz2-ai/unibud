import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canResend,
  cleanUsername,
  judgeCode,
  judgeReset,
  passwordIssues,
  registrationErrors,
  routeForAccount,
  validEmail,
} from "./domain.ts";

const valid = {
  firstName: "Ada",
  lastName: "Okonkwo",
  username: "ada_o",
  email: "ada@uni.test",
  password: "correcthorse1",
  confirm: "correcthorse1",
  terms: true,
};

describe("registration", () => {
  it("accepts a complete registration", () => {
    assert.deepEqual(registrationErrors(valid), []);
  });

  it("rejects a duplicate-style invalid email, a weak password, and a mismatch", () => {
    assert.equal(validEmail("not-an-email"), false);
    assert.ok(passwordIssues("short1").some((issue) => issue.includes("10")));
    assert.ok(passwordIssues("longpassword").some((issue) => issue.includes("number")));
    const errors = registrationErrors({ ...valid, email: "ada", password: "short1", confirm: "other-pass-1" });
    assert.ok(errors.some((error) => error.includes("email")));
    assert.ok(errors.some((error) => error.includes("10")));
    assert.ok(errors.some((error) => error.includes("match")));
  });

  it("rejects a missing terms acceptance and a bad username", () => {
    const errors = registrationErrors({ ...valid, username: "ab", terms: false });
    assert.ok(errors.some((error) => error.includes("Username")));
    assert.ok(errors.some((error) => error.includes("terms")));
    assert.equal(cleanUsername("Ada O!"), "adao");
  });
});

describe("verification", () => {
  const now = 1_000_000;

  it("accepts a matching unexpired code", () => {
    assert.equal(judgeCode({ matches: true, expiresAt: now + 1000, now, attempts: 0, used: false }).ok, true);
  });

  it("rejects an expired code and a used code", () => {
    const expired = judgeCode({ matches: true, expiresAt: now - 1, now, attempts: 0, used: false });
    const used = judgeCode({ matches: true, expiresAt: now + 1000, now, attempts: 0, used: true });
    assert.equal(expired.ok, false);
    assert.equal(used.ok, false);
    if (!expired.ok) assert.match(expired.error, /expired/);
    if (!used.ok) assert.match(used.error, /already been used/);
  });

  it("locks after the attempt limit and allows a resend only after the cooldown", () => {
    const locked = judgeCode({ matches: false, expiresAt: now + 1000, now, attempts: 5, used: false });
    assert.equal(locked.ok, false);
    if (!locked.ok) assert.match(locked.error, /Too many/);
    assert.equal(canResend(now - 10_000, now).ok, false);
    assert.equal(canResend(now - 60_000, now).ok, true);
    assert.equal(canResend(null, now).ok, true);
  });
});

describe("reset and routing", () => {
  it("rejects a used or expired reset link", () => {
    const used = judgeReset({ used: true, expiresAt: 20, now: 10 });
    const expired = judgeReset({ used: false, expiresAt: 10, now: 10 });
    assert.equal(used.ok, false);
    assert.equal(expired.ok, false);
    if (!used.ok) assert.match(used.error, /already been used/);
    if (!expired.ok) assert.match(expired.error, /expired/);
    assert.equal(judgeReset({ used: false, expiresAt: 20, now: 10 }).ok, true);
  });

  it("sends each account state to its own place and never into the app early", () => {
    assert.equal(routeForAccount(null), "/join");
    assert.equal(routeForAccount("unverified"), "/verify");
    assert.equal(routeForAccount("incomplete"), "/setup");
    assert.equal(routeForAccount("suspended"), "/suspended");
    assert.equal(routeForAccount("complete"), "/");
  });
});
