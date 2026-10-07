import type { AgentActivityEvent, AgentActivityState, AgentId } from "./contracts";

export type ActivitySink = (event: AgentActivityEvent) => Promise<void>;

export function createActivitySink(sql: Awaited<ReturnType<import("@/lib/db").getSql>>): ActivitySink {
  return async (event) => {
    try {
      await sql`
        insert into agent_activity
          (id, request_id, user_id, agent_id, state, event, detail, created_at)
        values
          (${crypto.randomUUID()}, ${event.requestId}, ${event.userId}, ${event.agentId},
           ${event.state}, ${event.event}, ${event.detail ?? null}, ${event.createdAt})`;
    } catch {
      // Activity must never make the actual work lie or fail. The execution is still real.
    }
  };
}

export function activityEvent(
  requestId: string,
  userId: string,
  agentId: AgentId,
  state: AgentActivityState,
  event: AgentActivityEvent["event"],
  detail?: string,
): AgentActivityEvent {
  return {
    requestId,
    userId,
    agentId,
    state,
    event,
    detail,
    createdAt: new Date().toISOString(),
  };
}
