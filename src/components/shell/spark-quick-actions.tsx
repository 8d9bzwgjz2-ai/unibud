import { Link } from "@tanstack/react-router";
import { BriefcaseBusiness, GraduationCap, HandHeart, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ACTIONS = [
  {
    to: "/board",
    label: "Board",
    description: "Your college, cohort and class",
    icon: GraduationCap,
  },
  {
    to: "/money",
    label: "Commerce",
    description: "Banking, payments and marketplace",
    icon: BriefcaseBusiness,
  },
  {
    to: "/market",
    search: { cat: "services" as const },
    label: "Services",
    description: "Find and offer services",
    icon: HandHeart,
  },
] as const;

export function SparkQuickActions() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close Spark"
          className="fixed inset-0 z-[55] bg-ink/12"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div
        ref={panelRef}
        className={cn("spark-quick", open && "spark-quick--open")}
        aria-hidden={!open}
      >
        <div className="spark-quick__panel" role="dialog" aria-label="Spark quick actions">
          <div className="mb-2 flex items-center justify-between px-1">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Spark
              </p>
              <p className="mt-0.5 text-sm font-medium">Quick actions</p>
            </div>
            <button
              type="button"
              aria-label="Close Spark"
              className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  to={action.to}
                  search={"search" in action ? action.search : undefined}
                  onClick={() => setOpen(false)}
                  className="spark-quick__action"
                >
                  <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-foreground">
                    <Icon className="size-5" strokeWidth={1.8} />
                  </span>
                  <span className="mt-2 text-sm font-semibold">{action.label}</span>
                  <span className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                    {action.description}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label="Open Spark"
        aria-expanded={open}
        className={cn("spark-trigger", open && "spark-trigger--open")}
        onClick={() => setOpen((value) => !value)}
      >
        <Sparkles className="size-[18px]" strokeWidth={1.8} />
      </button>
    </>
  );
}
