import { createFileRoute } from "@tanstack/react-router";
import { Bell, BookOpen, Calendar, Clapperboard, Heart, MessageCircle, Newspaper, UserPlus } from "lucide-react";
import { useState } from "react";
import { relativeTime } from "@/lib/unibud/format";
import { useCampusStore, type HumanNote } from "@/lib/unibud/campus-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/notifications")({ component: Notifications });

const ICONS: Record<HumanNote["kind"], typeof Heart> = {
  social: Heart,
  communities: MessageCircle,
  events: Calendar,
  money: Heart,
  class: BookOpen,
  live: Clapperboard,
  news: Newspaper,
};

function Notifications() {
  const notes = useCampusStore((s) => s.notes);
  const markAllRead = useCampusStore((s) => s.markAllRead);
  const markRead = useCampusStore((s) => s.markRead);
  const [tab, setTab] = useState<"all" | HumanNote["kind"]>("all");
  const shown = tab === "all" ? notes : notes.filter((n) => n.kind === tab);
  const fresh = shown.filter((n) => !n.read);
  const earlier = shown.filter((n) => n.read);

  return (
    <main className="safe-bottom px-5 pt-6">
      <p className="kicker text-center">Your updates</p>
      <h1 className="mt-1 text-center font-display text-4xl">Notifications</h1>
      <button type="button" onClick={markAllRead} className="mx-auto mt-3 block text-sm font-medium text-bud">
        Mark all as read
      </button>
      <div className="mt-5 flex gap-2 overflow-x-auto">
        {(
          [
            ["all", "All"],
            ["social", "Social"],
            ["communities", "Communities"],
            ["class", "Class"],
            ["live", "Live"],
            ["news", "News"],
            ["events", "Events"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "h-9 shrink-0 rounded-full px-4 text-sm font-medium",
              tab === id ? "bg-ink text-paper" : "bg-card text-muted-foreground ring-1 ring-border",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {fresh.length ? <h2 className="mt-6 text-sm font-medium">New</h2> : null}
      <ul>
        {fresh.map((n) => (
          <NoteRow key={n.id} note={n} onOpen={() => markRead(n.id)} />
        ))}
      </ul>
      {earlier.length ? <h2 className="mt-6 text-sm font-medium">Earlier</h2> : null}
      <ul>
        {earlier.map((n) => (
          <NoteRow key={n.id} note={n} onOpen={() => markRead(n.id)} />
        ))}
      </ul>
    </main>
  );
}

function NoteRow({ note, onOpen }: { note: HumanNote; onOpen: () => void }) {
  const Icon =
    note.kind === "social" && note.title.includes("accepted") ? UserPlus : ICONS[note.kind] ?? Bell;
  const inner = (
    <div className="flex items-start gap-3 py-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-bud-dim text-bud">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">{note.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{note.body}</p>
        <p className="mt-1 text-xs text-muted-foreground">{relativeTime(note.createdAt)}</p>
      </div>
      {!note.read ? <span className="mt-2 size-2 rounded-full bg-bud" /> : null}
    </div>
  );
  if (note.href) {
    return (
      <li className="border-b border-border">
        <a href={note.href} onClick={onOpen}>
          {inner}
        </a>
      </li>
    );
  }
  return <li className="border-b border-border">{inner}</li>;
}
