/** Mix cards for Square. Location is a signal, not the product. */

export type Challenge = {
  id: string;
  title: string;
  body: string;
  topic: string;
  joins: number;
};

export type GlobalClip = {
  id: string;
  title: string;
  interest: string;
  src: string;
  authorHandle: string;
};

export const GLOBAL_FACTS = [
  {
    id: "gx-moon",
    kicker: "Space",
    title: "Water ice mapped in a lunar crater you can actually point to",
    summary:
      "A new pass over the south pole tightens where ice is stable. Engineering students keep asking about extraction. The rest of us just want the photo.",
    topic: "space",
    image: "/covers/campus-night.jpg",
  },
  {
    id: "gx-robot",
    kicker: "Invention",
    title: "A Nairobi lab shipped a $90 robot arm that learns from a phone",
    summary:
      "Not a TED talk. A working arm, open notes, and a Discord that stays up at 2am. Builders in three countries already forked it.",
    topic: "tech",
    image: "/market/camera.jpg",
  },
  {
    id: "gx-ai",
    kicker: "AI",
    title: "The model that explains a proof without writing your assignment",
    summary:
      "Useful when you already tried. Useless when you paste the question. The difference is still the student.",
    topic: "tech",
  },
  {
    id: "gx-game",
    kicker: "Games",
    title: "A 14-day game jam is eating group chats this week",
    summary:
      "Theme drops Friday. Teams of two. You do not need to be a CS major. You need a mechanic and a deadline.",
    topic: "games",
  },
] as const;

export const CHALLENGES: Challenge[] = [
  {
    id: "ch-build",
    title: "48-hour build",
    body: "Ship one thing that works offline. Screenshot it. No pitch deck.",
    topic: "tech",
    joins: 1840,
  },
  {
    id: "ch-sky",
    title: "Look up",
    body: "Photograph the moon or a clear sky from wherever you are. Caption the place, not the flex.",
    topic: "space",
    joins: 920,
  },
  {
    id: "ch-sound",
    title: "One song, no lyrics",
    body: "Drop an instrumental that gets you through the last hour of work.",
    topic: "music",
    joins: 2104,
  },
];

export const GLOBAL_CLIPS: GlobalClip[] = [
  { id: "cl1", title: "Robot arm, first successful grab", interest: "tech", src: "/market/camera.jpg", authorHandle: "aisha_nbo" },
  { id: "cl2", title: "Moon, cheap lens, honest sky", interest: "space", src: "/covers/campus-night.jpg", authorHandle: "jonas_wits" },
  { id: "cl3", title: "Faculty night recap", interest: "nightlife", src: "/covers/campus-night.jpg", authorHandle: "kemi" },
  { id: "cl4", title: "Five-a-side, last light", interest: "football", src: "/market/keke.jpg", authorHandle: "ibrahim" },
];
