import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_POLICY, type PolicyConfig } from "./eligibility";
import {
  DEFAULT_CAMERA,
  NEUTRAL_ADJUST,
  type Audience,
  type CameraPrefs,
  type CaptureMode,
  type LibraryItem,
  type PublishDest,
  type MixTrack,
  type StudioClip,
  type StudioDraft,
  type StudioIntent,
  type StudioOverlay,
  type StudioView,
} from "./types";
import type { MusicRef } from "@/lib/music/types";

type StudioState = {
  view: StudioView;
  mode: CaptureMode;
  intent: StudioIntent;
  dest: PublishDest;
  messageId?: string;
  facing: "user" | "environment";
  zoom: number;
  prefs: CameraPrefs;
  premium: boolean;
  image?: string;
  originalImage?: string;
  video?: string;
  clips: StudioClip[];
  caption: string;
  filterId: string;
  filterAmount: number;
  adjust: typeof NEUTRAL_ADJUST;
  effectId: string;
  favoriteEffects: string[];
  recentEffects: string[];
  overlays: StudioOverlay[];
  music?: string;
  musicRef?: MusicRef;
  mix: MixTrack[];
  clipVolume: number;
  clipMute: boolean;
  audience: Audience;
  topic: string;
  place: string;
  drafts: StudioDraft[];
  library: LibraryItem[];
  picked: string[];
  policy: PolicyConfig;
  standing: { startedAt: string; strikes: number; verified: boolean };
  live: { on: boolean; title: string; viewers: number; lines: string[]; startedAt?: string };
  undo: { clips: StudioClip[]; overlays: StudioOverlay[]; mix: MixTrack[] }[];
  redo: { clips: StudioClip[]; overlays: StudioOverlay[]; mix: MixTrack[] }[];
  dualStatus: "off" | "on" | "unsupported" | "denied" | "busy";
  chroma: { on: boolean; plate: string; tolerance: number; feather: number };
  faceOn: boolean;
  setView: (v: StudioView) => void;
  setMode: (v: CaptureMode) => void;
  setIntent: (v: StudioIntent) => void;
  setDest: (v: PublishDest, messageId?: string) => void;
  setFacing: (v: "user" | "environment") => void;
  setZoom: (v: number) => void;
  patchPrefs: (v: Partial<CameraPrefs>) => void;
  setPremium: (v: boolean) => void;
  setImage: (src: string, original?: string) => void;
  setVideo: (src: string) => void;
  addClip: (clip: StudioClip) => void;
  patchClip: (id: string, v: Partial<StudioClip>) => void;
  removeClip: (id: string) => void;
  moveClip: (id: string, dir: -1 | 1) => void;
  setCaption: (v: string) => void;
  setFilter: (id: string, amount?: number) => void;
  patchAdjust: (v: Partial<typeof NEUTRAL_ADJUST>) => void;
  resetEdit: () => void;
  setEffect: (id: string) => void;
  toggleFavEffect: (id: string) => void;
  addOverlay: (o: StudioOverlay) => void;
  patchOverlay: (id: string, v: Partial<StudioOverlay>) => void;
  removeOverlay: (id: string) => void;
  setMusic: (v?: string) => void;
  setMusicRef: (v?: MusicRef) => void;
  setClipVolume: (v: number) => void;
  setClipMute: (v: boolean) => void;
  addMix: (t: MixTrack) => void;
  patchMix: (id: string, v: Partial<MixTrack>) => void;
  removeMix: (id: string) => void;
  moveMix: (id: string, dir: -1 | 1) => void;
  setDualStatus: (v: StudioState["dualStatus"]) => void;
  patchChroma: (v: Partial<StudioState["chroma"]>) => void;
  setFaceOn: (v: boolean) => void;
  setAudience: (v: Audience) => void;
  setTopic: (v: string) => void;
  setPlace: (v: string) => void;
  addLibrary: (item: LibraryItem) => void;
  toggleFavorite: (id: string) => void;
  togglePicked: (id: string) => void;
  clearPicked: () => void;
  saveDraft: () => void;
  loadDraft: (id: string) => void;
  clearProject: () => void;
  snapshot: () => void;
  undoLast: () => void;
  redoLast: () => void;
  startLive: (title: string) => void;
  addLiveLine: (line: string) => void;
  endLive: () => void;
  patchPolicy: (v: Partial<PolicyConfig>) => void;
};

function draftFrom(s: StudioState): StudioDraft {
  return {
    id: `d-${Date.now()}`,
    kind: s.mode === "story" ? "story" : s.video ? "peek" : s.image ? "photo" : "write",
    dest: s.dest,
    caption: s.caption,
    image: s.image,
    originalImage: s.originalImage,
    video: s.video,
    clips: s.clips,
    filterId: s.filterId,
    filterAmount: s.filterAmount,
    adjust: s.adjust,
    aspect: s.mode === "peek" || s.mode === "story" ? "9:16" : "original",
    music: s.music,
    mix: s.mix,
    overlays: s.overlays,
    effectId: s.effectId,
    audience: s.audience,
    topic: s.topic,
    place: s.place,
    updatedAt: new Date().toISOString(),
  };
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      view: "camera",
      mode: "post",
      intent: "post",
      dest: "square",
      facing: "environment",
      zoom: 1,
      prefs: DEFAULT_CAMERA,
      premium: false,
      clips: [],
      caption: "",
      filterId: "original",
      filterAmount: 1,
      adjust: { ...NEUTRAL_ADJUST },
      effectId: "none",
      favoriteEffects: [],
      recentEffects: [],
      overlays: [],
      mix: [],
      clipVolume: 1,
      clipMute: false,
      audience: "everyone",
      topic: "",
      place: "",
      drafts: [],
      library: [],
      picked: [],
      policy: DEFAULT_POLICY,
      standing: { startedAt: new Date(Date.now() - 40 * 86_400_000).toISOString(), strikes: 0, verified: false },
      live: { on: false, title: "", viewers: 0, lines: [] },
      undo: [],
      redo: [],
      dualStatus: "off",
      chroma: { on: false, plate: "#111114", tolerance: 0.38, feather: 0.16 },
      faceOn: false,
      setView: (view) => set({ view }),
      setMode: (mode) => set({ mode, dest: mode === "story" ? "story" : mode === "peek" ? "peek" : mode === "live" ? "live" : "square" }),
      setIntent: (intent) => set({ intent }),
      setDest: (dest, messageId) => set({ dest, messageId }),
      setFacing: (facing) => set({ facing }),
      setZoom: (zoom) => set({ zoom: Math.max(1, Math.min(4, zoom)) }),
      patchPrefs: (v) => set((s) => ({ prefs: { ...s.prefs, ...v } })),
      setPremium: (premium) => set({ premium }),
      setImage: (src, original) =>
        set((s) => ({
          image: src,
          originalImage: original ?? s.originalImage ?? src,
          view: "photo",
        })),
      setVideo: (src) =>
        set((s) => ({
          video: src,
          clips: s.clips.length
            ? s.clips
            : [{ id: `c-${Date.now()}`, src, duration: 0, trimStart: 0, trimEnd: 0, speed: 1 }],
          view: "video",
        })),
      addClip: (clip) => set((s) => ({ clips: [...s.clips, clip], video: s.video ?? clip.src })),
      patchClip: (id, v) =>
        set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, ...v } : c)) })),
      removeClip: (id) => set((s) => ({ clips: s.clips.filter((c) => c.id !== id) })),
      moveClip: (id, dir) =>
        set((s) => {
          const i = s.clips.findIndex((c) => c.id === id);
          if (i < 0) return s;
          const j = i + dir;
          if (j < 0 || j >= s.clips.length) return s;
          const next = [...s.clips];
          const [item] = next.splice(i, 1);
          next.splice(j, 0, item);
          return { clips: next };
        }),
      setCaption: (caption) => set({ caption }),
      setFilter: (filterId, amount) =>
        set((s) => ({ filterId, filterAmount: amount ?? s.filterAmount })),
      patchAdjust: (v) => set((s) => ({ adjust: { ...s.adjust, ...v } })),
      resetEdit: () =>
        set((s) => ({
          image: s.originalImage ?? s.image,
          filterId: "original",
          filterAmount: 1,
          adjust: { ...NEUTRAL_ADJUST },
          effectId: "none",
        })),
      setEffect: (effectId) =>
        set((s) => ({
          effectId,
          recentEffects: [effectId, ...s.recentEffects.filter((x) => x !== effectId)].slice(0, 12),
        })),
      toggleFavEffect: (id) =>
        set((s) => ({
          favoriteEffects: s.favoriteEffects.includes(id)
            ? s.favoriteEffects.filter((x) => x !== id)
            : [...s.favoriteEffects, id],
        })),
      addOverlay: (o) => set((s) => ({ overlays: [...s.overlays, o] })),
      patchOverlay: (id, v) =>
        set((s) => ({ overlays: s.overlays.map((o) => (o.id === id ? { ...o, ...v } : o)) })),
      removeOverlay: (id) => set((s) => ({ overlays: s.overlays.filter((o) => o.id !== id) })),
      setMusic: (music) => set({ music }),
      setMusicRef: (musicRef) => set({ musicRef, music: musicRef?.title }),
      setClipVolume: (clipVolume) => set({ clipVolume }),
      setClipMute: (clipMute) => set({ clipMute }),
      addMix: (t) => set((s) => ({ mix: [...s.mix, t] })),
      patchMix: (id, v) => set((s) => ({ mix: s.mix.map((x) => (x.id === id ? { ...x, ...v } : x)) })),
      removeMix: (id) => set((s) => ({ mix: s.mix.filter((x) => x.id !== id) })),
      moveMix: (id, dir) =>
        set((s) => {
          const i = s.mix.findIndex((x) => x.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= s.mix.length) return s;
          const next = [...s.mix];
          const [item] = next.splice(i, 1);
          next.splice(j, 0, item);
          return { mix: next };
        }),
      setDualStatus: (dualStatus) => set({ dualStatus }),
      patchChroma: (v) => set((s) => ({ chroma: { ...s.chroma, ...v } })),
      setFaceOn: (faceOn) => set({ faceOn }),
      setAudience: (audience) => set({ audience }),
      setTopic: (topic) => set({ topic }),
      setPlace: (place) => set({ place }),
      addLibrary: (item) =>
        set((s) => ({ library: [item, ...s.library.filter((x) => x.id !== item.id)].slice(0, 80) })),
      toggleFavorite: (id) =>
        set((s) => ({
          library: s.library.map((x) => (x.id === id ? { ...x, favorite: !x.favorite } : x)),
        })),
      togglePicked: (id) =>
        set((s) => ({
          picked: s.picked.includes(id) ? s.picked.filter((x) => x !== id) : [...s.picked, id],
        })),
      clearPicked: () => set({ picked: [] }),
      saveDraft: () => set((s) => ({ drafts: [draftFrom(s), ...s.drafts].slice(0, 12) })),
      loadDraft: (id) =>
        set((s) => {
          const d = s.drafts.find((x) => x.id === id);
          if (!d) return s;
          return {
            caption: d.caption,
            image: d.image,
            originalImage: d.originalImage,
            video: d.video,
            clips: d.clips,
            filterId: d.filterId,
            filterAmount: d.filterAmount,
            adjust: d.adjust,
            dest: d.dest,
            overlays: d.overlays ?? [],
            effectId: d.effectId ?? "none",
            music: d.music,
            mix: d.mix ?? [],
            view: d.image ? "photo" : d.video ? "video" : "write",
          };
        }),
      clearProject: () =>
        set({
          image: undefined,
          originalImage: undefined,
          video: undefined,
          clips: [],
          caption: "",
          filterId: "original",
          filterAmount: 1,
          adjust: { ...NEUTRAL_ADJUST },
          overlays: [],
          effectId: "none",
          music: undefined,
          mix: [],
          picked: [],
          view: "camera",
        }),
      snapshot: () =>
        set((s) => ({
          undo: [...s.undo, { clips: s.clips, overlays: s.overlays, mix: s.mix }].slice(-20),
          redo: [],
        })),
      undoLast: () =>
        set((s) => {
          const last = s.undo[s.undo.length - 1];
          if (!last) return s;
          return {
            clips: last.clips,
            overlays: last.overlays,
            mix: last.mix,
            undo: s.undo.slice(0, -1),
            redo: [...s.redo, { clips: s.clips, overlays: s.overlays, mix: s.mix }].slice(-20),
          };
        }),
      redoLast: () =>
        set((s) => {
          const last = s.redo[s.redo.length - 1];
          if (!last) return s;
          return {
            clips: last.clips,
            overlays: last.overlays,
            mix: last.mix,
            redo: s.redo.slice(0, -1),
            undo: [...s.undo, { clips: s.clips, overlays: s.overlays, mix: s.mix }].slice(-20),
          };
        }),
      startLive: (title) =>
        set({
          live: { on: true, title, viewers: 1, lines: [], startedAt: new Date().toISOString() },
          view: "live",
          mode: "live",
        }),
      addLiveLine: (line) =>
        set((s) => ({ live: { ...s.live, lines: [...s.live.lines, line].slice(-40) } })),
      endLive: () => set((s) => ({ live: { ...s.live, on: false }, view: "camera" })),
      patchPolicy: (v) => set((s) => ({ policy: { ...s.policy, ...v } })),
    }),
    {
      name: "unibud-studio",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StudioState>;
        return {
          ...current,
          ...p,
          prefs: { ...DEFAULT_CAMERA, ...(p.prefs ?? {}) },
          policy: { ...DEFAULT_POLICY, ...(p.policy ?? {}) },
          mode: p.mode === "post" || p.mode === "story" || p.mode === "peek" || p.mode === "live" ? p.mode : "post",
          intent: p.intent === "post" || p.intent === "story" || p.intent === "peek" || p.intent === "reel" ? p.intent : "post",
        };
      },
      partialize: (s) => ({
        prefs: s.prefs,
        premium: s.premium,
        drafts: s.drafts.slice(0, 8),
        library: s.library.slice(0, 40),
        favoriteEffects: s.favoriteEffects,
        policy: s.policy,
        standing: s.standing,
      }),
    },
  ),
);

export function standingNow() {
  const s = useStudioStore.getState();
  return s.standing;
}
