import type {
  ActionLogEntry,
  AvailableAction,
  ClientView,
  ConsequenceEntry,
  DomainEffect,
  EventInstance,
  SimulationAction,
  SimulationActionId,
  TurnResult,
  WorldState,
} from "@sim/schemas";
import { WorldStateSchema } from "@sim/schemas";

const ACTIONS: Record<SimulationActionId, AvailableAction> = {
  read_handoff: {
    id: "read_handoff",
    eventId: "",
    systemId: "email",
    label: "Read shift handoff",
    description: "Review the previous analyst's incomplete handoff notes.",
    simulatedMinutes: 5,
  },
  acknowledge_handoff: {
    id: "acknowledge_handoff",
    eventId: "",
    systemId: "team_chat",
    label: "Confirm the handoff",
    description:
      "Tell Morgan what remains open and what you will handle first.",
    simulatedMinutes: 5,
  },
  review_alert: {
    id: "review_alert",
    eventId: "",
    systemId: "alert_dashboard",
    label: "Review alert",
    description: "Read the alert details and initial indicators.",
    simulatedMinutes: 10,
  },
  inspect_login_context: {
    id: "inspect_login_context",
    eventId: "",
    systemId: "alert_dashboard",
    label: "Inspect login context",
    description: "Check available device, location, and account context.",
    simulatedMinutes: 15,
  },
  inspect_account_history: {
    id: "inspect_account_history",
    eventId: "",
    systemId: "alert_dashboard",
    label: "Compare account history",
    description:
      "Compare recent sign-ins, failures, and normal account patterns.",
    simulatedMinutes: 10,
  },
  check_device_inventory: {
    id: "check_device_inventory",
    eventId: "",
    systemId: "knowledge_base",
    label: "Check device inventory",
    description:
      "Confirm whether the device is enrolled and assigned to the employee.",
    simulatedMinutes: 10,
  },
  search_knowledge_base: {
    id: "search_knowledge_base",
    eventId: "",
    systemId: "knowledge_base",
    label: "Check response procedure",
    description:
      "Review the approved procedure and closure criteria for this event.",
    simulatedMinutes: 10,
  },
  dismiss_alert: {
    id: "dismiss_alert",
    eventId: "",
    systemId: "alert_dashboard",
    label: "Dismiss as false positive",
    description: "Close the alert without further escalation.",
    simulatedMinutes: 15,
  },
  escalate_alert: {
    id: "escalate_alert",
    eventId: "",
    systemId: "alert_dashboard",
    label: "Escalate with evidence",
    description: "Send the reviewed evidence to a senior analyst.",
    simulatedMinutes: 5,
  },
  document_ticket: {
    id: "document_ticket",
    eventId: "",
    systemId: "ticket_queue",
    label: "Document ticket",
    description: "Record what was reviewed and why the decision was made.",
    simulatedMinutes: 20,
  },
  open_phishing_report: {
    id: "open_phishing_report",
    eventId: "",
    systemId: "email",
    label: "Open phishing report",
    description:
      "Read the employee's report without opening the suspicious link.",
    simulatedMinutes: 5,
  },
  inspect_email_headers: {
    id: "inspect_email_headers",
    eventId: "",
    systemId: "email",
    label: "Inspect email headers",
    description: "Check sender, reply-to, authentication, and routing details.",
    simulatedMinutes: 10,
  },
  check_link_destination: {
    id: "check_link_destination",
    eventId: "",
    systemId: "alert_dashboard",
    label: "Analyze link destination",
    description:
      "Use the approved inspection tool to examine the destination safely.",
    simulatedMinutes: 10,
  },
  quarantine_message: {
    id: "quarantine_message",
    eventId: "",
    systemId: "alert_dashboard",
    label: "Quarantine matching message",
    description:
      "Contain matching copies through the approved mail-security control.",
    simulatedMinutes: 5,
  },
  notify_reporter: {
    id: "notify_reporter",
    eventId: "",
    systemId: "email",
    label: "Update the reporter",
    description:
      "Explain the safe next steps and confirm the report was received.",
    simulatedMinutes: 5,
  },
  ask_manager: {
    id: "ask_manager",
    eventId: "",
    systemId: "team_chat",
    label: "Ask manager for context",
    description: "Request guidance without transferring responsibility.",
    simulatedMinutes: 5,
  },
  complete_shift: {
    id: "complete_shift",
    eventId: "shift",
    systemId: "team_chat",
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
        interactableIds: [
          "alert-dashboard",
          "ticket-queue",
          "email",
          "knowledge-base",
          "team-chat",
        ],
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
        summary:
          "Repeated failures were followed by a successful sign-in from an unfamiliar network.",
        priority: "high",
        systemId: "alert_dashboard",
        status: "active",
        triggeredAt: 0,
        deadlineAt: 180,
        reviewed: false,
        contextInspected: false,
        managerConsulted: false,
        completedActionIds: [],
      },
      {
        id: "handoff-1",
        templateId: "incomplete_handoff",
        title: "Shift handoff",
        summary:
          "The previous analyst left an incomplete note about open monitoring work.",
        priority: "normal",
        systemId: "email",
        status: "active",
        triggeredAt: 0,
        deadlineAt: 35,
        reviewed: false,
        contextInspected: false,
        managerConsulted: false,
        completedActionIds: [],
      },
      {
        id: "routine-alert-1",
        templateId: "routine_alert_review",
        title: "Routine service-account alert",
        summary:
          "A known automation account generated a low-severity authentication alert.",
        priority: "low",
        systemId: "alert_dashboard",
        status: "pending",
        triggeredAt: 25,
        deadlineAt: 220,
        reviewed: false,
        contextInspected: false,
        managerConsulted: false,
        completedActionIds: [],
      },
      {
        id: "phishing-report-1",
        templateId: "phishing_report",
        title: "Employee phishing report",
        summary:
          "An employee reported a benefits-themed message with an unfamiliar sign-in link.",
        priority: "high",
        systemId: "email",
        status: "pending",
        triggeredAt: 55,
        deadlineAt: 260,
        reviewed: false,
        contextInspected: false,
        managerConsulted: false,
        completedActionIds: [],
      },
      {
        id: "false-positive-1",
        templateId: "false_positive",
        title: "Expected scanner activity",
        summary:
          "A vulnerability scanner triggered a routine connection alert during its approved window.",
        priority: "low",
        systemId: "alert_dashboard",
        status: "pending",
        triggeredAt: 100,
        deadlineAt: 300,
        reviewed: false,
        contextInspected: false,
        managerConsulted: false,
        completedActionIds: [],
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
      taskBacklog: 5,
      accuracy: 0,
      riskExposure: 0,
    },
  });
}

export function availableActions(state: WorldState): AvailableAction[] {
  const activeEvents = state.events.filter(({ status }) => status === "active");
  if (
    state.events.length > 0 &&
    state.events.every(({ status }) =>
      ["resolved", "escalated", "expired"].includes(status),
    )
  ) {
    return [ACTIONS.complete_shift];
  }
  return activeEvents.flatMap(actionsForEvent);
}

function hasCompleted(
  event: EventInstance,
  actionId: SimulationActionId,
): boolean {
  return event.completedActionIds.includes(actionId);
}

function target(
  event: EventInstance,
  actionId: SimulationActionId,
): AvailableAction {
  return { ...ACTIONS[actionId], eventId: event.id };
}

function withManager(
  event: EventInstance,
  actions: AvailableAction[],
): AvailableAction[] {
  return event.managerConsulted
    ? actions
    : [...actions, target(event, "ask_manager")];
}

function nextLinearAction(
  event: EventInstance,
  sequence: SimulationActionId[],
): AvailableAction[] {
  const next = sequence.find((actionId) => !hasCompleted(event, actionId));
  return next ? [target(event, next)] : [];
}

function actionsForEvent(event: EventInstance): AvailableAction[] {
  if (event.templateId === "incomplete_handoff") {
    return withManager(
      event,
      nextLinearAction(event, ["read_handoff", "acknowledge_handoff"]),
    );
  }
  if (event.templateId === "routine_alert_review") {
    return withManager(
      event,
      nextLinearAction(event, [
        "review_alert",
        "search_knowledge_base",
        "document_ticket",
        "dismiss_alert",
      ]),
    );
  }
  if (event.templateId === "phishing_report") {
    return withManager(
      event,
      nextLinearAction(event, [
        "open_phishing_report",
        "inspect_email_headers",
        "check_link_destination",
        "quarantine_message",
        "notify_reporter",
        "document_ticket",
      ]),
    );
  }
  if (event.templateId === "false_positive") {
    return withManager(
      event,
      nextLinearAction(event, [
        "review_alert",
        "inspect_login_context",
        "document_ticket",
        "dismiss_alert",
      ]),
    );
  }

  if (!hasCompleted(event, "review_alert")) {
    return withManager(event, [target(event, "review_alert")]);
  }
  if (!hasCompleted(event, "inspect_login_context")) {
    return withManager(event, [
      target(event, "inspect_login_context"),
      target(event, "dismiss_alert"),
    ]);
  }
  const investigationActions = [
    "inspect_account_history",
    "check_device_inventory",
  ] as const;
  const remainingInvestigation = investigationActions
    .filter((actionId) => !hasCompleted(event, actionId))
    .map((actionId) => target(event, actionId));
  if (remainingInvestigation.length > 0) {
    return withManager(event, [
      ...remainingInvestigation,
      target(event, "dismiss_alert"),
    ]);
  }
  if (!hasCompleted(event, "document_ticket")) {
    return withManager(event, [
      target(event, "document_ticket"),
      target(event, "dismiss_alert"),
    ]);
  }
  return withManager(event, [
    target(event, "escalate_alert"),
    target(event, "dismiss_alert"),
  ]);
}

function consequence(
  state: WorldState,
  eventId: string,
  actionId: SimulationActionId,
  description: string,
  dueAt?: number,
): ConsequenceEntry {
  const entry: ConsequenceEntry = {
    id: `${state.sessionId}-${String(state.ledger.length + 1)}`,
    eventId,
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
  const allowedAction = availableActions(currentState).find(
    ({ id, eventId }) =>
      id === action.id &&
      (action.eventId === undefined || action.eventId === eventId),
  );
  if (!allowedAction) {
    throw new ActionUnavailableError(action.id);
  }

  const state = structuredClone(currentState);
  const effects: DomainEffect[] = [
    { type: "action_applied", actionId: action.id },
  ];
  const definition = ACTIONS[action.id];
  state.simClock += definition.simulatedMinutes;
  state.completedActionIds.push(action.id);
  const targetEventId = action.eventId ?? allowedAction.eventId;
  const event = state.events.find(({ id }) => id === targetEventId);

  if (event) {
    if (
      action.id !== "ask_manager" &&
      !event.completedActionIds.includes(action.id)
    ) {
      event.completedActionIds.push(action.id);
    }
    if (action.id === "review_alert") {
      event.reviewed = true;
      state.hidden.cognitiveLoad += 1;
    }
    if (
      action.id === "inspect_login_context" ||
      action.id === "inspect_account_history" ||
      action.id === "check_device_inventory" ||
      action.id === "inspect_email_headers" ||
      action.id === "check_link_destination"
    ) {
      event.contextInspected = true;
      state.hidden.accuracy += 1;
    }
    if (action.id === "dismiss_alert") {
      const isSuspiciousLogin = event.templateId === "suspicious_login";
      const entry = consequence(
        state,
        event.id,
        action.id,
        isSuspiciousLogin
          ? "The dismissed login alert may require renewed attention if related activity appears."
          : "The reviewed routine alert was documented and closed as expected activity.",
        isSuspiciousLogin ? state.simClock + 40 : undefined,
      );
      state.ledger.push(entry);
      effects.push({
        type: "consequence_recorded",
        consequenceId: entry.id,
      });
      event.status = "resolved";
      event.resolution = isSuspiciousLogin
        ? "Dismissed before the available evidence was fully developed."
        : "Reviewed, documented, and closed as expected activity.";
      if (isSuspiciousLogin) {
        state.hidden.riskExposure += 1;
      } else {
        state.hidden.taskBacklog = Math.max(0, state.hidden.taskBacklog - 1);
      }
    }
    if (action.id === "document_ticket") {
      const entry = consequence(
        state,
        event.id,
        action.id,
        `The ${event.title.toLowerCase()} ticket now records the evidence, reasoning, and next step.`,
      );
      state.ledger.push(entry);
      effects.push({
        type: "consequence_recorded",
        consequenceId: entry.id,
      });
      if (event.templateId === "phishing_report") {
        event.status = "resolved";
        event.resolution =
          "The message was analyzed, contained, communicated, and documented.";
        effects.push({ type: "event_resolved", eventId: event.id });
        state.hidden.taskBacklog = Math.max(0, state.hidden.taskBacklog - 1);
      }
    }
    if (action.id === "ask_manager") {
      event.managerConsulted = true;
      const entry = consequence(
        state,
        event.id,
        action.id,
        managerGuidance(event),
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
        event.id,
        action.id,
        "A senior analyst received the alert with supporting context.",
      );
      state.ledger.push(entry);
      effects.push({ type: "event_resolved", eventId: event.id });
      state.hidden.taskBacklog = Math.max(0, state.hidden.taskBacklog - 1);
    }
    if (action.id === "acknowledge_handoff") {
      event.status = "resolved";
      event.resolution =
        "You confirmed the open work and stated your initial priority to Morgan.";
      effects.push({ type: "event_resolved", eventId: event.id });
      state.hidden.taskBacklog = Math.max(0, state.hidden.taskBacklog - 1);
    }
    if (action.id === "quarantine_message") {
      const entry = consequence(
        state,
        event.id,
        action.id,
        "Matching messages were quarantined through the approved mail-security control.",
      );
      state.ledger.push(entry);
      effects.push({
        type: "consequence_recorded",
        consequenceId: entry.id,
      });
    }
    if (action.id === "notify_reporter") {
      const entry = consequence(
        state,
        event.id,
        action.id,
        "The employee received safe next steps and confirmation that the report was being handled.",
      );
      state.ledger.push(entry);
      effects.push({
        type: "consequence_recorded",
        consequenceId: entry.id,
      });
    }
  }

  for (const pendingEvent of state.events) {
    if (
      pendingEvent.status === "pending" &&
      state.simClock >= pendingEvent.triggeredAt
    ) {
      pendingEvent.status = "active";
      const entry = consequence(
        state,
        pendingEvent.id,
        action.id,
        `New work arrived: ${pendingEvent.title}.`,
      );
      state.ledger.push(entry);
      effects.push({
        type: "consequence_recorded",
        consequenceId: entry.id,
      });
    }
  }

  for (const activeEvent of state.events) {
    if (
      activeEvent.status === "active" &&
      state.simClock > activeEvent.deadlineAt
    ) {
      activeEvent.status = "expired";
      activeEvent.resolution =
        "The work remained incomplete when its operational deadline passed.";
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
      const affectedEvent = state.events.find(({ id }) => id === entry.eventId);
      if (affectedEvent && affectedEvent.status !== "escalated") {
        affectedEvent.status = "escalated";
        affectedEvent.resolution =
          "Related activity appeared after the alert was dismissed.";
        effects.push({
          type: "event_escalated",
          eventId: affectedEvent.id,
        });
      }
    }
  }

  return { state: WorldStateSchema.parse(state), effects };
}

function managerGuidance(event: EventInstance): string {
  if (event.templateId === "incomplete_handoff") {
    return "Morgan asks you to read the handoff, identify unfinished work, and confirm what you will prioritize first.";
  }
  if (event.templateId === "phishing_report") {
    return "Morgan recommends preserving the message, checking headers and the link with approved tools, containing matches, and updating the reporter.";
  }
  if (
    event.templateId === "routine_alert_review" ||
    event.templateId === "false_positive"
  ) {
    return "Morgan recommends checking the approved activity window and documenting why the alert can be closed.";
  }
  return "Morgan recommends reviewing the alert details, checking device and location context, and documenting uncertainty before deciding.";
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
          };
          return resolution === undefined ? event : { ...event, resolution };
        },
      ),
    availableActions: availableActions(state),
    operationalMessages,
    pacingMode: state.pacingMode,
  };
}
