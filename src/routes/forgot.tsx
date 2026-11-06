import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AccountAlert, AccountButton, AccountField, AccountFrame } from "@/components/account/frame";
import { requestPasswordReset } from "@/lib/account/server";

export const Route = createFileRoute("/forgot")({ component: Forgot });

function Forgot() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await requestPasswordReset({ data: { email } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
      setToken("token" in result && result.token ? result.token : "");
    } catch {
      setError("The reset could not be started.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountFrame kicker="Password" title="Reset your password" body="If the email is registered, a single-use link is prepared. It expires in 30 minutes.">
      {sent ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {token
              ? "Email delivery is not connected, so the one-time link is shown here. It will not work twice."
              : "If that email is registered, the reset link was sent. It will not work twice."}
          </p>
          {token ? (
            <Link to="/reset/$token" params={{ token }} className="block text-sm font-medium break-all">
              Open reset link
            </Link>
          ) : null}
          <Link to="/login" className="block text-sm text-muted-foreground">Back to log in</Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          <AccountField label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
          {error ? <AccountAlert>{error}</AccountAlert> : null}
          <AccountButton type="submit" disabled={busy || !email}>{busy ? "Preparing…" : "Send reset link"}</AccountButton>
        </form>
      )}
    </AccountFrame>
  );
}
