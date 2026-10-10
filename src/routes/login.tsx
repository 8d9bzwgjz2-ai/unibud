import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/brand/logo";
import { useCampusStore } from "@/lib/unibud/campus-store";

export const Route = createFileRoute("/login")({ component: Login });

function ProviderMark({ id }: { id: string }) {
  if (id.includes("google")) {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    );
  }
  if (id.includes("apple")) {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path
          fill="currentColor"
          d="M16.37 12.62c-.03-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.63-1.71-3.19-1.73-1.36-.14-2.65.8-3.34.8-.69 0-1.76-.78-2.9-.76-1.49.02-2.86.87-3.62 2.2-1.55 2.68-.4 6.64 1.11 8.81.74 1.06 1.62 2.25 2.77 2.21 1.12-.05 1.54-.71 2.89-.71s1.73.71 2.91.69c1.2-.02 1.96-1.08 2.69-2.15.85-1.23 1.2-2.43 1.22-2.49-.03-.01-2.33-.89-2.36-3.56zM14.5 6.9c.61-.74 1.03-1.77.91-2.8-.88.04-1.95.59-2.58 1.33-.57.66-1.06 1.72-.93 2.73.98.08 1.99-.5 2.6-1.26z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M18.24 4H21l-6.53 7.46L22 20h-5.5l-4.3-5.62L7.3 20H4.53l6.98-7.98L2.5 4h5.64l3.88 5.16L18.24 4zm-.96 14.4h1.53L7.3 5.52H5.66l11.62 12.88z"
      />
    </svg>
  );
}

function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || "Student",
        });
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) throw new Error(err.message);
      }
      await authClient.getSession();
      await router.invalidate();
      const done = useCampusStore.getState().onboardingDone;
      await router.navigate({ to: done ? "/" : "/welcome" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-black lg:block">
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link to="/" className="block max-w-[9rem]">
            <Wordmark size="sm" />
          </Link>
          <div className="max-w-md">
            <p className="kicker">UNIBUD</p>
            <h1 className="mt-3 font-display text-4xl font-medium text-paper">
              Where people, ideas and discovery meet.
            </h1>
            <p className="mt-4 text-sm text-paper/70">
              Social, learning, culture, and a quiet assistant named Bud. Wallet money here is a demo
              ledger. No real naira moves.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <Link to="/" className="mb-10 lg:hidden">
          <Wordmark size="sm" />
        </Link>
        <h2 className="font-display text-3xl font-medium">Sign in</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Use a campus account. Your wallet, chats, and semester stay on this device’s session.
        </p>

        {authEnabled ? (
          // The federated broker is deployed-only; staging (VITE_AUTH_BROKER=false)
          // signs in with this app's own email/password accounts.
          import.meta.env.VITE_AUTH_BROKER === "false" ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Sign in with your UNIBUD email and password.
            </p>
          ) : (
            <div className="mt-8 space-y-3">
              {GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => signIn(p.providerId, { callbackURL: "/welcome" })}
                >
                  <ProviderMark id={p.providerId} />
                  Continue with {p.label}
                </Button>
              ))}
            </div>
          )
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">Sign-in is disabled.</p>
        )}

        {import.meta.env.VITE_AUTH_BROKER === "false" ? null : (
          <div className="my-8 flex items-center gap-3 text-xs tracking-wide text-muted-foreground uppercase">
            <span className="h-px flex-1 bg-border" />
            or email
            <span className="h-px flex-1 bg-border" />
          </div>
        )}

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("in")}
            className={mode === "in" ? "text-sm font-medium" : "text-sm text-muted-foreground"}
          >
            Sign in
          </button>
          <span className="text-muted-foreground">/</span>
          <button
            type="button"
            onClick={() => setMode("up")}
            className={mode === "up" ? "text-sm font-medium" : "text-sm text-muted-foreground"}
          >
            Create account
          </button>
        </div>

        <form onSubmit={onEmail} className="space-y-3">
          {mode === "up" ? (
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Adaeze"
                autoComplete="name"
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@outlook.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Working…" : mode === "up" ? "Create account" : "Sign in"}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Verification goes to your email (Outlook or campus mail).
          </p>
        </form>
      </section>
    </main>
  );
}
