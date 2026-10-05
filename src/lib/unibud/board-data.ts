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

/**
 * Reality First: Board sessions come only from real lecturer-created sessions.
 * No backend session store is connected yet, so this is intentionally empty.
 */
export const BOARD_SESSIONS: BoardSession[] = [];

export const SESSION_LIFECYCLE = ["scheduled", "live", "ended", "processing", "available"] as const;
