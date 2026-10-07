import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BudShell } from "@/components/bud/bud-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthReady } from "@/components/unibud/sign-in-gate";
import { askBud } from "@/lib/bud/server";
import { useMutation } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/bud/fixer")({ component: BudFixer });

function BudFixer() {
  const { user } = useAuthReady();
  const [problem, setProblem] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: () =>
      askBud({
        data: {
          prompt: `Bud Fixer (academic/task): ${problem}. Break it down, ask one question if needed, and suggest a next step. Do not write the assignment.`,
        },
      }),
    onSuccess: (r) => {
      if (r.ok) setReply(r.text);
      else setReply(r.error);
    },
  });

  return (
    <BudShell>
      <main className="safe-bottom px-5 pt-6">
        <p className="kicker">Problem-solving</p>
        <h1 className="mt-1 font-display text-3xl">Bud Fixer</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Academic and task help. Software bugs belong in Settings → Report. The Fixer in the menu is for people, not the platform.
        </p>
        <Textarea
          className="mt-5"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="I don’t know how to start this lab / semester / reading…"
        />
        <Button
          className="mt-3 w-full"
          disabled={!problem.trim() || mut.isPending || !user}
          onClick={() => mut.mutate()}
        >
          {mut.isPending ? "Bud is thinking…" : user ? "Work it with Bud" : "Sign in first"}
        </Button>
        {reply ? (
          <div className="mt-5 rounded-2xl bg-card p-4 text-sm leading-relaxed ring-1 ring-border">{reply}</div>
        ) : null}
      </main>
    </BudShell>
  );
}
