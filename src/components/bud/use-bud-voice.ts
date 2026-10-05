import { useEffect, useRef, useState } from "react";

type Rec = {
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  lang: string;
  interimResults: boolean;
};

function makeRec(): Rec | null {
  if (typeof window === "undefined") return null;
  const C =
    (window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec })
      .SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => Rec }).webkitSpeechRecognition;
  if (!C) return null;
  const rec = new C();
  rec.lang = "en-NG";
  rec.interimResults = false;
  return rec;
}

export function useBudVoice() {
  const [listening, setListening] = useState(false);
  const recRef = useRef<Rec | null>(null);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  function listen(onText: (t: string) => void) {
    const rec = recRef.current ?? makeRec();
    recRef.current = rec;
    if (!rec) return false;
    rec.onresult = (ev) => {
      const t = ev.results[0]?.[0]?.transcript?.trim();
      if (t) onText(t);
    };
    rec.onend = () => setListening(false);
    try {
      rec.start();
      setListening(true);
      return true;
    } catch {
      setListening(false);
      return false;
    }
  }

  function stop() {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.96;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  }

  return { listen, stop, speak, listening, canListen: typeof window !== "undefined" && Boolean(makeRec()) };
}
