import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, MoreHorizontal, Paperclip, Phone, Send, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/unibud/person";
import { SignInCard, useAuthReady } from "@/components/unibud/sign-in-gate";
import { personByHandle } from "@/lib/unibud/catalog";
import { getConversation, sendMessage } from "@/lib/social/server";
import { persistAudioEvent, listRoomMessages, sendRoomMessage, uploadMedia } from "@/lib/media/server";
import { fileToDataUrl } from "@/lib/media/client";
import { mediaUrl } from "@/lib/media/types";
import { parseShareJson, type ChatShare } from "@/lib/media/share";
import { campusRoomById, ROOM_SEED, type CampusRoom } from "@/lib/unibud/chat-rooms";
import { canGovernClass } from "@/lib/unibud/roles";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { useStudioStore } from "@/lib/studio/store";
import { VideoCall } from "@/components/chat/video-call";
import { ShareCard } from "@/components/chat/share-card";
import { BUD_MEDIA } from "@/lib/media/bud-media";
import { recordAudioEvent } from "@/lib/music/events";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/messages/$id")({ component: Thread });

function Thread() {
  const { id } = Route.useParams();
  const room = campusRoomById(id);
  if (room) return <RoomThread room={room} />;
  return <DirectThread id={id} />;
}

function DirectThread({ id }: { id: string }) {
  const { user, isPending } = useAuthReady();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const q = useQuery({
    queryKey: ["convo", id],
    queryFn: () => getConversation({ data: id }),
    enabled: Boolean(user),
  });
  const mut = useMutation({
    mutationFn: (extra?: { body?: string; mediaId?: string; shareKind?: string; shareJson?: string }) =>
      sendMessage({
        data: {
          conversationId: id,
          body: extra?.body ?? body,
          mediaId: extra?.mediaId,
          shareKind: extra?.shareKind,
          shareJson: extra?.shareJson,
        },
      }),
    onSuccess: () => {
      setBody("");
      void qc.invalidateQueries({ queryKey: ["convo", id] });
      void qc.invalidateQueries({ queryKey: ["convos"] });
    },
  });

  if (isPending) return <div className="m-4 h-40 animate-pulse rounded-2xl bg-secondary" />;
  if (!user) {
    return (
      <main className="px-5 py-8">
        <SignInCard title="Sign in" body="Chats are private to your account." />
      </main>
    );
  }
  const person = personByHandle(q.data?.conversation.peerHandle ?? "");

  return (
    <main className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-card">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Avatar name={person?.name ?? "Student"} className="size-11" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{person?.name ?? q.data?.conversation.peerHandle}</p>
          <p className="text-xs text-success">Active now · Direct</p>
        </div>
        <CallButtons group={false} peer={person?.name ?? "them"} />
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        <p className="text-center text-xs text-muted-foreground">Today</p>
        {(q.data?.messages ?? []).map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
              m.sender === "me" ? "ml-auto bg-ink text-paper" : "bg-secondary text-foreground",
            )}
          >
            {m.body}
            {m.shareJson || m.mediaId ? (
              <ShareCard
                share={
                  parseShareJson(m.shareJson) ?? {
                    kind: (m.shareKind as ChatShare["kind"]) ?? "file",
                    mediaId: m.mediaId,
                    title: m.body,
                  }
                }
              />
            ) : null}
          </div>
        ))}
      </div>
      <Composer
        body={body}
        setBody={setBody}
        placeholder={`Message ${person?.name.split(" ")[0] ?? ""}…`}
        onSend={() => {
          if (body.trim()) mut.mutate();
        }}
        pending={mut.isPending}
        conversationId={id}
        onShare={(share) => {
          void mut.mutateAsync({
            body: share.title ?? "",
            mediaId: share.mediaId,
            shareKind: share.kind,
            shareJson: JSON.stringify(share),
          });
          if (share.audioId) {
            recordAudioEvent({ kind: "share", audioId: share.audioId, surface: "chat" });
            void persistAudioEvent({ data: { kind: "share", audioId: share.audioId, surface: "chat" } });
          }
          void persistAudioEvent({ data: { kind: "chat_media_sent", surface: "chat" } });
        }}
        onCamera={() => {
          useCampusStore.getState().setComposeOpen(true);
          useStudioStore.getState().setDest("message", id);
          useStudioStore.getState().setView("camera");
        }}
      />
    </main>
  );
}

function RoomThread({ room }: { room: CampusRoom }) {
  const { user, isPending } = useAuthReady();
  const qc = useQueryClient();
  const role = useCampusStore((s) => s.role ?? "student");
  const [body, setBody] = useState("");
  const q = useQuery({
    queryKey: ["room", room.id],
    queryFn: () => listRoomMessages({ data: room.id }),
    enabled: Boolean(user),
  });
  const mut = useMutation({
    mutationFn: (extra?: { body?: string; mediaId?: string; shareKind?: string; shareJson?: string }) =>
      sendRoomMessage({
        data: {
          roomId: room.id,
          senderName: "You",
          body: extra?.body ?? body,
          mediaId: extra?.mediaId,
          shareKind: extra?.shareKind,
          shareJson: extra?.shareJson,
        },
      }),
    onSuccess: () => {
      setBody("");
      void qc.invalidateQueries({ queryKey: ["room", room.id] });
    },
  });

  const sentPending = useRef(false);
  useEffect(() => {
    if (sentPending.current || !user) return;
    const pending = useCampusStore.getState().pendingShare;
    if (!pending) return;
    sentPending.current = true;
    void mut.mutateAsync({
      body: pending.title ?? "",
      mediaId: pending.mediaId,
      shareKind: pending.kind,
      shareJson: JSON.stringify(pending),
    });
    useCampusStore.getState().setPendingShare(undefined);
  }, [user]);

  if (isPending) return <div className="m-4 h-40 animate-pulse rounded-2xl bg-secondary" />;
  if (!user) {
    return (
      <main className="px-5 py-8">
        <SignInCard title="Sign in" body="Class, study and community chats are private." />
      </main>
    );
  }

  const canCall =
    room.kind === "study" ||
    room.kind === "group" ||
    (room.kind === "class" && canGovernClass(role));

  return (
    <main className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-card">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{room.title}</p>
          <p className="text-xs text-muted-foreground">
            {room.kind} chat · {room.subtitle}
          </p>
        </div>
        {room.communityId ? (
          <Link
            to="/communities/$id"
            params={{ id: room.communityId }}
            className="text-xs font-medium text-bud"
          >
            Space
          </Link>
        ) : null}
        <CallButtons
          group
          disabled={!canCall}
          onCall={() =>
            toast.message(
              canCall
                ? "Demo group call — nobody is on a real line."
                : "Class governors start class calls. Study groups can call among themselves.",
            )
          }
        />
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {(ROOM_SEED[room.id] ?? []).map((m, i) => (
          <div
            key={`seed-${i}`}
            className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
              m.sender === "You" ? "ml-auto bg-ink text-paper" : "bg-secondary text-foreground",
            )}
          >
            {m.sender !== "You" ? (
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">{m.sender}</p>
            ) : null}
            {m.body}
          </div>
        ))}
        {(q.data ?? []).map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
              m.sender === "You" ? "ml-auto bg-ink text-paper" : "bg-secondary text-foreground",
            )}
          >
            {m.sender !== "You" ? (
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">{m.sender}</p>
            ) : null}
            {m.body}
            {m.shareJson || m.mediaId ? (
              <ShareCard
                share={
                  parseShareJson(m.shareJson) ?? {
                    kind: (m.shareKind as ChatShare["kind"]) ?? "file",
                    mediaId: m.mediaId,
                    title: m.body,
                  }
                }
              />
            ) : null}
          </div>
        ))}
      </div>
      <Composer
        body={body}
        setBody={setBody}
        placeholder={`Message ${room.title}…`}
        onSend={() => {
          const t = body.trim();
          if (!t) return;
          void mut.mutateAsync({ body: t });
        }}
        pending={mut.isPending}
        roomId={room.id}
        onShare={(share) => {
          void mut.mutateAsync({
            body: share.title ?? "",
            mediaId: share.mediaId,
            shareKind: share.kind,
            shareJson: JSON.stringify(share),
          });
        }}
      />
    </main>
  );
}

function CallButtons({
  group,
  disabled,
  onCall,
  peer = "them",
}: {
  group: boolean;
  disabled?: boolean;
  onCall?: () => void;
  peer?: string;
}) {
  const [video, setVideo] = useState(false);
  return (
    <>
      {video ? <VideoCall peer={peer} onEnd={() => setVideo(false)} /> : null}
      <button
        type="button"
        className="grid size-11 place-items-center text-muted-foreground disabled:opacity-40"
        aria-label={group ? "Group call" : "Call"}
        disabled={disabled}
        onClick={() => (onCall ? onCall() : toast.message("Voice needs a connected call service. Video is available now."))}
      >
        <Phone className="size-5" />
      </button>
      <button
        type="button"
        className="grid size-11 place-items-center text-muted-foreground"
        aria-label="Video call"
        onClick={() => setVideo(true)}
      >
        <Video className="size-5" />
      </button>
      <button type="button" className="grid size-11 place-items-center text-muted-foreground" aria-label="More">
        <MoreHorizontal className="size-5" />
      </button>
    </>
  );
}

function Composer({
  body,
  setBody,
  placeholder,
  onSend,
  pending,
  onCamera,
  onShare,
  conversationId,
  roomId,
}: {
  body: string;
  setBody: (v: string) => void;
  placeholder: string;
  onSend: () => void;
  pending: boolean;
  onCamera?: () => void;
  onShare?: (share: ChatShare) => void;
  conversationId?: string;
  roomId?: string;
}) {
  const [menu, setMenu] = useState(false);
  const [pick, setPick] = useState<"audio" | "bud" | null>(null);
  const [busy, setBusy] = useState(false);
  const originals = useCampusStore((s) => s.originalAudios ?? []);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function sendFile(file: File, kind: ChatShare["kind"]) {
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const r = await uploadMedia({
        data: { dataUrl, fileName: file.name, mime: file.type, kind: kind === "file" ? "file" : kind === "photo" ? "photo" : kind === "video" ? "video" : "audio", conversationId, roomId },
      });
      if (!r.ok) {
        toast.message(r.error);
        return;
      }
      onShare?.({ kind, mediaId: r.id, title: file.name, src: mediaUrl(r.id) });
    } catch {
      toast.message("Could not send that file.");
    } finally {
      setBusy(false);
      setMenu(false);
    }
  }

  return (
    <div className="sheet-safe border-t border-border px-3 pt-3">
      {menu ? (
        <div className="mb-2 flex flex-wrap gap-2 text-xs font-medium">
          <button type="button" className="rounded-full bg-secondary px-3 py-2" onClick={() => photoRef.current?.click()}>
            Photo
          </button>
          <button type="button" className="rounded-full bg-secondary px-3 py-2" onClick={() => videoRef.current?.click()}>
            Video
          </button>
          <button type="button" className="rounded-full bg-secondary px-3 py-2" onClick={() => setPick("audio")}>
            Audio
          </button>
          <button type="button" className="rounded-full bg-secondary px-3 py-2" onClick={() => fileRef.current?.click()}>
            File
          </button>
          <button type="button" className="rounded-full bg-secondary px-3 py-2" onClick={() => setPick("bud")}>
            Bud
          </button>
          {busy ? <span className="text-muted-foreground">Sending…</span> : null}
        </div>
      ) : null}
      {pick === "audio" ? (
        <div className="mb-2 max-h-36 overflow-y-auto rounded-2xl bg-secondary p-2">
          {originals.map((a) => (
            <button
              key={a.audioId}
              type="button"
              className="block w-full rounded-xl px-2 py-2 text-left text-xs"
              onClick={() => {
                onShare?.({ kind: "audio", audioId: a.audioId, title: a.title });
                setPick(null);
                setMenu(false);
              }}
            >
              Original audio · @{a.creatorHandle} — {a.title}
            </button>
          ))}
        </div>
      ) : null}
      {pick === "bud" ? (
        <div className="mb-2 rounded-2xl bg-secondary p-2">
          {BUD_MEDIA.map((m) => (
            <button
              key={m.id}
              type="button"
              className="block w-full rounded-xl px-2 py-2 text-left text-xs"
              onClick={() => {
                onShare?.({ kind: "bud", budMediaId: m.id, title: m.title, duration: `${m.durationMin} min` });
                setPick(null);
                setMenu(false);
              }}
            >
              Bud · {m.title} · {m.durationMin} min
            </button>
          ))}
        </div>
      ) : null}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <button
          type="button"
          className="grid size-11 place-items-center text-muted-foreground"
          aria-label="Attach"
          onClick={() => setMenu((v) => !v)}
        >
          <Paperclip className="size-5" />
        </button>
        <button
          type="button"
          className="grid size-11 place-items-center text-muted-foreground"
          aria-label="Camera"
          onClick={onCamera}
        >
          <ImageIcon className="size-5" />
        </button>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder}
          className="h-11 flex-1 rounded-full bg-secondary px-4 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={pending || busy || !body.trim()}
          className="grid size-11 place-items-center text-ink disabled:text-muted-foreground"
          aria-label="Send"
        >
          <Send className="size-5" />
        </button>
      </form>
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          void sendFile(f, "photo");
          setMenu(false);
        }}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          void sendFile(f, "video");
          setMenu(false);
        }}
      />
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          void sendFile(f, "file");
        }}
      />
    </div>
  );
}

