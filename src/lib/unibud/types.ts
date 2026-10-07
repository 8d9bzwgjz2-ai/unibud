export type ListingKind = "goods" | "service" | "stay";
export type ListingCategory =
  | "accommodation"
  | "food"
  | "fashion"
  | "electronics"
  | "books"
  | "beauty"
  | "transport"
  | "events"
  | "services"
  | "other";

export type Tone = "ink" | "teal" | "warm" | "forest" | "clay" | "night";

export type RequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "paid"
  | "expired"
  | "cancelled";

export type TxType =
  | "demo_topup"
  | "send"
  | "receive"
  | "request_in"
  | "withdraw"
  | "market_pay"
  | "service_pay"
  | "funding";

export type TxStatus = "demo_recorded" | "pending" | "declined" | "cancelled";

export type University = {
  id: string;
  name: string;
  shortName: string;
  city: string;
};

export type DirectoryPerson = {
  handle: string;
  name: string;
  universityId: string;
  program: string;
  year: string;
  bio: string;
  verified: boolean;
  faculty?: string;
  department?: string;
  role?: "student" | "governor" | "lecturer" | "moderator";
  tags?: import("./identity-tags").IdentityTag[];
};

export type Listing = {
  id: string;
  kind: ListingKind;
  category: ListingCategory;
  title: string;
  description: string;
  priceKobo: number;
  priceNote: string;
  image?: string;
  tone: Tone;
  sellerHandle: string;
  universityId: string;
  location: string;
  tags: string[];
  savedCount: number;
  createdAt: string;
};

export type Community = {
  id: string;
  name: string;
  kind: string;
  universityId?: string;
  description: string;
  cover?: string;
  members: number;
  ownerUserId?: string | null;
  privacy?: string;
  category?: string | null;
  createdAt?: string;
};

export type FeedPost = {
  id: string;
  communityId: string;
  authorHandle: string;
  body: string;
  image?: string;
  video?: string;
  kind?: "post" | "reel";
  createdAt: string;
  audioId?: string;
};

export type DiscoveryItem = {
  id: string;
  kicker: string;
  title: string;
  summary: string;
  topic: string;
  image?: string;
};

export type Conversation = {
  id: string;
  peerHandle: string;
  listingId?: string | null;
  lastBody: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  sender: "me" | "peer";
  body: string;
  createdAt: string;
  mediaId?: string;
  shareKind?: string;
  shareJson?: string;
};

export type WalletSnapshot = {
  balanceKobo: number;
  demo: true;
};

export type WalletTx = {
  id: string;
  type: TxType;
  amountKobo: number;
  status: TxStatus;
  counterparty: string;
  note: string;
  createdAt: string;
};

export type MoneyRequest = {
  id: string;
  direction: "out" | "in";
  peerHandle: string;
  amountKobo: number;
  note: string;
  status: RequestStatus;
  createdAt: string;
};

export type Course = {
  id: string;
  sessionLabel: string;
  semester: string;
  title: string;
  code: string;
};

export type StudyMaterial = {
  id: string;
  courseId: string;
  title: string;
  kind: "note" | "file" | "link";
};

export type StudySession = {
  id: string;
  courseId: string;
  title: string;
  startsAt: string;
  minutes: number;
};

export type AppNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
};

export type StudentProfile = {
  userId: string;
  displayName: string;
  handle: string;
  universityId: string;
  program: string;
  year: string;
  bio: string;
  campusRole?: string;
  onboardingDone?: boolean;
};

export type BudMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  conversationId?: string;
  media?: BudThreadMedia;
};

export type BudThreadMedia = {
  kind: "audio" | "image" | "gif" | "file" | "voice";
  mediaId?: string;
  src?: string;
  status?: "ready" | "generating" | "failed";
  name?: string;
};

export type BudConversation = {
  id: string;
  title: string;
  updatedAt: string;
  preview: string;
};
