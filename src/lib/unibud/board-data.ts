export type SessionStatus = "scheduled" | "live" | "ended" | "processing" | "available";

export type BoardSession = {
  id: string;
  title: string;
  course: string;
  lecturer: string;
  lecturerHandle: string;
  department: string;
  startsAt: string;
  status: SessionStatus;
  durationMin: number;
  topic: string;
};

export const BOARD_SESSIONS: BoardSession[] = [
  {
    id: "csc301-live",
    title: "Data Structures — Recursion",
    course: "CSC 301",
    lecturer: "Dr. Okoro",
    lecturerHandle: "okoro",
    department: "Computer Science",
    startsAt: new Date().toISOString(),
    status: "live",
    durationMin: 90,
    topic: "Recursion and call stacks",
  },
  {
    id: "law204-soon",
    title: "Constitutional Law tutorial",
    course: "LAW 204",
    lecturer: "Prof. Adewale",
    lecturerHandle: "adewale",
    department: "Law",
    startsAt: new Date(Date.now() + 3 * 60 * 60_000).toISOString(),
    status: "scheduled",
    durationMin: 60,
    topic: "Federalism",
  },
  {
    id: "eng205-ended",
    title: "Engineering Drawing studio",
    course: "ENG 205",
    lecturer: "Dr. Okoro",
    lecturerHandle: "okoro",
    department: "Engineering",
    startsAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
    status: "ended",
    durationMin: 120,
    topic: "Orthographic projection",
  },
  {
    id: "gst201-proc",
    title: "Use of English — revision",
    course: "GST 201",
    lecturer: "Prof. Adewale",
    lecturerHandle: "adewale",
    department: "General Studies",
    startsAt: new Date(Date.now() - 26 * 60 * 60_000).toISOString(),
    status: "processing",
    durationMin: 45,
    topic: "Academic writing",
  },
  {
    id: "mth101-rec",
    title: "Calculus I — Limits",
    course: "MTH 101",
    lecturer: "Dr. Okoro",
    lecturerHandle: "okoro",
    department: "Mathematics",
    startsAt: new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString(),
    status: "available",
    durationMin: 75,
    topic: "Limits and continuity",
  },
];

export const SESSION_LIFECYCLE = ["scheduled", "live", "ended", "processing", "available"] as const;
