export type ChatShare = {
  kind: "audio" | "video" | "photo" | "bud" | "file";
  title?: string;
  audioId?: string;
  budMediaId?: string;
  mediaId?: string;
  src?: string;
  duration?: string;
};

export function parseShareJson(raw?: string): ChatShare | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as ChatShare;
  } catch {
    return undefined;
  }
}

