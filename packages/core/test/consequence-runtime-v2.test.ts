import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type { WorldState } from "@sim/schemas";
import { applyAction, applyTaskAttempt, availableActions, createInitialWorldState } from "../src/index.js";
import { applyDueCallbacks, applyDueConsequences } from "../src/scheduler.js";

const pack = loadDefaultCybersecurityPack();
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing test fixture");
  return value;
}

function ready(eventId: string, taskId: string, completedActionIds: WorldState["events"][number]["completedActionIds"] = []) {
  const state = createInitialWorldState(`route-${eventId}-${taskId}`, 42, {}, pack);
  const event = required(state.events.find(({ id }) => id === eventId));
  event.status = "active";
  event.completedActionIds = completedActionIds;
  state.simClock = event.triggeredAt;
  state.observedArtifactIds = Object.keys(state.artifacts);
  const task = required(state.rules.tasks[taskId]);
  state.taskProgress[`${eventId}:${taskId}`] = {
    currentStep: task.steps.length - 1,
    attempts: 0,
    completed: false,
    selectedOptionIdsByStep: {},
    outcomeIdsByStep: {},
    correctionHistory: [],
  };
  return state;
}

describe("Cyber 2.0.0 consequence routes", () => {
  it("accepts every B1 disposition after the same investigation", () => {
    expect(pack.career.packVersion).toBe("2.0.0");
    for (const choice of ["escalate-with-comparisons", "escalate-identifiers-only", "close-location-explained", "close-familiar-account"]) {
      const state = ready("suspicious-login-1", "login-ticket-summary", ["review_alert", "inspect_login_context", "inspect_account_history", "check_device_inventory"]);
      const documented = applyAction(state, {
        id: "document_ticket", eventId: "suspicious-login-1", actorId: "user", decisionOptionId: choice,
        ticketPayload: {
          ticketId: "ticket-suspicious-login-1",
          verifiedEvidence: "Session and device records compared.",
          uncertainty: "The session owner remains unverified.",
          followUp: "Preserve the saved evidence for review.",
          sourceArtifactIds: ["suspicious-login-alert"],
        },
      }).state;
      expect(documented.flags.b1_choice).toBe(choice);
      const terminal = choice.startsWith("close-") ? "dismiss_alert" : "escalate_alert";
      expect(availableActions(documented).map(({ id }) => id)).toContain(terminal);
      const committed = applyAction(documented, { id: terminal, eventId: "suspicious-login-1", actorId: "user" }).state;
      expect(committed.events.find(({ id }) => id === "suspicious-login-1")?.status).toBe("resolved");
      expect(committed.pendingCallbacks).toHaveLength(1);
      expect(committed.acknowledgements).toHaveLength(1);
      expect(committed.acknowledgements[0]?.decisionId).toBe("suspicious_login");
      applyDueCallbacks(committed, [], true);
      expect(committed.teamMessages?.some(({ author }) => author === "reviewer" || author === "employee")).toBe(true);
      if (terminal === "dismiss_alert") {
        expect(committed.events.find(({ id }) => id === "login-clarification-1")?.status).toBe("waiting");
      }
    }
  });

  it("commits all B2 authority routes and gives each a later response", () => {
    for (const choice of ["route-to-owner", "route-with-interim", "self-approve", "route-to-director"]) {
      const state = ready("access-request-1", "access-authority-check");
      required(state.taskProgress["access-request-1:access-authority-check"]).currentStep = 0;
      const turn = applyTaskAttempt(state, { eventId: "access-request-1", taskId: "access-authority-check", selectedOptionIds: [choice] });
      expect(turn.accepted).toBe(true);
      expect(turn.state.flags.b2_choice).toBe(choice);
      expect(turn.state.pendingCallbacks).toHaveLength(1);
      expect(turn.state.acknowledgements).toHaveLength(1);
    }
  });

  it("preserves an omission through correction and settles required callbacks", () => {
    const state = ready("shift-handoff-1", "end-shift-continuity");
    const progress = required(state.taskProgress["shift-handoff-1:end-shift-continuity"]);
    progress.currentStep = 0;
    const omitted = applyTaskAttempt(state, { eventId: "shift-handoff-1", taskId: "end-shift-continuity", selectedOptionIds: ["checks-omitted"] });
    expect(omitted.accepted).toBe(true);
    const questioned = applyTaskAttempt(omitted.state, { eventId: "shift-handoff-1", taskId: "end-shift-continuity", selectedOptionIds: ["reviewer-question"] });
    const corrected = applyTaskAttempt(questioned.state, { eventId: "shift-handoff-1", taskId: "end-shift-continuity", selectedOptionIds: ["correct-omission"] });
    expect(corrected.accepted).toBe(true);
    expect(corrected.state.flags.b3_choice).toBe("corrected");
    expect(corrected.state.taskProgress["shift-handoff-1:end-shift-continuity"]?.correctionHistory).toEqual([
      { stepId: "handoff-checked", initialOptionIds: ["checks-omitted"], correctedOptionIds: ["correct-omission"] },
    ]);
    const effects: Parameters<typeof applyDueCallbacks>[1] = [];
    applyDueCallbacks(corrected.state, effects, true);
    expect(corrected.state.pendingCallbacks[0]?.applied).toBe(true);
    expect(corrected.state.teamMessages?.some(({ author }) => author === "reviewer")).toBe(true);
  });

  it("accepts complete and thin B3 handoffs", () => {
    for (const [first, last, expected] of [
      [["login-records-checked", "scanner-checked"], ["next-analyst-review"], "complete"],
      [["checks-omitted"], ["send-thin"], "thin"],
    ] as const) {
      const state = ready("shift-handoff-1", "end-shift-continuity");
      required(state.taskProgress["shift-handoff-1:end-shift-continuity"]).currentStep = 0;
      const firstTurn = applyTaskAttempt(state, { eventId: "shift-handoff-1", taskId: "end-shift-continuity", selectedOptionIds: [...first] });
      const secondTurn = applyTaskAttempt(firstTurn.state, { eventId: "shift-handoff-1", taskId: "end-shift-continuity", selectedOptionIds: ["reviewer-question"] });
      const lastTurn = applyTaskAttempt(secondTurn.state, { eventId: "shift-handoff-1", taskId: "end-shift-continuity", selectedOptionIds: [...last] });
      expect(lastTurn.accepted).toBe(true);
      expect(lastTurn.state.flags.b3_choice).toBe(expected);
      expect(lastTurn.state.acknowledgements).toHaveLength(1);
    }
  });

  it("settles a required callback before completion without padding the clock", () => {
    const state = ready("shift-handoff-1", "end-shift-continuity");
    for (const event of state.events) event.status = "resolved";
    state.pendingCallbacks.push({
      id: "required", eventId: "shift-handoff-1", actionId: "submit_shift_handoff",
      dueAt: state.simClock + 100, applied: false, delayMinutes: 100, when: [],
      author: "reviewer", body: "The next analyst received the handoff.",
      activationMessages: [], requiredAtCompletion: true,
    });
    const before = state.simClock;
    const completed = applyAction(state, { id: "complete_shift", eventId: "shift", actorId: "user" }).state;
    expect(completed.simClock).toBe(before);
    expect(completed.pendingCallbacks[0]?.applied).toBe(true);
    expect(completed.teamMessages?.at(-1)?.body).toBe("The next analyst received the handoff.");
  });

  it("never resurrects an expired event from a delayed consequence or callback", () => {
    const state = ready("suspicious-login-1", "login-ticket-summary");
    const event = required(state.events.find(({ id }) => id === "suspicious-login-1"));
    event.status = "expired";
    event.resolution = "Expired at the operational deadline.";
    state.ledger.push({ id: "late", eventId: event.id, actionId: "dismiss_alert", description: "Late consequence", createdAt: 0, dueAt: 1, applied: false });
    state.pendingCallbacks.push({ id: "late-callback", eventId: event.id, actionId: "dismiss_alert", dueAt: 1, applied: false, delayMinutes: 1, when: [], author: "reviewer", body: "Late message", activationMessages: [], requiredAtCompletion: true });
    state.simClock = 100;
    applyDueConsequences(state, []);
    applyDueCallbacks(state, []);
    expect(event.status).toBe("expired");
    expect(event.resolution).toBe("Expired at the operational deadline.");
    expect(state.teamMessages).toEqual([]);
  });
});
