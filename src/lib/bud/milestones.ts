/** Internal work map. Never shown in the Bud UI. */

export type Milestone = {
  goal: string;
  current: string;
  known: string[];
  struggles: string[];
  next: string;
  status: "fresh" | "in-progress" | "blocked";
};

export const EMPTY_MILESTONE: Milestone = {
  goal: "",
  current: "",
  known: [],
  struggles: [],
  next: "",
  status: "fresh",
};

export function parseMilestone(raw: string | null | undefined): Milestone {
  if (!raw) return { ...EMPTY_MILESTONE, known: [], struggles: [] };
  try {
    const v = JSON.parse(raw) as Partial<Milestone>;
    return {
      goal: typeof v.goal === "string" ? v.goal.slice(0, 180) : "",
      current: typeof v.current === "string" ? v.current.slice(0, 180) : "",
      known: Array.isArray(v.known) ? v.known.map(String).slice(-8) : [],
      struggles: Array.isArray(v.struggles) ? v.struggles.map(String).slice(-6) : [],
      next: typeof v.next === "string" ? v.next.slice(0, 180) : "",
      status: v.status === "in-progress" || v.status === "blocked" ? v.status : "fresh",
    };
  } catch {
    return { ...EMPTY_MILESTONE, known: [], struggles: [] };
  }
}

/** Update the map from this turn. Do not rediscover what is already known. */
export function advanceMilestone(prev: Milestone, prompt: string): Milestone {
  const p = prompt.replace(/\s+/g, " ").trim();
  const lower = p.toLowerCase();
  const topic = extractTopic(p);
  const goal = prev.goal || (topic ? `Understand ${topic}` : prev.goal);
  const struggles = [...prev.struggles];
  if (/\b(stuck|don't get|dont get|confused|struggl|lost|hard)\b/.test(lower) && topic) {
    if (!struggles.includes(topic)) struggles.push(topic);
  }
  const known = [...prev.known];
  if (/\b(got it|i understand|makes sense|okay i see)\b/.test(lower) && prev.current) {
    if (!known.includes(prev.current)) known.push(prev.current);
  }
  return {
    goal: goal.slice(0, 180),
    current: (topic || prev.current).slice(0, 180),
    known: known.slice(-8),
    struggles: struggles.slice(-6),
    next: topic && !known.includes(topic) ? `Check they can use ${topic} once` : prev.next,
    status: goal ? "in-progress" : "fresh",
  };
}

function extractTopic(prompt: string) {
  const cleaned = prompt.replace(/^(please |can you |could you |help me |explain |what is |what's |whats )/i, "");
  const t = cleaned.replace(/[?!.].*$/, "").trim();
  if (t.length < 3 || t.length > 80) return "";
  return t;
}
