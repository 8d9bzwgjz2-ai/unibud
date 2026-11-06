import { createFileRoute, Link } from "@tanstack/react-router";
import { BudShell } from "@/components/bud/bud-shell";

export const Route = createFileRoute("/_app/bud/communities")({ component: BudCommunities });

const ROOMS = [
  { id: "math", name: "Mathematics", blurb: "Worked examples, not assignment dumping." },
  { id: "cs", name: "Computer Science", blurb: "Labs, debugging, and study groups." },
  { id: "research", name: "Research", blurb: "Sources, outlines, and honest citations." },
  { id: "exams", name: "Exam preparation", blurb: "Plans and past questions, not leaked papers." },
  { id: "lit", name: "Literature", blurb: "Close reading with people who showed up." },
];

function BudCommunities() {
  return (
    <BudShell>
      <main className="safe-bottom px-5 pt-6">
        <p className="kicker">Knowledge</p>
        <h1 className="mt-1 font-display text-3xl">Bud Communities</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Academic rooms. Social clubs stay in UNIBUD Communities.
        </p>
        <ul className="mt-5 space-y-3">
          {ROOMS.map((r) => (
            <li key={r.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <p className="font-medium">{r.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{r.blurb}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm">
          Need the social side?{" "}
          <Link to="/communities" className="font-medium text-bud">
            Open UNIBUD Communities
          </Link>
        </p>
      </main>
    </BudShell>
  );
}
