import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AccountAlert, AccountButton, AccountFrame } from "@/components/account/frame";
import { getMyAccount, resendEmailCode, verifyEmailCode } from "@/lib/account/server";
import { useSettledUser } from "@/lib/account/use-settled-user";
import { Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/verify")({ component: Verify });

const HINT = "unibud-verify-hint";

function Verify() {
  const router = useRouter();
  const { user, waiting } = useSettledUser();
  const account = useQuery({
    queryKey: ["unibud-account", user?.id],
    queryFn: () => getMyAccount(),
    enabled: !waiting && Boolean(user),
  });
  const [code, setCode] = useState("");
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(HINT) || "{}") as { code?: string; retryAt?: number };
      if (saved.code) setHint(saved.code);
      if (saved.retryAt) setWait(Math.max(0, saved.retryAt - Date.now()));
    } catch {
      /* ignore a bad hint */
    }
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setInterval(() => setWait((value) => Math.max(0, value - 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [wait]);

  if (waiting) return <AccountFrame kicker="Verification" title="Enter the code" body="Checking your account." />;
  if (!user) return <Navigate to="/login" />;
  if (account.data && account.data.status !== "unverified") {
    return <Navigate to={account.data.status === "complete" ? "/" : account.data.status === "suspended" ? "/suspended" : "/setup"} />;
  }

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const result = await verifyEmailCode({ data: { code } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await account.refetch();
      sessionStorage.removeItem(HINT);
      await router.invalidate();
      await router.navigate({ to: "/setup" });
    } catch {
      setError("Verification could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError("");
    try {
      const result = await resendEmailCode();
      if (!result.ok) {
        setError(result.error);
        if ("waitMs" in result && result.waitMs) setWait(result.waitMs);
        return;
      }
      setNote(result.delivery === "sent" ? "A new code was sent." : "Email delivery is not connected. A new code is shown here.");
      if (result.code) {
        setHint(result.code);
        sessionStorage.setItem(HINT, JSON.stringify({ code: result.code, retryAt: result.retryAt }));
      }
      if (result.retryAt) setWait(Math.max(0, result.retryAt - Date.now()));
    } catch {
      setError("A new code could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountFrame
      kicker="Verification"
      title="Enter the code"
      body={account.data ? `Six digits for ${account.data.email}. The code expires in 10 minutes.` : "Six digits from your email."}
    >
      <input
        value={code}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        aria-label="Verification code"
        onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
        className="h-14 w-full rounded-2xl bg-card text-center font-display text-3xl tracking-[0.4em] ring-1 ring-border outline-none"
      />
      {hint ? (
        <div className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-border">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Email delivery is not connected. Your code is only on this device.
          </p>
          <div className="mt-3 grid grid-cols-6 gap-2" aria-label="Your verification code">
            {hint.split("").map((digit, index) => (
              <span key={`${digit}-${index}`} className="grid h-12 place-items-center rounded-xl bg-secondary font-display text-2xl">
                {digit}
              </span>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="h-11 rounded-full text-sm ring-1 ring-border" onClick={() => setCode(hint)}>
              Use this code
            </button>
            <button
              type="button"
              className="h-11 rounded-full text-sm ring-1 ring-border"
              onClick={() => {
                void navigator.clipboard?.writeText(hint).then(
                  () => setNote("Code copied."),
                  () => setNote("Copy is unavailable. Use the code above."),
                );
              }}
            >
              Copy code
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">If the message arrived, it will not be repeated here.</p>
      )}
      {note ? <p className="mt-3 text-sm text-muted-foreground">{note}</p> : null}
      {error ? <AccountAlert>{error}</AccountAlert> : null}
      <div className="mt-6 space-y-3">
        <AccountButton disabled={busy || code.length !== 6} onClick={() => void confirm()}>
          {busy ? "Checking…" : "Verify email"}
        </AccountButton>
        <button type="button" className="h-11 w-full text-sm text-muted-foreground disabled:opacity-50" disabled={busy || wait > 0} onClick={() => void resend()}>
          {wait > 0 ? `Resend in ${Math.ceil(wait / 1000)}s` : "Resend code"}
        </button>
      </div>
    </AccountFrame>
  );
}
