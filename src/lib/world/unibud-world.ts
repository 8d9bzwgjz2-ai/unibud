export const UNIBUD_WORLD_PRINCIPLES = {
  type: "educational-world",
  description:
    "UNIBUD is a connected educational world and student society, not a collection of isolated features.",
  learningModel:
    "Learning is woven into ordinary life. Social browsing is not treated as a lesson by default.",
  realityFirst:
    "World activity, content, relationships, imports, and agent work must come from real application state or connected capabilities.",
  agents:
    "Agents are distinct people-like roles within one unified intelligence, with identity, responsibility, behavior, memory, state, relationships, and real collaboration.",
  places:
    "Places are first-class world concepts with purpose, context, activity, rules, relationships, and state.",
  discovery:
    "The Square and Discovery should remain open-ended and continuously changing when real sources are available.",
  integrations:
    "Connected browsing and social integrations may surface permitted external content, including the student's own external posts, but only when a real integration returns it.",
} as const;

export const UNIBUD_CORE_PLACES = [
  "square",
  "discovery",
  "campus",
  "chat",
  "studies",
  "scene",
  "drop",
  "profile",
] as const;

export type UnibudCorePlace = (typeof UNIBUD_CORE_PLACES)[number];
