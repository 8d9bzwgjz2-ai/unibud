import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  resolveBudShortcut,
  useCampusStore,
  type BudShortcut,
  type ProfileVisibility,
} from "@/lib/unibud/campus-store";
import { upsertMyProfile } from "@/lib/unibud/server";
import { useAuthReady } from "@/components/unibud/sign-in-gate";
import type { CampusRole } from "@/lib/unibud/roles";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { submitReport } from "@/lib/reports/server";

export const Route = createFileRoute("/_app/settings")({ component: Settings });

function Settings() {
  const shortcut = useCampusStore((s) => resolveBudShortcut(s));
  const setBudShortcut = useCampusStore((s) => s.setBudShortcut);
  const role = useCampusStore((s) => s.role ?? "student");
  const setRole = useCampusStore((s) => s.setRole);
  const visibility = useCampusStore((s) => s.profileVisibility);
  const setProfileVisibility = useCampusStore((s) => s.setProfileVisibility);
  const academicVisibility = useCampusStore((s) => s.academicVisibility);
  const setAcademicVisibility = useCampusStore((s) => s.setAcademicVisibility);
  const prefs = useCampusStore((s) => s.prefs);
  const setPrefs = useCampusStore((s) => s.setPrefs);
  const { user } = useAuthReady();

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Account</p>
      <h1 className="mt-1 font-display text-4xl">Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">Privacy, notifications, Bud placement, and demo role.</p>

      <p className="mt-8 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Bud shortcut position
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Placement only. Bud always stays in the menu. Hidden does not disable Bud.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {(["top", "bottom", "hidden"] as BudShortcut[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setBudShortcut(v)}
            className={cn(
              "h-11 rounded-full text-sm capitalize",
              shortcut === v ? "bg-ink text-paper" : "bg-card ring-1 ring-border",
            )}
          >
            {v}
          </button>
        ))}
      </div>

      <p className="mt-8 text-xs font-medium tracking-wide text-muted-foreground uppercase">Profile visibility</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Private chats, attendance and study material stay gated. This only controls how open your identity card is.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["public", "campus", "connections"] as ProfileVisibility[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setProfileVisibility(v)}
            className={cn(
              "h-9 rounded-full px-4 text-sm capitalize",
              visibility === v ? "bg-ink text-paper" : "bg-card ring-1 ring-border",
            )}
          >
            {v}
          </button>
        ))}
      </div>

      <p className="mt-8 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Role on this device (demo)
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Roles do not inherit. Class Governor is still a student. Tutor Mode is lecturers only.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["student", "governor", "lecturer", "moderator"] as CampusRole[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              setRole(v);
              if (user) void upsertMyProfile({ data: { campusRole: v } });
            }}
            className={cn(
              "h-9 rounded-full px-4 text-sm capitalize",
              role === v ? "bg-ink text-paper" : "bg-card ring-1 ring-border",
            )}
          >
            {v === "governor" ? "Class Governor" : v}
          </button>
        ))}
      </div>

      <p className="mt-8 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Academic details visibility
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Programme and department stay off the social card unless you choose otherwise.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["connections", "campus", "hidden"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setAcademicVisibility(v)}
            className={cn(
              "h-9 rounded-full px-4 text-sm capitalize",
              academicVisibility === v ? "bg-ink text-paper" : "bg-card ring-1 ring-border",
            )}
          >
            {v}
          </button>
        ))}
      </div>

      <p className="mt-8 text-xs font-medium tracking-wide text-muted-foreground uppercase">Preferences</p>
      <ul className="mt-2 divide-y divide-border rounded-2xl bg-card ring-1 ring-border">
        <Toggle label="Push-style alerts in the app" value={prefs.push} onChange={(v) => setPrefs({ push: v })} />
        <Toggle label="Read receipts in Chat" value={prefs.reads} onChange={(v) => setPrefs({ reads: v })} />
        <Toggle label="Marketplace activity" value={prefs.market} onChange={(v) => setPrefs({ market: v })} />
      </ul>

      <p className="mt-8 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Report
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Software bugs and platform problems belong here — not in The Fixer.
      </p>
      <ReportBox />

      <section className="mt-10 rounded-2xl bg-card p-4 ring-1 ring-border">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">About</p>
        <p className="mt-2 text-sm leading-relaxed">
          UNIBUD is a student operating environment. Credits: Oracle — Engineer / Builder / Systems
          Thinker. References Bud, UNIBUD, SOULYNC, My Realm, and The Fixer methodology.
        </p>
        <a
          href="https://myrealmbyoracle.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm font-medium"
        >
          Oracle portfolio
        </a>
      </section>
    </main>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-4">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={cn(
          "h-7 w-12 shrink-0 rounded-full p-0.5 transition-colors",
          value ? "bg-ink" : "bg-secondary",
        )}
      >
        <span
          className={cn(
            "block size-6 rounded-full bg-paper transition-transform",
            value ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </li>
  );
}

function ReportBox() {
  const [kind, setKind] = useState<"problem" | "bug" | "content">("problem");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  return (
    <form
      className="mt-3 space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!body.trim() || sending) return;
        setSending(true);
        try {
          await submitReport({ data: { kind, body } });
          toast.success("Report submitted. This is not The Fixer.");
          setBody("");
        } catch {
          toast.error("Report not submitted. Sign in and try again — nothing was saved.");
        } finally {
          setSending(false);
        }
      }}
    >
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["problem", "Report a problem"],
            ["bug", "Report a bug"],
            ["content", "Report content"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setKind(id)}
            className={cn(
              "h-9 rounded-full px-3 text-xs",
              kind === id ? "bg-ink text-paper" : "bg-secondary",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          kind === "bug"
            ? "What broke, and what did you expect?"
            : kind === "content"
              ? "Which post, Riff, or profile — and why?"
              : "What went wrong in UNIBUD?"
        }
      />
      <Button type="submit" size="sm" disabled={!body.trim() || sending}>
        {sending ? "Sending…" : "Send report"}
      </Button>
    </form>
  );
}
