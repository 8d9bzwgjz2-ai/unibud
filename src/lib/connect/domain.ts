/** Relationship rules for Connect. No profiles are invented here. */

export type RequestStatus = "pending" | "accepted" | "declined" | "cancelled" | "removed";
export type FollowStatus = "pending" | "active";

export type ConnectRequest = {
  id: string;
  fromId: string;
  toId: string;
  status: RequestStatus;
};

export type Follow = {
  followerId: string;
  followedId: string;
  status: FollowStatus;
};

export type Block = { blockerId: string; blockedId: string };

export type DiscoverPerson = {
  id: string;
  handle: string;
  name: string;
  extra: string;
  discoverable: boolean;
  verified: boolean;
  username?: string;
};

export function isBlocked(blocks: Block[], a: string, b: string) {
  return blocks.some(
    (block) =>
      (block.blockerId === a && block.blockedId === b) || (block.blockerId === b && block.blockedId === a),
  );
}

export function visibleInSearch(person: DiscoverPerson, viewerId: string, blocks: Block[]) {
  if (person.id === viewerId) return false;
  if (!person.discoverable) return false;
  if (isBlocked(blocks, viewerId, person.id)) return false;
  return true;
}

function levenshtein(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let last = i - 1;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = prev[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, last + cost);
      last = cur;
    }
  }
  return prev[b.length] ?? 99;
}

/** Relevance only. Verification never changes rank. `@name` matches the same as `name`. */
export function rankScore(
  query: string,
  person: Pick<DiscoverPerson, "handle" | "name" | "extra" | "verified"> & { username?: string },
) {
  const q = query.trim().toLowerCase().replace(/^@+/, "");
  if (!q) return 1;
  const handles = [person.handle, person.username]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
  const name = person.name.toLowerCase();
  const extra = person.extra.toLowerCase();
  let score = 0;
  if (handles.some((handle) => handle === q)) score = 100;
  else if (name === q) score = 90;
  else if (handles.some((handle) => handle.startsWith(q)) || name.startsWith(q)) score = 70;
  else if (handles.some((handle) => handle.includes(q)) || name.includes(q)) score = 50;
  else if (handles.some((handle) => levenshtein(handle, q) <= 1) || levenshtein(name, q) <= 1) score = 40;
  else if (extra.includes(q)) score = 30;
  return score;
}

export function rankPeople<T extends DiscoverPerson>(query: string, people: T[]) {
  return people
    .map((person) => ({ person, score: rankScore(query, person) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.person.name.localeCompare(b.person.name))
    .map((row) => row.person);
}

export function rankServices<T extends { name: string; category: string; description: string }>(query: string, services: T[]) {
  const q = query.trim().toLowerCase();
  return services
    .map((service) => {
      if (!q) return { service, score: 1 };
      const name = service.name.toLowerCase();
      const extra = `${service.category} ${service.description}`.toLowerCase();
      let score = 0;
      if (name === q) score = 100;
      else if (name.startsWith(q)) score = 70;
      else if (name.includes(q)) score = 50;
      else if (extra.includes(q)) score = 30;
      return { service, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.service.name.localeCompare(b.service.name))
    .map((row) => row.service);
}

/** Prefer an incoming request so Accept is not hidden behind a request this person sent. */
export function relationWith(requests: ConnectRequest[], me: string, them: string) {
  const incoming = requests.find((request) => request.status === "pending" && request.toId === me && request.fromId === them);
  const outgoing = requests.find((request) => request.status === "pending" && request.fromId === me && request.toId === them);
  const accepted = acceptedBetween(requests, me, them);
  const pending = incoming ?? outgoing;
  return {
    pending,
    accepted,
    requestFromMe: Boolean(outgoing) && !incoming,
    requestId: pending?.id ?? null,
    requestStatus: (pending?.status ?? accepted?.status ?? null) as ConnectRequest["status"] | null,
  };
}

export function pendingBetween(requests: ConnectRequest[], a: string, b: string) {
  return requests.find(
    (request) =>
      request.status === "pending" &&
      ((request.fromId === a && request.toId === b) || (request.fromId === b && request.toId === a)),
  );
}

export function acceptedBetween(requests: ConnectRequest[], a: string, b: string) {
  return requests.find(
    (request) =>
      request.status === "accepted" &&
      ((request.fromId === a && request.toId === b) || (request.fromId === b && request.toId === a)),
  );
}

/** A direct message only goes to a real, connected person who allows messages. */
export function canDirectMessage(input: {
  fromId: string;
  toId: string;
  blocks: Block[];
  requests: ConnectRequest[];
  allowMessages: boolean;
}) {
  if (input.fromId === input.toId) return { ok: false as const, error: "You cannot message yourself." };
  if (isBlocked(input.blocks, input.fromId, input.toId)) return { ok: false as const, error: "This person is not available." };
  if (!acceptedBetween(input.requests, input.fromId, input.toId)) {
    return { ok: false as const, error: "Connect before you message." };
  }
  if (!input.allowMessages) return { ok: false as const, error: "This person is not taking messages." };
  return { ok: true as const };
}

export function sendRequest(input: {
  fromId: string;
  toId: string;
  requests: ConnectRequest[];
  blocks: Block[];
  allowRequests: boolean;
}) {
  if (input.fromId === input.toId) return { ok: false as const, error: "You cannot connect with yourself." };
  if (isBlocked(input.blocks, input.fromId, input.toId)) return { ok: false as const, error: "This person is not available." };
  if (!input.allowRequests) return { ok: false as const, error: "This person is not taking connection requests." };
  if (acceptedBetween(input.requests, input.fromId, input.toId)) return { ok: false as const, error: "You are already connected." };
  const pending = pendingBetween(input.requests, input.fromId, input.toId);
  if (pending) {
    if (pending.toId === input.fromId) {
      return { ok: false as const, error: "They already asked to connect. Accept it from Requests." };
    }
    return { ok: false as const, error: "A request is already waiting.", request: pending };
  }
  return { ok: true as const };
}

export function acceptRequest(request: ConnectRequest | undefined, actorId: string) {
  if (!request || request.status !== "pending") return { ok: false as const, error: "That request is no longer waiting." };
  if (request.toId !== actorId) return { ok: false as const, error: "Only the recipient can accept this request." };
  return { ok: true as const, requesterId: request.fromId };
}

export function declineRequest(request: ConnectRequest | undefined, actorId: string) {
  if (!request || request.status !== "pending") return { ok: false as const, error: "That request is no longer waiting." };
  if (request.toId !== actorId) return { ok: false as const, error: "Only the recipient can decline this request." };
  return { ok: true as const };
}

export function cancelRequest(request: ConnectRequest | undefined, actorId: string) {
  if (!request || request.status !== "pending") return { ok: false as const, error: "That request is no longer waiting." };
  if (request.fromId !== actorId) return { ok: false as const, error: "Only the sender can cancel this request." };
  return { ok: true as const };
}

export function removeConnection(request: ConnectRequest | undefined, actorId: string) {
  if (!request || request.status !== "accepted") return { ok: false as const, error: "There is no connection to remove." };
  if (request.fromId !== actorId && request.toId !== actorId) return { ok: false as const, error: "That connection is not yours." };
  return { ok: true as const, otherId: request.fromId === actorId ? request.toId : request.fromId };
}

export function followUser(input: {
  followerId: string;
  followedId: string;
  blocks: Block[];
  approval: boolean;
  existing?: Follow;
}) {
  if (input.followerId === input.followedId) return { ok: false as const, error: "You cannot follow yourself." };
  if (isBlocked(input.blocks, input.followerId, input.followedId)) return { ok: false as const, error: "This person is not available." };
  if (input.existing?.status === "active") return { ok: false as const, error: "You already follow this person.", status: "active" as const };
  if (input.existing?.status === "pending") return { ok: false as const, error: "A follow request is already waiting.", status: "pending" as const };
  return { ok: true as const, status: input.approval ? ("pending" as const) : ("active" as const) };
}

export function authorizeService(integration: "available" | "unavailable", scopes: string[]) {
  if (integration !== "available") return { ok: false as const, error: "This service is not available to connect." };
  const clean = scopes.map((scope) => scope.trim()).filter(Boolean);
  if (!clean.length) return { ok: false as const, error: "Nothing was approved to share." };
  return { ok: true as const, status: "connected" as const, scopes: clean };
}

export function serviceLabel(integration: "available" | "unavailable", grantStatus?: string | null) {
  if (integration !== "available") return "Not connected";
  if (grantStatus === "connected") return "Connected";
  if (grantStatus === "pending") return "Connection pending";
  if (grantStatus === "revoked") return "Access revoked";
  return "Not connected";
}

export type ConnectionAsker = { name: string; handle: string; at: string };

/** Old notices say "Ada wants to connect" with no @handle. Attach the asker who actually sent it. */
export function nameConnectionAsker(
  note: { title: string; body: string; href?: string },
  askers: ConnectionAsker[],
  noteAt: string,
) {
  const blob = `${note.title}\n${note.body}`;
  const isRequest = /connection request|wants to connect|asked to connect/i.test(blob);
  if (!isRequest || /@[a-z0-9_]/i.test(blob)) return note;
  const lower = blob.toLowerCase();
  const named = askers.filter((asker) => asker.handle && asker.name && lower.includes(asker.name.toLowerCase()));
  if (!named.length) return note;
  const at = Date.parse(noteAt);
  const best = named
    .slice()
    .sort((a, b) => Math.abs(Date.parse(a.at) - at) - Math.abs(Date.parse(b.at) - at))[0];
  return {
    title: `${best.name} (@${best.handle}) asked to connect`,
    body: "Accept or decline this request from Connect.",
    href: `/connect/people/${best.handle}`,
  };
}
