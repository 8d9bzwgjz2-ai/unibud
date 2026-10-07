import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CampusRole } from "./roles";
import type { IdentityTag } from "./identity-tags";
import { SEED_SPILLS, type SpillPost, type SpillReply } from "./spill-data";
import type { ChatShare } from "@/lib/media/share";
import { RightsManagement, SEED_ORIGINAL_AUDIO } from "@/lib/music/audio";

export type BudShortcut = "top" | "bottom" | "hidden";
export type ProfileVisibility = "public" | "campus" | "connections";
export type AcademicVisibility = "connections" | "campus" | "hidden";
export type LifeStage = "student" | "tutor" | "both" | "pre";
export type Prefs = { push: boolean; reads: boolean; market: boolean };
export type BudAtlas = {
  lastGoal: string;
  understood: string[];
  struggles: string[];
  likes: string[];
};

export type LocalPost = {
  id: string;
  authorHandle: string;
  body: string;
  createdAt: string;
  communityId?: string;
  image?: string;
  video?: string;
  kind?: "post" | "reel";
  audioId?: string;
};

export type LocalStory = {
  id: string;
  image?: string;
  video?: string;
  caption?: string;
  createdAt: string;
};


export type HumanNote = {
  id: string;
  kind: "social" | "communities" | "events" | "money" | "class" | "live" | "news";
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
};

export type SocialLink = {
  id: string;
  platform: string;
  url: string;
  visible: boolean;
};

export type HighlightReel = {
  id: string;
  name: string;
  cover?: string;
  items: string[];
};

export type AcademicProject = {
  id: string;
  title: string;
  note: string;
};

type CampusState = {
  liked: Record<string, boolean>;
  likeCounts: Record<string, number>;
  following: string[];
  followers: string[];
  connections: string[];
  incoming: string[];
  outgoing: string[];
  recentSearches: string[];
  localPosts: LocalPost[];
  myStories: LocalStory[];
  notes: HumanNote[];
  storiesSeen: string[];
  showBud: boolean;
  budShortcut: BudShortcut;
  role: CampusRole;
  tutorMode: boolean;
  liveAttendance: Record<string, "present">;
  livePresence: Record<string, "in" | "away">;
  recordingWatched: Record<string, boolean>;
  faculty: string;
  department: string;
  programme: string;
  level: string;
  semester: string;
  profileVisibility: ProfileVisibility;
  academicVisibility: AcademicVisibility;
  identityTags: IdentityTag[];
  socialLinks: SocialLink[];
  highlights: HighlightReel[];
  interests: string[];
  academicInterests: string[];
  skills: string[];
  projects: AcademicProject[];
  onboardingDone: boolean;
  avatarDataUrl: string;
  legalName: string;
  postReplies: Record<string, SpillReply[]>;
  spills: SpillPost[];
  flaggedSpills: string[];
  followedRiffs: string[];
  homeCampusId: string;
  lifeStage: LifeStage;
  hiddenPosts: string[];
  savedPosts: string[];
  reportedPosts: string[];
  commentLikes: Record<string, boolean>;
  composeOpen: boolean;
  dropOpen: boolean;
  originalAudios: UnibudAudio[];
  savedAudioIds: string[];
  audioReports: AudioReport[];
  pendingShare?: ChatShare;
  squareView: "feed" | "peek";
  prefs: Prefs;
  fixerRatings: number[];
  budAtlas: BudAtlas;
  toggleLike: (id: string) => void;
  follow: (handle: string) => void;
  unfollow: (handle: string) => void;
  accept: (handle: string) => void;
  decline: (handle: string) => void;
  request: (handle: string) => void;
  cancelRequest: (handle: string) => void;
  unconnect: (handle: string) => void;
  addSearch: (q: string) => void;
  clearSearches: () => void;
  removeSearch: (q: string) => void;
  addPost: (body: string, handle: string, media?: { image?: string; video?: string; id?: string; audioId?: string }) => void;
  addStory: (s: LocalStory) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  seeStory: (handle: string) => void;
  setShowBud: (v: boolean) => void;
  setBudShortcut: (v: BudShortcut) => void;
  setRole: (v: CampusRole) => void;
  setTutorMode: (v: boolean) => void;
  markLivePresent: (sessionId: string) => void;
  leaveLive: (sessionId: string) => void;
  rejoinLive: (sessionId: string) => void;
  markRecordingWatched: (sessionId: string) => void;
  setFaculty: (v: string) => void;
  setDepartment: (v: string) => void;
  setProgramme: (v: string) => void;
  setLevel: (v: string) => void;
  setSemester: (v: string) => void;
  setProfileVisibility: (v: ProfileVisibility) => void;
  setAcademicVisibility: (v: AcademicVisibility) => void;
  toggleIdentityTag: (id: IdentityTag) => void;
  setSocialLinks: (links: SocialLink[]) => void;
  addHighlight: (h: HighlightReel) => void;
  removeHighlight: (id: string) => void;
  setInterests: (v: string[]) => void;
  setAcademicInterests: (v: string[]) => void;
  setSkills: (v: string[]) => void;
  setProjects: (v: AcademicProject[]) => void;
  setOnboardingDone: (v: boolean) => void;
  setAvatarDataUrl: (v: string) => void;
  setLegalName: (v: string) => void;
  addPostReply: (postId: string, reply: SpillReply) => void;
  addSpill: (
    body: string,
    handle: string,
    extra?: { quoteId?: string; communityId?: string; quotedFrom?: { handle: string; body: string } },
  ) => void;
  replySpill: (spillId: string, reply: SpillReply) => void;
  flagSpill: (id: string) => void;
  followRiff: (id: string) => void;
  setHomeCampusId: (v: string) => void;
  setLifeStage: (v: LifeStage) => void;
  hidePost: (id: string) => void;
  toggleSavePost: (id: string) => void;
  reportPost: (id: string) => void;
  toggleCommentLike: (id: string) => void;
  setComposeOpen: (v: boolean) => void;
  setDropOpen: (v: boolean) => void;
  registerOriginalAudio: (a: UnibudAudio) => void;
  saveAudio: (id: string) => void;
  unsaveAudio: (id: string) => void;
  useOriginalAudio: (id: string, contentId: string) => void;
  reportAudio: (id: string, reason: string) => void;
  setPendingShare: (v?: ChatShare) => void;
  setSquareView: (v: "feed" | "peek") => void;
  setPrefs: (v: Partial<Prefs>) => void;
  addFixerRating: (n: number) => void;
  patchBudAtlas: (v: Partial<BudAtlas>) => void;
};

const SEED_NOTES: HumanNote[] = [
  {
    id: "n1",
    kind: "social",
    title: "Your post just got some love from Tunde.",
    body: "He reacted to the hostel note you shared with campus.",
    href: "/",
    read: false,
    createdAt: new Date(Date.now() - 8 * 60_000).toISOString(),
  },
  {
    id: "n2",
    kind: "social",
    title: "Adaeze Okonkwo accepted your connection request.",
    body: "You can message her without waiting on a request.",
    href: "/connect",
    read: false,
    createdAt: new Date(Date.now() - 24 * 60_000).toISOString(),
  },
  {
    id: "n3",
    kind: "communities",
    title: "UNN Engineering has new replies in a discussion you follow.",
    body: "Twelve people jumped in since you last looked.",
    href: "/communities/unn-eng",
    read: false,
    createdAt: new Date(Date.now() - 60 * 60_000).toISOString(),
  },
  {
    id: "n4",
    kind: "events",
    title: "Reminder: Faculty night is tonight.",
    body: "Doors from 19:30. Tickets are in Marketplace — Events.",
    href: "/market",
    read: true,
    createdAt: new Date(Date.now() - 4 * 60 * 60_000).toISOString(),
  },
  {
    id: "n5",
    kind: "class",
    title: "CSC 301 is live on UniBoard.",
    body: "Dr. Okoro started Recursion. Joining now can count as live attendance.",
    href: "/board/csc301",
    read: false,
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
  {
    id: "n6",
    kind: "live",
    title: "Late join is still live.",
    body: "You can rejoin CSC 301 while the session is open. Recording later will not flip absence.",
    href: "/board/csc301",
    read: false,
    createdAt: new Date(Date.now() - 3 * 60_000).toISOString(),
  },
  {
    id: "n7",
    kind: "news",
    title: "Exam timetable is out.",
    body: "Dates sit on UniBoard and Educational News — not Square.",
    href: "/news",
    read: false,
    createdAt: new Date(Date.now() - 90 * 60_000).toISOString(),
  },
];

export const useCampusStore = create<CampusState>()(
  persist(
    (set) => ({
      liked: {},
      likeCounts: { p1: 28, p2: 14, p3: 41, p5: 63, p8: 9, sp1: 22, sp3: 31, sp6: 18 },
      following: ["amaka", "adaeze"],
      followers: ["tunde", "kemi"],
      connections: ["amaka", "tunde"],
      incoming: ["chinedu", "kemi", "fatima"],
      outgoing: ["ibrahim"],
      recentSearches: ["architecture society", "faculty night", "Adaeze Okonkwo"],
      localPosts: [],
      myStories: [],
      notes: SEED_NOTES,
      storiesSeen: [],
      showBud: true,
      budShortcut: "bottom",
      role: "student",
      tutorMode: false,
      liveAttendance: {},
      livePresence: {},
      recordingWatched: {},
      faculty: "Engineering",
      department: "Computer Engineering",
      programme: "Computer Engineering",
      level: "200",
      semester: "1",
      profileVisibility: "public",
      academicVisibility: "connections",
      identityTags: [],
      socialLinks: [],
      highlights: [],
      interests: [],
      academicInterests: [],
      skills: [],
      projects: [],
      onboardingDone: false,
      avatarDataUrl: "",
      legalName: "",
      postReplies: {},
      spills: SEED_SPILLS,
      flaggedSpills: [],
      followedRiffs: [],
      homeCampusId: "unilag",
      lifeStage: "student",
      hiddenPosts: [],
      savedPosts: [],
      reportedPosts: [],
      commentLikes: {},
      composeOpen: false,
      dropOpen: false,
      originalAudios: SEED_ORIGINAL_AUDIO,
      savedAudioIds: [],
      audioReports: [],
      squareView: "feed",
      prefs: { push: true, reads: true, market: false },
      fixerRatings: [],
      budAtlas: { lastGoal: "", understood: [], struggles: [], likes: [] },
      toggleLike: (id) =>
        set((s) => {
          const on = !s.liked[id];
          const base = s.likeCounts[id] ?? 12;
          return {
            liked: { ...s.liked, [id]: on },
            likeCounts: { ...s.likeCounts, [id]: Math.max(0, base + (on ? 1 : -1)) },
          };
        }),
      follow: (handle) =>
        set((s) => ({
          following: s.following.includes(handle) ? s.following : [...s.following, handle],
        })),
      unfollow: (handle) =>
        set((s) => ({ following: s.following.filter((h) => h !== handle) })),
      accept: (handle) =>
        set((s) => ({
          incoming: s.incoming.filter((h) => h !== handle),
          connections: s.connections.includes(handle) ? s.connections : [...s.connections, handle],
        })),
      decline: (handle) =>
        set((s) => ({ incoming: s.incoming.filter((h) => h !== handle) })),
      request: (handle) =>
        set((s) => ({
          outgoing: s.outgoing.includes(handle) ? s.outgoing : [...s.outgoing, handle],
        })),
      cancelRequest: (handle) =>
        set((s) => ({ outgoing: s.outgoing.filter((h) => h !== handle) })),
      unconnect: (handle) =>
        set((s) => ({ connections: s.connections.filter((h) => h !== handle) })),
      addSearch: (q) =>
        set((s) => {
          const t = q.trim();
          if (!t) return s;
          return { recentSearches: [t, ...s.recentSearches.filter((x) => x !== t)].slice(0, 8) };
        }),
      clearSearches: () => set({ recentSearches: [] }),
      removeSearch: (q) =>
        set((s) => ({ recentSearches: s.recentSearches.filter((x) => x !== q) })),
      addPost: (body, handle, media) =>
        set((s) => ({
          localPosts: [
            {
              id: media?.id ?? `local-${Date.now()}`,
              authorHandle: handle,
              body,
              createdAt: new Date().toISOString(),
              communityId: s.homeCampusId === "unn" ? "unn-eng" : "unilag-campus",
              image: media?.image,
              video: media?.video,
              kind: media?.video ? "reel" : "post",
              audioId: media?.audioId,
            },
            ...s.localPosts,
          ],
        })),
      addStory: (story) =>
        set((s) => ({ myStories: [story, ...(s.myStories ?? [])].slice(0, 12) })),
      markAllRead: () => set((s) => ({ notes: s.notes.map((n) => ({ ...n, read: true })) })),
      markRead: (id) =>
        set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      seeStory: (handle) =>
        set((s) => ({
          storiesSeen: s.storiesSeen.includes(handle) ? s.storiesSeen : [...s.storiesSeen, handle],
        })),
      setShowBud: (v) => set({ showBud: v, budShortcut: v ? "bottom" : "hidden" }),
      setBudShortcut: (v) => set({ budShortcut: v, showBud: v !== "hidden" }),
      setRole: (v) => set({ role: v, tutorMode: v === "lecturer" }),
      setTutorMode: (v) =>
        set((s) => ({ tutorMode: s.role === "lecturer" ? v : false })),
      markLivePresent: (sessionId) =>
        set((s) => ({
          liveAttendance: { ...s.liveAttendance, [sessionId]: "present" },
          livePresence: { ...s.livePresence, [sessionId]: "in" },
        })),
      leaveLive: (sessionId) =>
        set((s) => ({
          livePresence: { ...s.livePresence, [sessionId]: "away" },
        })),
      rejoinLive: (sessionId) =>
        set((s) => ({
          liveAttendance: { ...s.liveAttendance, [sessionId]: "present" },
          livePresence: { ...s.livePresence, [sessionId]: "in" },
        })),
      markRecordingWatched: (sessionId) =>
        set((s) => ({ recordingWatched: { ...s.recordingWatched, [sessionId]: true } })),
      setFaculty: (v) => set({ faculty: v }),
      setDepartment: (v) => set({ department: v }),
      setProgramme: (v) => set({ programme: v }),
      setLevel: (v) => set({ level: v }),
      setSemester: (v) => set({ semester: v }),
      setProfileVisibility: (v) => set({ profileVisibility: v }),
      setAcademicVisibility: (v) => set({ academicVisibility: v }),
      toggleIdentityTag: (id) =>
        set((s) => ({
          identityTags: s.identityTags.includes(id)
            ? s.identityTags.filter((t) => t !== id)
            : [...s.identityTags, id],
        })),
      setSocialLinks: (links) => set({ socialLinks: links }),
      addHighlight: (h) => set((s) => ({ highlights: [...s.highlights, h] })),
      removeHighlight: (id) =>
        set((s) => ({ highlights: s.highlights.filter((h) => h.id !== id) })),
      setInterests: (v) => set({ interests: v }),
      setAcademicInterests: (v) => set({ academicInterests: v }),
      setSkills: (v) => set({ skills: v }),
      setProjects: (v) => set({ projects: v }),
      setOnboardingDone: (v) => set({ onboardingDone: v }),
      setAvatarDataUrl: (v) => set({ avatarDataUrl: v }),
      setLegalName: (v) => set({ legalName: v }),
      addPostReply: (postId, reply) =>
        set((s) => ({
          postReplies: {
            ...s.postReplies,
            [postId]: [...(s.postReplies[postId] ?? []), reply],
          },
        })),
      addSpill: (body, handle, extra) =>
        set((s) => ({
          spills: [
            {
              id: `sp-${Date.now()}`,
              authorHandle: handle,
              body,
              createdAt: new Date().toISOString(),
              quoteId: extra?.quoteId,
              quotedFrom: extra?.quotedFrom,
              communityId: extra?.communityId,
              replies: [],
            },
            ...s.spills,
          ],
        })),
      replySpill: (spillId, reply) =>
        set((s) => ({
          spills: s.spills.map((sp) =>
            sp.id === spillId ? { ...sp, replies: [...sp.replies, reply] } : sp,
          ),
        })),
      flagSpill: (id) =>
        set((s) => ({
          flaggedSpills: s.flaggedSpills.includes(id) ? s.flaggedSpills : [...s.flaggedSpills, id],
        })),
      followRiff: (id) =>
        set((s) => {
          const cur = s.followedRiffs ?? [];
          return {
            followedRiffs: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
          };
        }),
      setHomeCampusId: (v) => set({ homeCampusId: v }),
      setLifeStage: (v) => set({ lifeStage: v }),
      hidePost: (id) =>
        set((s) => ({
          hiddenPosts: s.hiddenPosts.includes(id) ? s.hiddenPosts : [...s.hiddenPosts, id],
        })),
      toggleSavePost: (id) =>
        set((s) => {
          const cur = s.savedPosts ?? [];
          return { savedPosts: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
        }),
      reportPost: (id) =>
        set((s) => ({
          reportedPosts: (s.reportedPosts ?? []).includes(id)
            ? s.reportedPosts
            : [...(s.reportedPosts ?? []), id],
          hiddenPosts: s.hiddenPosts.includes(id) ? s.hiddenPosts : [...s.hiddenPosts, id],
        })),
      toggleCommentLike: (id) =>
        set((s) => ({ commentLikes: { ...(s.commentLikes ?? {}), [id]: !s.commentLikes?.[id] } })),
      setComposeOpen: (composeOpen) => set({ composeOpen }),
      setDropOpen: (dropOpen) => set({ dropOpen }),
      registerOriginalAudio: (a) =>
        set((s) => ({
          originalAudios: [a, ...(s.originalAudios ?? []).filter((x) => x.audioId !== a.audioId)].slice(0, 80),
        })),
      saveAudio: (id) =>
        set((s) => ({
          savedAudioIds: (s.savedAudioIds ?? []).includes(id) ? s.savedAudioIds : [...(s.savedAudioIds ?? []), id],
        })),
      unsaveAudio: (id) => set((s) => ({ savedAudioIds: (s.savedAudioIds ?? []).filter((x) => x !== id) })),
      useOriginalAudio: (id, contentId) =>
        set((s) => ({
          originalAudios: (s.originalAudios ?? []).map((a) =>
            a.audioId === id && !a.usedBy.includes(contentId)
              ? { ...a, usageCount: a.usageCount + 1, usedBy: [...a.usedBy, contentId] }
              : a,
          ),
        })),
      reportAudio: (id, reason) =>
        set((s) => {
          const cur = (s.originalAudios ?? []).find((a) => a.audioId === id);
          if (!cur) return s;
          const { audio, report } = RightsManagement.report(cur, reason);
          return {
            originalAudios: (s.originalAudios ?? []).map((a) => (a.audioId === id ? audio : a)),
            audioReports: [...(s.audioReports ?? []), report],
          };
        }),
      setPendingShare: (pendingShare) => set({ pendingShare }),
      setSquareView: (squareView) => set({ squareView }),
      setPrefs: (v) => set((s) => ({ prefs: { ...s.prefs, ...v } })),
      addFixerRating: (n) =>
        set((s) => ({
          fixerRatings: [...(s.fixerRatings ?? []), Math.min(5, Math.max(1, Math.round(n)))].slice(-40),
        })),
      patchBudAtlas: (v) =>
        set((s) => ({
          budAtlas: {
            lastGoal: v.lastGoal ?? s.budAtlas?.lastGoal ?? "",
            understood: v.understood ?? s.budAtlas?.understood ?? [],
            struggles: v.struggles ?? s.budAtlas?.struggles ?? [],
            likes: v.likes ?? s.budAtlas?.likes ?? s.interests ?? [],
          },
        })),
    }),
    { name: "unibud-campus", merge: (persisted, current) => ({
      ...current,
      ...(persisted as object),
      composeOpen: false,
      dropOpen: false,
      squareView: "feed" as const,
    }) },
  ),
);

export function unreadCount(notes: HumanNote[]) {
  return notes.filter((n) => !n.read).length;
}

export function resolveBudShortcut(s: { budShortcut?: BudShortcut; showBud?: boolean }): BudShortcut {
  if (s.budShortcut === "top" || s.budShortcut === "bottom" || s.budShortcut === "hidden") {
    return s.budShortcut;
  }
  return s.showBud === false ? "hidden" : "bottom";
}

export function connectLabel(handle: string, s: Pick<CampusState, "connections" | "outgoing">) {
  if (s.connections.includes(handle)) return "Connected";
  if (s.outgoing.includes(handle)) return "Pending";
  return "Connect";
}
