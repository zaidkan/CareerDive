import type {
  ActionLogEntry,
  AvailableAction,
  ClientView,
  ConsequenceEntry,
  DomainEffect,
  SimulationAction,
  SimulationActionId,
  TurnResult,
  WorldState,
} from "@sim/schemas";
import { WorldStateSchema } from "@sim/schemas";

const ACTIONS: Record<SimulationActionId, AvailableAction> = {
  review_alert: {
    id: "review_alert",
    label: "Review alert",
    description: "Read the alert details and initial indicators.",
    simulatedMinutes: 10,
  },
  inspect_login_context: {
    id: "inspect_login_context",
    label: "Inspect login context",
    description: "Check available device, location, and account context.",
    simulatedMinutes: 15,
  },
  dismiss_alert: {
    id: "dismiss_alert",
    label: "Dismiss as false positive",
    description: "Close the alert without further escalation.",
    simulatedMinutes: 15,
  },
  escalate_alert: {
    id: "escalate_alert",
    label: "Escalate with evidence",
    description: "Send the reviewed evidence to a senior analyst.",
    simulatedMinutes: 5,
  },
  document_ticket: {
    id: "document_ticket",
    label: "Document ticket",
    description: "Record what was reviewed and why the decision was made.",
    simulatedMinutes: 20,
  },
  ask_manager: {
    id: "ask_manager",
    label: "Ask manager for context",
    description: "Request guidance without transferring responsibility.",
    simulatedMinutes: 5,
  },
  complete_shift: {
    id: "complete_shift",
    label: "Complete shift",
    description: "Finish the current simulation shift.",
    simulatedMinutes: 0,
  },
};

export class ActionUnavailableError extends Error {
  constructor(actionId: string) {
    super(`Action "${actionId}" is not available in the current state`);
    this.name = "ActionUnavailableError";
  }
}

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function createInitialWorldState(
  sessionId: string,
  seed: number,
  options: {
    sessionKind?: "tutorial" | "assessed";
    pacingMode?:
      | "standard"
      | "extended"
      | "pause_compatible"
      | "no_hard_timer"
      | "practice";
  } = {},
): WorldState {
  return WorldStateSchema.parse({
    sessionId,
    sessionKind: options.sessionKind ?? "assessed",
    seed,
    rngState: seed,
    simClock: 0,
    currentLocationId: "operations-center",
    locations: {
      "operations-center": {
        id: "operations-center",
        name: "Security Operations Center",
        connectedLocationIds: [],
        interactableIds: ["alert-dashboard", "ticket-queue"],
      },
    },
    facts: {
      "alert-visible": {
        id: "alert-visible",
        content:
          "A successful login occurred from an unfamiliar location shortly after repeated failures.",
        visibility: "public",
        knownBy: ["manager", "user"],
        notKnownBy: [],
      },
      "employee-private-travel": {
        id: "employee-private-travel",
        content: "The employee privately disclosed planned travel to Montreal.",
        visibility: "private",
        knownBy: ["employee"],
        notKnownBy: ["manager", "user"],
      },
    },
    npcs: {
      manager: {
        id: "manager",
        name: "Morgan",
        role: "Security Operations Manager",
        mood: "neutral",
        memoryFactIds: ["alert-visible"],
      },
    },
    events: [
      {
        id: "suspicious-login-1",
        templateId: "suspicious_login",
        title: "Unfamiliar successful login",
        status: "active",
        triggeredAt: 0,
        deadlineAt: 40,
        reviewed: false,
        contextInspected: false,
      },
    ],
    ledger: [],
    completedActionIds: [],
    pacingMode: options.pacingMode ?? "standard",
    hidden: {
      stress: 0,
      fatigue: 0,
      trust: { manager: 0 },
      reputation: 0,
      cognitiveLoad: 0,
      taskBacklog: 1,
      accuracy: 0,
      riskExposure: 0,
    },
  });
}

export function availableActions(state: WorldState): AvailableAction[] {
  const event = state.events[0];
  if (!event || event.status === "resolved" || event.status === "expired") {
    return [ACTIONS.complete_shift];
  }

  const actions: AvailableAction[] = [];
  if (!event.reviewed) {
    actions.push(ACTIONS.review_alert, ACTIONS.ask_manager);
    return actions;
  }

  if (!event.contextInspected) {
    actions.push(
      ACTIONS.inspect_login_context,
      ACTIONS.dismiss_alert,
      ACTIONS.document_ticket,
      ACTIONS.ask_manager,
    );
    return actions;
  }

  actions.push(
    ACTIONS.escalate_alert,
    ACTIONS.dismiss_alert,
    ACTIONS.document_ticket,
    ACTIONS.ask_manager,
  );
  return actions;
}

function consequence(
  state: WorldState,
  actionId: SimulationActionId,
  description: string,
  dueAt?: number,
): ConsequenceEntry {
  const entry: ConsequenceEntry = {
    id: `${state.sessionId}-${String(state.ledger.length + 1)}`,
    eventId: "suspicious-login-1",
    actionId,
    description,
    createdAt: state.simClock,
    applied: dueAt === undefined,
  };
  if (dueAt !== undefined) {
    entry.dueAt = dueAt;
  }
  return entry;
}

export function applyAction(
  currentState: WorldState,
  rawAction: SimulationAction,
): TurnResult {
  const action = rawAction;
  const allowed = availableActions(currentState).some(
    ({ id }) => id === action.id,
  );
  if (!allowed) {
    throw new ActionUnavailableError(action.id);
  }

  const state = structuredClone(currentState);
  const effects: DomainEffect[] = [
    { type: "action_applied", actionId: action.id },
  ];
  const definition = ACTIONS[action.id];
  state.simClock += definition.simulatedMinutes;
  state.completedActionIds.push(action.id);
  const event = state.events[0];

  if (event) {
    if (action.id === "review_alert") {
      event.reviewed = true;
      state.hidden.cognitiveLoad += 1;
    }
    if (action.id === "inspect_login_context") {
      event.contextInspected = true;
      state.hidden.accuracy += 1;
    }
    if (action.id === "dismiss_alert") {
      const entry = consequence(
        state,
        action.id,
        "The dismissed alert requires renewed attention when related activity appears.",
        event.deadlineAt,
      );
      state.ledger.push(entry);
      effects.push({
        type: "consequence_recorded",
        consequenceId: entry.id,
      });
      state.hidden.riskExposure += 1;
    }
    if (action.id === "document_ticket") {
      const entry = consequence(
        state,
        action.id,
        "The investigation record now contains the user's reasoning.",
      );
      state.ledger.push(entry);
      effects.push({
        type: "consequence_recorded",
        consequenceId: entry.id,
      });
    }
    if (action.id === "escalate_alert") {
      event.status = "resolved";
      event.resolution = "Escalated with reviewed context.";
      const entry = consequence(
        state,
        action.id,
        "A senior analyst received the alert with supporting context.",
      );
      state.ledger.push(entry);
      effects.push({ type: "event_resolved", eventId: event.id });
      state.hidden.taskBacklog = Math.max(0, state.hidden.taskBacklog - 1);
    }
  }

  for (const entry of state.ledger) {
    if (
      !entry.applied &&
      entry.dueAt !== undefined &&
      state.simClock >= entry.dueAt
    ) {
      entry.applied = true;
      if (event && event.status === "active") {
        event.status = "escalated";
        event.resolution =
          "Related activity appeared after the alert was dismissed.";
        effects.push({ type: "event_escalated", eventId: event.id });
      }
    }
  }

  return { state: WorldStateSchema.parse(state), effects };
}

export function foldActionLog(
  initialState: WorldState,
  entries: ActionLogEntry[],
): WorldState {
  return [...entries]
    .sort((left, right) => left.sequence - right.sequence)
    .reduce(
      (state, entry) => applyAction(state, entry.action).state,
      initialState,
    );
}

export function toClientView(state: WorldState): ClientView {
  const location = state.locations[state.currentLocationId];
  if (!location) {
    throw new Error("Current location is missing");
  }
  const operationalMessages = state.ledger
    .filter(({ applied }) => applied)
    .map(({ description }) => description);
  return {
    sessionId: state.sessionId,
    sessionKind: state.sessionKind,
    simClock: state.simClock,
    currentLocation: location,
    events: state.events.map(({ id, title, status, resolution }) => {
      const event = { id, title, status };
      return resolution === undefined ? event : { ...event, resolution };
    }),
    availableActions: availableActions(state),
    operationalMessages,
    pacingMode: state.pacingMode,
  };
}
