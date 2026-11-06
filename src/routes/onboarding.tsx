import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Wordmark } from "@/components/brand/logo";
import { LifeMark, OrbitMark, RiffMark } from "@/components/brand/identity-marks";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

const SLIDES = [
  {
    kicker: "Square",
    title: "A quiet home for what is actually happening.",
    body: "Square is the front of UNIBUD. Nothing here is filled with invented posts.",
    mark: <LifeMark size={72} />,
  },
  {
    kicker: "Connect",
    title: "People and services, only when they are real.",
    body: "Follow someone, or ask to connect. Services stay disconnected until they truly are.",
    mark: <OrbitMark size={72} />,
  },
  {
    kicker: "Bud",
    title: "A direct conversation, not a mascot in the bar.",
    body: "Bud is the only assistant you see. These slides do not sign you in.",
    mark: <RiffMark size={72} />,
  },
];

function Onboarding() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index] ?? SLIDES[0];
  const last = index === SLIDES.length - 1;
  return (
    <main className="flex min-h-dvh flex-col bg-background px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex items-center justify-between">
          <Wordmark size="sm" />
          <Link to="/join" className="text-sm text-muted-foreground">
            Skip
          </Link>
        </div>
        <div className="mt-16 grid size-28 place-items-center rounded-full bg-card ring-1 ring-border">{slide.mark}</div>
        <p className="kicker mt-10">{slide.kicker}</p>
        <h1 className="mt-2 font-display text-4xl">{slide.title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{slide.body}</p>
        <div className="mt-auto flex items-center justify-between pt-12">
          <div className="flex gap-1.5" aria-hidden>
            {SLIDES.map((item, itemIndex) => (
              <span key={item.kicker} className={`h-1.5 rounded-full ${itemIndex === index ? "w-6 bg-ink" : "w-1.5 bg-border"}`} />
            ))}
          </div>
          {last ? (
            <Link to="/join" className="grid h-12 place-items-center rounded-full bg-ink px-6 text-sm font-medium text-paper">
              Create account
            </Link>
          ) : (
            <button type="button" className="h-12 rounded-full bg-ink px-6 text-sm font-medium text-paper" onClick={() => setIndex((value) => value + 1)}>
              Next
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
