import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Mic,
  MoreHorizontal,
  Paperclip,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SignInCard, useAuthReady } from "@/components/unibud/sign-in-gate";
import { Avatar } from "@/components/unibud/person";
import {
  askBud,
  deleteBudConversation,
  getBudThread,
  listBudConversations,
  retryBud,
} from "@/lib/bud/server";
import type { BudMessage } from "@/lib/unibud/types";
import { cn } from "@/lib/utils";
import { takeBudDraft } from "@/lib/bud/draft";
import { BudRichText } from "@/components/bud/rich-text";
import { ThreadMedia } from "@/components/bud/thread-media";
import { useBudVoice } from "@/components/bud/use-bud-voice";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { uploadMedia } from "@/lib/media/server";
import { fileToDataUrl } from "@/lib/media/client";
import { mediaUrl } from "@/lib/media/types";
import { recordAudioEvent } from "@/lib/music/events";
import type { BudThreadMedia } from "@/lib/unibud/types";

const ACTIVE_KEY = "unibud-bud-active";
const EMPTY_ATLAS = { lastGoal: "", understood: [] as string[], struggles: [] as string[], likes: [] as string[] };

function timeLabel(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function BudWorkspace() {
  const { user, isPending } = useAuthReady();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(ACTIVE_KEY);
  });
  const [freshChat, setFreshChat] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const recChunks = useRef<Blob[]>([]);
  const [attachment, setAttachment] = useState<{
    name: string;
    kind: string;
    excerpt?: string;
    media?: BudThreadMedia;
  } | null>(null);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const voice = useBudVoice();
  const atlas = useCampusStore((s) => s.budAtlas) ?? EMPTY_ATLAS;
  const interests = useCampusStore((s) => s.interests);

  const convos = useQuery({
    queryKey: ["bud-convos"],
    queryFn: () => listBudConversations(),
    enabled: Boolean(user),
  });

  useEffect(() => {
    const id = sessionStorage.getItem("unibud-bud-media");
    if (!id) return;
    sessionStorage.removeItem("unibud-bud-media");
    recordAudioEvent({ kind: "bud_media_open", budMediaId: id, surface: "bud" });
  }, []);

  useEffect(() => {
    const draft = takeBudDraft();
    if (draft) setPrompt(draft);
  }, []);

  const thread = useQuery({
    queryKey: ["bud", activeId],
    queryFn: () => getBudThread({ data: { conversationId: activeId ?? undefined } }),
    enabled: Boolean(user) && Boolean(activeId),
  });

  const messages: BudMessage[] = activeId ? (thread.data ?? []) : [];
  const empty = !activeId || messages.length === 0;

  useEffect(() => {
    if (activeId) sessionStorage.setItem(ACTIVE_KEY, activeId);
    else sessionStorage.removeItem(ACTIVE_KEY);
  }, [activeId]);

  useEffect(() => {
    if (freshChat) return;
    if (!activeId && convos.data?.length) {
      setActiveId(convos.data[0].id);
    }
  }, [activeId, convos.data, freshChat]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, thread.isFetching]);

  const ask = useMutation({
    mutationFn: (input: { text: string; media?: BudThreadMedia }) =>
      askBud({
        data: {
          prompt: input.text,
          conversationId: activeId ?? undefined,
          attachment: attachment
            ? { name: attachment.name, kind: attachment.kind, excerpt: attachment.excerpt }
            : input.media
              ? { name: input.media.name ?? "media", kind: input.media.kind }
              : undefined,
          media: input.media ?? attachment?.media,
          fromPath: typeof window !== "undefined" ? sessionStorage.getItem("unibud-last-path") ?? undefined : undefined,
          atlas: {
            lastGoal: atlas?.lastGoal,
            understood: atlas?.understood,
            struggles: atlas?.struggles,
            likes: atlas?.likes?.length ? atlas.likes : interests,
          },
        },
      }),
    onSuccess: async (r) => {
      setPrompt("");
      setAttachment(null);
      setPendingUser(null);
      setFreshChat(false);
      if ("conversationId" in r && r.conversationId && r.conversationId !== activeId) {
        setActiveId(r.conversationId);
      }
      await qc.invalidateQueries({ queryKey: ["bud"] });
      await qc.invalidateQueries({ queryKey: ["bud-convos"] });
    },
    onError: () => setPendingUser(null),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBudConversation({ data: { id } }),
    onSuccess: async (_, id) => {
      if (activeId === id) setActiveId(null);
      await qc.invalidateQueries({ queryKey: ["bud-convos"] });
      await qc.invalidateQueries({ queryKey: ["bud"] });
    },
  });

  const retry = useMutation({
    mutationFn: () => retryBud({ data: { conversationId: activeId! } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["bud"] });
    },
  });

  function send(text: string) {
    const t = text.trim();
    if ((!t && !attachment?.media) || ask.isPending) return;
    const outgoing = !t ? (attachment?.media?.kind === "voice" ? "Voice note" : "Sent media") : t;
    setPendingUser(outgoing);
    setPrompt("");
    ask.mutate({ text: outgoing, media: attachment?.media });
  }

  function close() {
    if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
    else void navigate({ to: "/" });
  }

  async function onFile(file: File | undefined) {
    if (!file) return null;
    let excerpt: string | undefined;
    if (file.type.startsWith("text/") && file.size < 80_000) {
      excerpt = (await file.text()).slice(0, 2000);
    }
    let media: BudThreadMedia | undefined;
    const kind: BudThreadMedia["kind"] = file.type.startsWith("image/")
      ? file.type.includes("gif")
        ? "gif"
        : "image"
      : file.type.startsWith("audio/")
        ? "audio"
        : "file";
    try {
      const dataUrl = await fileToDataUrl(file);
      const up = await uploadMedia({ data: { dataUrl, fileName: file.name, mime: file.type } });
      media = {
        kind,
        name: file.name,
        status: "ready",
        mediaId: up.ok ? up.id : undefined,
        src: up.ok ? mediaUrl(up.id) : dataUrl,
      };
    } catch {
      media = { kind, name: file.name, status: "failed" };
    }
    const next = { name: file.name, kind: file.type || "file", excerpt, media };
    setAttachment(next);
    return next;
  }

  async function toggleVoiceNote() {
    if (recording) {
      recRef.current?.stop();
      recRef.current?.stream.getTracks().forEach((t) => t.stop());
      recRef.current = null;
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recChunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) recChunks.current.push(e.data);
      };
      rec.onstop = () => {
        void (async () => {
          const blob = new Blob(recChunks.current, { type: rec.mimeType || "audio/webm" });
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
          const next = await onFile(file);
          if (next?.media) {
            next.media.kind = "voice";
            next.name = "Voice note";
            setAttachment(next);
            setPendingUser("Voice note");
            ask.mutate({ text: "Voice note", media: { ...next.media, kind: "voice" } });
          }
        })();
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      const ok = voice.listen((t) => send(t));
      if (!ok) setPrompt((p) => p || "Microphone isn’t available. Type instead.");
    }
  }

  if (isPending) {
    return (
      <div className="fixed inset-0 z-40 bg-background">
        <div className="mx-auto mt-24 h-40 max-w-3xl animate-pulse rounded-2xl bg-secondary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-background pt-[env(safe-area-inset-top)]">
        <BudTop onClose={close} onMenu={() => {}} />
        <div className="mx-auto w-full max-w-3xl px-5 py-10">
          <SignInCard
            title="Talk to Bud"
            body="Sign in so Bud can keep this conversation with you."
          />
        </div>
      </div>
    );
  }

  const failed = ask.isError || (ask.data && ask.data.ok === false);
  const busy = ask.isPending || retry.isPending;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <div className="border-b border-border pt-[env(safe-area-inset-top)]">
        <BudTop
          onClose={close}
          onMenu={() => {
            setMenuOpen((v) => !v);
            setHistoryOpen(false);
          }}
        />
      </div>

      {menuOpen ? (
        <div className="absolute top-[calc(env(safe-area-inset-top)+3.5rem)] right-3 z-50 w-56 rounded-2xl bg-card p-1 shadow-soft ring-1 ring-border">
          <button
            type="button"
            className="flex h-11 w-full items-center gap-2 rounded-xl px-3 text-sm hover:bg-secondary"
            onClick={() => {
              setFreshChat(true);
              setActiveId(null);
              sessionStorage.removeItem(ACTIVE_KEY);
              setHistoryOpen(false);
              setMenuOpen(false);
            }}
          >
            <Plus className="size-4" /> New conversation
          </button>
          <button
            type="button"
            className="flex h-11 w-full items-center gap-2 rounded-xl px-3 text-sm hover:bg-secondary"
            onClick={() => {
              setHistoryOpen(true);
              setMenuOpen(false);
            }}
          >
            History
          </button>
          {activeId ? (
            <button
              type="button"
              className="flex h-11 w-full items-center gap-2 rounded-xl px-3 text-sm text-destructive hover:bg-secondary"
              onClick={() => {
                remove.mutate(activeId);
                setMenuOpen(false);
              }}
            >
              <Trash2 className="size-4" /> Delete conversation
            </button>
          ) : null}
        </div>
      ) : null}

      {historyOpen ? (
        <div className="absolute inset-0 z-50 flex flex-col bg-background pt-[env(safe-area-inset-top)]">
          <div className="flex h-12 items-center justify-between px-2">
            <p className="px-3 text-sm font-medium">Conversations</p>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-full"
              aria-label="Close history"
              onClick={() => setHistoryOpen(false)}
            >
              <X className="size-5" />
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto px-3 pb-8">
            {(convos.data ?? []).length === 0 ? (
              <p className="px-3 py-8 text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              (convos.data ?? []).map((c) => (
                <li key={c.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    className="min-w-0 flex-1 rounded-xl px-3 py-3 text-left hover:bg-secondary"
                    onClick={() => {
                      setActiveId(c.id);
                      setHistoryOpen(false);
                    }}
                  >
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    {c.preview ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.preview}</p>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="grid size-11 place-items-center text-muted-foreground"
                    aria-label={`Delete ${c.title}`}
                    onClick={() => remove.mutate(c.id)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      <div ref={scroller} className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-y-auto overscroll-contain px-4">
        {empty && !busy && !pendingUser ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <Avatar name="Bud" className="size-16 text-base" />
            <p className="mt-3 text-sm font-semibold">Bud</p>
            <p className="mt-1 text-xs text-muted-foreground">Direct message</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-5">
            <p className="text-center text-xs text-muted-foreground">Today</p>
            {messages.map((m) => (
              <div key={m.id} className={cn("max-w-[80%]", m.role === "user" ? "ml-auto" : "mr-auto")}>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user" ? "bg-ink text-paper" : "bg-secondary text-foreground",
                  )}
                >
                  {m.role === "assistant" ? <BudRichText text={m.content} /> : m.content}
                  {m.media ? <ThreadMedia media={m.media} /> : null}
                </div>
                <p className={cn("mt-1 text-[11px] text-muted-foreground", m.role === "user" && "text-right")}>
                  {timeLabel(m.createdAt)}
                </p>
              </div>
            ))}
            {pendingUser ? (
              <div className="ml-auto max-w-[80%]">
                <div className="rounded-2xl bg-ink px-4 py-2.5 text-sm leading-relaxed text-paper">
                  {pendingUser}
                  {attachment?.media ? <ThreadMedia media={attachment.media} /> : null}
                </div>
              </div>
            ) : null}
            {busy ? (
              <div className="mr-auto max-w-[80%] rounded-2xl bg-secondary px-4 py-2.5 text-sm text-muted-foreground">
                typing…
              </div>
            ) : null}
            {failed && !busy ? (
              <div className="flex items-center justify-center gap-2">
                <p className="text-sm text-muted-foreground">Message didn’t send.</p>
                <button
                  type="button"
                  className="h-9 rounded-full px-3 text-sm font-medium ring-1 ring-border"
                  onClick={() => activeId && retry.mutate()}
                >
                  Try again
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <form
        className="mx-auto w-full max-w-3xl border-t border-border px-3 pt-2"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        onSubmit={(e) => {
          e.preventDefault();
          send(prompt);
        }}
      >
        {attachment ? (
          <div className="mb-2 overflow-hidden rounded-2xl bg-secondary px-3 py-2 text-xs">
            {attachment.media ? <ThreadMedia media={attachment.media} /> : <span className="truncate">{attachment.name}</span>}
            <button type="button" className="mt-1 text-muted-foreground" onClick={() => setAttachment(null)}>
              Remove
            </button>
          </div>
        ) : null}
        {recording ? <p className="mb-2 text-xs text-muted-foreground">Recording a voice note… tap the mic to send.</p> : null}
        <div className="flex items-end gap-1">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center text-muted-foreground"
            aria-label="Attach a file"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="size-5" />
          </button>
          <button
            type="button"
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-full",
              recording || voice.listening ? "bg-ink text-paper" : "text-muted-foreground",
            )}
            aria-label={recording ? "Stop voice note" : "Voice note"}
            onClick={() => void toggleVoiceNote()}
          >
            <Mic className="size-5" />
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            value={prompt}
            placeholder="Message"
            className="max-h-28 min-h-11 flex-1 resize-none rounded-3xl bg-secondary px-4 py-3 text-sm outline-none"
            onChange={(e) => {
              setPrompt(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 112)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(prompt);
              }
            }}
          />
          <button
            type="submit"
            disabled={busy || (!prompt.trim() && !attachment?.media)}
            aria-label="Send"
            className="grid size-11 shrink-0 place-items-center text-ink disabled:text-muted-foreground"
          >
            <Send className="size-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

function BudTop({ onClose, onMenu }: { onClose: () => void; onMenu: () => void }) {
  return (
    <header className="mx-auto flex h-14 w-full max-w-3xl items-center gap-1 px-1">
      <button
        type="button"
        onClick={onClose}
        className="grid size-11 place-items-center rounded-full"
        aria-label="Back"
      >
        <ChevronLeft className="size-5" />
      </button>
      <Avatar name="Bud" className="size-9" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">Bud</p>
        <p className="text-xs text-muted-foreground">Direct</p>
      </div>
      <button
        type="button"
        onClick={onMenu}
        className="grid size-11 place-items-center rounded-full"
        aria-label="Conversation actions"
      >
        <MoreHorizontal className="size-5" />
      </button>
    </header>
  );
}
