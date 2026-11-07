import type { AgentDefinition, AgentId, AgentInput, AgentOutput } from "./contracts";
import { activityEvent, type ActivitySink } from "./activity";
import { getAgentDefinition } from "./registry";

export type AgentExecution = {
  agentId: AgentId;
  status: "completed" | "failed" | "skipped";
  output?: AgentOutput;
};

/** Executes real handlers only. Missing handlers are explicit, never simulated. */
export async function executeAgent(
  definition: AgentDefinition,
  input: AgentInput,
  sink: ActivitySink,
): Promise<AgentExecution> {
  await sink(activityEvent(input.requestId, input.userId, definition.id, "queued", "queued", "Real work queued."));
  if (!definition.handler) {
    await sink(activityEvent(input.requestId, input.userId, definition.id, "idle", "skipped", "No runtime capability is connected for this responsibility."));
    return { agentId: definition.id, status: "skipped", output: { ok: false, error: "Capability not connected." } };
  }

  await sink(activityEvent(input.requestId, input.userId, definition.id, "working", "started", "Real work started."));
  try {
    const output = await definition.handler(input, {
      requestId: input.requestId,
      now: new Date().toISOString(),
      userId: input.userId,
      prompt: input.prompt,
      context: input.context ?? {},
    });
    if (output.ok) {
      await sink(activityEvent(input.requestId, input.userId, definition.id, "completed", "completed", output.summary));
      return { agentId: definition.id, status: "completed", output };
    }
    await sink(activityEvent(input.requestId, input.userId, definition.id, "failed", "failed", output.error));
    return { agentId: definition.id, status: "failed", output };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Agent execution failed.";
    await sink(activityEvent(input.requestId, input.userId, definition.id, "failed", "failed", detail));
    return { agentId: definition.id, status: "failed", output: { ok: false, error: detail } };
  }
}

export async function executeSpecialists(
  ids: AgentId[],
  input: AgentInput,
  sink: ActivitySink,
): Promise<AgentExecution[]> {
  const executions: AgentExecution[] = [];
  for (const id of ids) {
    executions.push(await executeAgent(getAgentDefinition(id), input, sink));
  }
  return executions;
}
