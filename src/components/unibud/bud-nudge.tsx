import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { setBudDraft } from "@/lib/bud/draft";

/** Quiet Bud entry. Not a second AI product. */
export function BudNudge({
  draft,
  children,
}: {
  draft: string;
  children: string;
}) {
  return (
    <Link
      to="/bud"
      className="mt-4 inline-flex h-10 items-center gap-2 text-sm text-muted-foreground"
      onClick={() => setBudDraft(draft)}
    >
      <Sparkles className="size-4 text-bud" />
      {children}
    </Link>
  );
}
