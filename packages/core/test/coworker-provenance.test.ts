import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import {
  applyAction,
  applyWorkplaceInteraction,
  createInitialWorldState,
  toClientView,
} from "../src/index.js";
const pack = loadDefaultCybersecurityPack();
const initial = () =>
  createInitialWorldState("coworker-provenance", 7, {}, pack);
const ask = (
  state: ReturnType<typeof initial>,
  text = "What remains uncertain?",
) =>
  applyAction(state, {
    id: "ask_manager",
    actorId: "player",
    eventId: "suspicious-login-1",
    freeText: text,
  }).state;
describe("coworker provenance", () => {
  it("keeps consultation available and acknowledges a manually inspected device source", () => {
    let state = ask(initial(), "What case context do we have?");
    expect(
      toClientView(state).availableActions.some(
        (a) => a.id === "ask_manager" && a.eventId === "suspicious-login-1",
      ),
    ).toBe(true);
    state = applyAction(state, {
      id: "review_alert",
      actorId: "player",
      eventId: "suspicious-login-1",
    }).state;
    state = applyAction(state, {
      id: "inspect_login_context",
      actorId: "player",
      eventId: "suspicious-login-1",
    }).state;
    state = applyWorkplaceInteraction(state, {
      type: "open_artifact",
      artifactId: "device-inventory-1",
    }).state;
    const reply =
      ask(state, "What case context do we have?").teamMessages?.at(-1)?.body ??
      "";
    expect(reply).not.toMatch(/device record has not been checked/);
    expect(reply).toMatch(/device.*(opened|checked|recorded)/i);
  });
  it("does not answer a scanner question as if it concerned Patel", () => {
    const reply =
      ask(initial(), "What about scanner A-1180?").teamMessages?.at(-1)?.body ??
      "";
    expect(reply).toMatch(/selected case|selected work|A-1042/i);
    expect(reply).not.toMatch(/not looked into this login yet/i);
  });
  it("bounded questions produce different context without creating evidence", () => {
    const state = initial();
    const context = ask(state, "What case context do we have?");
    const uncertainty = ask(state, "What remains uncertain?");
    const handoff = ask(state, "What should the next analyst know?");
    expect(
      new Set(
        [context, uncertainty, handoff].map(
          (s) => s.teamMessages?.at(-1)?.body,
        ),
      ).size,
    ).toBe(3);
    expect(handoff.facts).toEqual(state.facts);
    expect(handoff.workplace.inspectedArtifactIds).toEqual(
      state.workplace.inspectedArtifactIds,
    );
  });
});

import { applyDueCallbacks } from "../src/scheduler.js";
import { julesDialogueFromClientView } from "../src/index.js";
describe("work remembered without invented completion", () => {
  it("a query with no inspected result does not become checked evidence", () => {
    let state = applyAction(initial(), {
      id: "review_alert",
      actorId: "player",
      eventId: "suspicious-login-1",
    }).state;
    state = applyAction(state, {
      id: "query_records",
      actorId: "player",
      eventId: "suspicious-login-1",
      queryPayload: {
        datasetId: "auth",
        filters: { user: "j.patel@example.com" },
      },
    }).state;
    expect(
      ask(state, "What case context do we have?").teamMessages?.at(-1)?.body,
    ).toMatch(/not enough context/);
  });
  it.each([false, true])(
    "handoff receipt names omitted sources, opened=%s",
    (opened) => {
      const state = initial();
      const event = state.events.find((e) => e.id === "shift-handoff-1");
      if (!event) throw new Error("Missing handoff fixture");
      event.status = "active";
      state.workplace.handoffSourceArtifactIds = ["device-inventory-1"];
      state.workplace.inspectedArtifactIds = opened
        ? ["device-inventory-1", "login-session-timeline", "vpn-context-1"]
        : ["device-inventory-1"];
      state.pendingCallbacks.push({
        id: "b3-complete-receipt",
        eventId: event.id,
        author: "reviewer",
        body: "Everything was checked.",
        actionId: "submit_shift_handoff",
        delayMinutes: 10,
        dueAt: 10,
        applied: false,
        when: [],
        activationMessages: [],
        requiredAtCompletion: true,
      });
      applyDueCallbacks(state, [], true);
      const body = state.teamMessages?.at(-1)?.body ?? "";
      expect(body).toContain("1 selected source reference");
      expect(body).toContain(
        opened ? "opened but not attached" : "not opened during this shift",
      );
      expect(body).not.toMatch(/Everything was checked/);
      expect(state.pendingCallbacks.at(-1)?.body).toBe(body);
    },
  );
  it("Jules carries the saved question after an earlier case consultation", () => {
    let state = applyWorkplaceInteraction(initial(), {
      type: "talk_to_jules",
      topic: "current_work",
      eventId: "suspicious-login-1",
    }).state;
    state = applyAction(state, {
      id: "review_alert",
      actorId: "player",
      eventId: "suspicious-login-1",
    }).state;
    const view = toClientView(state);
    view.structuredTickets = {
      "ticket-suspicious-login-1": {
        ticketId: "ticket-suspicious-login-1",
        linkedWorkItemIds: ["suspicious-login-1"],
        entityRefs: [],
        evidenceFactIds: [],
        status: "open",
        noteText: "",
        sourceArtifactIds: ["suspicious-login-alert"],
        uncertainty: "Session ownership is unresolved.",
      },
    };
    expect(julesDialogueFromClientView(view, "team_context").text).toContain(
      "Session ownership is unresolved.",
    );
  });
});

it("Jules follows remaining active work without claiming an unrelated source was checked", () => {
  const state = initial();
  state.events = state.events.map((e) => ({
    ...e,
    status:
      e.id === "access-request-1" ? ("active" as const) : ("resolved" as const),
  }));
  const view = toClientView(state);
  view.workplace.lastInspectedArtifactId = "device-inventory-1";
  const reply = julesDialogueFromClientView(view, "current_work").text;
  expect(reply).toContain("Urgent finance access request");
  expect(reply).not.toContain("You opened Device inventory");
});
