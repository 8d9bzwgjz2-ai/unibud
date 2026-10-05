import { getSql } from "@/lib/db";
import { canTeach, canGovernClass, canModerateCommunity, type CampusRole } from "./roles";

function asRole(v: unknown): CampusRole {
  if (v === "lecturer" || v === "governor" || v === "moderator" || v === "student") return v;
  return "student";
}

export async function loadCampusRole(userId: string): Promise<CampusRole> {
  const sql = await getSql();
  const rows = await sql<{ campus_role?: string }>`
    select campus_role from student_profiles where user_id = ${userId} limit 1`;
  return asRole(rows[0]?.campus_role);
}

export async function assertCanTeach(userId: string) {
  const role = await loadCampusRole(userId);
  if (!canTeach(role)) throw new Error("Only lecturers can use Tutor Mode.");
  return role;
}

export async function assertCanGovern(userId: string) {
  const role = await loadCampusRole(userId);
  if (!canGovernClass(role)) throw new Error("Only class governors can coordinate a class.");
  return role;
}

export async function assertCanModerate(userId: string) {
  const role = await loadCampusRole(userId);
  if (!canModerateCommunity(role)) throw new Error("Only community moderators can do that.");
  return role;
}
