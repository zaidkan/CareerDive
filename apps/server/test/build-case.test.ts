import { expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import {
  statusGroups,
  findingQuestions,
  findingReviewGaps,
  handoffOptions,
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
    rowSelections: [["s0731"], ["s0741"], ["v218"]],
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
  const inspect = (recordId: string) => {
    const query = required(state.queryHistory.at(-1));
    const interaction = {
      type: "inspect_query_record" as const,
      queryId: query.queryId,
      recordId,
    };
    state = applyWorkplaceInteraction(state, interaction).state;
    log.push({
      sequence: log.length + 1,
      interaction: { type: "workplace_interaction", interaction },
    });
  };
  return { initial, log, open, act, inspect, state: () => state };
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

it("builds all cases with distinct authored findings, real responses and memo-based handoff", () => {
  const r = run();
  r.open("handoff-email");
  r.act({
    id: "acknowledge_handoff",
    eventId: "handoff-1",
    ticketPayload: { ticketId: "ticket-handoff-1", ownershipCaseId: eventId },
  });
  expect(r.state().events.find((e) => e.id === "handoff-1")?.status).toBe(
    "resolved",
  );
  const build = (
    id: string,
    nextStep: string[],
    decisionOptionId: string,
    actionId: "document_ticket" | "route_access_request" | "resolve_login_help",
    dispatch?: "escalate_alert" | "dismiss_alert",
  ) => {
    const questions = findingQuestions(id);
    for (const source of new Set(
      questions.flatMap((q) => q.rows.map((row) => row.sourceId)),
    ))
      r.open(source);
    const caseFindings = questions.map((q) => {
      const rowSelections = q.rowGroups.map((g) =>
        g.multiple ? g.rowIds : g.rowIds.slice(0, 1),
      );
      return {
        questionId: q.id,
        rowSelections,
        rowIds: [...new Set(rowSelections.flat())],
        claimId: required(q.claims[0]).id,
      };
    });
    const reasoning = reasoningFromFindings(id, {
      version: "desk-options-v1",
      evidence: [],
      context: [],
      uncertainty: [],
      nextStep,
      caseFindings,
    });
    r.act({
      id: "update_ticket_notes",
      eventId: id,
      ticketPayload: { ticketId: `ticket-${id}`, reasoning },
    });
    r.act({
      id: actionId,
      eventId: id,
      decisionOptionId,
      ticketPayload: {
        ticketId: `ticket-${id}`,
        reasoning,
        ...(dispatch ? { dispatch } : {}),
      },
    });
    return reasoning;
  };
  build(
    eventId,
    ["login-nextStep-2"],
    "escalate-with-comparisons",
    "document_ticket",
    "escalate_alert",
  );
  build(
    "routine-alert-1",
    ["scanner-nextStep-1", "scanner-nextStep-2"],
    "expected-close-with-monitoring",
    "document_ticket",
    "dismiss_alert",
  );
  build(
    "access-request-1",
    ["finance-nextStep-1", "finance-nextStep-2"],
    "route-with-interim",
    "route_access_request",
  );
  build(
    "login-help-1",
    ["rivera-nextStep-1", "rivera-nextStep-2"],
    "update-saved-password",
    "resolve_login_help",
  );
  r.open("suspicious-login-alert");
  r.act({
    id: "send_status_update",
    eventId: "status-check-1",
    ticketPayload: {
      ticketId: "ticket-status-check-1",
      statusOptionIds: [
        "confirmed-sequence",
        "identity-uncertain",
        "review-in-progress",
      ],
    },
  });
  r.open("rivera-result-receipt");
  const riveraInitial = required(
    r.state().structuredTickets["ticket-login-help-1"]?.decisionReasoning,
  );
  r.act({
    id: "update_ticket_notes",
    eventId: "login-help-1",
    ticketPayload: {
      ticketId: "ticket-login-help-1",
      reasoning: {
        ...riveraInitial,
        phase: "follow-up",
        evidence: ["rivera-followup-evidence-1", "rivera-followup-evidence-2"],
        uncertainty: ["rivera-followup-uncertainty-2"],
        nextStep: ["rivera-followup-nextStep-2"],
      },
    },
  });
  const offered = handoffOptions(r.state());
  r.act({
    id: "submit_shift_handoff",
    eventId: "shift-handoff-1",
    handoffPayload: {
      sourceArtifactIds: [],
      followUp: "senior-review",
      selections: {
        version: "desk-options-v1",
        stateKey: offered.stateKey,
        optionIds: offered.options
          .filter((o) => o.id.startsWith("carry-"))
          .map((o) => o.id),
      },
    },
  });
  expect(r.state().workplace.handoffSourceArtifactIds).toEqual(
    expect.arrayContaining([
      "login-session-timeline",
      "vpn-context-1",
      "device-inventory-1",
    ]),
  );
  expect(
    r.state().teamMessages?.find((m) => m.actionId === "submit_shift_handoff")
      ?.body,
  ).toContain("Recorded memo revision");
  r.act({ id: "complete_shift", eventId: "shift" });
  const review = buildDecisionReview(r.state(), r.log);
  expect(review.decisions.map((d) => [d.decisionId, d.outcomeLabel])).toEqual(
    expect.arrayContaining([
      ["suspicious_login", "supported"],
      ["scanner_interruption", "supported"],
      ["finance_access", "supported"],
      ["routine_login", "supported"],
      ["shift_handoff", "supported"],
    ]),
  );
  const riveraReview = required(
    review.decisions.find((d) => d.decisionId === "routine_login"),
  );
  expect(riveraReview.outcomeLabel).toBe("supported");
  expect(riveraReview.followUpReview?.outcomeLabel).toBe("needs_more_evidence");
  expect(riveraReview.followUpReview?.excerpt).toContain("phone");
  for (const d of review.decisions.filter(
    (d) => d.decisionId !== "shift_handoff",
  ))
    expect(d.practicalExample?.excerpt).toBeTruthy();
  expect(
    review.decisions.find((d) => d.decisionId === "finance_access")
      ?.practicalExample?.response,
  ).toContain("interim");
  expect(foldActionLog(r.initial, r.log)).toEqual(r.state());
});

it("can finish without correct findings or a coached status gate; later communication corrections stay separate", () => {
  const r = run();
  r.open("handoff-email");
  r.act({
    id: "acknowledge_handoff",
    eventId: "handoff-1",
    ticketPayload: { ticketId: "ticket-handoff-1", ownershipCaseId: eventId },
  });
  const weak: ReasoningSelection = {
    version: "desk-options-v1",
    evidence: [],
    context: [],
    uncertainty: [],
    nextStep: [],
    caseFindings: [],
  };
  const commit = (
    id: string,
    actionId: "document_ticket" | "route_access_request" | "resolve_login_help",
    decisionOptionId: string,
    dispatch?: "dismiss_alert",
  ) => {
    r.act({
      id: actionId,
      eventId: id,
      decisionOptionId,
      ticketPayload: {
        ticketId: `ticket-${id}`,
        reasoning: weak,
        ...(dispatch ? { dispatch } : {}),
      },
    });
  };
  commit(
    eventId,
    "document_ticket",
    "close-location-explained",
    "dismiss_alert",
  );
  commit(
    "routine-alert-1",
    "document_ticket",
    "expected-close",
    "dismiss_alert",
  );
  commit("access-request-1", "route_access_request", "self-approve");
  commit("login-help-1", "resolve_login_help", "name-attacker");
  expect(r.state().artifacts["rivera-result-receipt"]?.body).toContain(
    "not been tested",
  );
  r.open("suspicious-login-alert");
  r.open("login-session-timeline");
  r.act({
    id: "send_status_update",
    eventId: "status-check-1",
    ticketPayload: {
      ticketId: "ticket-status-check-1",
      statusOptionIds: [
        "confirmed-person",
        "nothing-accessed",
        "close-on-location",
      ],
    },
  });
  expect(r.state().events.find((e) => e.id === "status-check-1")?.status).toBe(
    "resolved",
  );
  expect(r.state().events.find((e) => e.id === "shift-handoff-1")?.status).toBe(
    "active",
  );
  r.act({
    id: "send_status_update",
    eventId: "status-check-1",
    ticketPayload: {
      ticketId: "ticket-status-check-1",
      statusOptionIds: [
        "confirmed-sequence",
        "identity-uncertain",
        required(
          statusGroups(r.state())
            .find((g) => g.id === "status-next")
            ?.options.find((o) => o.id !== "close-on-location"),
        ).id,
      ],
    },
  });
  const offered = handoffOptions(r.state());
  r.act({
    id: "submit_shift_handoff",
    eventId: "shift-handoff-1",
    handoffPayload: {
      sourceArtifactIds: [],
      followUp: "monitor",
      selections: {
        version: "desk-options-v1",
        stateKey: offered.stateKey,
        optionIds: [],
      },
    },
  });
  r.act({ id: "complete_shift", eventId: "shift" });
  const status = buildDecisionReview(r.state(), r.log).statusReview;
  expect(status?.outcomeLabel).toBe("needs_more_evidence");
  expect(status?.corrections).toHaveLength(1);
  expect(status?.gaps.join(" ")).toContain("no file/mail");
  expect(
    buildDecisionReview(r.state(), r.log).decisions.every(
      (d) => d.outcomeLabel !== "supported",
    ),
  ).toBe(true);
  expect(foldActionLog(r.initial, r.log)).toEqual(r.state());
});

it("reviews selected session roles, not just a bag of opened rows", () => {
  const route = required(
    complete.find((finding) => finding.questionId === "route"),
  );
  expect(findingReviewGaps(eventId, complete)).toEqual([]);
  for (const rowSelections of [undefined, [["s0741"], ["s0731"], ["v218"]]]) {
    expect(
      findingReviewGaps(
        eventId,
        complete.map((finding) =>
          finding.questionId === "route"
            ? { ...route, rowSelections }
            : finding,
        ),
      ),
    ).toEqual([expect.stringContaining("selected rows and scope")]);
  }
});

it("attaches equivalent inspected query records and cites their real excerpts without fabricating source openings", () => {
  const r = run();
  const sources = [
    {
      datasetId: "auth" as const,
      filters: { user: "j.patel@example.com" },
      ids: ["AUTH-0731-PATEL", "AUTH-0741-PATEL"],
    },
    {
      datasetId: "vpn" as const,
      filters: { user: "j.patel@example.com" },
      ids: ["V-218"],
    },
    {
      datasetId: "devices" as const,
      filters: { deviceLabel: "unknown-laptop-17" },
      ids: ["unknown-laptop-17"],
    },
  ];
  for (const source of sources) {
    r.act({
      id: "query_records",
      eventId,
      queryPayload: { datasetId: source.datasetId, filters: source.filters },
    });
    for (const id of source.ids) r.inspect(id);
  }
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
  expect(ticket.decisionSourceIds).toEqual(
    expect.arrayContaining(sources.flatMap((source) => source.ids)),
  );
  expect(ticket.decisionSourceIds).not.toContain("login-session-timeline");
  const decision = required(
    buildDecisionReview(r.state(), r.log).decisions.find(
      (d) => d.decisionId === "suspicious_login",
    ),
  );
  expect(decision.outcomeLabel).toBe("supported");
  expect(decision.practicalExample?.sourceId).toBe("AUTH-0731-PATEL");
  expect(decision.practicalExample?.excerpt).toContain("S-0731");
  expect(foldActionLog(r.initial, r.log)).toEqual(r.state());
});
