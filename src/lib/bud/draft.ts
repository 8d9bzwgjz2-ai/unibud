/** Carry a Square/Riff line into Bud without making Bud a feed overlay. */
export const BUD_DRAFT_KEY = "unibud-bud-draft";

export function setBudDraft(text: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(BUD_DRAFT_KEY, text.slice(0, 800));
}

export function takeBudDraft() {
  if (typeof window === "undefined") return "";
  const t = sessionStorage.getItem(BUD_DRAFT_KEY) ?? "";
  sessionStorage.removeItem(BUD_DRAFT_KEY);
  return t;
}
