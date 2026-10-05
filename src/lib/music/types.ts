/** UNIBUD Music: streaming catalogue contracts. Not a user-upload dump for commercial tracks. */

export type MusicLayer =
  | "catalogue" // licensed commercial, provider-backed
  | "owned" // UNIBUD-owned / user-generated original
  | "voice" // recorded in Studio
  | "edit" // temporary Studio scratch audio
  | "tone"; // generated pulse, not a song

/** "ready" only when a real licensed catalogue provider is connected. */
export type CatalogueStatus = "unprovisioned" | "ready";

export type Entitlement = "unavailable" | "preview" | "ads" | "free" | "premium";

export type TerritoryCode = string;

export type TrackRights = {
  stream: boolean;
  previewSeconds: number;
  studioUse: boolean;
  download: boolean;
  territories: TerritoryCode[];
  explicit: boolean;
  expiresAt?: string;
};

export type Artist = { id: string; name: string };
export type Album = { id: string; title: string; artistId: string; artwork?: string };

export type Track = {
  id: string;
  title: string;
  artistId: string;
  artistName?: string;
  albumId: string;
  albumTitle?: string;
  durationMs: number;
  artwork?: string;
  rights: TrackRights;
  entitlement: Entitlement;
  /** Licensed stream URL from the provider. Never a user-uploaded commercial file. */
  streamUrl?: string;
  providerId: string;
};

export type PlaybackSource = {
  trackId: string;
  kind: "preview" | "stream";
  url: string;
  startMs?: number;
  durationMs?: number;
  expiresAt?: string;
};

export type ProviderCapabilities = {
  search: boolean;
  metadata: boolean;
  artwork: boolean;
  preview: boolean;
  playback: boolean;
  deepLink: boolean;
  favorites: boolean;
  authorization: boolean;
  commercialUse: boolean;
  synchronization: boolean;
  territories: boolean;
  affiliate: boolean;
  attribution: boolean;
};

export const UNPROVISIONED_CAPABILITIES: ProviderCapabilities = {
  search: false,
  metadata: false,
  artwork: false,
  preview: false,
  playback: false,
  deepLink: false,
  favorites: false,
  authorization: false,
  commercialUse: false,
  synchronization: false,
  territories: false,
  affiliate: false,
  attribution: false,
};

export type SearchQuery = {
  q: string;
  territory?: TerritoryCode;
  entitlement?: Entitlement;
};

export type BrowsePage = {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
};

export type MusicProvider = {
  id: string;
  name: string;
  status: CatalogueStatus;
  reason: string;
  search: (q: SearchQuery) => Promise<Track[]>;
  browse: () => Promise<BrowsePage>;
  artist: (id: string) => Promise<Artist | null>;
  album: (id: string) => Promise<Album | null>;
  track: (id: string) => Promise<Track | null>;
  playback: (trackId: string, kind: "preview" | "stream") => Promise<PlaybackSource | null>;
  licensing: (trackId: string) => Promise<TrackRights | null>;
  listenLink: (trackId: string) => Promise<{ provider: string; url: string } | null>;
  capabilities: ProviderCapabilities;
};

export type MusicRef = {
  providerId: string;
  trackId: string;
  title: string;
  artistName?: string;
  artwork?: string;
  startMs: number;
  durationMs?: number;
  entitlement: Entitlement;
  sourceType?: "LICENSED_MUSIC" | "ORIGINAL_AUDIO" | "USER_AUDIO";
  audioId?: string;
  creatorHandle?: string;
};

export type MusicBusiness = {
  adsSupported: boolean;
  premiumSubscription: boolean;
  creatorPayout: boolean;
  royaltyAccounting: boolean;
  /** Rates are contract-defined. Never invent numbers here. */
  contractId?: string;
};
