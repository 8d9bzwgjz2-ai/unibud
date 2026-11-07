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

export const CAMPUS_ROOMS: CampusRoom[] = [
  {
    id: "room-csc301",
    kind: "class",
    title: "CSC 301 Class",
    subtitle: "Class chat · 186 students",
    communityId: "csc301-class",
    lastBody: "Governor: Recursion tutorial moved to Board at 10.",
    updatedAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    members: ["amaka", "adaeze", "tunde"],
  },
  {
    id: "room-night",
    kind: "study",
    title: "Night calculus group",
    subtitle: "Study chat · 24 students",
    communityId: "night-study",
    lastBody: "Fatima: past questions in the files tab.",
    updatedAt: new Date(Date.now() - 40 * 60_000).toISOString(),
    members: ["fatima", "ibrahim", "ngozi"],
  },
  {
    id: "room-unilag",
    kind: "community",
    title: "UNILAG Campus",
    subtitle: "Community chat",
    communityId: "unilag-campus",
    lastBody: "Water is back on New Hall.",
    updatedAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
    members: ["amaka", "tunde"],
  },
  {
    id: "room-hall",
    kind: "group",
    title: "New Hall floor 2",
    subtitle: "Group · 8",
    lastBody: "Who is bringing the extension?",
    updatedAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
    members: ["amaka", "tunde", "kemi"],
  },
  {
    id: "room-sound",
    kind: "community",
    title: "Afrobeats & Campus DJ",
    subtitle: "Sound room",
    communityId: "afrobeats",
    lastBody: "Kemi: playlist for faculty night is in the files.",
    updatedAt: new Date(Date.now() - 5 * 60 * 60_000).toISOString(),
    members: ["kemi", "amaka"],
  },
  {
    id: "room-pitch",
    kind: "community",
    title: "Five-a-side",
    subtitle: "Pitch room",
    communityId: "five-aside",
    lastBody: "Ibrahim: Saturday 5pm. White or yellow bib.",
    updatedAt: new Date(Date.now() - 6 * 60 * 60_000).toISOString(),
    members: ["ibrahim", "tunde"],
  },
  {
    id: "room-gist",
    kind: "community",
    title: "The Gist",
    subtitle: "Campus talk",
    communityId: "the-gist",
    lastBody: "Kemi: rumours go here after you check them.",
    updatedAt: new Date(Date.now() - 90 * 60_000).toISOString(),
    members: ["kemi", "amaka", "tunde"],
  },
];

export function campusRoomById(id: string) {
  return CAMPUS_ROOMS.find((r) => r.id === id);
}

export const ROOM_SEED: Record<string, { sender: string; body: string }[]> = {
  "room-csc301": [
    { sender: "Amaka", body: "Announcement: CSC 301 is live on Board. Joining now can count as attendance." },
    { sender: "You", body: "On my way. Late join still counts?" },
    { sender: "Amaka", body: "Yes, while it is live. Watching the recording later will not." },
  ],
  "room-night": [
    { sender: "Fatima", body: "Limits chapter, 9pm. Bring questions, not the assignment dump." },
    { sender: "You", body: "I’ll join the call after hall dinner." },
  ],
  "room-unilag": [
    { sender: "Tunde", body: "Faculty night tickets are in Marketplace — Events." },
  ],
  "room-hall": [
    { sender: "Kemi", body: "Extension from the corridor. Don’t leave it in the kitchen." },
  ],
  "room-sound": [
    { sender: "Kemi", body: "Faculty night playlist is not a rumour. Check Marketplace — Events." },
  ],
  "room-pitch": [
    { sender: "Ibrahim", body: "Pitch behind the hostel, 5pm. Ball is sorted." },
  ],
  "room-gist": [
    { sender: "Kemi", body: "If it is gist, it lives here. If it is a class announcement, it does not." },
  ],
};
