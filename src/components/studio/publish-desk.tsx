import { useState } from "react";
import { toast } from "sonner";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { createPost } from "@/lib/social/server";
import { sendMessage } from "@/lib/social/server";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { rasterize } from "@/lib/studio/photo";
import { runExport } from "@/lib/studio/export/engine";
import { useStudioStore } from "@/lib/studio/store";
import type { PublishDest } from "@/lib/studio/types";
import { originalFromPublish } from "@/lib/music/audio";

const DESTS: { id: PublishDest; label: string }[] = [
  { id: "square", label: "Square" },
  { id: "story", label: "Story" },
  { id: "peek", label: "Peek" },
  { id: "message", label: "Message" },
  { id: "save", label: "Save only" },
];

export function PublishDesk() {
  const dest = useStudioStore((s) => s.dest);
  const intent = useStudioStore((s) => s.intent);
  const setDest = useStudioStore((s) => s.setDest);
  const caption = useStudioStore((s) => s.caption);
  const setCaption = useStudioStore((s) => s.setCaption);
  const image = useStudioStore((s) => s.image);
  const original = useStudioStore((s) => s.originalImage);
  const video = useStudioStore((s) => s.video);
  const clips = useStudioStore((s) => s.clips);
  const adjust = useStudioStore((s) => s.adjust);
  const filterId = useStudioStore((s) => s.filterId);
  const filterAmount = useStudioStore((s) => s.filterAmount);
  const effectId = useStudioStore((s) => s.effectId);
  const overlays = useStudioStore((s) => s.overlays);
  const audience = useStudioStore((s) => s.audience);
  const setAudience = useStudioStore((s) => s.setAudience);
  const topic = useStudioStore((s) => s.topic);
  const setTopic = useStudioStore((s) => s.setTopic);
  const place = useStudioStore((s) => s.place);
  const setPlace = useStudioStore((s) => s.setPlace);
  const musicRef = useStudioStore((s) => s.musicRef);
  const mix = useStudioStore((s) => s.mix);
  const saveDraft = useStudioStore((s) => s.saveDraft);
  const addLibrary = useStudioStore((s) => s.addLibrary);
  const clearProject = useStudioStore((s) => s.clearProject);
  const messageId = useStudioStore((s) => s.messageId);
  const addPost = useCampusStore((s) => s.addPost);
  const registerOriginalAudio = useCampusStore((s) => s.registerOriginalAudio);
  const recordOriginalAudioUse = useCampusStore((s) => s.useOriginalAudio);
  const addStory = useCampusStore((s) => s.addStory);
  const setComposeOpen = useCampusStore((s) => s.setComposeOpen);
  const { user } = useCurrentUserState();
  const navigate = useNavigate();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function bakeImage() {
    if (!image) return undefined;
    try {
      return await rasterize(original ?? image, adjust, filterId, filterAmount, effectId, overlays, useStudioStore.getState().chroma);
    } catch {
      return image;
    }
  }

  async function go() {
    if (!user) {
      setComposeOpen(false);
      void navigate({ to: "/login" });
      return;
    }
    setBusy(true);
    try {
      const baked = await bakeImage();
      let clip = video ?? clips[0]?.src;
      if (clips.length) {
        try {
          const out = await runExport({
            clips,
            overlays,
            effectId,
            aspect: dest === "peek" || dest === "story" ? "9:16" : "16:9",
            chroma: useStudioStore.getState().chroma,
            mix: useStudioStore.getState().mix,
            originalAudio: true,
          });
          clip = URL.createObjectURL(out.blob);
          if (out.container !== "webm") toast.message(`Exported ${out.container}`);
          else if (out.notes[0]) toast.message(`${out.container.toUpperCase()} · ${out.engine}`);
        } catch {
          toast.message("Timeline preview is live; this browser kept the source clip for Drop.");
        }
      }
      if (dest === "save") {
        if (baked) addLibrary({ id: `lib-${Date.now()}`, kind: "photo", src: baked, createdAt: new Date().toISOString() });
        toast.success("Saved to library.");
        clearProject();
        setComposeOpen(false);
        return;
      }
      if (dest === "story") {
        addStory({
          id: `st-${Date.now()}`,
          image: baked,
          video: clip,
          caption,
          createdAt: new Date().toISOString(),
        });
        toast.success("On your Story.");
        clearProject();
        setComposeOpen(false);
        void navigate({ to: "/" });
        return;
      }
      if (dest === "message") {
        if (messageId) {
          const body = caption.trim() || (clip ? "Video" : "Photo");
          await sendMessage({ data: { conversationId: messageId, body: baked ? `${body}\n${baked}` : body } });
          toast.success("Sent.");
        } else {
          toast.message("Open a chat, then Drop to send there.");
        }
        clearProject();
        setComposeOpen(false);
        if (messageId) void navigate({ to: "/messages/$id", params: { id: messageId } });
        return;
      }
      const kind = intent === "reel" || dest === "peek" || clip ? "reel" : "post";
      const credit = musicRef
        ? `\n♪ ${musicRef.sourceType === "ORIGINAL_AUDIO" ? "Original audio" : "Music"} · ${musicRef.title}${musicRef.creatorHandle ? ` · @${musicRef.creatorHandle}` : musicRef.artistName ? ` · ${musicRef.artistName}` : ""}`
        : "";
      const r = await createPost({
        data: {
          communityId: "unilag-campus",
          body: (caption.trim() || (intent === "reel" ? "Reel" : kind === "reel" ? "Peek" : "Photo")) + credit,
          image: baked,
          video: clip,
          kind,
        },
      });
      addPost(r.body, r.handle, { image: baked, video: clip, id: r.id, audioId: musicRef?.audioId });
      if (musicRef?.sourceType === "ORIGINAL_AUDIO" && musicRef.audioId) {
        recordOriginalAudioUse(musicRef.audioId, r.id);
      } else if (mix.some((m) => m.kind === "voice" || m.kind === "file" || m.kind === "tone")) {
        const bed = mix.find((m) => m.kind === "voice" || m.kind === "file" || m.kind === "tone");
        registerOriginalAudio(
          originalFromPublish({
            title: bed?.name || caption.trim() || "Original audio",
            creatorHandle: r.handle,
            sourceContentId: r.id,
            src: bed?.src,
          }),
        );
      }
      await router.invalidate();
      toast.success(intent === "reel" || dest === "peek" || intent === "peek" ? "On Peek." : "Dropped to Square.");
      clearProject();
      setComposeOpen(false);
      if (dest === "peek" || intent === "reel" || intent === "peek") sessionStorage.setItem("unibud-square-mode", "peek");
      void navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not publish.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-background pt-[env(safe-area-inset-top)]">
      <div className="flex h-12 items-center justify-between px-2">
        <button type="button" className="h-11 px-2 text-sm" onClick={() => useStudioStore.getState().setView(video ? "video" : "photo")}>
          Back
        </button>
        <p className="text-sm font-semibold">Publish</p>
        <button type="button" className="h-11 px-2 text-sm" onClick={() => { saveDraft(); toast.success("Draft saved."); }}>
          Draft
        </button>
      </div>
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-5">
        {image ? <img src={image} alt="" className="mx-auto h-48 rounded-2xl object-cover" /> : null}
        {video && !image ? <video src={video} className="mx-auto h-48 rounded-2xl object-cover" muted /> : null}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption…"
          className="mt-4 min-h-24 w-full resize-none bg-transparent text-base outline-none"
        />
        <p className="mt-6 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Send to</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DESTS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDest(d.id)}
              className={dest === d.id ? "h-9 rounded-full bg-ink px-4 text-sm text-paper" : "h-9 rounded-full bg-card px-4 text-sm ring-1 ring-border"}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="mt-6 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Audience</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["everyone", "connections", "close", "me"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAudience(a)}
              className={audience === a ? "h-9 rounded-full bg-ink px-4 text-sm text-paper" : "h-9 rounded-full bg-card px-4 text-sm ring-1 ring-border"}
            >
              {a === "me" ? "Only me" : a === "close" ? "Close" : a === "connections" ? "Connections" : "Everyone"}
            </button>
          ))}
        </div>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic" className="mt-4 h-11 w-full rounded-2xl bg-secondary px-4 text-sm outline-none" />
        <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Place" className="mt-2 h-11 w-full rounded-2xl bg-secondary px-4 text-sm outline-none" />
      </div>
      <div className="mx-auto w-full max-w-3xl px-5 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <Button className="w-full" disabled={busy} onClick={() => void go()}>
          {dest === "save" ? "Save" : dest === "message" ? "Send" : "Publish"}
        </Button>
      </div>
    </div>
  );
}
