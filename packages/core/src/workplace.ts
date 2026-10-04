import type {
  WorkplaceFeedbackCode,
  WorkplaceInteraction,
  WorkplaceInteractionTurn,
  WorldState,
} from "@sim/schemas";
import { WorkplaceInteractionTurnSchema } from "@sim/schemas";

const MOVEMENT_COST = 1;
const SNACK_BITE_RESTORE = 12;
const COFFEE_RESTORE = 28;
const EMERGENCY_RECOVERY = 20;
const SNACK_BITES_PER_BAR = 3;

export class WorkplaceInteractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkplaceInteractionError";
  }
}

function reject(message: string): never {
  throw new WorkplaceInteractionError(message);
}

function restoreEnergy(state: WorldState, amount: number): void {
  state.workplace.energy.current = Math.min(
    state.workplace.energy.max,
    state.workplace.energy.current + amount,
  );
}

function visibleEventIds(state: WorldState): Set<string> {
  return new Set(
    state.events
      .filter(({ status }) => status !== "pending")
      .map(({ id }) => id),
  );
}

export function canOpenArtifact(
  state: WorldState,
  artifactId: string,
): boolean {
  const artifact = state.artifacts[artifactId];
  if (!artifact) return false;
  if (artifact.kind === "kb_document") return true;
  const visible = visibleEventIds(state);
  return artifact.eventIds.some((eventId) => visible.has(eventId));
}

export function alertRecordSource(state: WorldState, recordId: string) {
  const record = state.rules.datasets.alerts?.records.find(
    (item) => item.datasetId === "alerts" && item.id === recordId,
  );
  if (!record || record.datasetId !== "alerts" || !record.linkedWorkItemId)
    return;
  const event = state.events.find(
    ({ id, systemId, status }) =>
      id === record.linkedWorkItemId &&
      systemId === "alert_dashboard" &&
      status === "active",
  );
  if (!event) return;
  const artifact = Object.values(state.artifacts).find(
    ({ kind, systemId, eventIds, metadata }) =>
      kind === "alert" &&
      systemId === "alert_dashboard" &&
      eventIds.includes(event.id) &&
      metadata.alertId === record.alertId,
  );
  if (!artifact || !canOpenArtifact(state, artifact.id)) return;
  return { record, event, artifact };
}

function observeArtifact(state: WorldState, artifactId: string): void {
  if (!state.observedArtifactIds.includes(artifactId)) {
    state.observedArtifactIds.push(artifactId);
  }
  state.workplace.lastInspectedArtifactId = artifactId;
  state.workplace.inspectedArtifactIds ??= [];
  if (!state.workplace.inspectedArtifactIds.includes(artifactId))
    state.workplace.inspectedArtifactIds.push(artifactId);
  const artifact = state.artifacts[artifactId];
  if (!artifact) return;
  for (const eventId of artifact.eventIds) {
    const event = state.events.find(({ id }) => id === eventId);
    if (event && !event.observedArtifactIds.includes(artifactId)) {
      event.observedArtifactIds.push(artifactId);
    }
  }
}

export function applyWorkplaceInteraction(
  currentState: WorldState,
  interaction: WorkplaceInteraction,
): WorkplaceInteractionTurn {
  const state = structuredClone(currentState);
  let feedbackCode: WorkplaceFeedbackCode;

  switch (interaction.type) {
    case "movement_exertion":
      if (state.workplace.energy.current < MOVEMENT_COST) {
        reject("Movement exertion requires available energy");
      }
      state.workplace.energy.current -= MOVEMENT_COST;
      feedbackCode = "movement_recorded";
      break;
    case "open_fridge":
      if (state.workplace.fridgeOpen) reject("The fridge is already open");
      state.workplace.fridgeOpen = true;
      feedbackCode = "fridge_opened";
      break;
    case "close_fridge":
      if (!state.workplace.fridgeOpen) reject("The fridge is already closed");
      state.workplace.fridgeOpen = false;
      feedbackCode = "fridge_closed";
      break;
    case "take_snack":
      if (!state.workplace.fridgeOpen) reject("Open the fridge first");
      if (state.workplace.carriedSnackBites > 0) {
        reject("Finish the carried snack before taking another");
      }
      if (state.workplace.fridgeSnackBars === 0) {
        reject("The fridge has no snack bars remaining");
      }
      state.workplace.fridgeSnackBars -= 1;
      state.workplace.carriedSnackBites = SNACK_BITES_PER_BAR;
      feedbackCode = "snack_taken";
      break;
    case "eat_snack_bite":
      if (state.workplace.carriedSnackBites === 0) {
        reject("No snack bites are available");
      }
      if (state.workplace.energy.current === state.workplace.energy.max) {
        reject("Energy is already full");
      }
      state.workplace.carriedSnackBites -= 1;
      restoreEnergy(state, SNACK_BITE_RESTORE);
      feedbackCode = "snack_bite_eaten";
      break;
    case "start_coffee":
      if (state.workplace.coffeeStage !== "idle") {
        reject("Coffee can start only from idle");
      }
      if (state.workplace.coffeeServings === 0) {
        reject("No coffee servings remain");
      }
      state.workplace.coffeeStage = "brewing";
      feedbackCode = "coffee_started";
      break;
    case "finish_coffee":
      if (state.workplace.coffeeStage !== "brewing") {
        reject("Coffee can finish only while brewing");
      }
      state.workplace.coffeeStage = "ready";
      feedbackCode = "coffee_ready";
      break;
    case "pour_coffee":
      if (state.workplace.coffeeStage !== "ready") {
        reject("Coffee can be poured only when ready");
      }
      if (state.workplace.coffeeServings === 0) {
        reject("No coffee servings remain");
      }
      state.workplace.coffeeServings -= 1;
      state.workplace.coffeeStage = "poured";
      feedbackCode = "coffee_poured";
      break;
    case "drink_coffee":
      if (state.workplace.coffeeStage !== "poured") {
        reject("Pour coffee before drinking it");
      }
      if (state.workplace.energy.current === state.workplace.energy.max) {
        reject("Energy is already full");
      }
      restoreEnergy(state, COFFEE_RESTORE);
      state.workplace.coffeeStage =
        state.workplace.coffeeServings > 0 ? "ready" : "idle";
      feedbackCode = "coffee_drunk";
      break;
    case "talk_to_jules":
      if (interaction.eventId) {
        if (!visibleEventIds(state).has(interaction.eventId))
          reject("Coworker context must refer to visible work");
        state.workplace.julesConsultations ??= [];
        if (
          !state.workplace.julesConsultations.some(
            (c) =>
              c.eventId === interaction.eventId &&
              c.topic === interaction.topic,
          )
        )
          state.workplace.julesConsultations.push({
            eventId: interaction.eventId,
            topic: interaction.topic,
          });
      }
      if (!state.workplace.julesTopicsSeen.includes(interaction.topic)) {
        state.workplace.julesTopicsSeen.push(interaction.topic);
      }
      feedbackCode = "jules_replied";
      break;
    case "open_artifact":
      if (!canOpenArtifact(currentState, interaction.artifactId)) {
        reject("Artifact is not authorized in the current state");
      }
      observeArtifact(state, interaction.artifactId);
      feedbackCode = "artifact_opened";
      break;
    case "open_alert_record": {
      const source = alertRecordSource(currentState, interaction.recordId);
      if (!source) reject("Alert record is not available in the current state");
      observeArtifact(state, source.artifact.id);
      state.workplace.selectedAlertIdsByEvent ??= {};
      state.workplace.selectedAlertIdsByEvent[source.event.id] =
        source.record.id;
      feedbackCode = "alert_record_opened";
      break;
    }
    case "inspect_query_record": {
      const query = state.queryHistory.find(
        ({ queryId }) => queryId === interaction.queryId,
      );
      if (!query?.resultIds.includes(interaction.recordId))
        reject("Record is not in this search result");
      state.workplace.inspectedRecordIds ??= [];
      if (!state.workplace.inspectedRecordIds.includes(interaction.recordId))
        state.workplace.inspectedRecordIds.push(interaction.recordId);
      feedbackCode = "query_record_inspected";
      break;
    }
    case "compare_artifacts": {
      const ids = interaction.artifactIds;
      if (
        new Set(ids).size !== 2 ||
        !ids.every(
          (id) =>
            state.workplace.inspectedArtifactIds?.includes(id) &&
            state.artifacts[id]?.eventIds.includes(interaction.eventId),
        )
      )
        reject("Open both case sources before comparing them");
      state.workplace.comparisons ??= [];
      if (
        !state.workplace.comparisons.some(
          (comparison) =>
            comparison.eventId === interaction.eventId &&
            ids.every((id) => comparison.artifactIds.includes(id)),
        )
      )
        state.workplace.comparisons.push({
          eventId: interaction.eventId,
          artifactIds: [...ids],
        });
      feedbackCode = "records_compared";
      break;
    }
    case "emergency_recovery": {
      const workplace = state.workplace;
      const exhausted = workplace.energy.current === 0;
      const resourcesExhausted =
        workplace.carriedSnackBites === 0 &&
        workplace.fridgeSnackBars === 0 &&
        workplace.coffeeServings === 0 &&
        workplace.coffeeStage === "idle";
      if (
        workplace.emergencyRecoveryUsed ||
        !exhausted ||
        !resourcesExhausted
      ) {
        reject("Emergency recovery is not available");
      }
      restoreEnergy(state, EMERGENCY_RECOVERY);
      workplace.emergencyRecoveryUsed = true;
      feedbackCode = "energy_recovered";
      break;
    }
  }

  return WorkplaceInteractionTurnSchema.parse({
    state,
    effects: [],
    feedbackCode,
  });
}
