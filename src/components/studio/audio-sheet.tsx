import { useMemo, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { UnibudMusic } from "@/lib/music";
import type { UnibudAudio } from "@/lib/music/audio";
import { useStudioStore } from "@/lib/studio/store";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { rightsForOriginal } from "@/lib/music/rights";
import { recordAudioEvent } from "@/lib/music/events";
import { cn } from "@/lib/utils";

type Lane = "foryou" | "trending" | "original" | "saved";

function dur(ms?: number) {
  if (!ms) return "";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function attach(a: UnibudAudio) {
  const studio = useStudioStore.getState();
  studio.snapshot();
  studio.addMix({
    id: `oa-${a.audioId}`,
    kind: "catalogue",
    name: a.title,
    src: a.src,
    volume: 0.85,
    mute: false,
    fadeIn: 0,
    fadeOut: 0,
    trackId: a.audioId,
    artistName: a.creatorHandle ?? a.artistName,
  });
  studio.setMusicRef({
    providerId: a.providerId ?? "unibud-original",
    trackId: a.audioId,
    audioId: a.audioId,
    title: a.title,
    artistName: a.artistName ?? a.creatorHandle,
    startMs: 0,
    durationMs: a.durationMs,
    entitlement: a.licensingStatus === "cleared" ? "free" : "preview",
    sourceType: a.sourceType === "LICENSED_MUSIC" ? "LICENSED_MUSIC" : "ORIGINAL_AUDIO",
    creatorHandle: a.creatorHandle,
  });
}

export function AudioSheet({ onClose, embedded }: { onClose?: () => void; embedded?: boolean }) {
  const originals = useCampusStore((s) => s.originalAudios ?? []);
  const savedIds = useCampusStore((s) => s.savedAudioIds ?? []);
  const following = useCampusStore((s) => s.following);
  const saveAudio = useCampusStore((s) => s.saveAudio);
  const unsaveAudio = useCampusStore((s) => s.unsaveAudio);
  const mix = useStudioStore((s) => s.mix);
  const musicRef = useStudioStore((s) => s.musicRef);
  const removeMix = useStudioStore((s) => s.removeMix);
  const [lane, setLane] = useState<Lane>("foryou");
  const [q, setQ] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const live = originals.filter((a) => a.status !== "removed");
  const needle = q.trim().toLowerCase();

  const list = useMemo(() => {
    let rows = live;
    if (lane === "saved") rows = live.filter((a) => savedIds.includes(a.audioId));
    else if (lane === "trending") rows = [...live].sort((a, b) => b.usageCount - a.usageCount);
    else if (lane === "foryou") {
      const followed = live.filter((a) => a.creatorHandle && following.includes(a.creatorHandle));
      const saved = live.filter((a) => savedIds.includes(a.audioId));
      const rest = live.filter((a) => !followed.includes(a) && !saved.includes(a));
      rows = [...followed, ...saved, ...rest];
    }
    if (!needle) return rows;
    return rows.filter(
      (a) =>
        a.title.toLowerCase().includes(needle) ||
        (a.creatorHandle ?? "").toLowerCase().includes(needle) ||
        (a.artistName ?? "").toLowerCase().includes(needle),
    );
  }, [live, lane, savedIds, following, needle]);

  function preview(a: UnibudAudio) {
    if (!a.src) return;
    setPreviewId(a.audioId);
    const el = audioRef.current;
    if (!el) return;
    el.src = a.src;
    void el.play().catch(() => {});
  }

  function applyAudio(a: UnibudAudio) {
    const rights = rightsForOriginal(a, "PEAK");
    if (!rights.useAudio) return;
    attach(a);
    recordAudioEvent({ kind: "use", audioId: a.audioId, surface: "peek" });
    onClose?.();
  }

  const body = (
    <>
      <p className="text-xs text-paper/60">Add music or original audio to your Drop, Story, or Peek.</p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search music, songs, artists, or sounds…"
        className="mt-3 h-11 w-full rounded-full bg-paper/10 px-4 text-sm outline-none placeholder:text-paper/40"
      />
      <div className="mt-3 flex gap-4 overflow-x-auto text-[13px] font-semibold">
        {([
          ["foryou", "For You"],
          ["trending", "Trending"],
          ["original", "Original"],
          ["saved", "Saved"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn("shrink-0 pb-1", lane === id ? "text-paper" : "text-paper/40")}
            onClick={() => setLane(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-3 max-h-[46vh] space-y-1 overflow-y-auto">
        {!UnibudMusic.ready() && (lane === "foryou" || q.trim()) ? (
          <p className="mb-3 text-[11px] text-paper/45">Music catalogue — licensed songs appear here when a partner is connected.</p>
        ) : null}
        {list.map((a) => {
          const saved = savedIds.includes(a.audioId);
          const kind = a.sourceType === "LICENSED_MUSIC" ? "Song" : a.sourceType === "EXTERNAL_MUSIC_REFERENCE" ? "Listen" : "Original audio";
          const who = a.creatorHandle ? `@${a.creatorHandle}` : a.artistName ?? "";
          const canUse = rightsForOriginal(a, "PEAK").useAudio;
          return (
            <div key={a.audioId} className="flex items-center gap-3 rounded-2xl px-1 py-2">
              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-paper/10 text-[10px] font-semibold"
                onClick={() => preview(a)}
                aria-label={`Preview ${a.title}`}
              >
                {a.artwork ? <img src={a.artwork} alt="" className="size-11 rounded-xl object-cover" /> : previewId === a.audioId ? "▶" : "♪"}
              </button>
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => preview(a)}>
                <span className="block truncate text-sm font-medium">{a.title}</span>
                <span className="block truncate text-[11px] text-paper/55">
                  {kind}
                  {who ? ` · ${who}` : ""}
                  {dur(a.durationMs) ? ` · ${dur(a.durationMs)}` : ""}
                  {a.usageCount > 1 ? ` · ${a.usageCount} uses` : ""}
                </span>
              </button>
              <button
                type="button"
                className="grid size-10 place-items-center"
                aria-label={saved ? "Unsave" : "Save"}
                onClick={() => (saved ? unsaveAudio(a.audioId) : saveAudio(a.audioId))}
              >
                <Heart className={cn("size-4", saved && "fill-paper")} />
              </button>
              {canUse ? (
                <button type="button" className="h-9 rounded-full bg-paper px-3 text-xs font-semibold text-ink" onClick={() => applyAudio(a)}>
                  Use
                </button>
              ) : a.listenUrl ? (
                <a href={a.listenUrl} target="_blank" rel="noreferrer" className="h-9 rounded-full bg-paper/10 px-3 text-xs leading-9">
                  Listen
                </a>
              ) : null}
            </div>
          );
        })}
        {lane === "saved" && !list.length ? (
          <p className="py-6 text-center text-xs text-paper/50">Save audio you like. It stays here for Drops, Stories, and Peeks.</p>
        ) : null}
        {lane !== "saved" && !list.length ? (
          <p className="py-6 text-center text-xs text-paper/50">No original audio matches that yet.</p>
        ) : null}
      </div>
      {musicRef ? (
        <p className="mt-3 text-[11px] text-paper/70">
          On this {musicRef.sourceType === "ORIGINAL_AUDIO" ? "original" : "track"}: {musicRef.title}
          {musicRef.creatorHandle ? ` · @${musicRef.creatorHandle}` : ""}
        </p>
      ) : null}
      {mix.length ? (
        <ul className="mt-2 space-y-1">
          {mix.map((t) => (
            <li key={t.id} className="flex items-center justify-between text-xs text-paper/70">
              <span className="truncate">{t.name}</span>
              <button type="button" onClick={() => removeMix(t.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <audio ref={audioRef} className="hidden" />
    </>
  );

  if (embedded) return <div className="text-paper">{body}</div>;

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-[1.5rem] bg-ink/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-paper">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">Audio</p>
        <button type="button" className="h-10 px-2 text-sm text-paper/60" onClick={onClose}>
          Close
        </button>
      </div>
      {body}
    </div>
  );
}
