/**
 * Oracle is the hidden knowledge layer behind Bud.
 * Never imported from shell/nav. Never named to the student.
 */
import { GLOBAL_FACTS } from "@/lib/unibud/discover-data";

export const ORACLE_LAYER = {
  id: "oracle",
  visibleToStudent: false,
  role: "knowledge-identity",
  host: "bud",
} as const;

export type OracleRequest = {
  query: string;
  studentId?: string;
};

export type OraclePacket = {
  summary: string;
  sources: { title: string; url?: string }[];
};

/** Lightweight verify/research packet. Not a student-facing answer. */
export async function queryOracleLayer(req: OracleRequest): Promise<OraclePacket | null> {
  const q = req.query.toLowerCase();
  const hit = GLOBAL_FACTS.find(
    (f) =>
      q.includes(f.topic) ||
      q.includes(f.kicker.toLowerCase()) ||
      f.title.toLowerCase().split(" ").some((w) => w.length > 4 && q.includes(w)),
  );
  if (!hit) return null;
  if (!/\b(true|real|happen|news|discover|invent|moon|space|robot|trend|new)\b/.test(q)) return null;
  return {
    summary: `${hit.kicker}: ${hit.title}. ${hit.summary}`,
    sources: [{ title: hit.kicker }],
  };
}
