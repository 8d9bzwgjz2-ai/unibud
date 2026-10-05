/** Social identity labels. Not permissions. Never grant tutor/lecturer from a tag. */

export type IdentityTag =
  | "creator"
  | "athlete"
  | "artist"
  | "musician"
  | "entrepreneur"
  | "leader"
  | "class-rep";

export const IDENTITY_TAGS: { id: IdentityTag; label: string; academic?: boolean }[] = [
  { id: "creator", label: "Creator" },
  { id: "athlete", label: "Athlete" },
  { id: "artist", label: "Artist" },
  { id: "musician", label: "Musician" },
  { id: "entrepreneur", label: "Entrepreneur" },
  { id: "leader", label: "Student leader", academic: true },
  { id: "class-rep", label: "Class representative", academic: true },
];

export const SOCIAL_PLATFORMS = [
  { id: "instagram", label: "Instagram", host: "instagram.com" },
  { id: "tiktok", label: "TikTok", host: "tiktok.com" },
  { id: "youtube", label: "YouTube", host: "youtube.com" },
  { id: "x", label: "X", host: "x.com" },
  { id: "spotify", label: "Spotify", host: "open.spotify.com" },
] as const;

export function tagLabel(id: IdentityTag) {
  return IDENTITY_TAGS.find((t) => t.id === id)?.label ?? id;
}

function hostAllowed(hostname: string) {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  return SOCIAL_PLATFORMS.some((p) => {
    const want = p.host.replace(/^www\./, "").toLowerCase();
    return host === want || host.endsWith(`.${want}`);
  });
}

export function isSafeExternalUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return hostAllowed(u.hostname);
  } catch {
    return false;
  }
}
