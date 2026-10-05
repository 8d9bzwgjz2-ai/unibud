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

/** Reality First: challenges need a real backend; none is connected. */
export const CHALLENGES: Challenge[] = [];

/** Reality First: no clip provider is connected. */
export const GLOBAL_CLIPS: GlobalClip[] = [];
