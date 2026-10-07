/** Stable contracts for UNIBUD's internal living agent system. */

export type AgentId =
  | "bud"
  | "oracle"
  | "scholar"
  | "orbit"
  | "coach"
  | "community"
  | "vision"
  | "creator"
  | "atlas"
  | "pulse"
  | "guardian"
  | "voice"
  | "navigator"
  | "spark"
  | "browser"
  | "fixer";

export type AgentActivityState = "idle" | "queued" | "working" | "waiting" | "completed" | "failed";

export type AgentInput = {
  requestId: string;
  userId: string;
  prompt: string;
  context?: Record<string, unknown>;
};

export type AgentOutput = {
  ok: boolean;
  summary?: string;
  data?: Record<string, unknown>;
  error?: string;
};

export type AgentRuntimeContext = {
  requestId: string;
  now: string;
  userId: string;
  prompt: string;
  context: Record<string, unknown>;
};

export type AgentHandler = (input: AgentInput, context: AgentRuntimeContext) => Promise<AgentOutput>;

export type AgentDefinition = {
  id: AgentId;
  role: string;
  responsibility: string;
  contextScope: string[];
  memoryScope: string[];
  permissions: string[];
  collaborators: AgentId[];
  handler?: AgentHandler;
};

export type AgentActivityEvent = {
  requestId: string;
  userId: string;
  agentId: AgentId;
  state: AgentActivityState;
  event: "queued" | "started" | "waiting" | "completed" | "failed" | "skipped";
  detail?: string;
  createdAt: string;
};
