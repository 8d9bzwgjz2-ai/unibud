import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, ShieldCheck, UserRoundX, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ProductLockup } from "@/components/brand/product-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/unibud/empty";
import { SignInCard, useAuthReady } from "@/components/unibud/sign-in-gate";
import {
  SOULYNC_INTENTS,
  SOULYNC_INTENT_LABEL,
  blockSoulync,
  decideSoulync,
  getSoulync,
  saveSoulyncProfile,
  type SoulyncIntent,
  type SoulyncState,
} from "@/lib/soulync/server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/soulync")({ component: SouLync });

function SouLync() {
  const { user, isPending } = useAuthReady();
  const qc = useQueryClient();
  const state = useQuery({
    queryKey: ["soulync"],
    queryFn: () => getSoulync(),
    enabled: Boolean(user),
  });

  if (isPending) return <div className="m-4 h-40 animate-pulse rounded-3xl bg-secondary" />;

  if (!user) {
    return (
      <main className="px-5 py-8">
        <ProductLockup product="soulync" />
        <p className="mt-3 text-sm text-muted-foreground">
          Intentional matching for students. Opt in, say what you actually want, and only people who
          both choose each other can start a conversation.
        </p>
        <div className="mt-6">
          <SignInCard
            title="SouLync is invite-to-yourself only"
            body="Sign in to create a profile. Nothing about you appears here until you publish one, and you can pause or block at any time."
          />
        </div>
      </main>
    );
  }

  if (state.isPending) return <div className="m-4 h-64 animate-pulse rounded-3xl bg-secondary" />;

  if (state.isError || !state.data) {
    return (
      <main className="px-5 py-8">
        <ProductLockup product="soulync" />
        <div className="mt-6">
          <EmptyState
            title="SouLync couldn’t open"
            body="The matching service didn’t answer. Try again — nothing was changed on your profile."
            action={<Button onClick={() => void state.refetch()}>Try again</Button>}
          />
        </div>
      </main>
    );
  }

  if (!state.data.profile) {
    return (
      <Onboarding
        defaultName={user.displayName ?? ""}
        onSaved={() => qc.invalidateQueries({ queryKey: ["soulync"] })}
      />
    );
  }

  return <Board state={state.data} onChanged={() => qc.invalidateQueries({ queryKey: ["soulync"] })} />;
}

function Onboarding({ defaultName, onSaved }: { defaultName: string; onSaved: () => void }) {
  const [displayName, setDisplayName] = useState(defaultName);
  const [age, setAge] = useState("");
  const [campus, setCampus] = useState("");
  const [program, setProgram] = useState("");
  const [intent, setIntent] = useState<SoulyncIntent>("open");
  const [interests, setInterests] = useState("");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      saveSoulyncProfile({
        data: {
          displayName,
          age: Number(age),
          campus,
          program,
          intent,
          interests: interests.split(",").map((i) => i.trim()),
          prompt,
        },
      }),
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      toast.message("SouLync profile published");
      onSaved();
    },
    onError: () => setError("SouLync couldn’t save that. Check your connection and try again."),
  });

  return (
    <main className="px-5 pb-10">
      <div className="pt-6">
        <ProductLockup product="soulync" />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        One profile, one honest introduction. 18+ only, and you choose how much to show.
      </p>

      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (save.isPending) return;
          setError(null);
          save.mutate();
        }}
      >
        <Field label="Name people will see">
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age">
            <Input
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 2))}
              inputMode="numeric"
              placeholder="18+"
              required
            />
          </Field>
          <Field label="Campus">
            <Input value={campus} onChange={(e) => setCampus(e.target.value)} maxLength={60} placeholder="UNILAG" />
          </Field>
        </div>
        <Field label="Program or course">
          <Input value={program} onChange={(e) => setProgram(e.target.value)} maxLength={60} placeholder="Computer Science" />
        </Field>
        <Field label="What you’re open to">
          <div className="flex flex-wrap gap-2">
            {SOULYNC_INTENTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setIntent(value)}
                className={cn(
                  "h-9 rounded-full px-3.5 text-sm",
                  intent === value ? "bg-ink text-paper" : "bg-card ring-1 ring-border",
                )}
              >
                {SOULYNC_INTENT_LABEL[value]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Interests (comma separated)">
          <Input
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="Afrobeats, football, late-night reading"
          />
        </Field>
        <Field label="One line about you">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={160}
            placeholder="What should someone ask you about?"
            className="min-h-24"
          />
        </Field>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={save.isPending}>
          {save.isPending ? "Publishing…" : "Publish my SouLync"}
        </Button>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4" />
          You can pause your profile or block anyone, at any time.
        </p>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Board({ state, onChanged }: { state: SoulyncState; onChanged: () => void }) {
  const [notice, setNotice] = useState<string | null>(null);
  const current = state.candidates[0];

  const decide = useMutation({
    mutationFn: (input: { targetUserId: string; decision: "like" | "pass" }) => decideSoulync({ data: input }),
    onSuccess: (result, input) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setNotice(
        result.matched
          ? "It’s mutual — you two can talk now."
          : input.decision === "like"
            ? "Liked. They’ll only know if they like you back."
            : null,
      );
      onChanged();
    },
    onError: () => toast.error("SouLync didn’t save that. Try again."),
  });

  const block = useMutation({
    mutationFn: (targetUserId: string) => blockSoulync({ data: { targetUserId } }),
    onSuccess: () => {
      toast.message("Blocked", { description: "They won’t appear for you again, and you won’t appear for them." });
      onChanged();
    },
    onError: () => toast.error("SouLync couldn’t block that profile. Try again."),
  });

  const busy = decide.isPending || block.isPending;

  return (
    <main className="px-5 pb-12">
      <div className="pt-6">
        <ProductLockup product="soulync">
          <Badge>18+</Badge>
        </ProductLockup>
      </div>

      <div className="mt-4 flex gap-2">
        <div className="flex-1 rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Matches</p>
          <p className="mt-1 text-2xl font-medium tabular">{state.matches.length}</p>
        </div>
        <div className="flex-1 rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Likes waiting</p>
          <p className="mt-1 text-2xl font-medium tabular">{state.likesWaiting}</p>
        </div>
      </div>

      {notice ? <p className="mt-3 text-sm text-muted-foreground">{notice}</p> : null}

      {current ? (
        <section className="mt-5" aria-label="Next profile">
          <article className="rounded-3xl bg-card p-5 ring-1 ring-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl leading-tight">
                  {current.displayName}
                  <span className="ml-2 text-base text-muted-foreground">{current.age}</span>
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[current.campus, current.program].filter(Boolean).join(" · ") || "Campus not shared"}
                </p>
              </div>
              <Badge>{SOULYNC_INTENT_LABEL[current.intent]}</Badge>
            </div>

            {current.prompt ? <p className="mt-4 text-sm leading-relaxed">{current.prompt}</p> : null}

            <div className="mt-4 flex flex-wrap gap-1.5">
              {current.interests.map((interest) => (
                <span key={interest} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">
                  {interest}
                </span>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                disabled={busy}
                onClick={() => decide.mutate({ targetUserId: current.userId, decision: "pass" })}
              >
                <X className="size-4" /> Pass
              </Button>
              <Button
                className="flex-1"
                disabled={busy}
                onClick={() => decide.mutate({ targetUserId: current.userId, decision: "like" })}
              >
                <Heart className="size-4" /> Like
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Block ${current.displayName}`}
                disabled={busy}
                onClick={() => block.mutate(current.userId)}
              >
                <UserRoundX className="size-4" />
              </Button>
            </div>
          </article>
          <p className="mt-3 text-xs text-muted-foreground">
            {state.candidates.length > 1
              ? `${state.candidates.length - 1} more profile${state.candidates.length === 2 ? "" : "s"} after this one.`
              : "That’s everyone on SouLync right now."}
          </p>
        </section>
      ) : (
        <div className="mt-5">
          <EmptyState
            title="No one left to meet yet"
            body="SouLync only shows people who chose to be here. Check back later — or invite someone you already know."
          />
        </div>
      )}

      <section className="mt-8" aria-label="Matches">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your matches</h2>
        {state.matches.length ? (
          <ul className="mt-3 space-y-2">
            {state.matches.map((match) => (
              <li key={match.userId} className="flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-border">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {match.displayName}
                    <span className="ml-1.5 font-normal text-muted-foreground">{match.age}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[match.campus, match.program].filter(Boolean).join(" · ") || "Matched on SouLync"}
                  </p>
                </div>
                <Link to="/messages" className="shrink-0 text-sm underline">
                  Say hi
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Matches appear here only when you both like each other. Nobody sees a one-sided like.
          </p>
        )}
      </section>

      <p className="mt-8 flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        Keep conversations on UNIBUD, meet in public places, and report anything that feels wrong. Blocking
        removes both of you from each other’s SouLync.
      </p>
    </main>
  );
}
