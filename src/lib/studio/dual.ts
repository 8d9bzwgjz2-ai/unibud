/** Dual camera: two real streams, or an explicit unsupported state. Never fake a second view. */

export type DualResult =
  | { ok: true; front: MediaStream; back: MediaStream }
  | { ok: false; reason: "unsupported" | "denied" | "busy" };

let live: Extract<DualResult, { ok: true }> | null = null;

export function currentDual() {
  return live;
}

export function stopDual() {
  if (!live) return;
  live.front.getTracks().forEach((t) => t.stop());
  live.back.getTracks().forEach((t) => t.stop());
  live = null;
}

export async function openDual(): Promise<DualResult> {
  if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices.enumerateDevices) {
    return { ok: false, reason: "unsupported" };
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter((d) => d.kind === "videoinput");
    if (cams.length < 2) return { ok: false, reason: "unsupported" };
    const back = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    try {
      const front = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" } },
        audio: false,
      });
      const backId = back.getVideoTracks()[0]?.getSettings().deviceId;
      const frontId = front.getVideoTracks()[0]?.getSettings().deviceId;
      if (backId && frontId && backId === frontId) {
        front.getTracks().forEach((t) => t.stop());
        back.getTracks().forEach((t) => t.stop());
        return { ok: false, reason: "unsupported" };
      }
      return { ok: true, front, back };
    } catch (e) {
      back.getTracks().forEach((t) => t.stop());
      const name = e instanceof Error ? e.name : "";
      if (name === "NotAllowedError") return { ok: false, reason: "denied" };
      return { ok: false, reason: "unsupported" };
    }
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "NotAllowedError") return { ok: false, reason: "denied" };
    if (name === "NotReadableError") return { ok: false, reason: "busy" };
    return { ok: false, reason: "unsupported" };
  }
}

export async function startDual(): Promise<DualResult> {
  stopDual();
  const r = await openDual();
  if (r.ok) live = r;
  return r;
}
