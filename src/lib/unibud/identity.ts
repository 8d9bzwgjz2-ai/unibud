import type { DirectoryPerson } from "./types";
import { COMMUNITIES } from "./catalog";
import type { AcademicVisibility, ProfileVisibility } from "./campus-store";

export type CampusLens = {
  universityId: string;
  program: string;
  year: string;
  faculty: string;
  department: string;
};

/** Fallback lens when the student has not set a campus yet. Not a Mix filter. */
export const SELF_CAMPUS: CampusLens = {
  universityId: "unilag",
  program: "Computer Engineering",
  year: "300",
  faculty: "Engineering",
  department: "Computer Engineering",
};

export function academicLine(p: DirectoryPerson) {
  const bits = [p.faculty, p.department, p.program, p.year ? `${p.year} level` : ""]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);
  return bits.join(" · ");
}

export function proximityScore(p: DirectoryPerson, connected: string[], lens: CampusLens = SELF_CAMPUS) {
  let n = 0;
  if (p.universityId === lens.universityId) n += 5;
  if (p.faculty === lens.faculty) n += 3;
  if (p.program === lens.program) n += 4;
  if (p.year === lens.year) n += 2;
  if (p.department === lens.department) n += 2;
  const shared = COMMUNITIES.filter(
    (c) => c.universityId && (c.universityId === p.universityId || c.universityId === lens.universityId),
  ).length;
  n += Math.min(3, shared);
  if (connected.includes(p.handle)) n -= 8;
  return n;
}

export function sharedContext(p: DirectoryPerson, lens: CampusLens = SELF_CAMPUS) {
  const items: string[] = [];
  if (p.universityId === lens.universityId) items.push("Same campus");
  if (p.program === lens.program) items.push("Same programme");
  if (p.year === lens.year) items.push("Same level");
  if (p.faculty && p.faculty === lens.faculty) items.push("Same faculty");
  const rooms = COMMUNITIES.filter(
    (c) =>
      c.universityId === p.universityId &&
      c.universityId === lens.universityId &&
      (c.kind === "Class" || c.kind === "Study" || c.kind === "University" || c.kind === "Faculty"),
  ).slice(0, 3);
  return { items, rooms };
}

/** Academic details are a permission, not a UI trick. Self always sees their own. */
export function canViewAcademic(opts: {
  self?: boolean;
  connected: boolean;
  following: boolean;
  sameCampus: boolean;
  visibility: AcademicVisibility;
}) {
  if (opts.self) return true;
  if (opts.visibility === "hidden") return false;
  if (opts.visibility === "campus") return opts.sameCampus || opts.connected;
  return opts.connected;
}

/** Public social card. Display name + username stay visible; this gates extra social detail. */
export function canViewSocialExtras(opts: {
  self?: boolean;
  connected: boolean;
  sameCampus: boolean;
  visibility: ProfileVisibility;
}) {
  if (opts.self) return true;
  if (opts.visibility === "public") return true;
  if (opts.visibility === "campus") return opts.sameCampus || opts.connected;
  return opts.connected;
}
