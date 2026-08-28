import type {
  CareerPack,
  PacingMode,
  SessionKind,
  WorldState,
} from "@sim/schemas";
import { WorldStateSchema } from "@sim/schemas";

export function createInitialWorldState(
  sessionId: string,
  seed: number,
  options: {
    sessionKind?: SessionKind;
    pacingMode?: PacingMode;
  } = {},
  pack: CareerPack,
): WorldState {
  const actions = Object.fromEntries(
    pack.scenario.actions.map((action) => [action.id, action]),
  );
  const tasks = Object.fromEntries(
    pack.scenario.tasks.map((task) => [task.id, task]),
  );
  const notificationRules = Object.fromEntries(
    pack.scenario.notifications.map((notification) => [notification.id, notification]),
  );
  const events = Object.entries(pack.scenario.eventTemplates).map(
    ([templateId, template]) => ({
      id: template.instanceId,
      templateId,
      title: template.title,
      summary: template.summary,
      priority: template.priority,
      systemId: template.systemId,
      status: template.initialStatus,
      triggeredAt: template.triggerAt,
      deadlineAt: template.deadlineMinutes,
      managerConsulted: false,
      completedActionIds: [],
      observedArtifactIds: [],
    }),
  );

  const trust = Object.fromEntries(
    pack.scenario.npcs.map((npc) => [npc.id, 0]),
  );
  const notifications = pack.scenario.notifications.flatMap((definition) => {
    const event = events.find(
      ({ templateId, status }) =>
        templateId === definition.eventTemplateId && status === "active",
    );
    return event
      ? [
          {
            id: definition.id,
            eventId: event.id,
            status: "unread" as const,
            snoozeUsed: false,
          },
        ]
      : [];
  });

  return WorldStateSchema.parse({
    sessionId,
    sessionKind: options.sessionKind ?? "assessed",
    seed,
    rngState: seed,
    simClock: 0,
    currentLocationId: pack.scenario.location.id,
    locations: {
      [pack.scenario.location.id]: pack.scenario.location,
    },
    facts: Object.fromEntries(
      pack.scenario.facts.map((fact) => [fact.id, fact]),
    ),
    npcs: Object.fromEntries(pack.scenario.npcs.map((npc) => [npc.id, npc])),
    events,
    ledger: [],
    completedActionIds: [],
    pacingMode: options.pacingMode ?? "standard",
    rules: {
      actions,
      eventTemplates: pack.scenario.eventTemplates,
      tasks,
      notifications: notificationRules,
    },
    artifacts: Object.fromEntries(
      pack.scenario.artifacts.map((artifact) => [artifact.id, artifact]),
    ),
    observedArtifactIds: [],
    ticketNotes: {},
    notebook: "",
    kbQuery: "",
    taskProgress: {},
    notifications,
    workplace: {
      energy: {
        current: pack.scenario.workplaceDefaults.energyMax,
        max: pack.scenario.workplaceDefaults.energyMax,
      },
      carriedSnackBites: 0,
      fridgeSnackBars: pack.scenario.workplaceDefaults.fridgeSnackBars,
      fridgeOpen: false,
      coffeeServings: pack.scenario.workplaceDefaults.coffeeServings,
      coffeeStage: "idle",
      julesTopicsSeen: [],
      emergencyRecoveryUsed: false,
    },
    hidden: {
      stress: 0,
      fatigue: 0,
      trust,
      reputation: 0,
      cognitiveLoad: 0,
      taskBacklog: pack.scenario.initialTaskBacklog,
      accuracy: 0,
      riskExposure: 0,
    },
  });
}
