import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AccountFrame } from "@/components/account/frame";
import { signOut } from "@/lib/auth/client";

export const Route = createFileRoute("/suspended")({ component: Suspended });

function Suspended() {
  const [busy, setBusy] = useState(false);
  return (
    <AccountFrame kicker="Account" title="This account is suspended" body="A suspended account cannot open UNIBUD. Nothing in the app is available from this sign-in.">
      <button
        type="button"
        className="h-12 w-full rounded-full text-sm font-medium ring-1 ring-border disabled:opacity-50"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void signOut("/start").catch(() => setBusy(false));
        }}
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </AccountFrame>
  );
}
