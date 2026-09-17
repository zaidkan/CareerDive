import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type { CareerPack } from "@sim/schemas";
import {
  ActionUnavailableError,
  applyAction,
  applyTaskAttempt,
  applyWorkplaceInteraction,
  createInitialWorldState,
  respondToNotification,
  toClientView,
} from "../src/index.js";

function performRequiredTask(
  initial: ReturnType<typeof createInitialWorldState>,
  actionId: Parameters<typeof applyAction>[1]["id"],
  eventId: string,
) {
  let state = initial;
  const available = toClientView(state).availableActions.find(
    (action) => action.id === actionId && action.eventId === eventId,
  );
  if (!available?.taskId) {
    return applyAction(state, {
      id: actionId,
      eventId,
      actorId: "user",
    }).state;
  }
  const task = state.rules.tasks[available.taskId];
  if (!task) throw new Error(`Missing task ${available.taskId}`);
  while (!state.taskProgress[`${eventId}:${task.id}`]?.completed) {
    const stepIndex =
      state.taskProgress[`${eventId}:${task.id}`]?.currentStep ?? 0;
    const step = task.steps[stepIndex];
    if (!step) throw new Error(`Missing task step ${String(stepIndex)}`);
    for (const artifactId of new Set(
      step.options.flatMap(({ source }) => (source ? [source.artifactId] : [])),
    )) {
      if (!state.observedArtifactIds.includes(artifactId))
        state = applyWorkplaceInteraction(state, {
          type: "open_artifact",
          artifactId,
        }).state;
    }
    state = applyTaskAttempt(state, {
      taskId: task.id,
      eventId,
      selectedOptionIds: step.requiredOptionIds,
    }).state;
  }
  return state;
}

function packWithHandoffTask(): CareerPack {
  const pack = structuredClone(loadDefaultCybersecurityPack());
  pack.scenario.tasks = [
    {
      id: "handoff-open-items",
      eventTemplateId: "incomplete_handoff",
      actionId: "read_handoff",
      systemId: "email",
      kind: "select_clues",
      title: "Find unfinished work",
      whyItMatters: "Handoffs stop work from getting lost between shifts.",
      releasesActionGate: false,
      steps: [
        {
          id: "unfinished-item",
          title: "What remains open?",
          prompt: "Choose the unfinished work.",
          instruction: "Select one item.",
          relatedArtifactIds: ["handoff-email"],
          minSelections: 1,
          maxSelections: 1,
          options: [
            { id: "device-check", label: "Device inventory check" },
            { id: "coffee", label: "Coffee order" },
          ],
          requiredOptionIds: ["device-check"],
          coachOnFailure: "Look for wording that says work was not finished.",
          successText: "You found the unfinished device check.",
        },
        {
          id: "missing-reference",
          title: "What information is missing?",
          prompt: "Choose the missing reference.",
          instruction: "Select one item.",
          relatedArtifactIds: ["handoff-email"],
          minSelections: 1,
          maxSelections: 1,
          options: [
            { id: "scanner-window", label: "Scanner maintenance window" },
            { id: "lunch-menu", label: "Lunch menu" },
          ],
          requiredOptionIds: ["scanner-window"],
          coachOnFailure:
            "The routine alert needs an approved schedule reference.",
          successText: "You identified the missing schedule reference.",
        },
      ],
    },
  ];
  return pack;
}

function world() {
  return createInitialWorldState("task-session", 42, {}, packWithHandoffTask());
}

describe("deterministic work tasks", () => {
  it("coaches a weak answer without advancing time or action completion", () => {
    const initial = world();
    const turn = applyTaskAttempt(initial, {
      taskId: "handoff-open-items",
      eventId: "handoff-1",
      selectedOptionIds: ["coffee"],
    });

    expect(turn.accepted).toBe(false);
    expect(turn.completed).toBe(false);
    expect(turn.feedback).toMatch(/not finished/i);
    expect(turn.state.simClock).toBe(0);
    expect(turn.state.completedActionIds).not.toContain("read_handoff");
    expect(
      turn.state.taskProgress["handoff-1:handoff-open-items"],
    ).toMatchObject({
      currentStep: 0,
      attempts: 1,
      completed: false,
    });
  });

  it("advances steps then performs the linked action exactly once", () => {
    const first = applyTaskAttempt(world(), {
      taskId: "handoff-open-items",
      eventId: "handoff-1",
      selectedOptionIds: ["device-check"],
    });
    expect(first.accepted).toBe(true);
    expect(first.completed).toBe(false);
    expect(first.state.simClock).toBe(0);
    expect(
      first.state.taskProgress["handoff-1:handoff-open-items"]?.currentStep,
    ).toBe(1);

    const second = applyTaskAttempt(first.state, {
      taskId: "handoff-open-items",
      eventId: "handoff-1",
      selectedOptionIds: ["scanner-window"],
    });
    expect(second.accepted).toBe(true);
    expect(second.completed).toBe(true);
    expect(second.state.simClock).toBe(5);
    expect(
      second.state.events.find(({ id }) => id === "handoff-1")
        ?.completedActionIds,
    ).toEqual(["read_handoff"]);
    expect(() =>
      applyTaskAttempt(second.state, {
        taskId: "handoff-open-items",
        eventId: "handoff-1",
        selectedOptionIds: ["scanner-window"],
      }),
    ).toThrow(ActionUnavailableError);
  });

  it("rejects direct action bypass while a required task is incomplete", () => {
    expect(() =>
      applyAction(world(), {
        id: "read_handoff",
        eventId: "handoff-1",
        actorId: "user",
      }),
    ).toThrow(/requires task/i);
  });

  it("serializes task options without answer keys or coaching rules", () => {
    const view = toClientView(world());
    const task = view.tasks.find(({ id }) => id === "handoff-open-items");
    expect(task).toMatchObject({
      actionId: "read_handoff",
      eventId: "handoff-1",
      stepIndex: 0,
      stepCount: 2,
    });
    expect(task?.options.map(({ id }) => id)).toEqual([
      "device-check",
      "coffee",
    ]);
    expect(JSON.stringify(task)).not.toMatch(
      /requiredOptionIds|coachOnFailure|successText/,
    );
  });

  it("turns a completed summary task into persistent ticket notes", () => {
    let state = createInitialWorldState(
      "summary-session",
      42,
      {},
      loadDefaultCybersecurityPack(),
    );
    state = performRequiredTask(state, "review_alert", "suspicious-login-1");
    state = performRequiredTask(
      state,
      "inspect_login_context",
      "suspicious-login-1",
    );
    state = performRequiredTask(
      state,
      "inspect_account_history",
      "suspicious-login-1",
    );
    state = performRequiredTask(
      state,
      "check_device_inventory",
      "suspicious-login-1",
    );
    state = performRequiredTask(state, "document_ticket", "suspicious-login-1");

    expect(state.ticketNotes["suspicious-login-1"]).toContain(
      "unknown-laptop-17 is not enrolled",
    );
    expect(state.ticketNotes["suspicious-login-1"]).toContain(
      "identity misuse is suspected, not yet proven",
    );
    expect(state.ticketNotes["suspicious-login-1"]).toContain(
      "Escalate for account containment review",
    );
  });
});

describe("deterministic interruption notifications", () => {
  function notificationWorld() {
    const pack = structuredClone(loadDefaultCybersecurityPack());
    pack.scenario.notifications = [
      {
        id: "routine-work-arrived",
        eventTemplateId: "routine_alert_review",
        systemId: "alert_dashboard",
        title: "Routine alert arrived",
        body: "Handle it now, snooze once, or continue the main case.",
        priority: "low",
        snoozeMinutes: 15,
      },
    ];
    return createInitialWorldState("notification-session", 9, {}, pack);
  }

  function activateRoutine() {
    let state = notificationWorld();
    state = performRequiredTask(state, "review_alert", "suspicious-login-1");
    state = performRequiredTask(state, "read_handoff", "handoff-1");
    state = performRequiredTask(state, "acknowledge_handoff", "handoff-1");
    state = performRequiredTask(
      state,
      "inspect_login_context",
      "suspicious-login-1",
    );
    return state;
  }

  it("creates a safe notification when pending routine work activates", () => {
    const state = activateRoutine();
    expect(state.notifications).toContainEqual(
      expect.objectContaining({
        id: "routine-work-arrived",
        eventId: "routine-alert-1",
        status: "unread",
      }),
    );
    expect(toClientView(state).notifications).toContainEqual(
      expect.objectContaining({
        id: "routine-work-arrived",
        canSnooze: true,
        systemId: "alert_dashboard",
      }),
    );
  });

  it("snoozes once, wakes after simulated time, then refuses another snooze", () => {
    const active = activateRoutine();
    let state = respondToNotification(active, {
      notificationId: "routine-work-arrived",
      response: "snooze",
    });
    expect(state.notifications[0]).toMatchObject({
      status: "snoozed",
      snoozeUsed: true,
      snoozedUntil: active.simClock + 15,
    });

    state = performRequiredTask(
      state,
      "inspect_account_history",
      "suspicious-login-1",
    );
    state = performRequiredTask(
      state,
      "check_device_inventory",
      "suspicious-login-1",
    );
    expect(state.notifications[0]?.status).toBe("unread");
    expect(() =>
      respondToNotification(state, {
        notificationId: "routine-work-arrived",
        response: "snooze",
      }),
    ).toThrow(/already been snoozed/i);
  });

  it.each(["handle", "continue"] as const)(
    "acknowledges a %s response without changing simulated time",
    (response) => {
      const active = activateRoutine();
      const next = respondToNotification(active, {
        notificationId: "routine-work-arrived",
        response,
      });
      expect(next.simClock).toBe(active.simClock);
      expect(next.notifications[0]?.status).toBe("acknowledged");
    },
  );
});
