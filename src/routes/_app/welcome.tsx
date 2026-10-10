import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCampusStore, type LifeStage } from "@/lib/unibud/campus-store";
import { upsertMyProfile } from "@/lib/unibud/server";
import { useAuthReady } from "@/components/unibud/sign-in-gate";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/welcome")({ component: Welcome });

const SOCIAL = ["music", "football", "campus gist", "fashion", "tech", "faith", "hustle", "nightlife"];
const ACADEMIC = ["notes", "exams", "projects", "internships", "research"];

const ROOM_HINTS: Record<string, { to: string; id: string; label: string }[]> = {
  music: [{ to: "/communities/$id", id: "afrobeats", label: "Afrobeats & Campus DJ" }],
  football: [{ to: "/communities/$id", id: "five-aside", label: "Five-a-side" }],
  "campus gist": [{ to: "/communities/$id", id: "the-gist", label: "The Gist" }],
};

function Welcome() {
  const nav = useNavigate();
  const { user } = useAuthReady();
  const setOnboardingDone = useCampusStore((s) => s.setOnboardingDone);
  const setInterests = useCampusStore((s) => s.setInterests);
  const setAcademicInterests = useCampusStore((s) => s.setAcademicInterests);
  const setLifeStage = useCampusStore((s) => s.setLifeStage);
  const onboardingDone = useCampusStore((s) => s.onboardingDone);
  const [step, setStep] = useState(0);
  const [who, setWho] = useState<LifeStage>("student");
  const [social, setSocial] = useState<string[]>([]);
  const [academic, setAcademic] = useState<string[]>([]);

  useEffect(() => {
    if (onboardingDone) void nav({ to: "/" });
  }, [onboardingDone, nav]);

  function finish() {
    setInterests(social);
    setAcademicInterests(academic);
    setLifeStage(who);
    setOnboardingDone(true);
    if (user)
      void upsertMyProfile({
        data: { onboardingDone: true, displayName: user.displayName ?? undefined },
      });
    void nav({ to: "/" });
  }

  const hints = social.flatMap((id) => ROOM_HINTS[id] ?? []);

  return (
    <main className="safe-bottom px-5 pt-10">
      <p className="kicker">Welcome</p>
      <h1 className="mt-2 font-display text-4xl">A few things, so the mix is yours.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Short questions. Skip anything. Nothing here grants extra permissions.
      </p>

      {step === 0 ? (
        <section className="mt-8">
          <p className="text-sm font-medium">You’re here as…</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["student", "Student"],
                ["tutor", "Tutor"],
                ["both", "Both"],
                ["pre", "Pre-university"],
              ] as const
            ).map(([id, label]) => (
              <Chip key={id} on={who === id} onClick={() => setWho(id)}>
                {label}
              </Chip>
            ))}
          </div>
          {who === "tutor" || who === "both" ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Bud will remember you teach. Tutor Mode still needs lecturer verification — this does not grant it.
            </p>
          ) : null}
          <Button className="mt-8 w-full" onClick={() => setStep(1)}>
            Continue
          </Button>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="mt-8">
          <p className="text-sm font-medium">What do you actually want to see?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SOCIAL.map((id) => (
              <Chip
                key={id}
                on={social.includes(id)}
                onClick={() =>
                  setSocial((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
                }
              >
                {id}
              </Chip>
            ))}
          </div>
          {who === "tutor" || who === "both" || who === "student" ? (
            <>
              <p className="mt-6 text-sm font-medium">Learning, if you want it.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ACADEMIC.map((id) => (
                  <Chip
                    key={id}
                    on={academic.includes(id)}
                    onClick={() =>
                      setAcademic((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
                    }
                  >
                    {id}
                  </Chip>
                ))}
              </div>
            </>
          ) : null}
          {hints.length ? (
            <div className="mt-6">
              <p className="text-xs text-muted-foreground">Rooms that match, if you want them later.</p>
              <ul className="mt-2 space-y-1">
                {hints.map((h) => (
                  <li key={h.id}>
                    <Link to="/communities/$id" params={{ id: h.id }} className="text-sm font-medium text-bud">
                      {h.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Button className="mt-8 w-full" onClick={finish}>
            Take me to Square
          </Button>
        </section>
      ) : null}

      <button type="button" className="mt-4 w-full text-sm text-muted-foreground" onClick={finish}>
        Skip for now
      </button>
    </main>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-full px-4 text-sm capitalize",
        on ? "bg-ink text-paper" : "bg-card ring-1 ring-border",
      )}
    >
      {children}
    </button>
  );
}
