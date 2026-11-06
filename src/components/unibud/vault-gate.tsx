import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInCard, useAuthReady } from "@/components/unibud/sign-in-gate";
import {
  saveVaultPasskey,
  setVaultPin,
  vaultPasskeyChallenge,
  vaultStatus,
  verifyVaultPasskey,
  verifyVaultPin,
} from "@/lib/vault/server";
import { cn } from "@/lib/utils";

const SESSION_KEY = "unibud-vault-open";

function sessionOpen() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markOpen() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

function b64urlToBuf(s: string) {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function bufToB64url(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function VaultGate({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { user, isPending } = useAuthReady();
  const [ready, setReady] = useState(sessionOpen);
  const [hasPin, setHasPin] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [pin, setPin] = useState("");
  const [mode, setMode] = useState<"setup" | "unlock">("unlock");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || ready) return;
    void vaultStatus().then((s) => {
      setHasPin(s.hasPin);
      setHasPasskey(s.hasPasskey);
      setMode(s.hasPin ? "unlock" : "setup");
    });
  }, [user, ready]);

  if (isPending) return <div className="m-4 h-48 animate-pulse rounded-3xl bg-secondary" />;
  if (!user) {
    return (
      <main className="px-4 py-8 md:px-6">
        <h1 className="text-2xl font-medium">{title}</h1>
        <div className="mt-6">
          <SignInCard
            title="Sign in first"
            body="Wallet and Marketplace sit behind your account, then a 4-digit passcode."
          />
        </div>
      </main>
    );
  }
  if (ready) return <>{children}</>;

  function tap(d: string) {
    setError(null);
    setPin((p) => (p.length >= 4 ? p : p + d));
  }

  async function submitPin() {
    if (pin.length !== 4) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "setup") await setVaultPin({ data: { pin } });
      else await verifyVaultPin({ data: { pin } });
      markOpen();
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unlock");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  async function registerKey() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const { challenge } = await vaultPasskeyChallenge();
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge: b64urlToBuf(challenge),
          rp: { name: "UNIBUD", id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(user.id),
            name: user.primaryEmail ?? "student",
            displayName: user.displayName ?? "Student",
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: { userVerification: "required", residentKey: "preferred" },
          timeout: 60_000,
        },
      })) as PublicKeyCredential | null;
      if (!cred) throw new Error("Passkey was cancelled.");
      await saveVaultPasskey({ data: { credentialId: bufToB64url(cred.rawId) } });
      setHasPasskey(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Passkey not available on this device.");
    } finally {
      setBusy(false);
    }
  }

  async function unlockKey() {
    setBusy(true);
    setError(null);
    try {
      const { challenge } = await vaultPasskeyChallenge();
      const cred = (await navigator.credentials.get({
        publicKey: {
          challenge: b64urlToBuf(challenge),
          userVerification: "required",
          timeout: 60_000,
        },
      })) as PublicKeyCredential | null;
      if (!cred) throw new Error("Passkey was cancelled.");
      await verifyVaultPasskey({ data: { credentialId: bufToB64url(cred.rawId) } });
      markOpen();
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Passkey failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-sm flex-col justify-center px-5">
      <p className="kicker">Protected</p>
      <h1 className="mt-2 font-display text-3xl">{mode === "setup" ? "Set a passcode" : `Unlock ${title}`}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "setup"
          ? "Four digits. This locks Wallet and Marketplace on this account. Demo money still never leaves UNIBUD."
          : "Enter your 4-digit passcode, or use a passkey."}
      </p>
      <div className="mt-8 flex justify-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "size-3 rounded-full",
              pin.length > i ? "bg-ink" : "bg-border",
            )}
          />
        ))}
      </div>
      <div className="mx-auto mt-8 grid w-56 grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"].map((d) => (
          <button
            key={d}
            type="button"
            disabled={busy}
            className="grid h-14 place-items-center rounded-full text-lg font-medium hover:bg-secondary"
            onClick={() => {
              if (d === "⌫") setPin((p) => p.slice(0, -1));
              else if (d === "OK") void submitPin();
              else tap(d);
            }}
          >
            {d}
          </button>
        ))}
      </div>
      {error ? <p className="mt-4 text-center text-sm text-destructive">{error}</p> : null}
      {hasPasskey ? (
        <Button variant="outline" className="mt-6 w-full" disabled={busy} onClick={() => void unlockKey()}>
          <Fingerprint className="size-4" />
          Unlock with passkey
        </Button>
      ) : (
        <Button variant="ghost" className="mt-6 w-full" disabled={busy} onClick={() => void registerKey()}>
          <Fingerprint className="size-4" />
          Add a passkey
        </Button>
      )}
    </main>
  );
}
