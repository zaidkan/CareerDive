import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import {
  applyAction,
  applyWorkplaceInteraction,
  createInitialWorldState,
  foldActionLog,
  handoffOptions,
  reasoningGroups,
  toClientView,
} from "@sim/core";
import type {
  ActionLogEntry,
  ReasoningSelection,
  SimulationAction,
  WorkplaceInteraction,
} from "@sim/schemas";
import { buildDecisionReview } from "../src/domain/decision-review.js";

const login = "suspicious-login-1";
const scanner = "routine-alert-1";
const finance = "access-request-1";
const rivera = "login-help-1";
const handoff = "shift-handoff-1";
const choices: Record<string, ReasoningSelection> = {
  [login]: {
    version: "desk-options-v1",
    evidence: ["login-evidence-1", "login-evidence-2", "login-evidence-3"],
    context: [],
    uncertainty: ["login-uncertainty-1", "login-uncertainty-3"],
    nextStep: ["login-nextStep-1"],
  },
  [scanner]: {
    version: "desk-options-v1",
    evidence: [
      "scanner-evidence-1",
      "scanner-evidence-2",
      "scanner-evidence-3",
    ],
    context: [],
    uncertainty: ["scanner-uncertainty-1"],
    nextStep: ["scanner-nextStep-1"],
  },
  [finance]: {
    version: "desk-options-v1",
    evidence: ["finance-evidence-1", "finance-evidence-2"],
    context: [],
    uncertainty: ["finance-uncertainty-1"],
    nextStep: ["finance-nextStep-1"],
  },
  [rivera]: {
    version: "desk-options-v1",
    evidence: ["rivera-evidence-1"],
    context: [],
    uncertainty: ["rivera-uncertainty-1", "rivera-uncertainty-2"],
    nextStep: ["rivera-nextStep-1"],
  },
};
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing test fixture");
  return value;
}
function run() {
  const initial = createInitialWorldState(
    "structured-review",
    7,
    {},
    loadDefaultCybersecurityPack(),
  );
  for (const event of initial.events) event.status = "active";
  required(initial.events.find((e) => e.id === login)).completedActionIds = [
    "review_alert",
    "inspect_login_context",
    "inspect_account_history",
    "check_device_inventory",
  ];
  required(initial.events.find((e) => e.id === scanner)).completedActionIds = [
    "review_alert",
    "search_knowledge_base",
  ];
  let state = structuredClone(initial);
  const log: ActionLogEntry[] = [];
  function action(value: Omit<SimulationAction, "actorId">) {
    const action = { ...value, actorId: "user" };
    state = applyAction(state, action).state;
    log.push({
      sequence: log.length + 1,
      interaction: { type: "action", action },
    });
  }
  function inspect(interaction: WorkplaceInteraction) {
    state = applyWorkplaceInteraction(state, interaction).state;
    log.push({
      sequence: log.length + 1,
      interaction: { type: "workplace_interaction", interaction },
    });
  }
  function openSources(eventId: string) {
    const selection = required(choices[eventId]);
    for (const group of reasoningGroups(state, eventId))
      for (const option of group.options.filter((o) =>
        selection[group.id].includes(o.id),
      ))
        for (const artifactId of option.sourceArtifactIds)
          inspect({ type: "open_artifact", artifactId });
  }
  function commit(
    eventId: string,
    selection = required(choices[eventId]),
    disposition?: string,
  ) {
    const id =
      eventId === finance
        ? "route_access_request"
        : eventId === rivera
          ? "resolve_login_help"
          : "document_ticket";
    action({
      id,
      eventId,
      ticketPayload: { ticketId: `ticket-${eventId}`, reasoning: selection },
      decisionOptionId:
        disposition ??
        (eventId === login
          ? "escalate-with-comparisons"
          : eventId === scanner
            ? "expected-close"
            : eventId === finance
              ? "route-to-owner"
              : "update-saved-password"),
    });
    if (eventId === login || eventId === scanner)
      action({
        id: eventId === login ? "escalate_alert" : "dismiss_alert",
        eventId,
      });
  }
  function decision(id: string) {
    return required(
      buildDecisionReview(state, log).decisions.find(
        (d) => d.decisionId === id,
      ),
    );
  }
  return {
    initial,
    log,
    action,
    inspect,
    openSources,
    commit,
    decision,
    get state() {
      return state;
    },
  };
}

describe("versioned evidence coverage at the original decision", () => {
  it.each([
    [login, "suspicious_login"],
    [scanner, "scanner_interruption"],
    [finance, "finance_access"],
    [rivera, "routine_login"],
  ])(
    "reviews actual %s selections without a provider",
    (eventId, decisionId) => {
      const shift = run();
      shift.openSources(eventId);
      shift.commit(eventId);
      expect(shift.decision(decisionId)).toMatchObject({
        outcomeLabel: "supported",
        evaluationMode: "structured-selections",
      });
      expect(shift.decision(decisionId).fieldReviews).toHaveLength(3);
      expect(foldActionLog(shift.initial, shift.log)).toEqual(shift.state);
    },
  );
  it("accepts the scanner monitoring disposition and complementary next check", () => {
    const shift = run();
    shift.openSources(scanner);
    shift.commit(
      scanner,
      {
        ...required(choices[scanner]),
        nextStep: ["scanner-nextStep-1", "scanner-nextStep-2"],
      },
      "expected-close-with-monitoring",
    );
    expect(shift.decision("scanner_interruption").outcomeLabel).toBe(
      "supported",
    );
    expect(
      toClientView(shift.state).handoffOptions?.options.find(
        (o) => o.id === "carry-scanner",
      )?.label,
    ).toContain("closed on its matched run");
  });
  it("uses equivalent queried records before save, including exact route and device", () => {
    const shift = run();
    for (const [datasetId, filters, ids] of [
      [
        "auth",
        { user: "j.patel@example.com" },
        ["AUTH-0731-PATEL", "AUTH-0741-PATEL"],
      ],
      ["vpn", { vpnId: "V-218" }, ["V-218"]],
      ["devices", { deviceLabel: "unknown-laptop-17" }, ["unknown-laptop-17"]],
    ] as const) {
      shift.action({
        id: "query_records",
        eventId: login,
        queryPayload: { datasetId, filters },
      });
      const result = required(toClientView(shift.state).queryResults.at(-1));
      for (const recordId of ids)
        shift.inspect({
          type: "inspect_query_record",
          queryId: result.queryId,
          recordId,
        });
    }
    shift.commit(login);
    expect(shift.decision("suspicious_login").outcomeLabel).toBe("supported");
    expect(
      shift.state.pendingCallbacks.find((c) => c.id === "b1-comparison-review")
        ?.body,
    ).not.toContain("Missing saved steps");
    expect(
      shift.state.structuredTickets[`ticket-${login}`]?.sourceRecordIds,
    ).toContain("V-218");
    expect(
      shift.state.structuredTickets[`ticket-${login}`]?.sourceArtifactIds,
    ).toEqual([]);
  });
  it("does not upgrade weak original reasoning after new inspections and correction", () => {
    const shift = run();
    const empty: ReasoningSelection = {
      version: "desk-options-v1",
      evidence: [],
      context: [],
      uncertainty: [],
      nextStep: [],
    };
    shift.commit(login, empty);
    shift.openSources(login);
    shift.action({
      id: "update_ticket_notes",
      eventId: login,
      ticketPayload: {
        ticketId: `ticket-${login}`,
        reasoning: required(choices[login]),
      },
    });
    const reviewed = shift.decision("suspicious_login");
    expect(reviewed.outcomeLabel).toBe("needs_more_evidence");
    expect(reviewed.evidenceUsedIds).toEqual([]);
    expect(reviewed.reasoningAnalysis?.correctionHistory).toHaveLength(1);
    expect(
      shift.state.structuredTickets[`ticket-${login}`]?.decisionReasoning
        ?.evidence,
    ).toEqual([]);
    expect(shift.state.structuredTickets[`ticket-${login}`]?.revision).toBe(2);
  });
  it("does not treat a complete draft as a committed scanner closure", () => {
    const shift = run();
    shift.openSources(scanner);
    shift.action({
      id: "document_ticket",
      eventId: scanner,
      decisionOptionId: "expected-close",
      ticketPayload: {
        ticketId: `ticket-${scanner}`,
        reasoning: required(choices[scanner]),
      },
    });
    expect(shift.decision("scanner_interruption")).toMatchObject({
      evaluationMode: "structured-selections",
      outcomeLabel: "needs_more_evidence",
      userChoiceId: null,
    });
    expect(shift.decision("scanner_interruption").explanation).toContain(
      "Recorded action: none",
    );
    expect(shift.state.events.find((e) => e.id === scanner)?.status).toBe(
      "active",
    );
  });
  it("preserves the scanner disposition when notes are revised before closure", () => {
    const shift = run();
    shift.openSources(scanner);
    shift.action({
      id: "document_ticket",
      eventId: scanner,
      decisionOptionId: "expected-close-with-monitoring",
      ticketPayload: {
        ticketId: `ticket-${scanner}`,
        reasoning: required(choices[scanner]),
      },
    });
    shift.action({
      id: "update_ticket_notes",
      eventId: scanner,
      ticketPayload: {
        ticketId: `ticket-${scanner}`,
        reasoning: required(choices[scanner]),
      },
    });
    shift.action({ id: "dismiss_alert", eventId: scanner });
    expect(shift.decision("scanner_interruption").outcomeLabel).toBe(
      "supported",
    );
    expect(foldActionLog(shift.initial, shift.log)).toEqual(shift.state);
  });
  it("never changes a recorded disposition through a note correction", () => {
    const shift = run();
    shift.openSources(login);
    shift.commit(login);
    shift.action({
      id: "update_ticket_notes",
      eventId: login,
      decisionOptionId: "close-familiar-account",
      ticketPayload: {
        ticketId: `ticket-${login}`,
        reasoning: required(choices[login]),
      },
    });
    expect(shift.state.structuredTickets[`ticket-${login}`]?.disposition).toBe(
      "escalate-with-comparisons",
    );
    expect(shift.decision("suspicious_login").outcomeLabel).toBe("supported");
  });
  it("requires the actual escalation action as well as a supported saved note", () => {
    const shift = run();
    shift.openSources(login);
    shift.commit(login);
    const inconsistentLog = shift.log.map((entry) =>
      entry.interaction.type === "action" &&
      entry.interaction.action.id === "escalate_alert"
        ? {
            ...entry,
            interaction: {
              type: "action" as const,
              action: {
                ...entry.interaction.action,
                id: "dismiss_alert" as const,
              },
            },
          }
        : entry,
    );
    const reviewed = required(
      buildDecisionReview(shift.state, inconsistentLog).decisions.find(
        (d) => d.decisionId === "suspicious_login",
      ),
    );
    expect(reviewed.outcomeLabel).toBe("needs_more_evidence");
  });
  it("requires inspection before save, not merely before the final action", () => {
    const shift = run();
    shift.openSources(login);
    shift.commit(login);
    const early = shift.log.filter(
      (e) => e.interaction.type === "workplace_interaction",
    );
    const writes = shift.log.filter((e) => e.interaction.type === "action");
    const reordered = [...writes.slice(0, 1), ...early, ...writes.slice(1)].map(
      (e, i) => ({ ...e, sequence: i + 1 }),
    );
    const review = buildDecisionReview(shift.state, reordered).decisions[0];
    expect(review?.outcomeLabel).toBe("needs_more_evidence");
    expect(review?.fieldReviews?.[0]?.gaps.join(" ")).toContain(
      "Missing inspected support",
    );
  });
  it("evaluates an all-selected contradiction honestly after committing it", () => {
    const shift = run();
    shift.openSources(login);
    for (const artifactId of ["travel-status-1", "employee-login-reply"])
      shift.inspect({ type: "open_artifact", artifactId });
    const selected = structuredClone(required(choices[login]));
    for (const group of reasoningGroups(shift.state, login))
      selected[group.id] = group.options.map((o) => o.id);
    shift.commit(login, selected);
    const reviewed = shift.decision("suspicious_login");
    expect(reviewed.outcomeLabel).toBe("needs_more_evidence");
    expect(reviewed.explanation).toContain(
      "no file/mail fields before OR after 07:45",
    );
    expect(reviewed.explanation).toContain("One session cannot substitute");
  });
  it.each([
    ["route-to-owner", "supported", "waiting for the data owner"],
    ["route-with-interim", "supported", "interim report granted no new role"],
    ["self-approve", "needs_more_evidence", "approved without the data owner"],
    ["route-to-director", "needs_more_evidence", "deadline approver"],
  ])(
    "finance %s preserves its actual authority outcome in review and handoff",
    (disposition, verdict, carry) => {
      const shift = run();
      shift.openSources(finance);
      shift.commit(finance, required(choices[finance]), disposition);
      expect(shift.decision("finance_access").outcomeLabel).toBe(verdict);
      expect(
        handoffOptions(shift.state).options.find(
          (o) => o.id === "carry-finance",
        )?.label,
      ).toContain(carry);
      expect(foldActionLog(shift.initial, shift.log)).toEqual(shift.state);
    },
  );
  it.each(["name-attacker", "grant-access"])(
    "Rivera %s keeps untested phone work in the receipt and corrected note",
    (disposition) => {
      const shift = run();
      shift.openSources(rivera);
      shift.commit(rivera, required(choices[rivera]), disposition);
      shift.inspect({
        type: "open_artifact",
        artifactId: "rivera-result-receipt",
      });
      const followup = {
        version: "desk-options-v1" as const,
        phase: "follow-up" as const,
        evidence: ["rivera-followup-evidence-1"],
        context: [],
        uncertainty: ["rivera-followup-uncertainty-1"],
        nextStep: ["rivera-followup-nextStep-1"],
      };
      shift.action({
        id: "update_ticket_notes",
        eventId: rivera,
        ticketPayload: { ticketId: `ticket-${rivera}`, reasoning: followup },
      });
      expect(
        shift.state.artifacts["rivera-result-receipt"]?.body,
      ).not.toContain("no further retries");
      expect(
        shift.state.artifacts["rivera-result-receipt"]?.title,
      ).not.toContain("recorded phone check");
      expect(
        shift.state.structuredTickets[`ticket-${rivera}`]?.followUp,
      ).toContain("complete any untested phone-app check");
      expect(shift.decision("routine_login").outcomeLabel).toBe(
        "needs_more_evidence",
      );
      expect(
        shift.decision("routine_login").reasoningAnalysis?.correctionHistory,
      ).toHaveLength(1);
      expect(foldActionLog(shift.initial, shift.log)).toEqual(shift.state);
    },
  );
  it("keeps actual wrong-device Rivera outcome and offers observed follow-up receipt", () => {
    const shift = run();
    shift.openSources(rivera);
    shift.commit(rivera, required(choices[rivera]), "name-attacker");
    expect(shift.decision("routine_login").outcomeLabel).toBe(
      "needs_more_evidence",
    );
    expect(
      required(shift.state.events.find((e) => e.id === rivera)).resolution,
    ).toContain("has not been tested");
    shift.inspect({
      type: "open_artifact",
      artifactId: "rivera-result-receipt",
    });
    const groups = reasoningGroups(shift.state, rivera);
    expect(groups[0]?.options[0]?.inspectedSourceIds).toEqual([
      "rivera-result-receipt",
    ]);
    expect(shift.state.artifacts["rivera-result-receipt"]?.body).not.toContain(
      "no further retries",
    );
  });
  it("preserves actual closed login/unauthorized finance/open scanner in handoff and records correction separately", () => {
    const shift = run();
    shift.openSources(login);
    shift.action({
      id: "document_ticket",
      eventId: login,
      decisionOptionId: "close-familiar-account",
      ticketPayload: {
        ticketId: `ticket-${login}`,
        reasoning: required(choices[login]),
      },
    });
    shift.action({ id: "dismiss_alert", eventId: login });
    shift.openSources(finance);
    shift.commit(finance, required(choices[finance]), "self-approve");
    const offered = handoffOptions(shift.state);
    expect(
      offered.options.find((o) => o.id === "carry-login")?.label,
    ).toContain("was closed");
    expect(
      offered.options.find((o) => o.id === "carry-finance")?.label,
    ).toContain("approved without the data owner");
    expect(
      offered.options.find((o) => o.id === "carry-scanner")?.label,
    ).toContain("remains open");
    shift.action({
      id: "submit_shift_handoff",
      eventId: handoff,
      handoffPayload: {
        sourceArtifactIds: [],
        followUp: "senior-review",
        selections: {
          version: "desk-options-v1",
          stateKey: offered.stateKey,
          optionIds: [],
        },
      },
    });
    for (const artifactId of ["scanner-run-log", "scanner-window"])
      shift.inspect({ type: "open_artifact", artifactId });
    const corrected = handoffOptions(shift.state);
    shift.action({
      id: "submit_shift_handoff",
      eventId: handoff,
      handoffPayload: {
        sourceArtifactIds: [],
        followUp: "senior-review",
        selections: {
          version: "desk-options-v1",
          stateKey: corrected.stateKey,
          optionIds: ["carry-login", "carry-finance", "carry-scanner"],
        },
      },
    });
    expect(shift.decision("shift_handoff").outcomeLabel).toBe(
      "needs_more_evidence",
    );
    expect(
      shift.decision("shift_handoff").reasoningAnalysis?.correctionHistory,
    ).toHaveLength(1);
    const messages =
      shift.state.teamMessages?.filter(
        (m) => m.actionId === "submit_shift_handoff",
      ) ?? [];
    expect(messages).toHaveLength(2);
    expect(new Set(messages.map((m) => m.id)).size).toBe(2);
    expect(messages[1]?.body).toContain("approved without the data owner");
    expect(messages[1]?.body).not.toContain("closed as expected");
  });
  it("does not resurrect selections replaced by a legacy note before the decision", () => {
    const shift = run();
    shift.openSources(login);
    shift.action({
      id: "update_ticket_notes",
      eventId: login,
      ticketPayload: {
        ticketId: `ticket-${login}`,
        reasoning: required(choices[login]),
      },
    });
    shift.action({
      id: "document_ticket",
      eventId: login,
      decisionOptionId: "escalate-with-comparisons",
      ticketPayload: {
        ticketId: `ticket-${login}`,
        verifiedEvidence: "Legacy edited note",
        uncertainty: "Unknown",
        followUp: "Review",
        sourceArtifactIds: [
          "login-session-timeline",
          "vpn-context-1",
          "device-inventory-1",
        ],
      },
    });
    shift.action({ id: "escalate_alert", eventId: login });
    expect(shift.decision("suspicious_login").evaluationMode).toBe(
      "limited-text-evaluation",
    );
    expect(shift.decision("suspicious_login").outcomeLabel).not.toBe(
      "supported",
    );
    expect(
      shift.state.structuredTickets[`ticket-${login}`]?.decisionReasoning,
    ).toBeUndefined();
  });
  it("leaves old text limited instead of manufacturing selections", () => {
    const shift = run();
    shift.openSources(login);
    shift.action({
      id: "document_ticket",
      eventId: login,
      decisionOptionId: "escalate-with-comparisons",
      ticketPayload: {
        ticketId: `ticket-${login}`,
        verifiedEvidence: "banana",
        uncertainty: "banana",
        followUp: "banana",
        sourceArtifactIds: [
          "login-session-timeline",
          "vpn-context-1",
          "device-inventory-1",
        ],
      },
    });
    shift.action({ id: "escalate_alert", eventId: login });
    expect(shift.decision("suspicious_login").evaluationMode).toBe(
      "limited-text-evaluation",
    );
    expect(shift.decision("suspicious_login").outcomeLabel).not.toBe(
      "supported",
    );
    expect(
      shift.state.structuredTickets[`ticket-${login}`]?.reasoning,
    ).toBeUndefined();
    expect(shift.decision("suspicious_login").rubricSignals).not.toContainEqual(
      { id: "documented_uncertainty", supported: true },
    );
    expect(
      shift.decision("suspicious_login").reasoningAnalysis?.whatSupportedIt,
    ).not.toContain("documented_uncertainty");
  });
});
