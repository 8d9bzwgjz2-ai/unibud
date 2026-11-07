import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUp,
  ChevronLeft,
  Download,
  Mic,
  MoreHorizontal,
  Paperclip,
  Plus,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SignInCard, useAuthReady } from "@/components/unibud/sign-in-gate";
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
import { BudRichText, plainBudText } from "@/components/bud/rich-text";
import { ThreadMedia } from "@/components/bud/thread-media";
import { useBudVoice } from "@/components/bud/use-bud-voice";
import { useCampusStore } from "@/lib/unibud/campus-store";
import { listBudMedia, uploadMedia } from "@/lib/media/server";
import { fileToDataUrl } from "@/lib/media/client";
import { mediaUrl } from "@/lib/media/types";
import { recordAudioEvent } from "@/lib/music/events";
import { listEnrollments } from "@/lib/academic/server";
import { courseByCode } from "@/lib/unibud/academic";
import type { BudThreadMedia } from "@/lib/unibud/types";

const PROMPTS = [
  "What are we covering in CSC 301?",
  "Explain this simply",
  "Help with an assignment",
  "What topic comes next?",
  "Give me practice questions",
  "When is my exam?",
];

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
  const role = useCampusStore((s) => s.role ?? "student");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(ACTIVE_KEY);
  });
  const [freshChat, setFreshChat] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [purpose, setPurpose] = useState<"learn" | "practice" | "assignment" | "revision" | "exam">("learn");
  const [purposeOpen, setPurposeOpen] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(false);
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
  const mediaQ = useQuery({
    queryKey: ["bud-media"],
    queryFn: () => listBudMedia(),
    enabled: Boolean(user),
  });
  const enrolled = useQuery({
    queryKey: ["enroll"],
    queryFn: () => listEnrollments(),
    enabled: Boolean(user),
  });

  useEffect(() => {
    const id = sessionStorage.getItem("unibud-bud-media");
    if (!id) return;
    setFocusId(id);
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
    const tagged = !t ? (attachment?.media?.kind === "voice" ? "Voice note" : "Sent media") : purpose === "learn" ? t : `[${purpose}] ${t}`;
    setPendingUser(tagged);
    setPrompt("");
    ask.mutate({ text: tagged, media: attachment?.media });
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
        <div className="absolute top-[calc(env(safe-area-inset-top)+3rem)] right-3 z-50 w-56 rounded-2xl bg-card p-1 shadow-soft ring-1 ring-border">
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
          <div className="flex flex-1 flex-col justify-center py-10">
            <span className="grid size-12 place-items-center rounded-2xl bg-ink text-paper">
              <Sparkles className="size-5" />
            </span>
            <h1 className="mt-6 font-display text-4xl">Hey, I’m Bud.</h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Talk, type, send a voice note, or drop in a photo. I’ll stay in this conversation.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="h-11 rounded-full bg-card px-4 text-sm ring-1 ring-border"
                >
                  {p}
                </button>
              ))}
            </div>
            {(enrolled.data ?? []).length ? (
              <button
                type="button"
                className="mt-6 text-left text-xs text-muted-foreground"
                onClick={() => setCoursesOpen(true)}
              >
                This semester · {(enrolled.data ?? []).map((c) => c.code).join(" · ")}
              </button>
            ) : (
              <p className="mt-6 text-xs text-muted-foreground">Add your courses in Studies when you want academic context.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-5">
            {messages.map((m) => (
              <article
                key={m.id}
                className={cn("max-w-[88%]", m.role === "user" ? "ml-auto" : "mr-auto")}
              >
                {m.role === "assistant" ? (
                  <p className="mb-1 text-[11px] font-medium text-muted-foreground">Bud</p>
                ) : null}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    m.role === "user" ? "bg-ink text-paper" : "bg-card ring-1 ring-border",
                  )}
                >
                  {m.role === "assistant" ? <BudRichText text={m.content} /> : m.content}
                  {m.media ? <ThreadMedia media={m.media} /> : null}
                </div>
                {m.role === "assistant" ? (
                  <div className="mt-1 flex gap-1">
                    <button
                      type="button"
                      className="grid size-9 place-items-center rounded-full text-muted-foreground"
                      aria-label="Listen to Bud"
                      onClick={() => voice.speak(plainBudText(m.content))}
                    >
                      <Volume2 className="size-4" />
                    </button>
                    {m.media?.kind === "image" || m.media?.kind === "gif" ? (
                      <button
                        type="button"
                        className="h-9 rounded-full px-3 text-xs font-medium text-muted-foreground"
                        onClick={() => {
                          useCampusStore.getState().setPendingShare({
                            kind: "bud",
                            title: "From Bud",
                            mediaId: m.media?.mediaId,
                            src: m.media?.src,
                          });
                          void navigate({ to: "/messages" });
                        }}
                      >
                        Share
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="grid size-9 place-items-center rounded-full text-muted-foreground"
                      aria-label="Save as notes"
                      onClick={() => {
                        const blob = new Blob([plainBudText(m.content)], { type: "text/plain" });
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = "bud-notes.txt";
                        a.click();
                      }}
                    >
                      <Download className="size-4" />
                    </button>
                  </div>
                ) : (
                  <p
                    className={cn(
                      "mt-1 text-[11px] text-muted-foreground",
                      m.role === "user" && "text-right",
                    )}
                  >
                    {timeLabel(m.createdAt)}
                  </p>
                )}
              </article>
            ))}
            {pendingUser ? (
              <article className="ml-auto max-w-[88%]">
                <div className="rounded-2xl bg-ink px-4 py-3 text-sm leading-relaxed text-paper">
                  {pendingUser}
                  {attachment?.media ? <ThreadMedia media={attachment.media} /> : null}
                </div>
              </article>
            ) : null}
            {busy ? (
              <div className="mr-auto max-w-[88%]">
                <p className="mb-1 text-[11px] font-medium text-muted-foreground">Bud</p>
                <div className="rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground ring-1 ring-border">
                  {/\b(image|gif|illustration)\b/i.test(pendingUser ?? "") ? "Generating… staying in this chat." : "Bud is thinking…"}
                </div>
              </div>
            ) : null}
            {failed && !busy ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Bud couldn’t finish that.</p>
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
        className="mx-auto w-full max-w-3xl px-3 pt-2"
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
        <div className="mb-2 flex items-center gap-2 overflow-x-auto text-[11px]">
          <button
            type="button"
            className={cn("shrink-0 rounded-full px-3 py-1.5", purposeOpen ? "bg-ink text-paper" : "bg-secondary")}
            onClick={() => setPurposeOpen((v) => !v)}
          >
            {purpose === "learn" ? "Learn" : purpose === "practice" ? "Practice" : purpose === "assignment" ? "Assignment" : purpose === "revision" ? "Revision" : "Exam prep"}
          </button>
          {purposeOpen
            ? (["learn", "practice", "assignment", "revision", "exam"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={cn("shrink-0 rounded-full px-3 py-1.5", purpose === id ? "bg-ink text-paper" : "bg-secondary")}
                  onClick={() => {
                    setPurpose(id);
                    setPurposeOpen(false);
                  }}
                >
                  {id === "learn" ? "Learn" : id === "practice" ? "Practice" : id === "assignment" ? "Assignment" : id === "revision" ? "Revision" : "Exam prep"}
                </button>
              ))
            : null}
        </div>
        <div className="flex items-end gap-2 rounded-[1.75rem] bg-secondary p-1.5 ring-1 ring-border">
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
            className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground"
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
            placeholder="Message Bud"
            className="max-h-28 min-h-11 flex-1 resize-none bg-transparent py-3 text-sm outline-none"
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
            className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-paper disabled:opacity-30"
          >
            <ArrowUp className="size-5" />
          </button>
        </div>
      </form>
      {coursesOpen ? (
        <div className="absolute inset-0 z-20 bg-ink/40" onClick={() => setCoursesOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-background p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold">This semester</p>
            <p className="mt-1 text-xs text-muted-foreground">Bud uses these courses as context. They live in Studies and Board — not as another assistant.</p>
            <ul className="mt-3 space-y-2 text-sm">
              {(enrolled.data ?? []).map((c) => {
                const sy = courseByCode(c.code);
                return (
                  <li key={c.id}>
                    <p>{c.code} · {c.title}</p>
                    {sy ? (
                      <p className="text-xs text-muted-foreground">{sy.topics.slice(0, 3).join(" · ")}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {(mediaQ.data ?? []).length ? (
              <ul className="mt-4 space-y-2">
                {(mediaQ.data ?? []).slice(0, 4).map((m) => (
                  <li key={m.id} className={cn("rounded-2xl bg-card p-3 ring-1 ring-border", focusId === m.id && "ring-bud")}>
                    <p className="text-sm font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.course}</p>
                    {m.mediaId && m.status === "ready" ? (
                      <audio className="mt-2 w-full" src={mediaUrl(m.mediaId)} controls onPlay={() => recordAudioEvent({ kind: "bud_media_play", budMediaId: m.id, surface: "bud" })} />
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            <button type="button" className="mt-4 h-11 w-full rounded-full bg-secondary text-sm" onClick={() => setCoursesOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BudTop({ onClose, onMenu }: { onClose: () => void; onMenu: () => void }) {
  return (
    <header className="mx-auto flex h-12 w-full max-w-3xl items-center justify-between px-1">
      <button
        type="button"
        onClick={onClose}
        className="grid size-11 place-items-center rounded-full"
        aria-label="Close Bud"
      >
        <ChevronLeft className="size-5" />
      </button>
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-ink text-paper">
          <Sparkles className="size-3.5" />
        </span>
        <p className="text-sm font-semibold">Bud</p>
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
