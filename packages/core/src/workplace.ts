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

function observeArtifact(state: WorldState, artifactId: string): void {
  if (!state.observedArtifactIds.includes(artifactId)) {
    state.observedArtifactIds.push(artifactId);
  }
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
