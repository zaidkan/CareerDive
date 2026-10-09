import { expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import {
  applyAction,
  applyWorkplaceInteraction,
  createInitialWorldState,
  reviewReasoning,
  reasoningFromFindings,
  foldActionLog,
} from "@sim/core";
import type {
  CaseFinding,
  ReasoningSelection,
  SimulationAction,
  ActionLogEntry,
} from "@sim/schemas";
import { buildDecisionReview } from "../src/domain/decision-review.js";
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing fixture value");
  return value;
}
const eventId = "suspicious-login-1";
const complete: CaseFinding[] = [
  {
    questionId: "signal",
    rowIds: ["failed-checks", "session-created"],
    claimId: "failed-then-session",
  },
  {
    questionId: "route",
    rowIds: ["s0731", "s0741", "v218"],
    claimId: "route-unmatched",
  },
  {
    questionId: "device",
    rowIds: ["flagged-device", "unknown-inventory", "inventory-limit"],
    claimId: "device-unenrolled",
  },
  {
    questionId: "coverage",
    rowIds: ["export-limit"],
    claimId: "coverage-not-collected",
  },
];
const selection = (
  caseFindings: CaseFinding[] = complete,
): ReasoningSelection =>
  reasoningFromFindings(eventId, {
    version: "desk-options-v1",
    evidence: [],
    context: [],
    uncertainty: [],
    nextStep: ["login-nextStep-2"],
    caseFindings,
  });
function run() {
  const initial = createInitialWorldState(
    "build-case",
    7,
    {},
    loadDefaultCybersecurityPack(),
  );
  let state = initial;
  const log: ActionLogEntry[] = [];
  const open = (artifactId: string) => {
    const interaction = { type: "open_artifact" as const, artifactId };
    state = applyWorkplaceInteraction(state, interaction).state;
    log.push({
      sequence: log.length + 1,
      interaction: { type: "workplace_interaction", interaction },
    });
  };
  const act = (value: Omit<SimulationAction, "actorId">) => {
    const action = { ...value, actorId: "user" };
    state = applyAction(state, action).state;
    log.push({
      sequence: log.length + 1,
      interaction: { type: "action", action },
    });
  };
  return { initial, log, open, act, state: () => state };
}
it("saves exact comparisons in either order, reopens without progress, and dispatches once with replayable provenance", () => {
  const r = run();
  for (const id of [
    "device-inventory-1",
    "login-session-timeline",
    "vpn-context-1",
  ])
    r.open(id);
  r.act({
    id: "update_ticket_notes",
    eventId,
    ticketPayload: {
      ticketId: `ticket-${eventId}`,
      reasoning: selection([required(complete[2])]),
    },
  });
  const firstClock = r.state().simClock;
  r.open("device-inventory-1");
  expect(r.state().simClock).toBe(firstClock);
  r.act({
    id: "update_ticket_notes",
    eventId,
    ticketPayload: { ticketId: `ticket-${eventId}`, reasoning: selection() },
  });
  expect(r.state().events.find((e) => e.id === eventId)?.status).toBe("active");
  r.act({
    id: "document_ticket",
    eventId,
    decisionOptionId: "escalate-with-comparisons",
    ticketPayload: {
      ticketId: `ticket-${eventId}`,
      reasoning: selection(),
      dispatch: "escalate_alert",
    },
  });
  const ticket = required(r.state().structuredTickets[`ticket-${eventId}`]);
  expect(ticket.decisionReasoning?.caseFindings).toEqual(complete);
  expect(ticket.decisionSourceIds).toEqual(
    expect.arrayContaining([
      "login-session-timeline",
      "vpn-context-1",
      "device-inventory-1",
    ]),
  );
  expect(r.state().events.find((e) => e.id === eventId)?.status).toBe(
    "resolved",
  );
  expect(ticket.status).toBe("pending_review");
  expect(
    buildDecisionReview(r.state(), r.log).decisions.find(
      (d) => d.decisionId === "suspicious_login",
    )?.outcomeLabel,
  ).toBe("supported");
  expect(foldActionLog(r.initial, r.log)).toEqual(r.state());
});
it("permits an unsupported city-only relation and false coverage, preserving initial assessment after correction", () => {
  const r = run();
  for (const id of [
    "login-session-timeline",
    "vpn-context-1",
    "device-inventory-1",
  ])
    r.open(id);
  const weak = selection(
    complete.map((f) =>
      f.questionId === "route"
        ? { ...f, claimId: "route-city" }
        : f.questionId === "coverage"
          ? { ...f, claimId: "coverage-no-access" }
          : f,
    ),
  );
  r.act({
    id: "document_ticket",
    eventId,
    decisionOptionId: "escalate-with-comparisons",
    ticketPayload: {
      ticketId: `ticket-${eventId}`,
      reasoning: weak,
      dispatch: "escalate_alert",
    },
  });
  r.act({
    id: "update_ticket_notes",
    eventId,
    ticketPayload: { ticketId: `ticket-${eventId}`, reasoning: selection() },
  });
  const review = required(
    buildDecisionReview(r.state(), r.log).decisions.find(
      (d) => d.decisionId === "suspicious_login",
    ),
  );
  expect(review.outcomeLabel).toBe("needs_more_evidence");
  expect(review.practicalExample?.claim).toContain("Before 07:45");
  expect(review.practicalExample?.excerpt).toBe(
    r
      .state()
      .artifacts["login-session-timeline"]?.body.split("\n")
      .find((line) => line.startsWith("Limit:")),
  );
  expect(review.practicalExample?.support).toContain("before OR after");
  expect(review.practicalExample?.nextCheck).toContain(
    "Request activity records",
  );
  expect(review.reasoningAnalysis?.correctionHistory.length).toBeGreaterThan(0);
  expect(
    r.state().structuredTickets[`ticket-${eventId}`]?.decisionReasoning,
  ).toEqual(weak);
});
it("rejects forged/unopened rows and mismatched dispatch atomically; missing work can still be sent", () => {
  const r = run();
  const original = structuredClone(r.state());
  expect(() => {
    r.act({
      id: "update_ticket_notes",
      eventId,
      ticketPayload: { ticketId: `ticket-${eventId}`, reasoning: selection() },
    });
  }).toThrow(/inspected/);
  expect(r.state()).toEqual(original);
  expect(() => {
    r.act({
      id: "document_ticket",
      eventId,
      decisionOptionId: "close-location-explained",
      ticketPayload: {
        ticketId: `ticket-${eventId}`,
        reasoning: selection([]),
        dispatch: "escalate_alert",
      },
    });
  }).toThrow(/match/);
  expect(r.state()).toEqual(original);
  r.act({
    id: "document_ticket",
    eventId,
    decisionOptionId: "close-location-explained",
    ticketPayload: {
      ticketId: `ticket-${eventId}`,
      reasoning: selection([]),
      dispatch: "dismiss_alert",
    },
  });
  expect(r.state().events.find((e) => e.id === eventId)?.status).toBe(
    "resolved",
  );
  expect(reviewReasoning(eventId, selection([]), []).verdict).toBe(
    "needs_more_evidence",
  );
});
