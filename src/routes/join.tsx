import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AccountAlert, AccountButton, AccountField, AccountFrame, PasswordHint } from "@/components/account/frame";
import { registrationErrors, type RegistrationInput } from "@/lib/account/domain";
import { finalizeRegistration, prepareRegistration } from "@/lib/account/server";
import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/join")({ component: Join });

const DRAFT = "unibud-join-draft";
const STEP = "unibud-join-step";
const HINT = "unibud-verify-hint";

const STEPS = ["name", "username", "email", "password", "terms"] as const;
const EMPTY: RegistrationInput = { firstName: "", lastName: "", username: "", email: "", password: "", confirm: "", terms: false };

function readDraft(): RegistrationInput {
  try {
    const saved = JSON.parse(sessionStorage.getItem(DRAFT) || "{}") as Partial<RegistrationInput>;
    return { ...EMPTY, ...saved, password: "", confirm: "", terms: false };
  } catch {
    return EMPTY;
  }
}

function readStep() {
  const raw = Number(sessionStorage.getItem(STEP) || "0");
  if (!Number.isInteger(raw)) return 0;
  return Math.min(STEPS.length - 1, Math.max(0, raw));
}

function Join() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RegistrationInput>(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const current = STEPS[step] ?? "name";

  useEffect(() => {
    setForm(readDraft());
    setStep(readStep());
  }, []);

  function patch(next: Partial<RegistrationInput>) {
    const value = { ...form, ...next };
    setForm(value);
    sessionStorage.setItem(DRAFT, JSON.stringify({ ...value, password: "", confirm: "", terms: false }));
  }

  function go(next: number) {
    const value = Math.min(STEPS.length - 1, Math.max(0, next));
    setStep(value);
    sessionStorage.setItem(STEP, String(value));
  }

  function forward() {
    setError("");
    if (current === "name" && (!form.firstName.trim() || !form.lastName.trim())) {
      setError("Enter your first and last name.");
      return;
    }
    if (current === "username" && registrationErrors({ ...form, password: "acceptable1", confirm: "acceptable1", terms: true }).some((item) => item.includes("Username"))) {
      setError("Usernames are 3–20 letters, numbers, or underscores.");
      return;
    }
    if (current === "email" && registrationErrors({ ...form, password: "acceptable1", confirm: "acceptable1", terms: true }).some((item) => item.includes("email"))) {
      setError("Enter a valid email address.");
      return;
    }
    if (current === "password") {
      const issues = registrationErrors({ ...form, terms: true }).filter((item) => item.includes("10") || item.includes("letter") || item.includes("number") || item.includes("match"));
      if (issues[0]) {
        setError(issues[0]);
        return;
      }
    }
    go(step + 1);
  }

  async function create() {
    setBusy(true);
    setError("");
    try {
      const ready = await prepareRegistration({ data: form });
      if (!ready.ok) {
        setError(ready.error);
        return;
      }
      const session = await authClient.getSession();
      if (!session.data?.user) {
        const { error: signUpError } = await authClient.signUp.email({
          email: ready.email,
          password: form.password,
          name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        });
        if (signUpError) {
          setError(signUpError.message || "That email is already registered.");
          return;
        }
      }
      await authClient.getSession();
      const created = await finalizeRegistration({ data: form });
      if (!created.ok) {
        setError(created.error);
        return;
      }
      const code = "code" in created ? created.code : undefined;
      if (code) sessionStorage.setItem(HINT, JSON.stringify({ code, retryAt: "retryAt" in created ? created.retryAt : Date.now() }));
      else sessionStorage.removeItem(HINT);
      sessionStorage.removeItem(DRAFT);
      sessionStorage.removeItem(STEP);
      await router.invalidate();
      await router.navigate({ to: "/verify" });
    } catch {
      setError("The account could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountFrame
      kicker="Create account"
      title={current === "name" ? "What should we call you?" : current === "username" ? "Choose a username" : current === "email" ? "Your email" : current === "password" ? "Choose a password" : "Terms"}
      body={current === "terms" ? "The account stays unverified until the email code is confirmed." : undefined}
      step={step + 1}
      steps={STEPS.length}
    >
      <div className="space-y-4">
        {current === "name" ? (
          <>
            <AccountField label="First name" value={form.firstName} onChange={(firstName) => patch({ firstName })} autoComplete="given-name" />
            <AccountField label="Last name" value={form.lastName} onChange={(lastName) => patch({ lastName })} autoComplete="family-name" />
          </>
        ) : null}
        {current === "username" ? (
          <AccountField label="Username" value={form.username} onChange={(username) => patch({ username })} autoComplete="username" placeholder="ada_o" />
        ) : null}
        {current === "email" ? (
          <AccountField label="Email" value={form.email} onChange={(email) => patch({ email })} type="email" autoComplete="email" />
        ) : null}
        {current === "password" ? (
          <>
            <AccountField label="Password" value={form.password} onChange={(password) => patch({ password })} type="password" autoComplete="new-password" />
            <PasswordHint password={form.password} />
            <AccountField label="Confirm password" value={form.confirm} onChange={(confirm) => patch({ confirm })} type="password" autoComplete="new-password" />
          </>
        ) : null}
        {current === "terms" ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-card p-4 text-sm leading-relaxed ring-1 ring-border">
              <p>A UNIBUD account is personal. Square, Connect, Quad, and Chat stay closed until this email is verified and the profile is finished.</p>
              <p className="mt-2">The password is stored only as a hash. There is no guest entry and no social sign-in.</p>
            </div>
            <label className="flex items-start gap-3 text-sm leading-relaxed">
              <input type="checkbox" className="mt-1 size-4" checked={form.terms} onChange={(event) => patch({ terms: event.target.checked })} />
              <span>I accept the UNIBUD terms and privacy policy.</span>
            </label>
          </div>
        ) : null}
        {error ? <AccountAlert>{error}</AccountAlert> : null}
        {current === "terms" ? (
          <AccountButton disabled={busy || !form.terms} onClick={() => void create()}>
            {busy ? "Creating…" : "Create account"}
          </AccountButton>
        ) : (
          <AccountButton onClick={forward}>Continue</AccountButton>
        )}
        {step > 0 ? (
          <button type="button" className="h-11 w-full text-sm text-muted-foreground" onClick={() => go(step - 1)}>
            Back
          </button>
        ) : null}
      </div>
    </AccountFrame>
  );
}
