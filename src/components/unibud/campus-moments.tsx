import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { personByHandle } from "@/lib/unibud/catalog";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { cn } from "@/lib/utils";
import { Avatar } from "./person";

type Cluster = {
  id: string;
  handles: [string, string];
  count: number;
  lines: string[];
  photos: [string, string];
};

const CLUSTERS: Cluster[] = [
  {
    id: "c-amaka",
    handles: ["amaka", "kemi"],
    count: 3,
    photos: ["/market/camera.jpg", "/covers/campus-night.jpg"],
    lines: ["Hall week fittings, not the rumour.", "Studio light hit different tonight.", "Portraits after faculty night."],
  },
  {
    id: "c-tunde",
    handles: ["tunde", "ibrahim"],
    count: 2,
    photos: ["/market/keke.jpg", "/covers/campus-night.jpg"],
    lines: ["Rain, keke, still made 8am.", "Second gate queue before lecture."],
  },
  {
    id: "c-adaeze",
    handles: ["adaeze", "chinedu"],
    count: 4,
    photos: ["/covers/campus-night.jpg", "/market/camera.jpg"],
    lines: ["Library till close. Notes after.", "Quiet reading corner, no playlist.", "Night class from the floor.", "Past questions club, New Hall."],
  },
  {
    id: "c-fatima",
    handles: ["fatima", "ngozi"],
    count: 2,
    photos: ["/covers/campus-night.jpg", "/market/braids.jpg"],
    lines: ["From the second gate before lecture.", "Meal plan that actually lasted the week."],
  },
  {
    id: "c-sky",
    handles: ["jonas_wits", "aisha_nbo"],
    count: 2,
    photos: ["/covers/campus-night.jpg", "/market/camera.jpg"],
    lines: ["Cheap lens. Honest sky.", "The arm grabbed on the third try."],
  },
];

function Face({ src, name, className }: { src?: string; name: string; className?: string }) {
  if (src) {
    return <img src={src} alt="" className={cn("size-11 rounded-full object-cover", className)} />;
  }
  return <Avatar name={name} className={cn("size-11", className)} />;
}

export function CampusMoments({
  signedIn,
  onCreate,
}: {
  signedIn: boolean;
  onCreate: () => void;
}) {
  const seen = useCampusStore((s) => s.storiesSeen);
  const seeStory = useCampusStore((s) => s.seeStory);
  const mine = useCampusStore((s) => s.myStories ?? []);
  const [open, setOpen] = useState<string | null>(null);
  const [mineOpen, setMineOpen] = useState(false);
  const [seg, setSeg] = useState(0);

  const active = CLUSTERS.filter((c) => !seen.includes(c.id));
  const current = CLUSTERS.find((c) => c.id === open) ?? null;

  function closeCluster(id: string) {
    seeStory(id);
    setOpen(null);
    setSeg(0);
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto px-4 py-2">
        <button
          type="button"
          onClick={() => (mine.length ? setMineOpen(true) : onCreate())}
          className="w-[3.25rem] shrink-0"
          aria-label="Your story"
        >
          <span
            className={cn(
              "relative mx-auto grid size-11 place-items-center overflow-hidden rounded-full bg-secondary text-ink",
              mine.length ? "ring-2 ring-success" : "ring-2 ring-dashed ring-ink/30",
            )}
          >
            {mine[0]?.image ? <img src={mine[0].image} alt="" className="size-full object-cover" /> : <Plus className="size-3.5" />}
          </span>
          <p className="mt-1 truncate text-center text-[10px] text-muted-foreground">You</p>
        </button>

        {active.map((c, i) => {
          const a = personByHandle(c.handles[0]);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setOpen(c.id);
                setSeg(0);
              }}
              className="w-[3.25rem] shrink-0"
              aria-label={`${a?.name ?? c.handles[0]} story`}
            >
              <span className="relative mx-auto block size-12">
                <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_200deg,#6d5ef6,#111114,#1f9d61,#6d5ef6)] p-[2px]">
                  <span className="block size-full rounded-full bg-background p-[2px]">
                    <Face src={c.photos[0]} name={a?.name ?? c.handles[0]} className="size-full" />
                  </span>
                </span>
                {i === 0 ? (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-ink px-1 text-[8px] font-semibold tracking-wide text-paper">
                    LIVE
                  </span>
                ) : null}
              </span>
              <p className="mt-1.5 truncate text-center text-[10px]">
                {(a?.name ?? c.handles[0]).split(" ")[0]}
              </p>
            </button>
          );
        })}
      </div>

      {current ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink text-paper">
          <div className="flex gap-1 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            {current.lines.map((_, i) => (
              <span
                key={i}
                className={cn("h-0.5 flex-1 rounded-full", i <= seg ? "bg-paper" : "bg-paper/25")}
              />
            ))}
          </div>
          <div className="flex items-center justify-between px-2">
            <p className="px-3 text-sm font-medium">
              {personByHandle(current.handles[0])?.name ?? current.handles[0]}
              <span className="ml-1 text-paper/50">@{current.handles[0]}</span>
            </p>
            <button
              type="button"
              className="grid size-11 place-items-center"
              aria-label="Close moment"
              onClick={() => closeCluster(current.id)}
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex flex-1 items-center">
            <button
              type="button"
              className="grid size-11 place-items-center"
              aria-label="Previous"
              onClick={() => setSeg((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="size-6" />
            </button>
            <div className="flex-1 px-4 text-center">
              <p className="font-display text-3xl">{current.lines[seg]}</p>
              <p className="mt-4 text-sm text-paper/60">Moment</p>
            </div>
            <button
              type="button"
              className="grid size-11 place-items-center"
              aria-label="Next"
              onClick={() => {
                if (seg >= current.lines.length - 1) closeCluster(current.id);
                else setSeg((i) => i + 1);
              }}
            >
              <ChevronRight className="size-6" />
            </button>
          </div>
          {!signedIn ? (
            <p className="sheet-safe text-center text-xs text-paper/50">Sign in to post your own moment.</p>
          ) : (
            <div className="h-[env(safe-area-inset-bottom)]" />
          )}
        </div>
      ) : null}

      {mineOpen && mine[0] ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink text-paper">
          <div className="flex items-center justify-between px-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <p className="px-2 text-sm font-semibold">You</p>
            <button type="button" className="grid size-11 place-items-center" onClick={() => setMineOpen(false)} aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center">
            {mine[0].video ? (
              <video src={mine[0].video} className="max-h-full w-full object-contain" autoPlay playsInline />
            ) : (
              <img src={mine[0].image} alt="" className="max-h-full w-full object-contain" />
            )}
          </div>
          {mine[0].caption ? <p className="px-5 py-3 text-sm">{mine[0].caption}</p> : null}
          <button type="button" className="sheet-safe pb-4 text-center text-sm font-medium" onClick={onCreate}>
            Add another
          </button>
        </div>
      ) : null}
    </>
  );
}
