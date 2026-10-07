import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/help")({ component: Help });

const FAQS = [
  {
    q: "Is the wallet real money?",
    a: "No. UNIBUD’s wallet is a demo ledger unless a real payment provider is connected. Nothing here is a bank transfer, card charge, or NELFUND disbursement.",
  },
  {
    q: "Is UNIBUD NELFUND?",
    a: "No. UNIBUD can explain the process and keep your notes. Official applications live at nelf.gov.ng.",
  },
  {
    q: "Who is Bud?",
    a: "Bud is the only assistant you talk to. Anything underneath stays hidden.",
  },
  {
    q: "Where are academic tools?",
    a: "Board for live class, Studies for your semester, Tutor Mode for lecturers. Square stays social.",
  },
  {
    q: "What is The Fixer?",
    a: "A place to talk through something that’s sitting on you. It is not therapy and not where you report app bugs.",
  },
];

function Help() {
  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker">Support</p>
      <h1 className="mt-1 font-display text-4xl">Help & Support</h1>
      <ul className="mt-6 space-y-3">
        {FAQS.map((f) => (
          <li key={f.q} className="rounded-2xl bg-card p-4 ring-1 ring-border">
            <p className="text-sm font-semibold">{f.q}</p>
            <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm">
        App problem?{" "}
        <Link to="/settings" className="font-medium text-bud">
          Report it in Settings
        </Link>
        . Need a person?{" "}
        <Link to="/fixer" className="font-medium text-bud">
          The Fixer
        </Link>{" "}
        or{" "}
        <Link to="/feedback" className="font-medium text-bud">
          send feedback
        </Link>
        .
      </p>
    </main>
  );
}
