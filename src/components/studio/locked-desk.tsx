import { evaluate } from "@/lib/studio/eligibility";
import { useStudioStore } from "@/lib/studio/store";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { Button } from "@/components/ui/button";

export function LockedDesk() {
  const setView = useStudioStore((s) => s.setView);
  const setMode = useStudioStore((s) => s.setMode);
  const policy = useStudioStore((s) => s.policy);
  const standing = useStudioStore((s) => s.standing);
  const premium = useStudioStore((s) => s.premium);
  const connections = useCampusStore((s) => s.connections);
  const followers = useCampusStore((s) => s.followers);
  const result = evaluate(
    "live",
    {
      startedAt: standing.startedAt,
      connections: connections.length,
      followers: followers.length,
      verified: standing.verified,
      creator: premium,
      strikes: standing.strikes,
    },
    policy,
  );

  return (
    <div className="flex h-dvh flex-col bg-background px-5 pt-[max(1rem,env(safe-area-inset-top))]">
      <button type="button" className="h-11 self-start text-sm" onClick={() => { setMode("post"); setView("camera"); }}>
        Back
      </button>
      <p className="mt-6 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Live</p>
      <h1 className="mt-2 font-display text-4xl">Not open for you yet.</h1>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
        Public Live is gated. Video calls in Chat stay available. This list comes from UNIBUD policy, not a hidden button.
      </p>
      <ul className="mt-8 space-y-3">
        {result.missing.map((m) => (
          <li key={m.key} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
            <p className="text-sm font-medium">{m.need}</p>
            <p className="text-xs text-muted-foreground">Now: {m.have}</p>
          </li>
        ))}
        {result.ok ? <li className="text-sm">You’re eligible — go back and start Live.</li> : null}
      </ul>
      <Button className="mt-auto mb-[max(1rem,env(safe-area-inset-bottom))]" onClick={() => { setMode("post"); setView("camera"); }}>
        Back to camera
      </Button>
    </div>
  );
}
