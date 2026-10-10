import type { BudThreadMedia } from "@/lib/unibud/types";
import { mediaUrl } from "@/lib/media/types";
import { cn } from "@/lib/utils";

export function ThreadMedia({ media, onRetry }: { media: BudThreadMedia; onRetry?: () => void }) {
  const src = media.src || (media.mediaId ? mediaUrl(media.mediaId) : undefined);
  if (media.status === "generating") {
    return <p className="mt-2 text-xs text-muted-foreground">Generating… staying in this chat.</p>;
  }
  if (media.status === "failed") {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        Couldn’t generate that. {onRetry ? <button type="button" className="font-medium" onClick={onRetry}>Try again</button> : "Try again."}
      </p>
    );
  }
  if ((media.kind === "audio" || media.kind === "voice") && src) {
    return (
      <audio className="mt-2 w-full max-w-[16rem]" src={src} controls preload="metadata" />
    );
  }
  if ((media.kind === "image" || media.kind === "gif") && src) {
    return <img src={src} alt="" className={cn("mt-2 max-h-64 w-full rounded-xl object-cover", media.kind === "gif" && "object-contain")} />;
  }
  if (media.kind === "file" && src) {
    return (
      <a href={src} className="mt-2 block text-xs underline" download>
        {media.name ?? "File"}
      </a>
    );
  }
  return null;
}