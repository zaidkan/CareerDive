import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type {
  LoggedInteraction,
  SimulationActionId,
  WorldState,
} from "@sim/schemas";
import { describe, expect, it } from "vitest";
import {
  applyAction,
  applyTaskAttempt,
  applyWorkplaceInteraction,
  availableActions,
  createInitialWorldState,
  foldActionLog,
  toClientView,
} from "../src/index.js";

const pack = loadDefaultCybersecurityPack();
const world = () => createInitialWorldState("shift-depth", 23, {}, pack);

function doWork(state: WorldState, id: SimulationActionId, eventId: string) {
  const interactions: LoggedInteraction[] = [];
  const available = availableActions(state).find(
    (action) => action.id === id && action.eventId === eventId,
  );
  if (!available) throw new Error(`Unavailable ${id}:${eventId}`);
  if (!available.taskId) {
    const action = { id, eventId, actorId: "user" as const };
    return {
      state: applyAction(state, action).state,
      interactions: [{ type: "action" as const, action }],
    };
  }

  const task = state.rules.tasks[available.taskId];
  if (!task) throw new Error(`Missing ${available.taskId}`);
  let next = state;
  while (!next.taskProgress[`${eventId}:${task.id}`]?.completed) {
    const stepIndex =
      next.taskProgress[`${eventId}:${task.id}`]?.currentStep ?? 0;
    const step = task.steps[stepIndex];
    if (!step) throw new Error(`Missing step ${String(stepIndex)}`);
    for (const artifactId of new Set(
      step.options.flatMap(({ source }) => (source ? [source.artifactId] : [])),
    )) {
      if (next.observedArtifactIds.includes(artifactId)) continue;
      const interaction = { type: "open_artifact" as const, artifactId };
      next = applyWorkplaceInteraction(next, interaction).state;
      interactions.push({ type: "workplace_interaction", interaction });
    }
    const attempt = {
      taskId: task.id,
      eventId,
      selectedOptionIds: step.requiredOptionIds,
    };
    next = applyTaskAttempt(next, attempt).state;
    interactions.push({ type: "task_attempt", attempt });
  }
  return { state: next, interactions };
}

const fullShift: ReadonlyArray<readonly [SimulationActionId, string]> = [
  ["read_handoff", "handoff-1"],
  ["acknowledge_handoff", "handoff-1"],
  ["review_alert", "suspicious-login-1"],
  ["inspect_login_context", "suspicious-login-1"],
  ["inspect_account_history", "suspicious-login-1"],
  ["check_device_inventory", "suspicious-login-1"],
  ["route_access_request", "access-request-1"],
  ["resolve_login_help", "login-help-1"],
  ["send_status_update", "status-check-1"],
  ["document_ticket", "suspicious-login-1"],
  ["escalate_alert", "suspicious-login-1"],
  ["review_alert", "routine-alert-1"],
  ["search_knowledge_base", "routine-alert-1"],
  ["document_ticket", "routine-alert-1"],
  ["dismiss_alert", "routine-alert-1"],
  ["submit_shift_handoff", "shift-handoff-1"],
];

describe("expanded Cybersecurity Analyst first shift", () => {
  it("releases the short situations in a deterministic workday order", () => {
    let state = world();
    expect(
      state.events.map(({ templateId, status }) => [templateId, status]),
    ).toEqual([
      ["incomplete_handoff", "active"],
      ["suspicious_login", "active"],
      ["access_request", "pending"],
      ["routine_alert_review", "pending"],
      ["employee_login_help", "pending"],
      ["morgan_status_check", "pending"],
      ["end_shift_handoff", "pending"],
    ]);

    state = doWork(state, "read_handoff", "handoff-1").state;
    state = doWork(state, "acknowledge_handoff", "handoff-1").state;
    state = doWork(state, "review_alert", "suspicious-login-1").state;
    expect(
      state.events.find(({ id }) => id === "access-request-1")?.status,
    ).toBe("active");
    expect(
      state.events.find(({ id }) => id === "routine-alert-1")?.status,
    ).toBe("pending");

    state = doWork(state, "inspect_login_context", "suspicious-login-1").state;
    expect(
      state.events.find(({ id }) => id === "routine-alert-1")?.status,
    ).toBe("active");
    expect(state.events.find(({ id }) => id === "login-help-1")?.status).toBe(
      "pending",
    );

    state = doWork(
      state,
      "inspect_account_history",
      "suspicious-login-1",
    ).state;
    expect(state.events.find(({ id }) => id === "login-help-1")?.status).toBe(
      "active",
    );
    expect(state.events.find(({ id }) => id === "status-check-1")?.status).toBe(
      "pending",
    );

    state = doWork(state, "check_device_inventory", "suspicious-login-1").state;
    state = doWork(state, "route_access_request", "access-request-1").state;
    state = doWork(state, "resolve_login_help", "login-help-1").state;
    expect(state.events.find(({ id }) => id === "status-check-1")?.status).toBe(
      "active",
    );
  });

  it("keeps task answers, callbacks, and pending content out of the client view", () => {
    const view = toClientView(world());
    const json = JSON.stringify(view);
    expect(json).not.toContain("requiredOptionIds");
    expect(json).not.toContain("actionEffects");
    expect(json).not.toContain("The data owner received the request");
    expect(json).not.toContain("login-help-1");
    expect(json).not.toContain("status-check-1");
  });

  it("requires opening authored sources before a new workplace decision", () => {
    let state = world();
    state = doWork(state, "read_handoff", "handoff-1").state;
    state = doWork(state, "acknowledge_handoff", "handoff-1").state;
    state = doWork(state, "review_alert", "suspicious-login-1").state;
    const action = availableActions(state).find(
      ({ id, eventId }) =>
        id === "route_access_request" && eventId === "access-request-1",
    );
    expect(action?.taskId).toBe("access-authority-check");
    expect(() =>
      applyTaskAttempt(state, {
        taskId: "access-authority-check",
        eventId: "access-request-1",
        selectedOptionIds: ["route-to-owner"],
      }),
    ).toThrow("Open the source records");
  });

  it("uses bounded callbacks instead of catastrophic consequences", () => {
    let state = world();
    for (const [id, eventId] of fullShift.slice(0, 7)) {
      state = doWork(state, id, eventId).state;
    }
    expect(
      state.events.find(({ id }) => id === "access-request-1")?.status,
    ).toBe("resolved");
    expect(state.hidden.riskExposure).toBe(0);
    const callback = state.ledger.find(
      ({ actionId }) => actionId === "route_access_request",
    );
    expect(callback?.applied).toBe(true);
    expect(callback?.description).toContain("data owner received the request");
  });

  it("completes and replays the full authored shift exactly", () => {
    const initial = world();
    let direct = initial;
    const interactions: LoggedInteraction[] = [];
    for (const [id, eventId] of fullShift) {
      const turn = doWork(direct, id, eventId);
      direct = turn.state;
      interactions.push(...turn.interactions);
    }
    expect(
      direct.events.every(({ status }) =>
        ["resolved", "escalated", "expired"].includes(status),
      ),
    ).toBe(true);
    expect(availableActions(direct)).toContainEqual(
      expect.objectContaining({ id: "complete_shift" }),
    );
    expect(direct.ticketNotes["suspicious-login-1"]).toContain(
      "A-1042 / S-0741",
    );
    expect(
      direct.ledger.find(
        ({ actionId }) => actionId === "submit_shift_handoff",
      )?.description,
    ).toContain("next analyst acknowledged");

    const replayed = foldActionLog(
      initial,
      interactions.map((interaction, index) => ({
        sequence: index + 1,
        interaction,
      })),
    );
    expect(replayed).toEqual(direct);
  });
});
