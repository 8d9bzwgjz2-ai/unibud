import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AccountAlert, AccountButton, AccountField, AccountFrame, PasswordHint } from "@/components/account/frame";
import { resetPassword } from "@/lib/account/server";

export const Route = createFileRoute("/reset/$token")({ component: Reset });

function Reset() {
  const { token } = Route.useParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await resetPassword({ data: { token, password, confirm } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
      window.setTimeout(() => {
        void router.navigate({ to: "/login" });
      }, 900);
    } catch {
      setError("The password could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountFrame kicker="Password" title={done ? "Password updated" : "Choose a new password"} body={done ? "Log in with the new password. The reset link is now used." : "This link works once."}>
      {done ? (
        <Link to="/login" className="text-sm font-medium">Go to log in</Link>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          <AccountField label="New password" value={password} onChange={setPassword} type="password" autoComplete="new-password" />
          <PasswordHint password={password} />
          <AccountField label="Confirm password" value={confirm} onChange={setConfirm} type="password" autoComplete="new-password" />
          {error ? <AccountAlert>{error}</AccountAlert> : null}
          <AccountButton type="submit" disabled={busy}>{busy ? "Saving…" : "Update password"}</AccountButton>
        </form>
      )}
    </AccountFrame>
  );
}
