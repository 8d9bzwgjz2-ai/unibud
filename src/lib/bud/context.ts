import type { Course, StudentProfile } from "@/lib/unibud/types";
import { formatSyllabus, syllabusForPrompt } from "@/lib/unibud/academic";

/** Dynamic student context for Bud. Never invent missing fields. */
export function formatStudentContext(
  profile: StudentProfile | null,
  courses: Course[],
  enrolledCodes: string[] = [],
  prompt = "",
): string {
  const bits: string[] = [];
  if (profile) {
    const who = [profile.displayName, profile.handle ? `@${profile.handle}` : ""]
      .filter(Boolean)
      .join(" ");
    if (who) bits.push(`Student: ${who}.`);
    if (profile.program) bits.push(`Program: ${profile.program}.`);
    if (profile.year) bits.push(`Year: ${profile.year}.`);
    if (profile.universityId) bits.push(`Campus id: ${profile.universityId}.`);
  }
  const codes = enrolledCodes.length ? enrolledCodes : courses.map((c) => c.code);
  if (codes.length) bits.push(`This semester they take: ${codes.join(", ")}.`);
  const relevant = syllabusForPrompt(prompt, codes);
  if (relevant.length) {
    bits.push(`Use only this syllabus. Do not invent topics.`);
    for (const c of relevant) bits.push(formatSyllabus(c));
  }
  if (courses.length) {
    bits.push(`Saved study notes courses: ${courses.map((c) => `${c.code} ${c.title}`.trim()).join("; ")}.`);
  }
  bits.push("Wallet in UNIBUD is a demo ledger. Funding notes are personal, not official.");
  bits.push("Only use facts supplied here. Do not invent a university, course, name, or balance.");
  bits.push("Do not write identical essays for every student. Explain, vary examples, ask what they already tried.");
  bits.push("If they mark work as an assessment or exam, help them learn — do not produce a ready-to-submit identical script.");
  bits.push("Keep replies short. Explain hard words. Do not dump this syllabus back as a list unless they asked what the course covers.");
  return bits.join(" ");
}