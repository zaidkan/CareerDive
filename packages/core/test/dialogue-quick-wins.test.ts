import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type { WorldState } from "@sim/schemas";
import {
  applyAction,
  applyWorkplaceInteraction,
  createInitialWorldState,
  foldActionLog,
  julesDialogueFromClientView,
  managerConsultationKey,
  managerRecap,
  ticketSourceAcknowledgement,
  toClientView,
} from "../src/index.js";
function must<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing test fixture");
  return value;
}
const pack = loadDefaultCybersecurityPack();
const initial = () =>
  createInitialWorldState("dialogue-quick-wins", 7, {}, pack);
const login = "suspicious-login-1";
const askAction = (freeText: string, eventId = login) => ({
  id: "ask_manager" as const,
  actorId: "player",
  eventId,
  freeText,
});
const ask = (state: WorldState, text: string, eventId = login) =>
  applyAction(state, askAction(text, eventId));
const body = (state: WorldState) => state.teamMessages?.at(-1)?.body ?? "";
function activate(state: WorldState, eventId: string) {
  const event = must(state.events.find((e) => e.id === eventId));
  event.status = "active";
  return state;
}

describe("authored Morgan question intents", () => {
  it.each([
    [login, "How do I look up this laptop?", /exact laptop label.*Inventory/],
    [login, "How should I compare the VPN route?", /timeline and VPN record/],
    [
      "access-request-1",
      "Who is the approval owner?",
      /deadline.*access approval.*authorize/,
    ],
    [
      "routine-alert-1",
      "How do I match the scanner?",
      /scanner, target network, and event time/,
    ],
    [
      "login-help-1",
      "What next for Rivera's device help request?",
      /device-specific results.*troubleshooting/,
    ],
  ])("answers %s: %s", (eventId, question, expected) => {
    const before = activate(initial(), eventId);
    const after = ask(before, question, eventId).state;
    expect(body(after)).toMatch(expected);
    expect(after.facts).toEqual(before.facts);
    expect(after.events.find((e) => e.id === eventId)?.managerConsulted).toBe(
      true,
    );
    expect(after.workplace.inspectedArtifactIds).toEqual(
      before.workplace.inspectedArtifactIds,
    );
    expect(
      after.events.find((e) => e.id === eventId)?.resolution,
    ).toBeUndefined();
    expect(body(after)).not.toMatch(/malicious|benign|correct answer|score/i);
  });
  it("device and route questions receive distinct, relevant answers", () => {
    expect(
      body(ask(initial(), "Which device do I look up?").state),
    ).not.toEqual(body(ask(initial(), "How do I compare the route?").state));
  });
  it("acknowledges inspected route sources without inventing their conclusion", () => {
    const state = initial();
    state.workplace.inspectedArtifactIds = [
      "login-session-timeline",
      "vpn-context-1",
    ];
    expect(body(ask(state, "How do I compare the VPN route?").state)).toMatch(
      /You opened.*connection IDs/,
    );
    expect(
      body(ask(initial(), "How do I compare the VPN route?").state),
    ).not.toContain("You opened");
  });
  it("acknowledges a recorded comparison rather than repeating the initial check", () => {
    const state = initial();
    state.workplace.comparisons = [
      {
        eventId: login,
        artifactIds: ["login-session-timeline", "vpn-context-1"],
      },
    ];
    expect(body(ask(state, "How do I compare the VPN route?").state)).toMatch(
      /You recorded.*connection IDs/,
    );
    expect(
      body(ask(state, "How do I compare the VPN route?").state),
    ).not.toContain("Open this case's");
  });
  it("unknown or unsupported questions offer bounded topics for the selected case", () => {
    expect(
      body(ask(initial(), "Can you make the decision for me?").state),
    ).toContain(
      "device lookup, route/VPN comparison, or what remains uncertain",
    );
    const finance = activate(initial(), "access-request-1");
    expect(
      body(ask(finance, "Which laptop?", "access-request-1").state),
    ).toContain("approval owner");
    expect(body(ask(initial(), "What about scanner A-1180?").state)).toContain(
      "selected case",
    );
  });
  it("handoff questions offer handoff topics rather than unrelated login checks", () => {
    const reply = body(
      ask(initial(), "What can you help with?", "handoff-1").state,
    );
    expect(reply).toContain(
      "case context, remaining uncertainty, or what the next analyst needs",
    );
    expect(reply).not.toMatch(/device lookup|VPN comparison/);
  });
  it("acknowledges records inspected before the alert was reviewed", () => {
    let state = applyAction(initial(), {
      id: "query_records",
      actorId: "player",
      eventId: login,
      queryPayload: {
        datasetId: "auth",
        filters: { user: "j.patel@example.com" },
      },
    }).state;
    const query = must(state.queryHistory.at(-1));
    state = applyWorkplaceInteraction(state, {
      type: "inspect_query_record",
      queryId: query.queryId,
      recordId: must(query.resultIds[0]),
    }).state;
    expect(body(ask(state, "What case context do we have?").state)).toMatch(
      /records give us context/,
    );
    expect(body(ask(state, "What case context do we have?").state)).not.toMatch(
      /not looked into/,
    );
  });
});

describe("Morgan recap revisions", () => {
  it("unchanged intent reuses guidance with no action, cost, ledger or chat turn", () => {
    const first = ask(initial(), "Which device should I look up?").state;
    const repeat = ask(first, "How do I check this laptop?");
    expect(repeat.state).toEqual(first);
    expect(repeat.effects).toEqual([]);
    expect(managerRecap(toClientView(first), login, "Check the device?")).toBe(
      body(first),
    );
  });
  it.each(["source", "record", "comparison", "ticket", "decision", "callback"])(
    "%s revision permits a fresh turn",
    (revision) => {
      const state = ask(initial(), "How do I compare the route?").state;
      const changed = structuredClone(state);
      if (revision === "callback")
        changed.teamMessages?.push({
          id: "employee-update",
          eventId: login,
          author: "employee",
          actionId: "dismiss_alert",
          body: "It is my account, but I don’t recognize the laptop.",
          simMinutes: changed.simClock,
        });
      if (revision === "source")
        changed.workplace.inspectedArtifactIds = ["login-session-timeline"];
      if (revision === "record")
        changed.workplace.inspectedRecordIdsByEvent = {
          [login]: ["AUTH-0750-PATEL"],
        };
      if (revision === "comparison")
        changed.workplace.comparisons = [
          {
            eventId: login,
            artifactIds: ["login-session-timeline", "vpn-context-1"],
          },
        ];
      if (revision === "ticket")
        changed.structuredTickets[`ticket-${login}`] = {
          ticketId: `ticket-${login}`,
          linkedWorkItemIds: [login],
          status: "open",
          entityRefs: [],
          evidenceFactIds: [],
          uncertainty: "Who used this session?",
        };
      if (revision === "decision")
        must(changed.events.find((e) => e.id === login)).resolution =
          "Recorded for review";
      expect(
        managerRecap(
          toClientView(changed),
          login,
          "How do I compare the route?",
        ),
      ).toBeUndefined();
      const next = ask(changed, "How do I compare the route?");
      expect(next.state.simClock).toBe(changed.simClock + 5);
      expect(next.state.workplace.energy.current).toBe(
        changed.workplace.energy.current - 1,
      );
      expect(next.state.teamMessages).toHaveLength(
        must(changed.teamMessages).length + 2,
      );
    },
  );
  it("an unrelated-question recap cannot suppress a later procedural consultation", () => {
    const state = ask(
      initial(),
      "Purple banana spaceship, where is lunch?",
    ).state;
    expect(state.events.find((e) => e.id === login)?.managerConsulted).toBe(
      false,
    );
    const next = ask(state, "What login evidence should I check?").state;
    expect(next.events.find((e) => e.id === login)?.managerConsulted).toBe(
      true,
    );
    expect(next.simClock).toBe(state.simClock + 5);
  });
  it("unrelated work and clock do not invalidate a recap", () => {
    const state = ask(initial(), "Which device?").state;
    const changed = structuredClone(state);
    changed.simClock += 1;
    changed.workplace.inspectedRecordIdsByEvent = {
      "login-help-1": ["AUTH-RIVERA"],
    };
    changed.workplace.inspectedArtifactIds = ["rivera-auth-summary"];
    expect(
      managerConsultationKey(toClientView(changed), login, "Which laptop?"),
    ).toBe(managerConsultationKey(toClientView(state), login, "Which device?"));
  });
  it("repeated requests replay deterministically and still honor availability", () => {
    const action = askAction("Which device?");
    const actions = [action, action];
    const direct = actions.reduce((s, a) => applyAction(s, a).state, initial());
    expect(
      foldActionLog(
        initial(),
        actions.map((a, i) => ({
          sequence: i + 1,
          interaction: { type: "action", action: a },
        })),
      ),
    ).toEqual(direct);
    must(direct.events.find((e) => e.id === login)).status = "pending";
    expect(() => ask(direct, "Which device?")).toThrow(/not available/);
  });
});

describe("Jules per-case help and continuity", () => {
  it.each([
    [
      "routine-alert-1",
      /scanner, target network, and event time.*queue isn't the event time/,
    ],
    ["access-request-1", /deadline.*access approval.*authorize the role/],
    ["login-help-1", /Open Rivera's device-specific login results first/],
  ])("reaches %s help ahead of the generic fallback", (eventId, expected) => {
    const view = toClientView(activate(initial(), eventId));
    view.events = view.events.filter((e) => e.id === eventId);
    expect(julesDialogueFromClientView(view, "current_work").text).toMatch(
      expected,
    );
  });
  it("mentions Rivera's observed device outcomes only after inspection", () => {
    const view = toClientView(activate(initial(), "login-help-1"));
    view.events = view.events.filter((e) => e.id === "login-help-1");
    expect(
      julesDialogueFromClientView(view, "current_work").text,
    ).not.toContain("laptop works");
    view.workplace.inspectedArtifactIds = ["rivera-auth-summary"];
    expect(julesDialogueFromClientView(view, "current_work").text).toContain(
      "The laptop works while the phone retries",
    );
  });
  it("revisiting a case moves its consultation to most recent without duplicates", () => {
    let state = activate(initial(), "access-request-1");
    for (const eventId of [login, "access-request-1", login])
      state = applyWorkplaceInteraction(state, {
        type: "talk_to_jules",
        topic: "current_work",
        eventId,
      }).state;
    expect(state.workplace.julesConsultations).toEqual([
      { eventId: "access-request-1", topic: "current_work" },
      { eventId: login, topic: "current_work" },
    ]);
  });
  it("ticket acknowledgement names the missing reference or recorded comparison, never grades free text", () => {
    const view = toClientView(initial());
    view.structuredTickets = {
      [`ticket-${login}`]: {
        ticketId: `ticket-${login}`,
        linkedWorkItemIds: [login],
        status: "open",
        entityRefs: [],
        evidenceFactIds: [],
        sourceArtifactIds: ["device-inventory-1"],
        verifiedEvidence: "bad note",
      },
    };
    expect(ticketSourceAcknowledgement(view, login)).toMatch(
      /needs a reference to.*timeline/i,
    );
    must(view.structuredTickets[`ticket-${login}`]).sourceArtifactIds = [
      "login-session-timeline",
      "vpn-context-1",
    ];
    expect(ticketSourceAcknowledgement(view, login)).toContain("no comparison");
    view.workplace.comparisons = [
      {
        eventId: login,
        artifactIds: ["login-session-timeline", "vpn-context-1"],
      },
    ];
    expect(ticketSourceAcknowledgement(view, login)).toMatch(
      /recorded comparison.*timeline.*VPN/i,
    );
    expect(ticketSourceAcknowledgement(view, login)).not.toMatch(
      /good|strong|supported|verified your note/i,
    );
  });
});
