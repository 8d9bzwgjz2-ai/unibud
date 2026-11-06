/** Account rules for UNIBUD sign-up, verification, and entry. No people are invented here. */

export const MIN_PASSWORD = 10;
export const CODE_TTL_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;
export const RESET_TTL_MS = 30 * 60 * 1000;

export const SETUP_STEPS = ["photo", "bio", "interests", "education", "location", "privacy", "preview"] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];
export type AccountStatus = "unverified" | "incomplete" | "complete" | "suspended";

export type UnibudAccount = {
  userId: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  status: AccountStatus;
  setupStep: SetupStep;
  bio: string;
  photoUrl: string;
  interests: string;
  institution: string;
  course: string;
  location: string;
  discoverable: boolean;
  allowMessages: boolean;
  showInstitution: boolean;
  showLocation: boolean;
};

export type RegistrationInput = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  confirm: string;
  terms: boolean;
};

export function cleanUsername(raw: string) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
}

export function validEmail(email: string) {
  const value = email.trim().toLowerCase();
  return value.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function passwordIssues(password: string) {
  const issues: string[] = [];
  if (password.length < MIN_PASSWORD) issues.push("Use at least 10 characters.");
  if (!/[a-zA-Z]/.test(password)) issues.push("Include a letter.");
  if (!/\d/.test(password)) issues.push("Include a number.");
  return issues;
}

export function passwordStrength(password: string): "empty" | "weak" | "okay" | "strong" {
  if (!password) return "empty";
  if (passwordIssues(password).length) return "weak";
  if (password.length >= 14 && /[^A-Za-z0-9]/.test(password)) return "strong";
  return "okay";
}

export function registrationErrors(input: RegistrationInput) {
  const errors: string[] = [];
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (firstName.length < 1 || firstName.length > 40) errors.push("Enter your first name.");
  if (lastName.length < 1 || lastName.length > 40) errors.push("Enter your last name.");
  const username = cleanUsername(input.username);
  if (username.length < 3 || username !== input.username.trim().toLowerCase()) {
    errors.push("Usernames are 3–20 letters, numbers, or underscores.");
  }
  if (!validEmail(input.email)) errors.push("Enter a valid email address.");
  errors.push(...passwordIssues(input.password));
  if (input.password !== input.confirm) errors.push("Passwords do not match.");
  if (!input.terms) errors.push("Accept the terms and privacy policy to create an account.");
  return errors;
}

export function judgeCode(input: {
  matches: boolean;
  expiresAt: number;
  now: number;
  attempts: number;
  used: boolean;
}) {
  if (input.used) return { ok: false as const, error: "That code has already been used.", lock: true };
  if (input.now >= input.expiresAt) return { ok: false as const, error: "That code has expired.", lock: true };
  if (input.attempts >= MAX_CODE_ATTEMPTS) {
    return { ok: false as const, error: "Too many attempts. Send a new code.", lock: true };
  }
  if (!input.matches) return { ok: false as const, error: "That code is not correct.", lock: false };
  return { ok: true as const };
}

export function canResend(lastSentAt: number | null, now: number) {
  if (lastSentAt == null) return { ok: true as const, waitMs: 0 };
  const waitMs = RESEND_COOLDOWN_MS - (now - lastSentAt);
  if (waitMs > 0) return { ok: false as const, error: "Wait before sending another code.", waitMs };
  return { ok: true as const, waitMs: 0 };
}

export function judgeReset(input: { used: boolean; expiresAt: number; now: number }) {
  if (input.used) return { ok: false as const, error: "This reset link has already been used." };
  if (input.now >= input.expiresAt) return { ok: false as const, error: "This reset link has expired." };
  return { ok: true as const };
}

/** Where a signed-in person should be. Complete accounts stay on the app. */
export function routeForAccount(status: AccountStatus | null): "/join" | "/verify" | "/setup" | "/suspended" | "/" {
  if (!status) return "/join";
  if (status === "suspended") return "/suspended";
  if (status === "unverified") return "/verify";
  if (status === "incomplete") return "/setup";
  return "/";
}

export function nextSetupStep(step: SetupStep): SetupStep {
  const index = SETUP_STEPS.indexOf(step);
  return SETUP_STEPS[Math.min(SETUP_STEPS.length - 1, index + 1)] ?? "preview";
}

export function interestsList(raw: string) {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}
