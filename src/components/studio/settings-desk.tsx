import { useStudioStore } from "@/lib/studio/store";
import type { GridKind } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

export function SettingsDesk() {
  const prefs = useStudioStore((s) => s.prefs);
  const patchPrefs = useStudioStore((s) => s.patchPrefs);
  const premium = useStudioStore((s) => s.premium);
  const setPremium = useStudioStore((s) => s.setPremium);
  const setView = useStudioStore((s) => s.setView);

  return (
    <div className="flex h-dvh flex-col bg-background pt-[env(safe-area-inset-top)]">
      <div className="flex h-12 items-center px-3">
        <button type="button" className="h-11 text-sm font-semibold" onClick={() => setView("camera")}>
          Back
        </button>
        <p className="flex-1 text-center text-sm font-semibold">Camera</p>
        <span className="w-12" />
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-5 pb-10">
        <Section title="Composition">
          <Row label="Grid">
            {(["off", "rule3", "rule4", "golden", "cross", "safe"] as GridKind[]).map((g) => (
              <Chip key={g} on={prefs.grid === g} onClick={() => patchPrefs({ grid: g })}>
                {g}
              </Chip>
            ))}
          </Row>
          <Toggle label="Level" on={prefs.level} onChange={(v) => patchPrefs({ level: v })} />
          <Toggle label="Mirror front camera" on={prefs.mirrorFront} onChange={(v) => patchPrefs({ mirrorFront: v })} />
        </Section>
        <Section title="Capture">
          <Row label="Quality">
            {(["720", "1080"] as const).map((q) => (
              <Chip key={q} on={prefs.quality === q} onClick={() => patchPrefs({ quality: q })}>
                {q}p
              </Chip>
            ))}
          </Row>
          <Row label="Frame rate">
            {([24, 30, 60] as const).map((f) => (
              <Chip key={f} on={prefs.fps === f} onClick={() => patchPrefs({ fps: f })}>
                {f}
              </Chip>
            ))}
          </Row>
          <Toggle label="HDR preference" on={prefs.hdr} onChange={(v) => patchPrefs({ hdr: v })} />
          <Toggle label="Stabilization" on={prefs.stabilize} onChange={(v) => patchPrefs({ stabilize: v })} />
          <Toggle label="Record audio" on={prefs.audio} onChange={(v) => patchPrefs({ audio: v })} />
          <Toggle label="Hands-free" on={prefs.handsFree} onChange={(v) => patchPrefs({ handsFree: v })} />
          <Toggle label="Green screen" on={prefs.greenScreen} onChange={(v) => patchPrefs({ greenScreen: v })} />
          <Toggle label="Dual camera" on={prefs.dual} onChange={(v) => patchPrefs({ dual: v })} />
          <Toggle label="Teleprompter" on={prefs.teleprompter} onChange={(v) => patchPrefs({ teleprompter: v })} />
          <Toggle label="Save originals" on={prefs.saveOriginal} onChange={(v) => patchPrefs({ saveOriginal: v })} />
        </Section>
        <Section title="Privacy">
          <Toggle label="Location metadata" on={prefs.locationMeta} onChange={(v) => patchPrefs({ locationMeta: v })} />
          <p className="text-xs text-muted-foreground">Location stays off unless you turn this on. AI object removal is on-device only when a provider is connected.</p>
        </Section>
        <Section title="Creator pack">
          <Toggle label="Premium filters and export looks" on={premium} onChange={setPremium} />
          <p className="text-xs text-muted-foreground">Uses UNIBUD entitlement, not a separate checkout. Core editing stays free.</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      <div className="mt-2 space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("h-9 rounded-full px-3 text-xs", on ? "bg-ink text-paper" : "bg-card ring-1 ring-border")}
    >
      {children}
    </button>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className="flex w-full items-center justify-between py-1 text-sm" onClick={() => onChange(!on)}>
      {label}
      <span className={cn("h-6 w-10 rounded-full p-0.5", on ? "bg-ink" : "bg-secondary")}>
        <span className={cn("block size-5 rounded-full bg-paper transition-transform", on ? "translate-x-4" : "")} />
      </span>
    </button>
  );
}
