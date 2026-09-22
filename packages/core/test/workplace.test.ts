import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type {
  LoggedInteraction,
  WorkplaceInteraction,
  WorldState,
} from "@sim/schemas";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ActionUnavailableError,
  WorkplaceInteractionError,
  applyAction,
  applyTaskAttempt,
  applyWorkplaceInteraction,
  canOpenArtifact,
  createInitialWorldState,
  foldActionLog,
  toClientView,
} from "../src/index.js";

const pack = loadDefaultCybersecurityPack();

function world(seed = 42): WorldState {
  return createInitialWorldState("workplace-session", seed, {}, pack);
}

function readyForReview(state: WorldState): WorldState {
  const ready = structuredClone(state);
  ready.taskProgress["suspicious-login-1:login-alert-compare"] = {
    currentStep: 1,
    attempts: 2,
    completed: true,
    selectedOptionIdsByStep: {},
  };
  return ready;
}

function interact(
  state: WorldState,
  interaction: WorkplaceInteraction,
): WorldState {
  return applyWorkplaceInteraction(state, interaction).state;
}

describe("source-bound alert records", () => {
  it("opens a real visible record, maps its artifact, and replays the same selected source", () => {
    const initial = world();
    const preview = toClientView(initial).alertRecords?.find(({ id }) => id === "A-1042");
    expect(preview).toMatchObject({ id: "A-1042", linkedWorkItemId: "suspicious-login-1" });
    expect(preview).not.toHaveProperty("note");
    expect(toClientView(initial).artifacts.find(({ id }) => id === "suspicious-login-alert")).not.toHaveProperty("body");

    const interaction = { type: "open_alert_record" as const, recordId: "A-1042" };
    const opened = applyWorkplaceInteraction(initial, interaction).state;
    expect(initial.workplace.selectedAlertIdsByEvent).toEqual({});
    expect(opened.workplace.selectedAlertIdsByEvent?.["suspicious-login-1"]).toBe("A-1042");
    expect(opened.observedArtifactIds).toContain("suspicious-login-alert");
    expect(opened.simClock).toBe(initial.simClock);
    expect(opened.workplace.energy).toEqual(initial.workplace.energy);
    expect(toClientView(opened).alertRecords?.find(({ id }) => id === "A-1042")?.note).toContain("Six failed");
    const replayed = foldActionLog(initial, [{ sequence: 1, interaction: { type: "workplace_interaction", interaction } }]);
    expect(replayed).toEqual(opened);

    const action = { id: "review_alert" as const, actorId: "user", eventId: "suspicious-login-1", sourceRecordId: "A-1042", sourceArtifactId: "suspicious-login-alert" };
    const reviewed = applyAction(opened, action).state;
    expect(reviewed.events.find(({ id }) => id === action.eventId)?.completedActionIds).toContain("review_alert");
    expect(foldActionLog(initial, [
      { sequence: 1, interaction: { type: "workplace_interaction", interaction } },
      { sequence: 2, interaction: { type: "action", action } },
    ])).toEqual(reviewed);
  });

  it("rejects unknown, pending, unrelated, and stale sources without mutation", () => {
    const initial = world();
    for (const recordId of ["missing", "A-1180", "A-1159"]) {
      expect(() => applyWorkplaceInteraction(initial, { type: "open_alert_record", recordId })).toThrow(WorkplaceInteractionError);
    }
    const opened = interact(initial, { type: "open_alert_record", recordId: "A-1042" });
    expect(() => applyAction(opened, { id: "review_alert", actorId: "user", eventId: "suspicious-login-1" })).toThrow(ActionUnavailableError);
    for (const [sourceRecordId, sourceArtifactId] of [["A-1180", "suspicious-login-alert"], ["A-1042", "scanner-alert"], ["A-1042", "missing"]]) {
      expect(() => applyAction(opened, { id: "review_alert", actorId: "user", eventId: "suspicious-login-1", sourceRecordId, sourceArtifactId })).toThrow(ActionUnavailableError);
    }
    expect(opened.simClock).toBe(0);
    expect(opened.events.find(({ id }) => id === "suspicious-login-1")?.completedActionIds).toEqual([]);
  });
});

function expectRejectedWithoutMutation(
  state: WorldState,
  interaction: WorkplaceInteraction,
): void {
  const before = structuredClone(state);
  let thrown: unknown;
  try {
    applyWorkplaceInteraction(state, interaction);
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(WorkplaceInteractionError);
  expect(state).toEqual(before);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("deterministic workplace energy", () => {
  it("charges accepted work and five-meter movement but never wall-clock idle", () => {
    vi.useFakeTimers();
    const initial = world();
    vi.advanceTimersByTime(60 * 60 * 1_000);
    expect(initial.workplace.energy.current).toBe(100);

    const moved = interact(initial, {
      type: "movement_exertion",
      distanceMeters: 5,
    });
    expect(moved.workplace.energy.current).toBe(99);
    expect(moved.simClock).toBe(0);

    const worked = applyAction(readyForReview(moved), {
      id: "review_alert",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    expect(worked.workplace.energy.current).toBe(95);
    expect(worked.simClock).toBe(10);
  });

  it("charges failed task attempts zero energy and zero simulated time", () => {
    let initial = world();
    // Advance to where a still-gated ticket task is offered (login-ticket-summary after inspections)
    initial = applyAction(initial, {
      id: "review_alert",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    initial = applyAction(initial, {
      id: "inspect_login_context",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    initial = applyAction(initial, {
      id: "inspect_account_history",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    initial = applyAction(initial, {
      id: "check_device_inventory",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    initial.workplace.energy.current = 73;
    const before = structuredClone(initial);

    const turn = applyTaskAttempt(initial, {
      taskId: "login-ticket-summary",
      eventId: "suspicious-login-1",
      selectedOptionIds: ["definite-attacker", "montreal-proof"],
    });

    expect(turn.accepted).toBe(false);
    expect(turn.state.workplace.energy.current).toBe(73);
    expect(turn.state.simClock).toBe(before.simClock);
    expect(initial).toEqual(before);
  });

  it("rejects unaffordable work without charging energy or advancing time", () => {
    const initial = readyForReview(world());
    initial.workplace.energy.current = 3;
    const before = structuredClone(initial);

    expect(() =>
      applyAction(initial, {
        id: "review_alert",
        eventId: "suspicious-login-1",
        actorId: "user",
      }),
    ).toThrow(ActionUnavailableError);
    expect(initial).toEqual(before);

    initial.workplace.energy.current = 4;
    const accepted = applyAction(initial, {
      id: "review_alert",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    expect(accepted.workplace.energy.current).toBe(0);
    expect(accepted.simClock).toBe(10);
  });

  it("rejects movement exertion when no energy remains", () => {
    const initial = world();
    initial.workplace.energy.current = 0;

    expectRejectedWithoutMutation(initial, {
      type: "movement_exertion",
      distanceMeters: 5,
    });
  });
});

describe("finite workplace resources", () => {
  it("uses exactly two three-bite snack bars without underflow or refill", () => {
    let state = world();
    state.workplace.energy.current = 0;
    state = interact(state, { type: "open_fridge" });

    for (const barsRemaining of [1, 0]) {
      state = interact(state, { type: "take_snack" });
      expect(state.workplace).toMatchObject({
        fridgeSnackBars: barsRemaining,
        carriedSnackBites: 3,
      });
      for (let bitesRemaining = 2; bitesRemaining >= 0; bitesRemaining -= 1) {
        state = interact(state, { type: "eat_snack_bite" });
        expect(state.workplace.carriedSnackBites).toBe(bitesRemaining);
      }
    }

    expect(state.workplace.energy.current).toBe(72);
    expectRejectedWithoutMutation(state, { type: "take_snack" });
    expectRejectedWithoutMutation(state, { type: "eat_snack_bite" });
  });

  it("requires the exact coffee transition order and stops after two servings", () => {
    let state = world();
    state.workplace.energy.current = 0;
    expectRejectedWithoutMutation(state, { type: "finish_coffee" });

    state = interact(state, { type: "start_coffee" });
    expect(state.workplace.coffeeStage).toBe("brewing");
    state = interact(state, { type: "finish_coffee" });
    expect(state.workplace.coffeeStage).toBe("ready");

    state = interact(state, { type: "pour_coffee" });
    expect(state.workplace).toMatchObject({
      coffeeServings: 1,
      coffeeStage: "poured",
    });
    state = interact(state, { type: "drink_coffee" });
    expect(state.workplace).toMatchObject({
      energy: { current: 28, max: 100 },
      coffeeServings: 1,
      coffeeStage: "ready",
    });

    state = interact(state, { type: "pour_coffee" });
    state = interact(state, { type: "drink_coffee" });
    expect(state.workplace).toMatchObject({
      energy: { current: 56, max: 100 },
      coffeeServings: 0,
      coffeeStage: "idle",
    });
    expectRejectedWithoutMutation(state, { type: "start_coffee" });
    expectRejectedWithoutMutation(state, { type: "drink_coffee" });
  });

  it("allows one emergency recovery only when exhausted with no usable resources", () => {
    const resourcesRemain = world();
    resourcesRemain.workplace.energy.current = 0;
    expectRejectedWithoutMutation(resourcesRemain, {
      type: "emergency_recovery",
    });

    let exhausted = world();
    exhausted.workplace.energy.current = 0;
    exhausted.workplace.carriedSnackBites = 0;
    exhausted.workplace.fridgeSnackBars = 0;
    exhausted.workplace.coffeeServings = 0;
    exhausted.workplace.coffeeStage = "idle";
    exhausted = interact(exhausted, { type: "emergency_recovery" });
    expect(exhausted.workplace).toMatchObject({
      energy: { current: 20, max: 100 },
      emergencyRecoveryUsed: true,
    });
    exhausted.workplace.energy.current = 0;
    expectRejectedWithoutMutation(exhausted, {
      type: "emergency_recovery",
    });
  });
});

describe("artifact authorization", () => {
  it("opens only visible-event artifacts or approved knowledge-base documents", () => {
    const initial = world();
    expect(canOpenArtifact(initial, "suspicious-login-alert")).toBe(true);
    expect(canOpenArtifact(initial, "handoff-email")).toBe(true);
    expect(canOpenArtifact(initial, "scanner-alert")).toBe(false);
    expect(canOpenArtifact(initial, "scanner-window")).toBe(true);
    expect(canOpenArtifact(initial, "missing-artifact")).toBe(false);

    expectRejectedWithoutMutation(initial, {
      type: "open_artifact",
      artifactId: "scanner-alert",
    });

    const opened = applyWorkplaceInteraction(initial, {
      type: "open_artifact",
      artifactId: "suspicious-login-alert",
    });
    expect(opened.feedbackCode).toBe("artifact_opened");
    expect(opened.state.observedArtifactIds).toContain(
      "suspicious-login-alert",
    );
    expect(
      opened.state.events.find(({ id }) => id === "suspicious-login-1")
        ?.observedArtifactIds,
    ).toContain("suspicious-login-alert");
  });

  it("keeps pending and unopened artifact details out of the client view", () => {
    const initial = world();
    const beforeOpen = toClientView(initial);
    expect(beforeOpen.artifacts.map(({ id }) => id)).not.toContain(
      "scanner-alert",
    );
    expect(
      beforeOpen.artifacts.find(({ id }) => id === "suspicious-login-alert"),
    ).not.toHaveProperty("body");
    expect(JSON.stringify(beforeOpen)).not.toContain(
      "Vulnerability scanner vuln-scan-03 opened connections",
    );

    const opened = interact(initial, {
      type: "open_artifact",
      artifactId: "suspicious-login-alert",
    });
    const afterOpen = toClientView(opened);
    expect(
      afterOpen.artifacts.find(({ id }) => id === "suspicious-login-alert")
        ?.body,
    ).toContain("6 failed MFA challenges");
    expect(initial.observedArtifactIds).toEqual([]);
  });
});

describe("workplace replay", () => {
  it("replays the same seed and interaction log to identical canonical state", () => {
    const interactions: LoggedInteraction[] = [
      { type: "workplace_interaction", interaction: { type: "open_fridge" } },
      { type: "workplace_interaction", interaction: { type: "take_snack" } },
      {
        type: "workplace_interaction",
        interaction: { type: "movement_exertion", distanceMeters: 5 },
      },
      {
        type: "workplace_interaction",
        interaction: { type: "eat_snack_bite" },
      },
      {
        type: "workplace_interaction",
        interaction: { type: "talk_to_jules", topic: "current_work" },
      },
      {
        type: "workplace_interaction",
        interaction: {
          type: "open_artifact",
          artifactId: "suspicious-login-alert",
        },
      },
    ];
    let direct = world(99);
    for (const entry of interactions) {
      if (entry.type !== "workplace_interaction") continue;
      direct = interact(direct, entry.interaction);
    }

    const entries = interactions.map((interaction, index) => ({
      sequence: index + 1,
      interaction,
    }));
    const replayed = foldActionLog(world(99), [
      ...entries.slice(3),
      ...entries.slice(0, 3),
    ]);

    expect(replayed).toEqual(direct);
    expect(replayed.workplace).toMatchObject({
      energy: { current: 100, max: 100 },
      fridgeSnackBars: 1,
      carriedSnackBites: 2,
      julesTopicsSeen: ["current_work"],
    });
    expect(replayed.observedArtifactIds).toContain("suspicious-login-alert");
  });
});
