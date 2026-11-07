import { useRef, useState } from "react";
import { useStudioStore } from "@/lib/studio/store";
import { cn } from "@/lib/utils";

const TABS = ["Recents", "Photos", "Videos", "Favorites", "Drafts"] as const;

export function LibraryDesk() {
  const library = useStudioStore((s) => s.library);
  const drafts = useStudioStore((s) => s.drafts);
  const setImage = useStudioStore((s) => s.setImage);
  const setVideo = useStudioStore((s) => s.setVideo);
  const addClip = useStudioStore((s) => s.addClip);
  const intent = useStudioStore((s) => s.intent);
  const addLibrary = useStudioStore((s) => s.addLibrary);
  const toggleFavorite = useStudioStore((s) => s.toggleFavorite);
  const loadDraft = useStudioStore((s) => s.loadDraft);
  const setView = useStudioStore((s) => s.setView);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Recents");
  const [q, setQ] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const items = library.filter((x) => {
    if (tab === "Photos") return x.kind === "photo";
    if (tab === "Videos") return x.kind === "video";
    if (tab === "Favorites") return x.favorite;
    return true;
  }).filter((x) => !q || x.album?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <div className="flex h-12 items-center justify-between px-3 pt-[env(safe-area-inset-top)]">
        <button type="button" className="h-11 text-sm font-semibold" onClick={() => setView("camera")}>
          Camera
        </button>
        <p className="text-sm font-semibold">{intent === "peek" || intent === "reel" ? "Media · Peek" : intent === "story" ? "Media · Story" : "Library"}</p>
        <button type="button" className="h-11 text-sm font-semibold" onClick={() => fileRef.current?.click()}>
          Import
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple={intent !== "story"}
        className="hidden"
        onChange={(e) => {
          const files = intent === "story" ? [...(e.target.files ?? [])].slice(0, 1) : [...(e.target.files ?? [])];
          e.target.value = "";
          files.forEach((f) => {
            const src = URL.createObjectURL(f);
            const kind = f.type.startsWith("video") ? "video" : "photo";
            addLibrary({ id: `lib-${Date.now()}-${f.name}`, kind, src, createdAt: new Date().toISOString() });
          });
        }}
      />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search albums, type…"
        className="mx-4 h-11 rounded-full bg-secondary px-4 text-sm outline-none"
      />
      <div className="mt-3 flex gap-3 overflow-x-auto px-4">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn("shrink-0 pb-2 text-[11px] font-semibold tracking-wide uppercase", tab === t ? "text-ink" : "text-muted-foreground")}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Drafts" ? (
        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {drafts.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => loadDraft(d.id)}
              className="flex w-full items-center gap-3 rounded-2xl bg-card px-3 py-3 text-left ring-1 ring-border"
            >
              {d.image ? <img src={d.image} alt="" className="size-12 rounded-lg object-cover" /> : <span className="size-12 rounded-lg bg-secondary" />}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{d.caption || d.kind}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(d.updatedAt).toLocaleString()}</p>
              </div>
            </button>
          ))}
          {!drafts.length ? <p className="pt-8 text-center text-sm text-muted-foreground">No drafts yet.</p> : null}
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-3 gap-1 overflow-y-auto p-1">
          {items.map((x) => (
            <button
              key={x.id}
              type="button"
              className="relative aspect-square overflow-hidden bg-secondary"
              onClick={() => {
                if (x.kind === "video") {
                  if (intent === "reel" || intent === "peek") {
                    addClip({ id: `c-${Date.now()}`, src: x.src, duration: 0, trimStart: 0, trimEnd: 0, speed: 1 });
                    setView("video");
                    return;
                  }
                  setVideo(x.src);
                  return;
                }
                setImage(x.src, x.src);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                toggleFavorite(x.id);
              }}
            >
              {x.kind === "video" ? (
                <video src={x.src} className="size-full object-cover" muted />
              ) : (
                <img src={x.src} alt="" className="size-full object-cover" />
              )}
              {x.favorite ? <span className="absolute top-1 right-1 size-2 rounded-full bg-bud" /> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
