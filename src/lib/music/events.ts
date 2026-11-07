/** Audio analytics. No fake revenue. Client-side buffer; persistAudioEvent writes SQL. */

export type AudioEventKind =
  | "preview"
  | "save"
  | "unsave"
  | "use"
  | "share"
  | "provider_click"
  | "report"
  | "audio_view"
  | "bud_media_play"
  | "bud_media_share"
  | "bud_media_open"
  | "chat_media_sent"
  | "chat_media_played";

export type AudioEvent = {
  id: string;
  kind: AudioEventKind;
  audioId?: string;
  budMediaId?: string;
  providerId?: string;
  surface: "drop" | "story" | "peek" | "chat" | "audio-page" | "community" | "bud";
  at: string;
};

const events: AudioEvent[] = [];

export function recordAudioEvent(e: Omit<AudioEvent, "id" | "at">) {
  events.push({ ...e, id: `ae-${Date.now()}-${events.length}`, at: new Date().toISOString() });
}

export function listAudioEvents() {
  return events.slice();
}
