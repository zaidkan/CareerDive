import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import {
  ActionUnavailableError,
  applyAction,
  applyTaskAttempt,
  createInitialWorldState,
  foldActionLog,
  toClientView,
} from "../src/index.js";

/**
 * V2 benign routine triage slice — the A-1159 blocked password-spray item.
 *
 * Product goal (SOC structured content pack AL-6 + task brief): the player
 * meets a routine-looking care item, performs real checks, reaches a benign /
 * non-urgent explanation from records and a control reference, documents it
 * with existing notes mechanics, and returns to the main queue. There is
 * deliberately NO quiz gate and NO "this is a false positive" statement.
 *
 * Canonical record A-1159 already exists in the pack with no completed
 * sign-ins and a blocklisted source; this suite asserts only deterministic
 * runtime behavior over real records and canonical actions.
 */

const sprayId = "blocked-spray-1";
const routineId = "routine-alert-1";
const loginId = "suspicious-login-1";

const BLOCKED_SOURCE = "192.0.2.71";

function world(sessionId = "v2-benign") {
  return createInitialWorldState(sessionId, 7, {}, loadDefaultCybersecurityPack());
}

function step(
  state: ReturnType<typeof world>,
  id: string,
  eventId: string,
  extra?: Record<string, unknown>,
): ReturnType<typeof world> {
  return applyAction(state, { id: id as never, eventId, actorId: "user", ...extra } as never)
    .state;
}

function sprayEvent(state: ReturnType<typeof world>) {
  const found = state.events.find((e) => e.id === sprayId);
  if (!found) throw new Error(`event ${sprayId} missing`);
  return found;
}

/**
 * Head of shift + login investigation (55 simulated minutes), then the routine
 * scanner item is documented (5+10+10+20 → 95). Advancing past 90 via the
 * non-query routine steps activates blocked-spray-1 through the ordinary
 * scheduler, which is exactly the pacing slot the pack authors chose.
 */
function pastSprayActivation(state: ReturnType<typeof world>): ReturnType<typeof world> {
  state = step(state, "read_handoff", "handoff-1");
  state = step(state, "acknowledge_handoff", "handoff-1");
  state = step(state, "review_alert", loginId);
  state = step(state, "inspect_login_context", loginId);
  state = step(state, "inspect_account_history", loginId);
  state = step(state, "check_device_inventory", loginId);
  state = step(state, "review_alert", routineId);
  state = step(state, "search_knowledge_base", routineId, { freeText: "scanner" });
  state = step(state, "document_ticket", routineId, { freeText: "Routine documented" });
  return state;
}

describe("V2 benign routine triage slice (blocked password spray)", () => {
  it("item exists as pending, stays hidden, then activates via existing sequencing", () => {
    const initial = world();
    const pending = initial.events.find((e) => e.id === sprayId);
    expect(pending).toBeDefined();
    expect(pending?.status).toBe("pending");
    expect(pending?.priority).toBe("normal");
    // Pending items are not surfaced until they arrive.
    const beforeView = toClientView(initial);
    expect(beforeView.events.some((e) => e.id === sprayId)).toBe(false);
    expect(
      toClientView(initial).availableActions.some((a) => a.eventId === sprayId),
    ).toBe(false);

    // Early-shift work (simClock 35) is still before the slot; not active yet.
    let state = world();
    state = step(state, "read_handoff", "handoff-1");
    state = step(state, "acknowledge_handoff", "handoff-1");
    state = step(state, "review_alert", loginId);
    state = step(state, "inspect_login_context", loginId);
    expect(sprayEvent(state).status).toBe("pending");

    state = pastSprayActivation(world());
    expect(sprayEvent(state).status).toBe("active");
    const view = toClientView(state);
    expect(view.events.some((e) => e.id === sprayId && e.status === "active")).toBe(true);
    expect(view.notifications.some((n) => n.eventId === sprayId)).toBe(true);
  });

  it("uses real canonical records and tools, never quiz selection", () => {
    let state = pastSprayActivation(world());
    // No quiz task exists for this template by construction.
    expect(
      Object.values(state.rules.tasks).some(
        (t) => t.eventTemplateId === "blocked_spray_review",
      ),
    ).toBe(false);
    const action = toClientView(state).availableActions.find(
      (a) => a.id === "review_alert" && a.eventId === sprayId,
    );
    expect(action).toBeDefined();
    expect(action?.taskId).toBeUndefined();

    state = step(state, "review_alert", sprayId);
    expect(state.observedArtifactIds).toContain("spray-alert");
    expect(state.artifacts["spray-alert"]?.body).toContain("192.0.2.71");
    expect(state.artifacts["spray-alert"]?.body).toContain("A-1159");

    // Real check: explicit auth export search for the blocklisted source is a
    // legitimate negative/zero-result result.
    const queried = applyAction(state, {
      id: "query_records",
      eventId: sprayId,
      actorId: "user",
      queryPayload: {
        datasetId: "auth",
        filters: { sourceIp: BLOCKED_SOURCE },
      },
    } as never).state;
    const entry = queried.queryHistory.at(-1);
    expect(entry?.totalCount).toBe(0);
    expect(entry?.resultIds).toEqual([]);
    // Querying never marks records observed.
    expect(queried.observedArtifactIds).toEqual(state.observedArtifactIds);

    // Real check: control reference through the knowledge base.
    state = step(queried, "search_knowledge_base", sprayId, { freeText: "blocklist" });
    expect(state.observedArtifactIds).toContain("spray-blocklist-reference");
    expect(state.kbQuery).toContain("blocklist");
    const refBody = state.artifacts["spray-blocklist-reference"]?.body ?? "";
    expect(refBody).toContain("192.0.2.71");
    expect(refBody).toContain("zero-row");

    // Canonical alert is linked to this work item, same pattern as A-1042.
    const alert = state.rules.datasets.alerts.records.find((r) => r.id === "A-1159");
    expect(alert?.linkedWorkItemId).toBe("blocked-spray-1");
  });

  it("resolves via plain actions without revealing the verdict before investigation", () => {
    let state = pastSprayActivation(world());
    const preView = toClientView(state);
    const preSerialized = JSON.stringify(preView);
    // The closure reasoning is not exposed before the investigation runs.
    expect(preSerialized).not.toMatch(/held control|zero completed sign-ins|this burst only|expected negative/);
    const note = preView.notifications.find((n) => n.eventId === sprayId);
    expect(note?.body).toMatch(/confirm what the controls show|review the burst/i);
    expect(note?.body).not.toMatch(/false positive|not an incident/i);

    // A quiz attempt on this item is illegal — nothing to bind to.
    expect(() =>
      applyTaskAttempt(state, {
        eventId: sprayId,
        taskId: "blocked-spray-quiz",
        selectedOptionIds: [],
      }),
    ).toThrow(ActionUnavailableError);

    state = step(state, "review_alert", sprayId);
    state = step(state, "search_knowledge_base", sprayId, { freeText: "blocklist" });
    state = step(state, "update_ticket_notes", sprayId, {
      freeText: `Confirmed ${BLOCKED_SOURCE}; no completed sign-in; blocklist entry active.`,
    });
    expect(state.ticketNotes[sprayId]).toContain(BLOCKED_SOURCE);
    state = step(state, "dismiss_alert", sprayId);

    expect(sprayEvent(state).status).toBe("resolved");
    expect(sprayEvent(state).resolution).toContain(BLOCKED_SOURCE);
    expect(sprayEvent(state).resolution).not.toMatch(/false positive|not an incident/i);

    // No task progress was ever created; return to the queue keeps login open.
    expect(state.taskProgress[`${sprayId}:blocked-spray-quiz`]).toBeUndefined();
    expect(state.events.find((e) => e.id === loginId)?.status).toBe("active");
    expect(toClientView(state).availableActions.some((a) => a.eventId === loginId)).toBe(true);
  });

  it("does not mutate Evidence Facts from free text and keeps hidden metadata private", () => {
    let state = pastSprayActivation(world());
    state = step(state, "review_alert", sprayId);
    state = step(state, "search_knowledge_base", sprayId, { freeText: "blocklist" });
    state = step(
      state,
      "update_ticket_notes",
      sprayId,
      "free text that looks like an Evidence Fact: clue found",
    );
    state = step(state, "update_notebook", sprayId, "source is blocked, proof in records");
    // Free text never manufactures world truth.
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
      { id: "review_alert" as const, eventId: sprayId, actorId: "user" as const },
      { id: "search_knowledge_base" as const, eventId: sprayId, actorId: "user" as const, freeText: "blocklist" },
      {
        id: "query_records" as const,
        eventId: sprayId,
        actorId: "user" as const,
        queryPayload: { datasetId: "auth", filters: { sourceIp: BLOCKED_SOURCE } },
      },
      { id: "dismiss_alert" as const, eventId: sprayId, actorId: "user" as const },
    ];
    const first = actions.reduce((s, a) => applyAction(s, a as never).state, world("v2-benign-replay"));
    const second = actions.reduce((s, a) => applyAction(s, a as never).state, world("v2-benign-replay"));
    expect(first).toEqual(second);

    const entries = actions.map((action, i) => ({
      sequence: i + 1,
      interaction: { type: "action" as const, action: action as never },
    }));
    expect(foldActionLog(world("v2-benign-replay"), entries as never)).toEqual(first);

    // After the spray item resolves, the queue still shows the login case.
    expect(first.events.find((e) => e.id === sprayId)?.status).toBe("resolved");
    expect(first.events.find((e) => e.id === loginId)?.status).toBe("active");
    expect(toClientView(first).events.find((e) => e.id === sprayId)?.category).toBe("routine");

    // No hidden answer metadata reaches the client.
    const serialized = JSON.stringify(toClientView(first));
    expect(serialized).not.toMatch(
      /"templateId"|"requiredOptionIds"|"correctOptionIds"|"expectedAnswer"|"relevance"|"idealDisposition"|"hiddenAnswer"|"triggeredAt"|"progression"|"queryHistory"/,
    );
  });
});