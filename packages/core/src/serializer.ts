import type { ClientView, WorldState } from "@sim/schemas";
import { availableActions } from "./availability.js";

export function toClientView(state: WorldState): ClientView {
  const location = state.locations[state.currentLocationId];
  if (!location) {
    throw new Error("Current location is missing");
  }
  const operationalMessages = state.ledger
    .filter(({ applied }) => applied)
    .map(({ description }) => description);
  const observed = new Set(state.observedArtifactIds);
  return {
    sessionId: state.sessionId,
    sessionKind: state.sessionKind,
    simClock: state.simClock,
    currentLocation: location,
    events: state.events
      .filter(({ status }) => status !== "pending")
      .map(
        ({
          id,
          templateId,
          title,
          summary,
          priority,
          systemId,
          status,
          deadlineAt,
          completedActionIds,
          observedArtifactIds,
          resolution,
        }) => {
          const event = {
            id,
            templateId,
            title,
            summary,
            priority,
            systemId,
            status,
            deadlineAt,
            completedActionIds,
            observedArtifactIds,
          };
          return resolution === undefined ? event : { ...event, resolution };
        },
      ),
    availableActions: availableActions(state),
    operationalMessages,
    pacingMode: state.pacingMode,
    artifacts: Object.values(state.artifacts).map((artifact) => ({
      ...artifact,
      observed: observed.has(artifact.id),
    })),
    ticketNotes: state.ticketNotes,
    notebook: state.notebook,
    kbQuery: state.kbQuery,
  };
}
