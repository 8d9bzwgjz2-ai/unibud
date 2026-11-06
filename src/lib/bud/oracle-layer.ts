/**
 * Oracle is the hidden knowledge layer behind Bud.
 * Never imported from shell/nav. Never named to the student.
 * Live answers go through the Oracle Arc model. This packet only points at real Connect places.
 */
import { campusSystemBrief } from "@/lib/oracle/campus";
import { CONNECT_LANES, connectSystemBrief } from "@/lib/connect/system";

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

/** Relationship questions get the real Connect map. Nothing else is treated as verified. */
export async function queryOracleLayer(req: OracleRequest): Promise<OraclePacket | null> {
  const q = req.query.toLowerCase();
  if (/\b(flow|wallet|savings|sport|fixture|cinema|movie|film|watch|order|handover|market|listing)\b/.test(q)) {
    return {
      summary: campusSystemBrief(),
      sources: [
        { title: "Flow", url: "/flow" },
        { title: "Sport", url: "/sport" },
        { title: "Cinema", url: "/watch" },
        { title: "Orders", url: "/orders" },
        { title: "Market", url: "/market" },
      ],
    };
  }
  if (!/\b(connect|people|friend|follow|soulync|wayward|message|chat|profile|directory)\b/.test(q)) return null;
  return {
    summary: connectSystemBrief(),
    sources: CONNECT_LANES.map((lane) => ({ title: lane.label, url: lane.to })),
  };
}
