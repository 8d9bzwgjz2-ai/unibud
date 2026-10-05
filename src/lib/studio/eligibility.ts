/** Configurable capability policy. UI consumes evaluate() — it does not invent thresholds. */

export type FeatureId = "live" | "stream" | "call";

export type PolicyRule = {
  minAccountDays: number;
  minConnections: number;
  minFollowers: number;
  minAge: number;
  requireVerified: boolean;
  requireCreator: boolean;
  maxStrikes: number;
  regions: string[];
};

export type PolicyConfig = Record<FeatureId, PolicyRule>;

const OPEN: PolicyRule = {
  minAccountDays: 0,
  minConnections: 0,
  minFollowers: 0,
  minAge: 0,
  requireVerified: false,
  requireCreator: false,
  maxStrikes: 99,
  regions: [],
};

export const DEFAULT_POLICY: PolicyConfig = {
  call: { ...OPEN },
  live: { ...OPEN, maxStrikes: 2 },
  stream: {
    ...OPEN,
    minAccountDays: 7,
    minConnections: 5,
    requireCreator: true,
    maxStrikes: 0,
  },
};

export type AccountStanding = {
  startedAt: string;
  connections: number;
  followers: number;
  age?: number;
  region?: string;
  verified: boolean;
  creator: boolean;
  strikes: number;
};

export type Eligibility = {
  feature: FeatureId;
  ok: boolean;
  missing: { key: keyof PolicyRule; have: string; need: string }[];
};

export function accountDays(startedAt: string) {
  const ms = Date.now() - new Date(startedAt).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function evaluate(feature: FeatureId, standing: AccountStanding, policy: PolicyConfig): Eligibility {
  const rule = policy[feature] ?? OPEN;
  const days = accountDays(standing.startedAt);
  const missing: Eligibility["missing"] = [];
  if (days < rule.minAccountDays) {
    missing.push({ key: "minAccountDays", have: `${days}d`, need: `${rule.minAccountDays}d on UNIBUD` });
  }
  if (standing.connections < rule.minConnections) {
    missing.push({ key: "minConnections", have: `${standing.connections}`, need: `${rule.minConnections} connections` });
  }
  if (standing.followers < rule.minFollowers) {
    missing.push({ key: "minFollowers", have: `${standing.followers}`, need: `${rule.minFollowers} followers` });
  }
  if (rule.minAge && (standing.age ?? 0) < rule.minAge) {
    missing.push({ key: "minAge", have: standing.age != null ? `${standing.age}` : "unknown", need: `${rule.minAge}+` });
  }
  if (rule.requireVerified && !standing.verified) {
    missing.push({ key: "requireVerified", have: "unverified", need: "a verified account" });
  }
  if (rule.requireCreator && !standing.creator) {
    missing.push({ key: "requireCreator", have: "standard", need: "Creator pack" });
  }
  if (standing.strikes > rule.maxStrikes) {
    missing.push({ key: "maxStrikes", have: `${standing.strikes} strikes`, need: `at most ${rule.maxStrikes}` });
  }
  if (rule.regions.length && standing.region && !rule.regions.includes(standing.region)) {
    missing.push({ key: "regions", have: standing.region, need: "an available region" });
  }
  return { feature, ok: missing.length === 0, missing };
}
