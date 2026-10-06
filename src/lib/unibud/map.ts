import type {
  AppNotification,
  BudConversation,
  BudMessage,
  ChatMessage,
  Community,
  Conversation,
  Course,
  DirectoryPerson,
  DiscoveryItem,
  FeedPost,
  Listing,
  ListingCategory,
  ListingKind,
  MoneyRequest,
  QuadAnnouncement,
  QuadGroup,
  RequestStatus,
  StudentProfile,
  StudyMaterial,
  StudySession,
  Tone,
  TxStatus,
  TxType,
  University,
  WalletTx,
} from "./types";

export function mapUni(r: {
  id: string;
  name: string;
  short_name: string;
  city: string;
}): University {
  return { id: r.id, name: r.name, shortName: r.short_name, city: r.city };
}

export function mapPerson(r: {
  handle: string;
  name: string;
  university_id: string;
  program: string;
  year: string;
  bio: string;
  verified: boolean;
}): DirectoryPerson {
  return {
    handle: r.handle,
    name: r.name,
    universityId: r.university_id,
    program: r.program,
    year: r.year,
    bio: r.bio,
    verified: r.verified,
  };
}

export function mapListing(r: {
  id: string;
  kind: string;
  category: string;
  title: string;
  description: string;
  price_kobo: number;
  price_note: string;
  image: string | null;
  tone: string;
  seller_handle: string;
  university_id: string;
  location: string;
  tags: string;
  saved_count: number;
  created_at: string;
}): Listing {
  let tags: string[] = [];
  try {
    tags = JSON.parse(r.tags) as string[];
  } catch {
    tags = [];
  }
  return {
    id: r.id,
    kind: r.kind as ListingKind,
    category: r.category as ListingCategory,
    title: r.title,
    description: r.description,
    priceKobo: r.price_kobo,
    priceNote: r.price_note,
    image: r.image ?? undefined,
    tone: r.tone as Tone,
    sellerHandle: r.seller_handle,
    universityId: r.university_id,
    location: r.location,
    tags,
    savedCount: r.saved_count,
    createdAt: r.created_at,
  };
}

export function mapCommunity(r: {
  id: string;
  name: string;
  kind: string;
  university_id: string | null;
  description: string;
  cover: string | null;
  members: number;
  created_by?: string | null;
  created_at?: string | Date;
}): Community {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    universityId: r.university_id ?? undefined,
    description: r.description,
    createdBy: r.created_by ?? undefined,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    cover: r.cover ?? undefined,
    members: r.members,
  };
}

export function mapPost(r: {
  id: string;
  community_id: string;
  author_handle: string;
  body: string;
  image: string | null;
  video?: string | null;
  kind?: string | null;
  group_id?: string | null;
  created_at: string;
}): FeedPost {
  return {
    id: r.id,
    communityId: r.community_id,
    authorHandle: r.author_handle,
    body: r.body,
    image: r.image ?? undefined,
    video: r.video ?? undefined,
    kind: r.kind === "reel" ? "reel" : "post",
    createdAt: r.created_at,
    groupId: r.group_id ?? undefined,
  };
}

export function mapQuadGroup(r: {
  id: string;
  quad_id: string;
  name: string;
  description: string;
  created_at: string;
}): QuadGroup {
  return {
    id: r.id,
    quadId: r.quad_id,
    name: r.name,
    description: r.description,
    createdAt: r.created_at,
  };
}

export function mapQuadAnnouncement(r: {
  id: string;
  quad_id: string;
  author_handle: string;
  body: string;
  created_at: string;
}): QuadAnnouncement {
  return {
    id: r.id,
    quadId: r.quad_id,
    authorHandle: r.author_handle,
    body: r.body,
    createdAt: r.created_at,
  };
}

export function mapPostReply(r: {
  id: string;
  post_id: string;
  author_handle: string;
  parent_id: string | null;
  body: string;
  created_at: string;
}) {
  return {
    id: r.id,
    postId: r.post_id,
    authorHandle: r.author_handle,
    parentId: r.parent_id ?? undefined,
    body: r.body,
    createdAt: r.created_at,
  };
}

export function mapDiscovery(r: {
  id: string;
  kicker: string;
  title: string;
  summary: string;
  topic: string;
  image: string | null;
}): DiscoveryItem {
  return {
    id: r.id,
    kicker: r.kicker,
    title: r.title,
    summary: r.summary,
    topic: r.topic,
    image: r.image ?? undefined,
  };
}

export function mapTx(r: {
  id: string;
  type: string;
  amount_kobo: number;
  status: string;
  counterparty: string;
  note: string;
  created_at: string;
}): WalletTx {
  return {
    id: r.id,
    type: r.type as TxType,
    amountKobo: r.amount_kobo,
    status: r.status as TxStatus,
    counterparty: r.counterparty,
    note: r.note,
    createdAt: r.created_at,
  };
}

export function mapRequest(r: {
  id: string;
  direction: string;
  peer_handle: string;
  amount_kobo: number;
  note: string;
  status: string;
  created_at: string;
}): MoneyRequest {
  return {
    id: r.id,
    direction: r.direction as "out" | "in",
    peerHandle: r.peer_handle,
    amountKobo: r.amount_kobo,
    note: r.note,
    status: r.status as RequestStatus,
    createdAt: r.created_at,
  };
}

export function mapConvo(r: {
  id: string;
  peer_handle: string;
  listing_id: string | null;
  last_body: string;
  updated_at: string;
}): Conversation {
  return {
    id: r.id,
    peerHandle: r.peer_handle,
    listingId: r.listing_id,
    lastBody: r.last_body,
    updatedAt: r.updated_at,
  };
}

export function mapMessage(r: {
  id: string;
  conversation_id: string;
  sender: string;
  body: string;
  created_at: string;
  media_id?: string | null;
  share_kind?: string | null;
  share_json?: string | null;
}): ChatMessage {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    sender: r.sender as "me" | "peer",
    body: r.body,
    createdAt: r.created_at,
    mediaId: r.media_id ?? undefined,
    shareKind: r.share_kind ?? undefined,
    shareJson: r.share_json ?? undefined,
  };
}

export function mapCourse(r: {
  id: string;
  session_label: string;
  semester: string;
  title: string;
  code: string;
}): Course {
  return {
    id: r.id,
    sessionLabel: r.session_label,
    semester: r.semester,
    title: r.title,
    code: r.code,
  };
}

export function mapMaterial(r: {
  id: string;
  course_id: string;
  title: string;
  kind: string;
}): StudyMaterial {
  return {
    id: r.id,
    courseId: r.course_id,
    title: r.title,
    kind: r.kind as StudyMaterial["kind"],
  };
}

export function mapSession(r: {
  id: string;
  course_id: string;
  title: string;
  starts_at: string;
  minutes: number;
}): StudySession {
  return {
    id: r.id,
    courseId: r.course_id,
    title: r.title,
    startsAt: r.starts_at,
    minutes: r.minutes,
  };
}

export function mapNote(r: {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  created_at: string;
}): AppNotification {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    href: r.href ?? undefined,
    read: r.read,
    createdAt: r.created_at,
  };
}

export function mapProfile(r: {
  user_id: string;
  display_name: string;
  handle: string;
  university_id: string;
  program: string;
  year: string;
  bio: string;
  campus_role?: string;
  onboarding_done?: boolean;
}): StudentProfile {
  return {
    userId: r.user_id,
    displayName: r.display_name,
    handle: r.handle,
    universityId: r.university_id,
    program: r.program,
    year: r.year,
    bio: r.bio,
    campusRole: r.campus_role,
    onboardingDone: Boolean(r.onboarding_done),
  };
}

export function mapBud(r: {
  id: string;
  role: string;
  content: string;
  created_at: string;
  conversation_id?: string | null;
  media_json?: string | null;
}): BudMessage {
  let media: BudMessage["media"];
  if (r.media_json) {
    try {
      media = JSON.parse(r.media_json) as BudMessage["media"];
    } catch {
      media = undefined;
    }
  }
  return {
    id: r.id,
    role: r.role as "user" | "assistant",
    content: r.content,
    createdAt: r.created_at,
    conversationId: r.conversation_id ?? undefined,
    media,
  };
}

export function mapConversation(r: {
  id: string;
  title: string;
  updated_at: string;
  preview?: string | null;
}): BudConversation {
  return {
    id: r.id,
    title: r.title,
    updatedAt: r.updated_at,
    preview: r.preview ?? "",
  };
}
