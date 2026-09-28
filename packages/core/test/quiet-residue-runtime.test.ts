import { expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type { WorldState } from "@sim/schemas";
import { applyTaskAttempt, createInitialWorldState } from "../src/index.js";

function atStep(eventId: string, taskId: string, step: number, completedActionIds: WorldState["events"][number]["completedActionIds"] = []) {
  const state = createInitialWorldState(`${taskId}-${String(step)}`, 7, {}, loadDefaultCybersecurityPack());
  const event = state.events.find(({ id }) => id === eventId);
  if (!event) throw new Error(`Missing ${eventId}`);
  event.status = "active";
  event.completedActionIds = completedActionIds;
  state.simClock = event.triggeredAt;
  state.observedArtifactIds = Object.keys(state.artifacts);
  state.taskProgress[`${eventId}:${taskId}`] = {
    currentStep: step, attempts: 0, completed: false,
    selectedOptionIdsByStep: {}, outcomeIdsByStep: {}, correctionHistory: [],
  };
  // Exercise authored option branches while normal V2 play keeps these
  // legacy exercises optional and derives quiet residue from canonical work.
  const task = state.rules.tasks[taskId];
  if (!task) throw new Error(`Missing ${taskId}`);
  task.releasesActionGate = false;
  return state;
}

function choose(state: WorldState, eventId: string, taskId: string, ...selectedOptionIds: string[]) {
  const turn = applyTaskAttempt(state, { eventId, taskId, selectedOptionIds });
  expect(turn.accepted).toBe(true);
  return turn.state;
}

it("records D1, D2, D3, and D6 residue with authored follow-up but no acknowledgements", () => {
  const cases = [
    ["handoff-1", "handoff-priority-message", 0, ["read_handoff"], ["routine-first-watch-login"], "d1_triage", "d1-routine-first-note"],
    ["suspicious-login-1", "login-alert-compare", 1, [], ["priority-label"], "d2_first_read", "d2-priority-followup"],
    ["suspicious-login-1", "account-pattern-compare", 2, ["review_alert", "inspect_login_context"], ["baseline-vpn-route", "approved-vpn-exit", "vpn-display-city"], "d3_vpn", "d3-city-route-followup"],
    ["routine-alert-1", "scanner-ticket-summary", 2, ["review_alert", "search_knowledge_base"], ["expected-close-with-monitoring"], "d6_scanner", "d6-monitoring-note"],
  ] as const;
  for (const [eventId, taskId, step, completed, choices, flag, callbackId] of cases) {
    const state = atStep(eventId, taskId, step, [...completed]);
    const next = choose(state, eventId, taskId, ...choices);
    expect(next.flags[flag]).toBeDefined();
    expect(next.pendingCallbacks.some(({ id }) => id === callbackId)).toBe(true);
    expect(next.acknowledgements).toEqual([]);
  }
});

it("records D8 and D9 residue through final action without an acknowledgement", () => {
  for (const [eventId, taskId, firstChoice, flag, callbackId] of [
    ["login-help-1", "employee-login-troubleshooting", ["phone-retries", "employee-device-report"], "d8_login_help", "d8-report-followup"],
    ["status-check-1", "morgan-midshift-update", ["confirmed-source"], "d9_status", "d9-source-status-note"],
  ] as const) {
    let state = atStep(eventId, taskId, 0);
    state = choose(state, eventId, taskId, ...firstChoice);
    const task = state.rules.tasks[taskId];
    if (!task) throw new Error(`Missing ${taskId}`);
    for (const step of task.steps.slice(1)) state = choose(state, eventId, taskId, ...step.requiredOptionIds);
    expect(state.flags[flag]).toBeDefined();
    expect(state.pendingCallbacks.some(({ id }) => id === callbackId)).toBe(true);
    expect(state.acknowledgements).toEqual([]);
  }
});
