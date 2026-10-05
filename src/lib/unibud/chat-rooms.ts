export type RoomKind = "group" | "class" | "study" | "community";

export type CampusRoom = {
  id: string;
  kind: RoomKind;
  title: string;
  subtitle: string;
  communityId?: string;
  lastBody: string;
  updatedAt: string;
  members: string[];
};

/** Reality First: group/class/study/community chats need real memberships; none are invented. */
export const CAMPUS_ROOMS: CampusRoom[] = [];

export function campusRoomById(id: string) {
  return CAMPUS_ROOMS.find((r) => r.id === id);
}

/** Reality First: no scripted room history. */
export const ROOM_SEED: Record<string, { sender: string; body: string }[]> = {};
