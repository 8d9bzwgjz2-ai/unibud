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
