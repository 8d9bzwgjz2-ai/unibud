import type { ChatShare } from "@/lib/media/share";
import { Link } from "@tanstack/react-router";
import { BUD_MEDIA } from "@/lib/media/bud-media";
import { mediaUrl } from "@/lib/media/types";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { recordAudioEvent } from "@/lib/music/events";

export type { ChatShare };

function srcOf(share: ChatShare) {
  if (share.mediaId) return mediaUrl(share.mediaId);
  return share.src;
}

export function ShareCard({ share }: { share: ChatShare }) {
  const originals = useCampusStore((s) => s.originalAudios ?? []);
  const saveAudio = useCampusStore((s) => s.saveAudio);
  const src = srcOf(share);

  if (share.kind === "photo" && src) {
    return <img src={src} alt="" className="mt-2 max-h-48 w-full rounded-xl object-cover" />;
  }
  if (share.kind === "video" && src) {
    return <video src={src} className="mt-2 max-h-56 w-full rounded-xl" controls playsInline />;
  }
  if (share.kind === "file") {
    return (
      <a href={src} className="mt-2 block text-xs underline" download>
        {share.title ?? "File"}
      </a>
    );
  }
  if (share.kind === "audio") {
    const a = originals.find((x) => x.audioId === share.audioId);
    const title = a?.title ?? share.title ?? "Original audio";
    const who = a?.creatorHandle ? `@${a.creatorHandle}` : "";
    const audioSrc = src || a?.src;
    return (
      <div className="mt-2 rounded-2xl bg-background/40 p-3">
        <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">Original audio</p>
        <p className="mt-1 text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{who}{a?.usageCount ? ` · ${a.usageCount} use${a.usageCount === 1 ? "" : "s"}` : ""}</p>
        <div className="mt-2 flex gap-3 text-xs font-medium">
          {audioSrc ? <audio src={audioSrc} className="h-8 w-28" controls /> : null}
          {share.audioId ? (
            <Link to="/audio/$id" params={{ id: share.audioId }} className="leading-8">
              Open
            </Link>
          ) : null}
          {share.audioId ? (
            <button
              type="button"
              onClick={() => {
                saveAudio(share.audioId!);
                recordAudioEvent({ kind: "save", audioId: share.audioId, surface: "chat" });
              }}
            >
              Save
            </button>
          ) : null}
        </div>
      </div>
    );
  }
  if (share.kind === "bud") {
    const m = BUD_MEDIA.find((x) => x.id === share.budMediaId);
    return (
      <div className="mt-2 rounded-2xl bg-background/40 p-3">
        <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-bud">Bud</p>
        <p className="mt-1 text-sm font-semibold">{m?.title ?? share.title}</p>
        <p className="text-xs text-muted-foreground">
          {m?.kind === "podcast" ? "Lecturer podcast" : m?.kind ?? "Academic media"}
          {m ? ` · ${m.durationMin} min` : ""}
        </p>
        <div className="mt-2 flex gap-3 text-xs font-medium">
          {src ? <audio src={src} className="h-8 w-36" controls /> : <span className="text-muted-foreground">Open in Bud to play</span>}
          <Link
            to="/bud"
            onClick={() => {
              if (share.budMediaId) sessionStorage.setItem("unibud-bud-media", share.budMediaId);
            }}
          >
            Open in Bud
          </Link>
        </div>
      </div>
    );
  }
  return share.title ? <p className="mt-1 text-sm">{share.title}</p> : null;
}
