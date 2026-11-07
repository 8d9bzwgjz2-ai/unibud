import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";


export const Route = createFileRoute("/_app/fixer")({ component: TheFixer });

const STEPS = ["Hear you", "Break it down", "One question", "A next step"];

function TheFixer() {
  const [issue, setIssue] = useState("");
  const [step, setStep] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const crisis = /\b(suicid|kill myself|end it|self.?harm|want to die)\b/i.test(issue);

  function next() {
    if (!issue.trim()) return;
    const notes = [
      `I hear you. You said: “${issue.trim()}”. This is about you, not a UNIBUD bug.`,
      "Let’s separate what happened, what you need, and what is actually in your control.",
      "One question: do you mainly need someone to listen, or do you want help choosing a practical next step?",
      "Start with one thing you can change today. If you want another person involved, use Talk to someone when a real support connection is available.",
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
        . Fixer is not therapy or a crisis line.
      </p>

      {crisis ? (
        <p className="mt-4 rounded-2xl bg-destructive/10 p-4 text-sm">
          If you are in immediate danger, contact local emergency services or a trusted person who can stay with you. UNIBUD cannot replace emergency or professional care.
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
        {step === STEPS.length - 1 ? "Work through it again" : "Continue"}
      </Button>
      <ol className="mt-6 space-y-3">
        {log.map((line, i) => (
          <li key={i} className="rounded-2xl bg-card p-4 text-sm ring-1 ring-border">
            {line}
          </li>
        ))}
      </ol>

      {step >= 2 ? (
        <section className="mt-8 rounded-2xl bg-card p-4 ring-1 ring-border">
          <h2 className="text-sm font-medium">Talk to someone</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Human support is a real connection, not a simulated chat. This build does not have a verified supporter-matching service connected yet, so it will not pretend to connect you to another student.
          </p>
          <Button className="mt-3" variant="outline" disabled>
            Human connection unavailable
          </Button>
        </section>
      ) : null}
    </main>
  );
}
