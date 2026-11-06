/** Concierge answers in the thread. It never claims a booking or an outside payment. */
export const CONCIERGE_DUTY = [
  "Point only to a place that exists in UNIBUD.",
  "Explain Flow, Sport, Cinema, Orders, Market, Connect, SouLync, and Wayward without inventing a person, a score, a title, or a listing.",
  "Refuse a booking, a ticket, and any payment.",
] as const;

export const CONCIERGE_ACTIONS = [
  { to: "/flow", label: "Flow", detail: "Share account and savings" },
  { to: "/sport", label: "Sport", detail: "Posted fixtures" },
  { to: "/watch", label: "Cinema", detail: "Titles members publish" },
  { to: "/orders", label: "Orders", detail: "Handover after Market" },
  { to: "/market", label: "Market", detail: "Real listings" },
  { to: "/connect", label: "Connect", detail: "Find a real account" },
  { to: "/connect/soulync", label: "SouLync", detail: "People who opted in" },
  { to: "/connect/wayward", label: "Wayward", detail: "Plans people organize" },
  { to: "/board", label: "Board", detail: "Classes and study" },
  { to: "/messages", label: "Chat", detail: "Messages already sent" },
] as const;

export function conciergeReply(text: string) {
  const q = text.toLowerCase();
  if (/\b(duty|responsib|what can you|what do you|your job|who are you|actions)\b/.test(q)) {
    return `My duty is three things. ${CONCIERGE_DUTY.join(" ")} The actions on this desk open those places. I do not carry them out for you, and I do not put this list in Bud.`;
  }
  if (/\b(flow|share account|savings|member ledger)\b/.test(q) || (/\b(pay|transfer|balance)\b/.test(q) && /\b(member|handle|flow|share)\b/.test(q))) {
    return "Flow is the member ledger. Add to your share account, move between shares and savings, or pay another member by @handle. Both sides update. It is not a bank deposit and nothing leaves UNIBUD.";
  }
  if (/\b(sport|fixture|football|score)\b/.test(q)) {
    return "Sport only shows fixtures a member posted. I can’t invent a match or a score. The person who posted it records live or full time.";
  }
  if (/\b(cinema|movie|film|watch)\b/.test(q)) {
    return "Cinema only shows titles a member published and has the right to show. There is no studio catalogue and no video file. My list is yours.";
  }
  if (/\b(order|handover|collected|reserved)\b/.test(q)) {
    return "Orders follows a request from asked, to accepted, to ready, to collected. Accepting reserves the listing. Collected marks it sold. I can’t take a payment.";
  }
  if (/\b(pay|payment|charge|transfer|book(?:ing)?|ticket)\b/.test(q)) {
    return "I can’t take a payment or confirm a booking. Nothing was charged. Member-to-member amounts live in Flow.";
  }
  if (/\b(buy|sell|market|listing)\b/.test(q)) {
    return "Market is where people list what they are selling. I can’t invent a listing or take the money.";
  }
  if (/\b(tour|party|concert|wayward|trip|outdoor)\b/.test(q)) {
    return "Wayward is where someone organizes a tour, a place, a night, or an activity. I can’t create that plan for them.";
  }
  if (/\b(date|dating|match|soulync)\b/.test(q)) {
    return "SouLync only shows people who turned it on. A match is two real accounts. I can’t introduce anyone else.";
  }
  if (/\b(class|course|lecture|exam|board|study)\b/.test(q)) {
    return "Board is academic: classes, study rooms, course posts, and notices.";
  }
  if (/\b(club|community|quad)\b/.test(q)) {
    return "Quad is social: communities people start, plus SouLync, Wayward, and Market.";
  }
  if (/\b(connect|find|people|friend)\b/.test(q)) {
    return "Search Connect by name or @handle, then follow or request. I only know accounts that exist.";
  }
  if (/\b(message|chat|text)\b/.test(q)) {
    return "A message reaches the other person only after you are connected and they allow messages. It shows in their Chat.";
  }
  return "I can point you to Flow, Sport, Cinema, Orders, Market, Connect, SouLync, Wayward, Board, or Quad. I can’t pretend something was arranged.";
}
