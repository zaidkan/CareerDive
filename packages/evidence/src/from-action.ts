import { randomUUID } from "node:crypto";
import type {
  EvidenceSignal,
  SimulationActionId,
  WorldState,
} from "@sim/schemas";
import { recordEvidence } from "./record.js";

/**
 * Derives the behavioral signal for a single assessed action.
 *
 * Takes only the world state and the ids it reads so the assessment domain
 * stays independent of how a caller stores sessions.
 */
export function evidenceFromAction(input: {
  state: WorldState;
  actionId: SimulationActionId;
  eventId: string;
}): EvidenceSignal {
  const dimension =
    input.actionId === "document_ticket"
      ? "communication"
      : input.actionId === "inspect_login_context"
        ? "analytical_reasoning"
        : "prioritization";
  return recordEvidence({
    id: randomUUID(),
    sessionId: input.state.sessionId,
    actionId: input.actionId,
    eventId: input.eventId,
    rhythm: input.state.events
      .find(({ id }) => id === input.eventId)
      ?.completedActionIds.includes("inspect_login_context")
      ? "quiet_investigation"
      : "routine_monitoring",
    pacingMode: input.state.pacingMode,
    category: "behavioral",
    dimension,
    observation: `Chose ${input.actionId.replaceAll("_", " ")} when it was available.`,
    occurredAt: new Date().toISOString(),
  });
}
