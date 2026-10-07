/** Mix: user files, recorded voice, generated tones. Not a licensed music catalog. */

export type MixKind = "original" | "file" | "voice" | "tone";

export type MixTrack = {
  id: string;
  kind: MixKind;
  name: string;
  src?: string;
  volume: number;
  mute: boolean;
  fadeIn: number;
  fadeOut: number;
};

export const TONES: { id: string; name: string; hz: number }[] = [
  { id: "tone-low", name: "Low pulse", hz: 110 },
  { id: "tone-mid", name: "Mid pulse", hz: 196 },
  { id: "tone-air", name: "Air pulse", hz: 392 },
];

export function toneUrl(hz: number, seconds = 4) {
  const ctx = new AudioContext();
  const sample = ctx.sampleRate;
  const n = sample * seconds;
  const buf = ctx.createBuffer(1, n, sample);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const env = i < sample * 0.02 ? i / (sample * 0.02) : i > n - sample * 0.08 ? (n - i) / (sample * 0.08) : 1;
    ch[i] = Math.sin((2 * Math.PI * hz * i) / sample) * 0.18 * env;
  }
  ctx.close();
  const wav = encodeWav(buf);
  return URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
}

function encodeWav(buf: AudioBuffer) {
  const samples = buf.getChannelData(0);
  const out = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(out);
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, buf.sampleRate, true);
  v.setUint32(28, buf.sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out;
}

export async function recordVoice(ms = 8000) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  rec.start();
  await new Promise((r) => window.setTimeout(r, ms));
  rec.stop();
  stream.getTracks().forEach((t) => t.stop());
  await new Promise((r) => {
    rec.onstop = () => r(null);
  });
  return URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
}
