export type CommunityAnnouncement = {
  id: string;
  title: string;
  body: string;
  by: string;
  createdAt: string;
};

export const COMMUNITY_META: Record<
  string,
  {
    chatId?: string;
    moderatorHandles?: string[];
    governorHandle?: string;
    announcements?: CommunityAnnouncement[];
  }
> = {
  "csc301-class": {
    chatId: "room-csc301",
    governorHandle: "amaka",
    announcements: [
      {
        id: "a1",
        title: "Live session on Board",
        body: "Dr. Okoro is live. Joining now can count as attendance. The recording will not.",
        by: "Amaka · Class Governor",
        createdAt: new Date(Date.now() - 20 * 60_000).toISOString(),
      },
    ],
  },
  "night-study": {
    chatId: "room-night",
  },
  "unilag-campus": {
    chatId: "room-unilag",
    moderatorHandles: ["chinedu"],
  },
  "unn-eng": {
    moderatorHandles: ["chinedu"],
  },
  afrobeats: {
    chatId: "room-sound",
  },
  "five-aside": {
    chatId: "room-pitch",
  },
  "the-gist": {
    chatId: "room-gist",
  },
};

export function communityKindCopy(kind: string) {
  switch (kind) {
    case "Class":
      return "Official academic cohort. Discussions, announcements, resources, class chat. Not a hangout feed.";
    case "Study":
      return "Students studying together. Anyone can join. Not the official class, and not Chat by itself.";
    case "University":
      return "Open campus space. Structured, not the Square feed.";
    case "Faculty":
      return "Faculty room. Departmental notices live here and in Educational News.";
    case "Music":
      return "Sound room. Playlists, hall week, who is actually playing. Not a streaming service.";
    case "Sports":
      return "Pitch talk. Fixtures, boots, who is bringing the ball.";
    case "Residence":
      return "Hall life. Light, water, roommates.";
    case "Career":
      return "Builders and internships. Ship something — don’t just post the logo.";
    case "Interest":
      return "A scene students chose. Gist, culture, whatever the room is about.";
    default:
      return "A structured shared space. Chat, if it exists, is the communication layer — not the community.";
  }
}

export function communityKindLabel(kind: string) {
  switch (kind) {
    case "Music":
      return "Sound";
    case "Sports":
      return "Pitch";
    case "Interest":
      return "Scene";
    case "Residence":
      return "Halls";
    case "Career":
      return "Build";
    case "Class":
      return "Class";
    case "Study":
      return "Study";
    default:
      return kind;
  }
}
