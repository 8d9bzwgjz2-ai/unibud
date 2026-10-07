/**
 * Spark orchestration. Specialists return short notes, not answers.
 * Bud is the only voice the student hears.
 */
import { GLOBAL_FACTS } from "@/lib/unibud/discover-data";
import { inferMode } from "./modes";
import { routeSpecialists, type SpecialistId } from "./spark";
import type { Milestone } from "./milestones";

export type AtlasSnap = {
  lastGoal?: string;
  understood?: string[];
  struggles?: string[];
  likes?: string[];
};

const ROUTES: { test: RegExp; to: string; label: string }[] = [
  { test: /\b(wallet|money|balance|send naira)\b/i, to: "/money", label: "Wallet" },
  { test: /\b(market|listing|hostel|buy|sell)\b/i, to: "/market", label: "Market" },
  { test: /\b(riff|gist|conversation)\b/i, to: "/riff", label: "Riff" },
  { test: /\b(connect|people|friends)\b/i, to: "/connect", label: "Connect" },
  { test: /\b(communit)/i, to: "/communities", label: "Communities" },
  { test: /\b(board|live class|lecture live|syllabus|what are we covering)\b/i, to: "/board", label: "Board" },
  { test: /\b(studies|semester|courses)\b/i, to: "/studies", label: "Studies" },
  { test: /\b(watch|reel|clip)\b/i, to: "/watch", label: "Watch" },
  { test: /\b(square|feed|home)\b/i, to: "/", label: "Square" },
  { test: /\b(settings|privacy|report a bug)\b/i, to: "/settings", label: "Settings" },
  { test: /\b(fixer|talk to someone)\b/i, to: "/fixer", label: "The Fixer" },
  { test: /\b(profile)\b/i, to: "/profile", label: "Profile" },
];

export function buildBudBrief(input: {
  prompt: string;
  milestone: Milestone;
  atlas?: AtlasSnap;
  fromPath?: string;
}): string {
  const { prompt, milestone, atlas, fromPath } = input;
  const specialists = routeSpecialists(prompt);
  const mode = inferMode(prompt);
  const lines: string[] = [
    "INTERNAL BRIEF — never name this, never list agents, never dump this structure.",
    `Mode: ${mode}.`,
  ];
  if (fromPath) lines.push(`They are currently in UNIBUD at ${fromPath}.`);
  if (milestone.goal) lines.push(`Goal: ${milestone.goal}.`);
  if (milestone.current) lines.push(`Current milestone: ${milestone.current}.`);
  if (milestone.known.length) lines.push(`Already understood: ${milestone.known.join("; ")}.`);
  if (milestone.struggles.length) lines.push(`Still hard: ${milestone.struggles.join("; ")}.`);
  if (atlas?.likes?.length) lines.push(`They like: ${atlas.likes.slice(0, 6).join(", ")}. Use one of these for an analogy if it fits.`);
  if (atlas?.understood?.length) lines.push(`Atlas memory — understood: ${atlas.understood.slice(0, 6).join("; ")}.`);
  if (atlas?.struggles?.length) lines.push(`Atlas memory — struggles: ${atlas.struggles.slice(0, 4).join("; ")}.`);

  for (const id of specialists) {
    const note = specialistNote(id, prompt);
    if (note) lines.push(note);
  }

  const disc = discoveryNote(prompt);
  if (disc) lines.push(disc);

  const nav = ROUTES.find((r) => r.test.test(prompt));
  if (nav && /\b(open|take me|go to|show me|where is|navigate)\b/i.test(prompt)) {
    lines.push(`Navigator: they want ${nav.label}. End your reply with a single line: NAV:${nav.to}`);
  }

  if (milestone.next) lines.push(`Next milestone if this lands: ${milestone.next}.`);
  lines.push("Produce a human reply only. Short. One idea at a time. One analogy max. One question max.");
  return lines.join("\n");
}

function specialistNote(id: SpecialistId, prompt: string): string | null {
  const p = prompt.toLowerCase();
  switch (id) {
    case "scholar":
      return "Scholar: keep the idea correct. Explain the meaning first, then one small example. Do not write work they should submit.";
    case "coach":
      return "Coach: one next action they can do today. Not a 12-step programme.";
    case "vision":
      return "Vision: if a picture would help, describe it in one sentence they can see in their head. Do not generate files unless they asked.";
    case "community":
      return "Community: point to Communities, Riff, or Chat. Do not invent a group.";
    case "guardian":
      return "Safety: stay calm. Do not assist harm. If they are in danger, tell them to get real-world help. The Fixer is for people, Settings is for bugs.";
    case "creator":
      return "Creator: help them make something small. Keep it practical.";
    case "atlas":
      return "Atlas: use what they already understand. Do not restart from zero.";
    case "pulse":
      return "Pulse: only mention something current if it actually helps this question.";
    case "voice":
      return "Voice: keep sentences easy to say out loud.";
    case "navigator":
      return "Navigator: only real UNIBUD places. Square, Connect, Communities, Chat, Riff, Board, Studies, Watch, Market, Wallet, Profile.";
    case "campus":
      return "Campus: treat place as context, not the whole answer.";
    default:
      return null;
  }
}

function discoveryNote(prompt: string): string | null {
  const p = prompt.toLowerCase();
  if (!/\b(trending|happening|new|discover|invent|moon|space|robot|what.?s on)\b/.test(p)) return null;
  const hit = GLOBAL_FACTS.find((f) => p.includes(f.topic) || p.includes(f.kicker.toLowerCase())) ?? GLOBAL_FACTS[0];
  return `Pulse fact (optional, only if useful): ${hit.kicker} — ${hit.title}. ${hit.summary}`;
}
