const MAX = 80 * 1024 * 1024;

export type MediaPick =
  | { ok: true; files: File[] }
  | { ok: false; reason: "cancelled" | "denied" | "unavailable" | "empty" | "too-large" };

export async function pickDeviceMedia(opts?: { multiple?: boolean }): Promise<MediaPick> {
  const multiple = opts?.multiple !== false;
  const picker = (window as unknown as { showOpenFilePicker?: (o: unknown) => Promise<{ getFile: () => Promise<File> }[]> }).showOpenFilePicker;
  try {
    if (picker) {
      const handles = await picker({
        multiple,
        types: [
          {
            description: "Photos and videos",
            accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".heic"], "video/*": [".mp4", ".webm", ".mov"] },
          },
        ],
      });
      const files = await Promise.all(handles.map((h) => h.getFile()));
      if (!files.length) return { ok: false, reason: "empty" };
      if (files.some((f) => f.size > MAX)) return { ok: false, reason: "too-large" };
      return { ok: true, files };
    }
    return { ok: false, reason: "unavailable" };
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "AbortError") return { ok: false, reason: "cancelled" };
    if (name === "NotAllowedError" || name === "SecurityError") return { ok: false, reason: "denied" };
    return { ok: false, reason: "unavailable" };
  }
}

export function filesFromInput(list: FileList | null): MediaPick {
  const files = [...(list ?? [])];
  if (!files.length) return { ok: false, reason: "empty" };
  if (files.some((f) => f.size > MAX)) return { ok: false, reason: "too-large" };
  return { ok: true, files };
}

export function pickReasonCopy(r: Exclude<MediaPick, { ok: true }>["reason"]) {
  if (r === "denied") return "UNIBUD can’t read files until this browser allows it.";
  if (r === "cancelled") return "Nothing imported.";
  if (r === "too-large") return "Keep each file under 80 MB on this path.";
  if (r === "empty") return "No files in that pick.";
  return "This browser uses the Files button, not the phone Photos app.";
}
