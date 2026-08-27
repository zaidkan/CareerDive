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
  const notifications = Object.fromEntries(
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
      notifications,
    },
    artifacts: Object.fromEntries(
      pack.scenario.artifacts.map((artifact) => [artifact.id, artifact]),
    ),
    observedArtifactIds: [],
    ticketNotes: {},
    notebook: "",
    kbQuery: "",
    taskProgress: {},
    notifications: [],
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
