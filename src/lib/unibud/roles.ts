export type CampusRole = "student" | "governor" | "lecturer" | "moderator";

/** Lecturer / tutor broadcasting and official teaching. Does not inherit. */
export function canTeach(role: CampusRole) {
  return role === "lecturer";
}

/** Class coordination only. Governors stay students. Lecturers do not inherit this. */
export function canGovernClass(role: CampusRole) {
  return role === "governor";
}

/** Community moderation, scoped in the UI to that community. Does not inherit. */
export function canModerateCommunity(role: CampusRole) {
  return role === "moderator";
}

export function roleLabel(role: CampusRole, program?: string) {
  switch (role) {
    case "lecturer":
      return program ? `Lecturer · ${program}` : "Lecturer";
    case "governor":
      return "Student · Class Governor";
    case "moderator":
      return "Community Moderator";
    default:
      return "Student";
  }
}
