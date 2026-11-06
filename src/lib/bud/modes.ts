/** Internal assistance slant. Never shown as an agent picker. */
export type BudMode = "academic" | "campus" | "planning" | "research" | "writing" | "general";

export function inferMode(prompt: string): BudMode {
  const p = prompt.toLowerCase();
  if (/\b(semester|timetable|schedule|plan my|deadline|calendar)\b/.test(p)) return "planning";
  if (/\b(research|source|cite|citation|paper|literature)\b/.test(p)) return "research";
  if (/\b(essay|write|explain|simplify|word|draft|paraphrase)\b/.test(p)) return "writing";
  if (/\b(hostel|campus|market|food|bus|keke|unilag|unn|lasu|find)\b/.test(p)) return "campus";
  if (/\b(assignment|course|exam|lecture|module|gpa|study)\b/.test(p)) return "academic";
  return "general";
}

export function modeHint(mode: BudMode): string {
  switch (mode) {
    case "academic":
      return "Lean academic: explain clearly, do not write submitted work.";
    case "campus":
      return "Lean campus life: hostels, market, services, getting around.";
    case "planning":
      return "Lean planning: break the semester into concrete next steps.";
    case "research":
      return "Lean research: structure inquiry, ask for sources, no fake citations.";
    case "writing":
      return "Lean writing: help them think and outline. Do not hand in the assignment.";
    default:
      return "Lean general student help. Stay practical.";
  }
}
