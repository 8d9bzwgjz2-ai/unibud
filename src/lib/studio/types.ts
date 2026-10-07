export type StudioView =
  | "camera"
  | "library"
  | "photo"
  | "video"
  | "write"
  | "live"
  | "stream"
  | "publish"
  | "settings"
  | "locked";

export type CaptureMode = "post" | "story" | "peek" | "live";

export type StudioIntent = "post" | "story" | "peek" | "reel";

export type PublishDest = "square" | "story" | "peek" | "message" | "live" | "save";

export type GridKind = "off" | "rule3" | "rule4" | "golden" | "cross" | "safe";

export type OverlayKind = "text" | "sticker" | "poll" | "question" | "mention" | "hashtag" | "place";
export type Audience = "everyone" | "connections" | "close" | "me";

export type StudioOverlay = {
  id: string;
  kind: OverlayKind;
  text: string;
  x: number;
  y: number;
  start: number;
  end: number;
  scale?: number;
  rot?: number;
};

export type StudioAdjust = {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  saturation: number;
  vibrance: number;
  temperature: number;
  tint: number;
  sharpness: number;
  clarity: number;
  vignette: number;
  grain: number;
  fade: number;
};

export const NEUTRAL_ADJUST: StudioAdjust = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  saturation: 0,
  vibrance: 0,
  temperature: 0,
  tint: 0,
  sharpness: 0,
  clarity: 0,
  vignette: 0,
  grain: 0,
  fade: 0,
};

export type StudioFilter = {
  id: string;
  name: string;
  category: string;
  premium?: boolean;
  css: string;
};

export type StudioClip = {
  id: string;
  src: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
  speed: number;
  reverse?: boolean;
  opacity?: number;
  rotate?: number;
  transition?: "cut" | "fade";
  effectId?: string;
};

export type MixTrack = {
  id: string;
  kind: "original" | "file" | "voice" | "tone" | "catalogue";
  name: string;
  src?: string;
  volume: number;
  mute: boolean;
  fadeIn: number;
  fadeOut: number;
  start?: number;
  trackId?: string;
  providerId?: string;
  artistName?: string;
};

export type StudioDraft = {
  id: string;
  kind: "photo" | "video" | "story" | "peek" | "live" | "write";
  dest: PublishDest;
  caption: string;
  image?: string;
  originalImage?: string;
  video?: string;
  clips: StudioClip[];
  filterId: string;
  filterAmount: number;
  adjust: StudioAdjust;
  aspect: "original" | "1:1" | "4:5" | "9:16" | "16:9";
  music?: string;
  mix: MixTrack[];
  overlays: StudioOverlay[];
  effectId: string;
  audience: Audience;
  topic?: string;
  place?: string;
  updatedAt: string;
};

export type LibraryItem = {
  id: string;
  kind: "photo" | "video";
  src: string;
  createdAt: string;
  favorite?: boolean;
  album?: string;
};

export type DualStatus = "off" | "on" | "unsupported" | "denied" | "busy";

export type ChromaPrefs = {
  on: boolean;
  plate: string;
  tolerance: number;
  feather: number;
};

export type CameraPrefs = {
  grid: GridKind;
  level: boolean;
  mirrorFront: boolean;
  hdr: boolean;
  stabilize: boolean;
  timer: 0 | 3 | 10;
  quality: "720" | "1080";
  fps: 24 | 30 | 60;
  flash: "off" | "on" | "auto";
  saveOriginal: boolean;
  locationMeta: boolean;
  audio: boolean;
  handsFree: boolean;
  greenScreen: boolean;
  dual: boolean;
  teleprompter: boolean;
};

export const DEFAULT_CAMERA: CameraPrefs = {
  grid: "off",
  level: false,
  mirrorFront: true,
  hdr: true,
  stabilize: true,
  timer: 0,
  quality: "1080",
  fps: 30,
  flash: "off",
  saveOriginal: true,
  locationMeta: false,
  audio: true,
  handsFree: false,
  greenScreen: false,
  dual: false,
  teleprompter: false,
};
