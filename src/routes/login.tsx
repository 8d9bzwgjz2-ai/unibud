import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AccountAlert, AccountButton, AccountField, AccountFrame } from "@/components/account/frame";
import { routeForAccount } from "@/lib/account/domain";
import { resolveLogin } from "@/lib/account/server";
import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const resolved = await resolveLogin({ data: { identifier } });
      if (!resolved.ok) {
        setError(resolved.error);
        return;
      }
      const { error: signInError } = await authClient.signIn.email({ email: resolved.email, password });
      if (signInError) {
        setError("Incorrect email, username, or password.");
        return;
      }
      await authClient.getSession();
      await router.invalidate();
      await router.navigate({ to: routeForAccount(resolved.status) });
    } catch {
      setError("Sign-in could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountFrame kicker="Returning" title="Log in" body="Use the email or username on your UNIBUD account.">
      <form className="space-y-4" onSubmit={onSubmit}>
        <AccountField label="Email or username" value={identifier} onChange={setIdentifier} autoComplete="username" />
        <AccountField label="Password" value={password} onChange={setPassword} type="password" autoComplete="current-password" />
        <Link to="/forgot" className="block text-sm font-medium">
          Forgot password
        </Link>
        {error ? <AccountAlert>{error}</AccountAlert> : null}
        <AccountButton type="submit" disabled={busy || !identifier || !password}>
          {busy ? "Checking…" : "Log in"}
        </AccountButton>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        New here? <Link to="/onboarding" className="font-medium text-foreground">Create an account</Link>
      </p>
    </AccountFrame>
  );
}
