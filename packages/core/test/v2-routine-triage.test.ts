import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import {
  applyAction,
  applyWorkplaceInteraction,
  createInitialWorldState,
  foldActionLog,
  toClientView,
} from "../src/index.js";

const routineId = "routine-alert-1";
const loginId = "suspicious-login-1";

function world(sessionId = "v2-routine") {
  return createInitialWorldState(sessionId, 7, {}, loadDefaultCybersecurityPack());
}

describe("V2 routine benign triage slice", () => {
  it("routine item exists as pending then active via existing sequencing", () => {
    const initial = world();
    const pending = initial.events.find((e) => e.id === routineId);
    expect(pending).toBeDefined();
    expect(pending?.status).toBe("pending");
    expect(pending?.priority).toBe("low");
    // Advance past triggerAt 25 via a few plain actions
    let state = applyAction(initial, { id: "read_handoff", eventId: "handoff-1", actorId: "user" }).state;
    state = applyAction(state, { id: "acknowledge_handoff", eventId: "handoff-1", actorId: "user" }).state;
    state = applyAction(state, { id: "review_alert", eventId: loginId, actorId: "user" }).state;
    // simClock should be 5+5+10=20, still pending
    expect(state.events.find((e) => e.id === routineId)?.status).toBe("pending");
    state = applyAction(state, { id: "inspect_login_context", eventId: loginId, actorId: "user" }).state;
    // 20+15=35, now routine should be active
    const routine = state.events.find((e) => e.id === routineId);
    expect(routine?.status).toBe("active");
    const view = toClientView(state);
    expect(view.events.some((e) => e.id === routineId && e.status === "active")).toBe(true);
    expect(view.notifications.some((n) => n.eventId === routineId)).toBe(true);
  });

  it("uses actual canonical records and real tools, not quiz selection", () => {
    let state = world();
    state = applyAction(state, { id: "read_handoff", eventId: "handoff-1", actorId: "user" }).state;
    state = applyAction(state, { id: "acknowledge_handoff", eventId: "handoff-1", actorId: "user" }).state;
    state = applyAction(state, { id: "review_alert", eventId: loginId, actorId: "user" }).state;
    state = applyAction(state, { id: "inspect_login_context", eventId: loginId, actorId: "user" }).state;
    // Routine now active; inspect its summary via artifact observation
    const routineView = toClientView(state);
    const routineAction = routineView.availableActions.find((a) => a.id === "review_alert" && a.eventId === routineId);
    expect(routineAction).toBeDefined();
    expect(routineAction?.taskId).toBeUndefined();
    state = applyAction(state, { id: "review_alert", eventId: routineId, actorId: "user" }).state;
    expect(state.observedArtifactIds).toContain("scanner-alert");
    const body = state.artifacts["scanner-alert"]?.body ?? "";
    expect(body).toContain("vuln-scan-03");
    // Real check via KB document
    state = applyWorkplaceInteraction(state, { type: "open_artifact", artifactId: "scanner-window" }).state;
    expect(state.observedArtifactIds).toContain("scanner-window");
    const kbBody = state.artifacts["scanner-window"]?.body ?? "";
    expect(kbBody).toContain("SCAN-FIN-MON");
    // Real check via structured query (scanner dataset) — 1-2 meaningful checks
    state = applyAction(state, {
      id: "query_records",
      eventId: routineId,
      actorId: "user",
      queryPayload: { datasetId: "scanner", filters: { scannerId: "vuln-scan-03" } },
    }).state;
    expect(state.queryHistory.at(-1)?.resultIds.length).toBeGreaterThan(0);
    // Zero-result is legitimate
    const zero = applyAction(state, {
      id: "query_records",
      eventId: routineId,
      actorId: "user",
      queryPayload: { datasetId: "scanner", filters: { scannerId: "no-such-scanner" } },
    }).state;
    expect(zero.queryHistory.at(-1)?.totalCount).toBe(0);
    expect(zero.observedArtifactIds).toEqual(state.observedArtifactIds);
  });

  it("does not reveal benign verdict before investigation and can be resolved via plain actions", () => {
    let state = world();
    state = applyAction(state, { id: "read_handoff", eventId: "handoff-1", actorId: "user" }).state;
    state = applyAction(state, { id: "acknowledge_handoff", eventId: "handoff-1", actorId: "user" }).state;
    state = applyAction(state, { id: "review_alert", eventId: loginId, actorId: "user" }).state;
    state = applyAction(state, { id: "inspect_login_context", eventId: loginId, actorId: "user" }).state;
    const beforeRoutine = toClientView(state);
    // No routine resolution yet
    expect(JSON.stringify(beforeRoutine)).not.toMatch(/expected discovery connections|every system is secure/);
    // Drive routine to active
    state = applyAction(state, { id: "inspect_account_history", eventId: loginId, actorId: "user" }).state;
    state = applyAction(state, { id: "check_device_inventory", eventId: loginId, actorId: "user" }).state;
    // Routine should be active now; resolve via plain investigation steps
    state = applyAction(state, { id: "review_alert", eventId: routineId, actorId: "user" }).state;
    state = applyAction(state, { id: "search_knowledge_base", eventId: routineId, actorId: "user", freeText: "scanner window" }).state;
    state = applyAction(state, { id: "document_ticket", eventId: routineId, actorId: "user", freeText: "Checked SCAN-FIN-MON window and RUN-FIN-031 run; event time 10:18 within approved window." }).state;
    expect(state.ticketNotes[routineId]).toContain("SCAN-FIN-MON");
    state = applyAction(state, { id: "dismiss_alert", eventId: routineId, actorId: "user" }).state;
    expect(state.events.find((e) => e.id === routineId)?.status).toBe("resolved");
    expect(state.events.find((e) => e.id === routineId)?.resolution).toContain("RUN-FIN-031");
    // No quiz task should have been required
    expect(state.taskProgress["routine-alert-1:scanner-alert-compare"]).toBeUndefined();
    expect(state.taskProgress["routine-alert-1:scanner-window-match"]).toBeUndefined();
    // Return to normal queue: login case still active
    expect(state.events.find((e) => e.id === loginId)?.status).toBe("active");
  });

  it("does not mutate Evidence Facts from free text and keeps hidden metadata private", () => {
    let state = world();
    state = applyAction(state, { id: "read_handoff", eventId: "handoff-1", actorId: "user" }).state;
    state = applyAction(state, { id: "review_alert", eventId: loginId, actorId: "user" }).state;
    state = applyAction(state, { id: "inspect_login_context", eventId: loginId, actorId: "user" }).state;
    state = applyAction(state, { id: "inspect_account_history", eventId: loginId, actorId: "user" }).state;
    state = applyAction(state, { id: "check_device_inventory", eventId: loginId, actorId: "user" }).state;
    state = applyAction(state, { id: "review_alert", eventId: routineId, actorId: "user" }).state;
    state = applyAction(state, { id: "search_knowledge_base", eventId: routineId, actorId: "user", freeText: "scanner" }).state;
    state = applyAction(state, {
      id: "document_ticket",
      eventId: routineId,
      actorId: "user",
      freeText: "free text that looks like an Evidence Fact: clue found",
    }).state;
    // Evidence Facts are separate; free text does not create them
    expect(Object.keys(state.rules.evidenceFacts ?? {}).length).toBe(0);
    const view = toClientView(state);
    expect(JSON.stringify(view)).not.toMatch(/requiredOptionIds|coachOnFailure|successText|templateId/);
    expect(view.artifacts.every((a) => !("relatedArtifactIds" in a))).toBe(true);
    expect(view.operationalMessages.join(" ")).not.toMatch(/\b(correct|incorrect|clue found)\b/i);
  });

  it("completion is deterministic under replay and supports returning to queue", () => {
    const actions = [
      { id: "read_handoff" as const, eventId: "handoff-1", actorId: "user" as const },
      { id: "acknowledge_handoff" as const, eventId: "handoff-1", actorId: "user" as const },
      { id: "review_alert" as const, eventId: loginId, actorId: "user" as const },
      { id: "inspect_login_context" as const, eventId: loginId, actorId: "user" as const },
      { id: "inspect_account_history" as const, eventId: loginId, actorId: "user" as const },
      { id: "check_device_inventory" as const, eventId: loginId, actorId: "user" as const },
      { id: "review_alert" as const, eventId: routineId, actorId: "user" as const },
      { id: "search_knowledge_base" as const, eventId: routineId, actorId: "user" as const, freeText: "scanner" },
      { id: "document_ticket" as const, eventId: routineId, actorId: "user" as const, freeText: "Routine checked" },
      { id: "dismiss_alert" as const, eventId: routineId, actorId: "user" as const },
    ];
    const first = actions.reduce((s, a) => applyAction(s, a).state, world("v2-replay"));
    const second = actions.reduce((s, a) => applyAction(s, a).state, world("v2-replay"));
    expect(first).toEqual(second);
    const entries = actions.map((action, i) => ({ sequence: i + 1, interaction: { type: "action" as const, action } }));
    expect(foldActionLog(world("v2-replay"), entries)).toEqual(first);
    // After routine resolved, queue still shows login case active
    expect(first.events.find((e) => e.id === routineId)?.status).toBe("resolved");
    expect(first.events.find((e) => e.id === loginId)?.status).toBe("active");
    expect(toClientView(first).availableActions.some((a) => a.eventId === loginId)).toBe(true);
  });
});
