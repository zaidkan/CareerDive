import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type { SimulationActionId, WorldState } from "@sim/schemas";
import {
  applyAction,
  applyTaskAttempt,
  applyWorkplaceInteraction,
  availableActions,
  createInitialWorldState,
  toClientView,
} from "@sim/core";

const pack = loadDefaultCybersecurityPack();

function world(sessionKind: "assessed" | "tutorial" = "assessed") {
  return createInitialWorldState(
    `golden-path-${sessionKind}`,
    24,
    { sessionKind },
    pack,
  );
}

function action(state: WorldState, id: SimulationActionId, eventId: string) {
  const candidate = availableActions(state).find(
    (entry) => entry.id === id && entry.eventId === eventId,
  );
  if (!candidate) throw new Error(`Expected ${id}:${eventId} to be available`);
  if (candidate.taskId) {
    const task = state.rules.tasks[candidate.taskId];
    if (!task) throw new Error(`Missing task ${candidate.taskId}`);
    let next = state;
    while (!next.taskProgress[`${eventId}:${task.id}`]?.completed) {
      const index = next.taskProgress[`${eventId}:${task.id}`]?.currentStep ?? 0;
      const step = task.steps[index];
      if (!step) throw new Error(`Missing step ${index} for ${task.id}`);
      for (const source of step.options.flatMap((option) =>
        option.source ? [option.source.artifactId] : [],
      )) {
        if (!next.observedArtifactIds.includes(source)) {
          next = applyWorkplaceInteraction(next, {
            type: "open_artifact",
            artifactId: source,
          }).state;
        }
      }
      next = applyTaskAttempt(next, {
        taskId: task.id,
        eventId,
        selectedOptionIds: step.requiredOptionIds,
      }).state;
    }
    return next;
  }
  return applyAction(state, { id, eventId, actorId: "user" }).state;
}

describe("assessed workplace golden path", () => {
  it("completes onboarding, investigation, break, ticket, escalation, and debrief readiness", () => {
    let state = world();
    const suspicious = "suspicious-login-1";
    const handoff = "handoff-1";

    // Onboarding / desk login is renderer-owned; canonical work begins at handoff.
    state = action(state, "read_handoff", handoff);
    state = action(state, "acknowledge_handoff", handoff);
    state = action(state, "review_alert", suspicious);
    state = action(state, "inspect_login_context", suspicious);
    state = action(state, "inspect_account_history", suspicious);
    state = action(state, "check_device_inventory", suspicious);

    // One finite break-room cycle: open fridge, snack, coffee, then Jules.
    for (const interaction of [
      { type: "open_fridge" as const },
      { type: "take_snack" as const },
      { type: "eat_snack_bite" as const },
      { type: "start_coffee" as const },
      { type: "finish_coffee" as const },
      { type: "pour_coffee" as const },
      { type: "drink_coffee" as const },
      { type: "close_fridge" as const },
      { type: "talk_to_jules" as const, topic: "current_work" as const },
    ]) {
      state = applyWorkplaceInteraction(state, interaction).state;
      expect(state.workplace.energy.current).toBeGreaterThan(0);
    }

    state = action(state, "document_ticket", suspicious);
    state = action(state, "escalate_alert", suspicious);
    // Resolve the scheduled routine scanner interruption before wrap-up.
    state = action(state, "review_alert", "routine-alert-1");
    state = action(state, "search_knowledge_base", "routine-alert-1");
    state = action(state, "document_ticket", "routine-alert-1");
    state = action(state, "dismiss_alert", "routine-alert-1");
    expect(availableActions(state).map(({ id }) => id)).toContain("complete_shift");
    state = action(state, "complete_shift", "shift");

    expect(state.workplace.energy.current).toBeGreaterThan(0);
    expect(state.workplace.julesTopicsSeen).toContain("current_work");
    expect(state.events.find(({ id }) => id === suspicious)?.status).toBe("resolved");
    expect(state.ledger.some((entry) => entry.actionId === "escalate_alert")).toBe(true);
    expect(state.ledger.every((entry) => entry.actionId !== "talk_to_jules")).toBe(true);
    expect(state.hidden).toBeDefined();
  });
});

describe("visual and structured mode parity", () => {
  it("exposes the same canonical actions, task options, and workplace interaction IDs", () => {
    const view = toClientView(world());
    const visual = toClientView(world());
    const structured = toClientView(world());
    const ids = (candidate: typeof view) => ({
      actions: candidate.availableActions.map(({ id, eventId, systemId }) =>
        `${id}:${eventId}:${systemId}`,
      ),
      tasks: candidate.tasks.flatMap((task) =>
        task.options.map((option) => `${task.id}:${option.id}`),
      ),
      workplace: [
        "open_fridge",
        "close_fridge",
        "take_snack",
        "eat_snack_bite",
        "start_coffee",
        "finish_coffee",
        "pour_coffee",
        "drink_coffee",
        "talk_to_jules:current_work",
      ],
    });
    expect(ids(visual)).toEqual(ids(structured));
    expect(ids(view).actions).toContain("read_handoff:handoff-1:email");
    expect(ids(view).tasks.length).toBeGreaterThan(0);
    expect(JSON.stringify(view)).not.toMatch(/pointer|navigation speed|walk speed/i);
    expect(view.sessionKind).toBe("assessed");
  });
});
