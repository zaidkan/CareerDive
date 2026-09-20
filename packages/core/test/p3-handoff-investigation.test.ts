import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import {
  applyAction,
  createInitialWorldState,
  foldActionLog,
  toClientView,
} from "../src/index.js";

/**
 * P3-T01 focused progression tests — investigation, not quiz gates.
 *
 * Proves:
 * - handoff no longer requires quiz-like option gate
 * - A-1042 progression does not require requiredOptionIds
 * - actual record/artifact investigation can unlock progression
 * - multiple sensible investigation orders work where intended
 * - query result alone does not equal observation
 * - no hidden authoring fields leak
 * - no success/failure grading UI is introduced
 * - replay remains deterministic
 */

function world(sessionId = "p3-handoff") {
  return createInitialWorldState(sessionId, 7, {}, loadDefaultCybersecurityPack());
}

describe("P3-T01 handoff + alert comprehension through investigation", () => {
  it("handoff no longer requires the quiz-like option gate", () => {
    const initial = world();
    const view = toClientView(initial);
    const handoffAction = view.availableActions.find(
      (a) => a.id === "read_handoff" && a.eventId === "handoff-1",
    );
    expect(handoffAction).toBeDefined();
    expect(handoffAction?.taskId).toBeUndefined();
    expect(view.tasks.find((t) => t.id === "handoff-open-items")).toBeUndefined();
    // Direct canonical action succeeds and observes the handoff artifact.
    const after = applyAction(initial, {
      id: "read_handoff",
      eventId: "handoff-1",
      actorId: "user",
    }).state;
    expect(after.observedArtifactIds).toContain("handoff-email");
    expect(after.events.find((e) => e.id === "handoff-1")?.completedActionIds).toContain(
      "read_handoff",
    );
    expect(after.taskProgress["handoff-1:handoff-open-items"]).toBeUndefined();
    expect(JSON.stringify(toClientView(after))).not.toMatch(
      /requiredOptionIds|coachOnFailure|successText/,
    );
  });

  it("A-1042 progression does not require requiredOptionIds and unlocks via inspection", () => {
    let state = world();
    state = applyAction(state, {
      id: "review_alert",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    expect(state.observedArtifactIds).toContain("suspicious-login-alert");
    expect(state.events.find((e) => e.id === "suspicious-login-1")?.completedActionIds).toContain(
      "review_alert",
    );
    // Next inspection should be available as plain action, not gated task.
    const view = toClientView(state);
    const ctxAction = view.availableActions.find(
      (a) => a.id === "inspect_login_context" && a.eventId === "suspicious-login-1",
    );
    expect(ctxAction).toBeDefined();
    expect(ctxAction?.taskId).toBeUndefined();
    expect(view.tasks.find((t) => t.id === "login-alert-compare")).toBeUndefined();
    expect(JSON.stringify(view)).not.toMatch(/Correct|That's right|Good job|You found the suspicious clue|Incorrect|Try again/);
  });

  it("actual record/artifact investigation can unlock progression", () => {
    let state = world();
    state = applyAction(state, {
      id: "review_alert",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    // Investigate via canonical actions (observation) and via query, then proceed.
    state = applyAction(state, {
      id: "inspect_login_context",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    expect(state.observedArtifactIds).toContain("login-context-1");
    state = applyAction(state, {
      id: "query_records",
      eventId: "suspicious-login-1",
      actorId: "user",
      queryPayload: { datasetId: "auth", filters: { sessionId: "S-0741" } },
    }).state;
    expect(state.queryHistory.at(-1)?.resultIds).toContain("AUTH-0741-PATEL");
    // Query does not equal observation.
    expect(state.observedArtifactIds).not.toContain("AUTH-0741-PATEL");
    // Continue investigation via other inspection (device) to unlock document step.
    state = applyAction(state, {
      id: "inspect_account_history",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    state = applyAction(state, {
      id: "check_device_inventory",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    const view = toClientView(state);
    expect(view.availableActions.some((a) => a.id === "document_ticket")).toBe(true);
  });

  it("multiple sensible investigation orders work where intended", () => {
    const authFirst = (() => {
      let s = world();
      s = applyAction(s, { id: "review_alert", eventId: "suspicious-login-1", actorId: "user" }).state;
      s = applyAction(s, { id: "inspect_login_context", eventId: "suspicious-login-1", actorId: "user" }).state;
      s = applyAction(s, { id: "inspect_account_history", eventId: "suspicious-login-1", actorId: "user" }).state;
      s = applyAction(s, { id: "check_device_inventory", eventId: "suspicious-login-1", actorId: "user" }).state;
      s = applyAction(s, { id: "query_records", eventId: "suspicious-login-1", actorId: "user", queryPayload: { datasetId: "auth", filters: { user: "j.patel@example.com" } } }).state;
      s = applyAction(s, { id: "query_records", eventId: "suspicious-login-1", actorId: "user", queryPayload: { datasetId: "devices", filters: { deviceLabel: "unknown-laptop-17" } } }).state;
      return s;
    })();
    const deviceFirst = (() => {
      let s = world();
      s = applyAction(s, { id: "review_alert", eventId: "suspicious-login-1", actorId: "user" }).state;
      s = applyAction(s, { id: "inspect_login_context", eventId: "suspicious-login-1", actorId: "user" }).state;
      s = applyAction(s, { id: "check_device_inventory", eventId: "suspicious-login-1", actorId: "user" }).state;
      s = applyAction(s, { id: "inspect_account_history", eventId: "suspicious-login-1", actorId: "user" }).state;
      s = applyAction(s, { id: "query_records", eventId: "suspicious-login-1", actorId: "user", queryPayload: { datasetId: "devices", filters: { deviceLabel: "unknown-laptop-17" } } }).state;
      s = applyAction(s, { id: "query_records", eventId: "suspicious-login-1", actorId: "user", queryPayload: { datasetId: "auth", filters: { user: "j.patel@example.com" } } }).state;
      return s;
    })();
    const authIds = authFirst.events.find((e) => e.id === "suspicious-login-1")?.completedActionIds ?? [];
    const deviceIds = deviceFirst.events.find((e) => e.id === "suspicious-login-1")?.completedActionIds ?? [];
    expect(authIds).toEqual(expect.arrayContaining(["review_alert", "inspect_login_context", "inspect_account_history", "check_device_inventory"]));
    expect(deviceIds).toEqual(expect.arrayContaining(["review_alert", "inspect_login_context", "inspect_account_history", "check_device_inventory"]));
    expect(toClientView(authFirst).availableActions.map((a) => a.id)).toEqual(
      expect.arrayContaining(["document_ticket"]),
    );
    expect(toClientView(deviceFirst).availableActions.map((a) => a.id)).toEqual(
      expect.arrayContaining(["document_ticket"]),
    );
    // Query history order differs, but progression state is equivalent.
    expect(authFirst.queryHistory.map((q) => q.datasetId)).toEqual(["auth", "devices"]);
    expect(deviceFirst.queryHistory.map((q) => q.datasetId)).toEqual(["devices", "auth"]);
  });

  it("query result alone does not equal observation and zero results are legitimate", () => {
    const initial = world();
    const before = [...initial.observedArtifactIds];
    const queried = applyAction(initial, {
      id: "query_records",
      eventId: "suspicious-login-1",
      actorId: "user",
      queryPayload: { datasetId: "devices", filters: { deviceLabel: "unknown-laptop-17" } },
    }).state;
    expect(queried.queryHistory.at(-1)?.resultIds).toEqual(["unknown-laptop-17"]);
    expect(queried.observedArtifactIds).toEqual(before);
    const zero = applyAction(queried, {
      id: "query_records",
      eventId: "suspicious-login-1",
      actorId: "user",
      queryPayload: {
        datasetId: "vpn",
        filters: {
          user: "j.patel@example.com",
          sourceIp: "203.0.113.44",
          windowStartSimMinutes: 440,
          windowEndSimMinutes: 460,
        },
      },
    }).state;
    expect(zero.queryHistory.at(-1)?.resultIds).toEqual([]);
    expect(zero.queryHistory.at(-1)?.totalCount).toBe(0);
    expect(zero.queryHistory.at(-1)?.truncated).toBe(false);
    expect(zero.observedArtifactIds).toEqual(before);
  });

  it("does not leak hidden authoring fields and introduces no grading UI", () => {
    let state = world();
    state = applyAction(state, { id: "read_handoff", eventId: "handoff-1", actorId: "user" }).state;
    state = applyAction(state, { id: "review_alert", eventId: "suspicious-login-1", actorId: "user" }).state;
    state = applyAction(state, { id: "inspect_login_context", eventId: "suspicious-login-1", actorId: "user" }).state;
    state = applyAction(state, { id: "query_records", eventId: "suspicious-login-1", actorId: "user", queryPayload: { datasetId: "auth", filters: {} } }).state;
    const view = toClientView(state);
    const serialized = JSON.stringify(view);
    expect(serialized).not.toMatch(/requiredOptionIds|coachOnFailure|successText|templateId/);
    expect(view.artifacts.every((a) => !("relatedArtifactIds" in a))).toBe(true);
    expect(view.operationalMessages.join(" ")).not.toMatch(/\b(correct|incorrect|right answer|wrong answer|clue found|Good job|Try again)\b/i);
    // No task for the released handoff/alert gates should be present.
    expect(view.tasks.find((t) => t.id === "handoff-open-items")).toBeUndefined();
    expect(view.tasks.find((t) => t.id === "login-alert-compare")).toBeUndefined();
  });

  it("replays the same investigation history deterministically", () => {
    const actions = [
      { id: "read_handoff" as const, eventId: "handoff-1", actorId: "user" as const },
      { id: "review_alert" as const, eventId: "suspicious-login-1", actorId: "user" as const },
      { id: "inspect_login_context" as const, eventId: "suspicious-login-1", actorId: "user" as const },
      { id: "query_records" as const, eventId: "suspicious-login-1", actorId: "user" as const, queryPayload: { datasetId: "auth" as const, filters: { sessionId: "S-0741" } } },
      { id: "inspect_account_history" as const, eventId: "suspicious-login-1", actorId: "user" as const },
      { id: "check_device_inventory" as const, eventId: "suspicious-login-1", actorId: "user" as const },
    ];
    const first = actions.reduce((s, a) => applyAction(s, a).state, world("p3-replay-a"));
    const second = actions.reduce((s, a) => applyAction(s, a).state, world("p3-replay-a"));
    expect(first).toEqual(second);
    expect(toClientView(first)).toEqual(toClientView(second));
    const entries = actions.map((action, i) => ({ sequence: i + 1, interaction: { type: "action" as const, action } }));
    expect(foldActionLog(world("p3-replay-a"), entries)).toEqual(first);
  });
});
