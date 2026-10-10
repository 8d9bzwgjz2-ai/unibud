/** Bud academic media. Not social audio. Not licensed commercial music. */

export type BudMediaKind = "lecture" | "podcast" | "tutorial" | "course" | "study";

export type BudMedia = {
  id: string;
  kind: BudMediaKind;
  title: string;
  course?: string;
  durationMin: number;
  origin: "bud";
  createdAt: string;
  src?: string;
};

export const BUD_MEDIA: BudMedia[] = [
  {
    id: "bud-csc301-w4",
    kind: "podcast",
    title: "CSC 301 — Week 4",
    course: "Recursion",
    durationMin: 42,
    origin: "bud",
    createdAt: "2026-08-18T09:00:00.000Z",
  },
  {
    id: "bud-math101-l3",
    kind: "lecture",
    title: "MATH 101 — Lecture 3",
    course: "Limits",
    durationMin: 38,
    origin: "bud",
    createdAt: "2026-08-19T11:00:00.000Z",
  },
];

export function budMediaById(id: string) {
  return BUD_MEDIA.find((m) => m.id === id);
}
