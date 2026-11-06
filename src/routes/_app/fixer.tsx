import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/fixer")({ component: TheFixer });

const STEPS = ["Hear you", "Break it down", "One question", "A next step"];

function TheFixer() {
  const [issue, setIssue] = useState("");
  const [step, setStep] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [peer, setPeer] = useState(false);
  const [draft, setDraft] = useState("");
  const [lines, setLines] = useState<{ from: "you" | "peer"; body: string }[]>([
    {
      from: "peer",
      body: "I’m another student. No names. Tell me what’s sitting heavy — I’ll stay with it.",
    },
  ]);
  const [rating, setRating] = useState<number | null>(null);
  const addFixerRating = useCampusStore((s) => s.addFixerRating);
  const crisis =
    /\b(suicid|kill myself|end it|self.?harm|want to die)\b/i.test(issue) ||
    lines.some((l) => /\b(suicid|kill myself|end it|self.?harm|want to die)\b/i.test(l.body));

  function next() {
    if (!issue.trim()) return;
    const notes = [
      `I’m with you. You said: “${issue.trim()}”. This is about you — not a UNIBUD bug.`,
      "Splitting it: what happened, what you hoped for, and what feels stuck.",
      "One question: do you need someone to listen, or a concrete next step you can take today?",
      "Next step: write one sentence you’d tell a trusted person. If you want, you can talk to another student anonymously below. I am not a therapist.",
    ];
    setLog((l) => [...l, notes[step] ?? notes[notes.length - 1]]);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">People, not the platform</p>
      <h1 className="mt-1 font-display text-4xl">The Fixer</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        For when you’re stuck as a person. Software bugs live in{" "}
        <Link to="/settings" className="font-medium text-foreground">
          Settings → Report
        </Link>
        . This is not therapy and not a crisis line.
      </p>

      {crisis ? (
        <p className="mt-4 rounded-2xl bg-destructive/10 p-4 text-sm">
          If you are in immediate danger, contact campus security or local emergency services. In
          Nigeria you can also reach the Mentally Aware Nigeria Initiative. UNIBUD cannot replace
          that help.
        </p>
      ) : null}

      <Textarea
        className="mt-5"
        value={issue}
        onChange={(e) => setIssue(e.target.value)}
        placeholder="What’s sitting on you right now?"
      />
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={
              i <= step
                ? "h-8 rounded-full bg-ink px-3 text-xs leading-8 text-paper"
                : "h-8 rounded-full bg-secondary px-3 text-xs leading-8 text-muted-foreground"
            }
          >
            {s}
          </span>
        ))}
      </div>
      <Button className="mt-4 w-full" onClick={next} disabled={!issue.trim()}>
        {step === STEPS.length - 1 ? "Sit with it again" : "Continue"}
      </Button>
      <ol className="mt-6 space-y-3">
        {log.map((line, i) => (
          <li key={i} className="rounded-2xl bg-card p-4 text-sm ring-1 ring-border">
            {line}
          </li>
        ))}
      </ol>

      {step >= 2 ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium">Anonymous peer</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Optional. Another willing student, no names. Consent both ways. You can leave anytime.
          </p>
          {!peer ? (
            <Button className="mt-3" variant="outline" onClick={() => setPeer(true)}>
              Request an anonymous conversation
            </Button>
          ) : (
            <div className="mt-3 rounded-2xl bg-card p-4 ring-1 ring-border">
              <p className="text-xs text-muted-foreground">Connected · identity hidden</p>
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {lines.map((l, i) => (
                  <p
                    key={i}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                      l.from === "you" ? "ml-auto bg-ink text-paper" : "bg-secondary",
                    )}
                  >
                    {l.body}
                  </p>
                ))}
              </div>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  const body = draft.trim();
                  setLines((x) => [
                    ...x,
                    { from: "you", body },
                    {
                      from: "peer",
                      body: "Heard. What’s one thing that would make tonight 10% lighter?",
                    },
                  ]);
                  setDraft("");
                }}
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Say it here…"
                  className="h-11 flex-1 rounded-full bg-secondary px-4 text-sm outline-none"
                />
                <Button type="submit" size="sm">
                  Send
                </Button>
              </form>
              {rating == null ? (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground">Was this person helpful?</p>
                  <div className="mt-2 flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className="size-9 rounded-full bg-secondary text-sm"
                        onClick={() => {
                          setRating(n);
                          addFixerRating(n);
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Thanks. Helpful ratings stay with the supporter — they don’t become a public score
                  you can farm.
                </p>
              )}
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
