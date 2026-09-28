import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type { ActionLogEntry, CareerPack } from "@sim/schemas";
import { PackTaskDefinitionSchema } from "@sim/schemas";
import {
  applyAction,
  availableActions,
  createInitialWorldState,
  foldActionLog,
  TaskRequiredError,
} from "../src/index.js";

const READ_HANDOFF = {
  id: "read_handoff",
  eventId: "handoff-1",
  actorId: "user",
} as const;

/** Fixture pack: exactly one binding released, everything else legacy. */
function packWithReleasedHandoff(): CareerPack {
  const pack = structuredClone(loadDefaultCybersecurityPack());
  const task = pack.scenario.tasks.find(
    ({ id }) => id === "handoff-open-items",
  );
  if (!task) throw new Error("Missing fixture task handoff-open-items");
  task.releasesActionGate = true;
  return pack;
}

function packWithLegacyHandoff(): CareerPack {
  const pack = structuredClone(loadDefaultCybersecurityPack());
  const task = pack.scenario.tasks.find(
    ({ id }) => id === "handoff-open-items",
  );
  if (!task) throw new Error("Missing fixture task handoff-open-items");
  // Default pack now ships this binding released (P3-T01); recreate legacy for this test.
  task.releasesActionGate = false;
  return pack;
}

function packWithGatedInspection(): CareerPack {
  const pack = structuredClone(loadDefaultCybersecurityPack());
  for (const id of [
    "login-context-clues",
    "account-pattern-compare",
    "device-owner-match",
  ]) {
    const task = pack.scenario.tasks.find((t) => t.id === id);
    if (task) task.releasesActionGate = false;
  }
  return pack;
}

describe("P1-T03 per-action gate release", () => {
  it("blocks a legacy task-bound action before task completion", () => {
    // Use a legacy pack where inspection is still gated to verify legacy blocking.
    let gated = createInitialWorldState(
      "p1-t03-legacy",
      7,
      {},
      packWithGatedInspection(),
    );
    gated = applyAction(gated, {
      id: "review_alert",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    expect(() =>
      applyAction(gated, {
        id: "inspect_login_context",
        eventId: "suspicious-login-1",
        actorId: "user",
      }),
    ).toThrow(TaskRequiredError);
    const legacyPack = packWithLegacyHandoff();
    const legacyState = createInitialWorldState(
      "p1-t03-legacy-handoff",
      7,
      {},
      legacyPack,
    );
    expect(() => applyAction(legacyState, { ...READ_HANDOFF })).toThrow(
      TaskRequiredError,
    );
  });

  it("permits the same action when its binding releases the gate", () => {
    const state = createInitialWorldState(
      "p1-t03-released",
      7,
      {},
      packWithReleasedHandoff(),
    );
    const next = applyAction(state, { ...READ_HANDOFF }).state;
    expect(next.observedArtifactIds).toContain("handoff-email");
    expect(
      next.taskProgress["handoff-1:handoff-open-items"]?.completed ?? false,
    ).toBe(false);
  });

  it("keeps an unrelated legacy binding gated", () => {
    let state = createInitialWorldState(
      "p1-t03-other",
      7,
      {},
      packWithGatedInspection(),
    );
    state = applyAction(state, {
      id: "review_alert",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    expect(() =>
      applyAction(state, {
        id: "inspect_login_context",
        eventId: "suspicious-login-1",
        actorId: "user",
      }),
    ).toThrow(TaskRequiredError);
  });

  it("still permits a legacy action after its task completes", () => {
    const pack = loadDefaultCybersecurityPack();
    const base = createInitialWorldState("p1-t03-completed", 7, {}, pack);
    const state = {
      ...base,
      taskProgress: {
        "handoff-1:handoff-open-items": {
          currentStep: 2,
          attempts: 2,
          completed: true,
          selectedOptionIdsByStep: {},
          outcomeIdsByStep: {},
          correctionHistory: [],
        },
      },
    };
    expect(() => applyAction(state, { ...READ_HANDOFF })).not.toThrow();
  });

  it("availability agrees with execution on gated vs released bindings", () => {
    const legacy = createInitialWorldState(
      "p1-t03-avail-legacy",
      7,
      {},
      packWithLegacyHandoff(),
    );
    const released = createInitialWorldState(
      "p1-t03-avail-released",
      7,
      {},
      packWithReleasedHandoff(),
    );
    const legacyOffered = availableActions(legacy).find(
      ({ id, eventId }) => id === "read_handoff" && eventId === "handoff-1",
    );
    const releasedOffered = availableActions(released).find(
      ({ id, eventId }) => id === "read_handoff" && eventId === "handoff-1",
    );
    // Gated: task-bound offer, execution throws.
    expect(legacyOffered?.taskId).toBe("handoff-open-items");
    expect(() => applyAction(legacy, { ...READ_HANDOFF })).toThrow(
      TaskRequiredError,
    );
    // Released: plain canonical offer, execution succeeds.
    expect(releasedOffered?.taskId).toBeUndefined();
    expect(() => applyAction(released, { ...READ_HANDOFF })).not.toThrow();
  });

  it("replays a released action deterministically", () => {
    const pack = packWithReleasedHandoff();
    const initial = createInitialWorldState("p1-t03-replay", 7, {}, pack);
    const entries: ActionLogEntry[] = [
      {
        sequence: 1,
        interaction: { type: "action", action: { ...READ_HANDOFF } },
      },
    ];
    const direct = applyAction(initial, { ...READ_HANDOFF }).state;
    expect(foldActionLog(initial, entries)).toEqual(direct);
  });

  it("rejects malformed gate-release authoring", () => {
    const pack = loadDefaultCybersecurityPack();
    const task = pack.scenario.tasks.find(
      ({ id }) => id === "handoff-open-items",
    );
    if (!task) throw new Error("Missing fixture task handoff-open-items");
    expect(() =>
      PackTaskDefinitionSchema.parse({
        ...structuredClone(task),
        releasesActionGate: "yes",
      }),
    ).toThrow();
  });
});
