export type SpillReply = {
  id: string;
  authorHandle: string;
  body: string;
  parentId?: string;
  createdAt: string;
};

export type SpillPost = {
  id: string;
  authorHandle: string;
  body: string;
  createdAt: string;
  communityId?: string;
  quoteId?: string;
  quotedFrom?: { handle: string; body: string };
  video?: string;
  replies: SpillReply[];
};

const ago = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const SEED_SPILLS: SpillPost[] = [
  {
    id: "sp1",
    authorHandle: "amaka",
    body: "Faculty night was actually good from the floor. Whoever said it was dead was standing in the wrong corner.",
    createdAt: ago(18),
    communityId: "afrobeats",
    replies: [
      {
        id: "sp1a",
        authorHandle: "kemi",
        body: "The DJ saved it after 11. Before that it was a photoshoot.",
        createdAt: ago(14),
      },
      {
        id: "sp1b",
        authorHandle: "tunde",
        body: "I left early. Gate light was already a queue.",
        createdAt: ago(11),
        parentId: "sp1a",
      },
    ],
  },
  {
    id: "sp2",
    authorHandle: "tunde",
    body: "If your hostel group chat is still arguing about whose turn it is to buy gas, just split it on UNIBUD and rest.",
    createdAt: ago(42),
    communityId: "hostel-life",
    replies: [
      {
        id: "sp2a",
        authorHandle: "ibrahim",
        body: "This is the whole point. Stop collecting cash in DMs.",
        createdAt: ago(38),
      },
    ],
  },
  {
    id: "sp3",
    authorHandle: "chinedu",
    body: "Unpopular: most “campus startups” are just WhatsApp stores with a Canva logo. Ship something that works offline first.",
    createdAt: ago(90),
    communityId: "campus-biz",
    replies: [],
  },
  {
    id: "sp4",
    authorHandle: "fatima",
    body: "Night class playlist that is not Afrobeats-only. Drop one song. I’ll start: anything with no lyrics for the last hour.",
    createdAt: ago(120),
    communityId: "quiet-nights",
    replies: [
      {
        id: "sp4a",
        authorHandle: "adaeze",
        body: "Instrumental Burna still counts. Don’t fight me.",
        createdAt: ago(110),
      },
    ],
  },
  {
    id: "sp5",
    authorHandle: "ibrahim",
    body: "Saturday five-a-side is not cancelled. Pitch behind the hostel, 5pm. Bring a bib or come in white.",
    createdAt: ago(180),
    communityId: "five-aside",
    replies: [
      {
        id: "sp5a",
        authorHandle: "tunde",
        body: "I have the ball. Don’t be the person who shows up in slides.",
        createdAt: ago(160),
      },
    ],
  },
  {
    id: "sp6",
    authorHandle: "kemi",
    body: "Someone in The Gist said faculty night tickets were sold out. They were not. Marketplace still has them. Stop buying from broadcasts.",
    createdAt: ago(240),
    communityId: "the-gist",
    quoteId: "sp1",
    replies: [
      {
        id: "sp6a",
        authorHandle: "amaka",
        body: "Correct. I listed the last Saturday slots in services too.",
        createdAt: ago(220),
      },
    ],
  },
  {
    id: "sp7",
    authorHandle: "aisha_nbo",
    body: "We open-sourced a $90 robot arm that learns from a phone. If you are building in engineering anywhere, the notes are public. Fork it.",
    createdAt: ago(50),
    communityId: "tech-builders",
    replies: [
      {
        id: "sp7a",
        authorHandle: "adaeze",
        body: "This is the kind of demo I want in lab, not another slide deck.",
        createdAt: ago(40),
      },
    ],
  },
  {
    id: "sp8",
    authorHandle: "jonas_wits",
    body: "New ice map in a lunar crater you can actually point to. Not a TED talk. The photo is the point.",
    createdAt: ago(70),
    replies: [],
  },
];

export function spillById(id: string) {
  return SEED_SPILLS.find((s) => s.id === id);
}
