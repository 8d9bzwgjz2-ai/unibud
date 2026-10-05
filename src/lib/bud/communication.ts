export type CommunicationStyle = {
  language: "english" | "pidgin" | "mixed" | "other";
  complexity: "simple" | "standard" | "detailed";
  tone: "calm" | "encouraging" | "direct" | "playful";
  responseLength: "brief" | "normal" | "deep";
  useAnalogy: boolean;
  askUnderstandingCheck: boolean;
};

export function inferCommunicationStyle(prompt: string): CommunicationStyle {
  const p = prompt.toLowerCase();
  const pidgin = /\b(wetin|dey|abi|sha|no wahala|na so|how far|oya|make we|una|sabi|fit|don|go dey|e be)\b/.test(p);
  const asksSimple = /\b(explain like|simple|simplify|easy|i don't understand|dont understand|confused|break it down)\b/.test(p);
  const asksDeep = /\b(in detail|deep dive|thorough|prove|derivation|research)\b/.test(p);
  const asksShort = /\b(quickly|just tell me|short answer|what time|when is|where is)\b/.test(p);
  const playful = /\b(fun|football|messi|anime|movie|game|gist)\b/.test(p);

  return {
    language: pidgin ? "mixed" : "english",
    complexity: asksSimple ? "simple" : asksDeep ? "detailed" : "standard",
    tone: playful ? "playful" : /\b(frustrated|stuck|help)\b/.test(p) ? "encouraging" : asksShort ? "direct" : "calm",
    responseLength: asksShort ? "brief" : asksDeep ? "deep" : "normal",
    useAnalogy: asksSimple || playful,
    askUnderstandingCheck: asksSimple || /\b(explain|teach|learn|understand)\b/.test(p),
  };
}

export function communicationInstruction(prompt: string): string {
  const style = inferCommunicationStyle(prompt);
  return `Communication strategy: language=${style.language}; complexity=${style.complexity}; tone=${style.tone}; length=${style.responseLength}; analogy=${style.useAnalogy ? "yes" : "only if useful"}; understanding-check=${style.askUnderstandingCheck ? "yes" : "no"}. Adapt naturally to the student. Do not force a style marker or announce the strategy.`;
}
