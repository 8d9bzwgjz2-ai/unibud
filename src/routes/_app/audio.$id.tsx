import { createFileRoute, Link } from "@tanstack/react-router";
import { personByHandle } from "@/lib/unibud/catalog";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { UnibudMusic } from "@/lib/music";
import type { UnibudAudio } from "@/lib/music/audio";
import { useStudioStore } from "@/lib/studio/store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/audio/$id")({ component: AudioPage });

function AudioPage() {
  const { id } = Route.useParams();
  const originals = useCampusStore((s) => s.originalAudios ?? []);
  const saved = useCampusStore((s) => s.savedAudioIds ?? []);
  const saveAudio = useCampusStore((s) => s.saveAudio);
  const unsaveAudio = useCampusStore((s) => s.unsaveAudio);
  const reportAudio = useCampusStore((s) => s.reportAudio);
  const setComposeOpen = useCampusStore((s) => s.setComposeOpen);
  const localPosts = useCampusStore((s) => s.localPosts);
  const found = originals.find((a) => a.audioId === id);
  if (!found) {
    return (
      <main className="px-5 py-10">
        <p className="text-sm text-muted-foreground">That audio isn’t on UNIBUD.</p>
        <Link to="/" className="mt-3 inline-block text-sm font-medium">
          Back to Square
        </Link>
      </main>
    );
  }
  const audio: UnibudAudio = found;

  const person = personByHandle(audio.creatorHandle ?? "");
  const uses = localPosts.filter((p) => p.audioId === audio.audioId || audio.usedBy.includes(p.id));
  const on = saved.includes(audio.audioId);

  function useIt() {
    if (audio.status === "removed" || audio.status === "restricted") {
      toast.message("This audio isn’t available.");
      return;
    }
    const studio = useStudioStore.getState();
    studio.snapshot();
    studio.addMix({
      id: `oa-${audio.audioId}`,
      kind: "catalogue",
      name: audio.title,
      src: audio.src,
      volume: 0.85,
      mute: false,
      fadeIn: 0,
      fadeOut: 0,
      artistName: person?.name ?? audio.creatorHandle,
      trackId: audio.audioId,
    });
    studio.setMusicRef({
      providerId: "unibud-original",
      trackId: audio.audioId,
      audioId: audio.audioId,
      title: audio.title,
      artistName: person?.name ?? audio.creatorHandle,
      startMs: 0,
      durationMs: audio.durationMs,
      entitlement: "free",
      sourceType: "ORIGINAL_AUDIO",
      creatorHandle: audio.creatorHandle,
    });
    studio.setView("camera");
    setComposeOpen(true);
    toast.message(`Using “${audio.title}” — still ${person?.name ?? audio.creatorHandle}’s original.`);
  }

  return (
    <main className="px-5 py-6">
      <p className="kicker">{audio.sourceType === "LICENSED_MUSIC" ? "Music" : "Original audio"}</p>
      <h1 className="mt-2 font-display text-4xl">{audio.title}</h1>
      {audio.sourceType === "ORIGINAL_AUDIO" ? (
        <p className="mt-2 text-sm text-muted-foreground">
          by{" "}
          {audio.creatorHandle ? (
            <Link to="/u/$handle" params={{ handle: audio.creatorHandle }} className="font-medium text-ink">
              {person?.name ?? audio.creatorHandle}
            </Link>
          ) : (
            "a UNIBUD creator"
          )}
          {audio.claimedOriginal ? " · claimed original — reports still apply" : null}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{audio.artistName} · licensed catalogue</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        {audio.usageCount} use{audio.usageCount === 1 ? "" : "s"}
        {audio.durationMs ? ` · ${(audio.durationMs / 1000).toFixed(1)}s` : ""}
        {audio.status !== "active" ? ` · ${audio.status}` : ""}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={audio.sourceType === "LICENSED_MUSIC" && !UnibudMusic.ready()}
          onClick={() => {
            if (audio.src) {
              const el = document.getElementById("audio-preview") as HTMLAudioElement | null;
              void el?.play();
              return;
            }
            toast.message(
              audio.sourceType === "LICENSED_MUSIC"
                ? UnibudMusic.reason()
                : "This original has no detached stem yet. Use audio still attaches the credit.",
            );
          }}
        >
          Preview
        </Button>
        <Button size="sm" onClick={useIt} disabled={audio.status !== "active"}>
          Use audio
        </Button>
        <Button size="sm" variant="ghost" onClick={() => (on ? unsaveAudio(audio.audioId) : saveAudio(audio.audioId))}>
          {on ? "Saved" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => reportAudio(audio.audioId, "rights")}>
          Report
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            useCampusStore.getState().setPendingShare({ kind: "audio", audioId: audio.audioId, title: audio.title });
            void toast.message("Open a chat and attach Audio — or share from Chat.");
          }}
        >
          Share
        </Button>
      </div>
      {audio.src ? <audio id="audio-preview" className="mt-3 w-full" src={audio.src} controls /> : null}
      <p className="mt-8 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Used in</p>
      {uses.length ? (
        <ul className="mt-2 space-y-2">
          {uses.map((p) => (
            <li key={p.id} className="text-sm">
              <Link to="/" className="font-medium">
                @{p.authorHandle}
              </Link>
              <span className="text-muted-foreground"> — {p.body.slice(0, 80)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">The original post is the first use. Reuses will list here.</p>
      )}
      {!UnibudMusic.ready() && audio.sourceType === "LICENSED_MUSIC" ? (
        <p className="mt-6 text-xs text-muted-foreground">{UnibudMusic.reason()}</p>
      ) : null}
    </main>
  );
}
