import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { openDirect } from "@/lib/social/server";

export function MessageLink({ handle, className }: { handle: string; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function open() {
    setBusy(true);
    setError("");
    try {
      const result = await openDirect({ data: { handle } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await router.navigate({ to: "/messages/$id", params: { id: result.id } });
    } catch {
      setError("The message could not be opened.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button type="button" disabled={busy} className={className} onClick={() => void open()}>
        {busy ? "Opening…" : "Message"}
      </button>
      {error ? <span className="mt-1 max-w-48 text-xs text-muted-foreground">{error}</span> : null}
    </span>
  );
}
