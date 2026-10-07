import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/feedback")({ component: Feedback });

function Feedback() {
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Product</p>
      <h1 className="mt-1 font-display text-4xl">Feedback</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tell us what felt off. This is a mock inbox in this build — it does not email anyone.
      </p>
      {sent ? (
        <p className="mt-8 rounded-2xl bg-card p-5 text-sm ring-1 ring-border">
          Logged locally. Thank you — we’ll treat it as a note, not a ticket in a government portal.
        </p>
      ) : (
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!body.trim()) return;
            setSent(true);
            toast.success("Feedback captured on this device");
          }}
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What should UNIBUD do better?"
          />
          <Button type="submit" className="w-full" disabled={!body.trim()}>
            Submit
          </Button>
        </form>
      )}
    </main>
  );
}
