import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import {
  applyAction,
  applyWorkplaceInteraction,
  createInitialWorldState,
  handoffOptions,
  reviewHandoffSelections,
  reasoningGroups,
  reviewReasoning,
  validateReasoning,
  toClientView,
} from "../src/index.js";
import type { ReasoningSelection, WorldState } from "@sim/schemas";

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing fixture value");
  return value;
}
function event(state: WorldState, id: string) {
  return required(state.events.find((e) => e.id === id));
}
const cases = {
  login: "suspicious-login-1",
  scanner: "routine-alert-1",
  finance: "access-request-1",
  rivera: "login-help-1",
};
const good: Record<string, ReasoningSelection> = {
  login: {
    version: "desk-options-v1",
    evidence: ["login-evidence-1", "login-evidence-2", "login-evidence-3"],
    context: [],
    uncertainty: ["login-uncertainty-1", "login-uncertainty-3"],
    nextStep: ["login-nextStep-1"],
  },
  scanner: {
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
  finance: {
    version: "desk-options-v1",
    evidence: ["finance-evidence-1", "finance-evidence-2"],
    context: [],
    uncertainty: ["finance-uncertainty-1"],
    nextStep: ["finance-nextStep-1"],
  },
  rivera: {
    version: "desk-options-v1",
    evidence: ["rivera-evidence-1"],
    context: [],
    uncertainty: ["rivera-uncertainty-1", "rivera-uncertainty-2"],
    nextStep: ["rivera-nextStep-1"],
  },
};
const wrong = new Set([
  "login-uncertainty-4",
  "login-nextStep-4",
  "scanner-evidence-4",
  "scanner-uncertainty-3",
  "scanner-uncertainty-4",
  "scanner-nextStep-3",
  "scanner-nextStep-4",
  "finance-evidence-3",
  "finance-uncertainty-3",
  "finance-uncertainty-4",
  "finance-nextStep-3",
  "finance-nextStep-4",
  "rivera-evidence-4",
  "rivera-uncertainty-4",
  "rivera-nextStep-3",
  "rivera-nextStep-4",
]);
function world(): WorldState {
  const state = createInitialWorldState(
    "options",
    24,
    {},
    loadDefaultCybersecurityPack(),
  );
  for (const event of state.events) event.status = "active";
  return state;
}
for (const [key, eventId] of Object.entries(cases)) {
  const state = world();
  for (const group of reasoningGroups(state, eventId))
    for (const option of group.options) {
      it(`${eventId}: ${option.id} preserves its approved verdict/context meaning`, () => {
        const selected = structuredClone(required(good[key]));
        selected[group.id] = [...new Set([...selected[group.id], option.id])];
        const result = reviewReasoning(
          eventId,
          selected,
          Object.keys(state.artifacts),
        );
        expect(result.verdict).toBe(
          wrong.has(option.id) ? "needs_more_evidence" : "supported",
        );
      });
    }
  it(`${eventId}: all-selected contradictions cannot be supported`, () => {
    const selected = structuredClone(required(good[key]));
    for (const group of reasoningGroups(state, eventId))
      selected[group.id] = group.options.map((o) => o.id);
    expect(
      reviewReasoning(eventId, selected, Object.keys(state.artifacts)).verdict,
    ).toBe("needs_more_evidence");
  });
}
describe("actual sources and alternatives", () => {
  it("accepts finance's interim route and equivalent uncertainty boundary", () => {
    const selected = {
      ...required(good.finance),
      uncertainty: ["finance-uncertainty-2"],
      nextStep: ["finance-nextStep-2"],
    };
    expect(
      reviewReasoning(cases.finance, selected, Object.keys(world().artifacts))
        .verdict,
    ).toBe("supported");
  });
  it("accepts scanner closure plus monitoring and Rivera auth without redundant inventory", () => {
    expect(
      reviewReasoning(
        cases.scanner,
        {
          ...required(good.scanner),
          nextStep: ["scanner-nextStep-1", "scanner-nextStep-2"],
        },
        Object.keys(world().artifacts),
      ).verdict,
    ).toBe("supported");
    expect(
      reviewReasoning(cases.rivera, required(good.rivera), [
        "rivera-auth-summary",
      ]).verdict,
    ).toBe("supported");
  });
  it("accepts equivalent exact query rows, never same-user/wrong-session rows", () => {
    const ids = [
      "AUTH-0731-PATEL",
      "AUTH-0741-PATEL",
      "V-218",
      "unknown-laptop-17",
    ];
    expect(
      reviewReasoning(cases.login, required(good.login), ids).verdict,
    ).toBe("supported");
    expect(
      reviewReasoning(cases.login, required(good.login), [
        "AUTH-0715-PATEL-HQ",
        "V-216",
        "corp-macbook-patel",
      ]).verdict,
    ).not.toBe("supported");
  });
  it("rejects forged/uninspected selections before mutation, but commits empty weak notes", () => {
    let state = world();
    const caseEvent = event(state, cases.login);
    caseEvent.completedActionIds = [
      "review_alert",
      "inspect_login_context",
      "inspect_account_history",
      "check_device_inventory",
    ];
    expect(() =>
      validateReasoning(state, cases.login, required(good.login)),
    ).toThrow("Open the selected source");
    const empty: ReasoningSelection = {
      version: "desk-options-v1",
      evidence: [],
      context: [],
      uncertainty: [],
      nextStep: [],
    };
    state = applyAction(state, {
      id: "document_ticket",
      actorId: "user",
      eventId: cases.login,
      decisionOptionId: "close-familiar-account",
      ticketPayload: { ticketId: `ticket-${cases.login}`, reasoning: empty },
    }).state;
    expect(state.structuredTickets[`ticket-${cases.login}`]?.reasoning).toEqual(
      empty,
    );
    state = applyAction(state, {
      id: "dismiss_alert",
      actorId: "user",
      eventId: cases.login,
    }).state;
    expect(state.events.find((e) => e.id === cases.login)?.status).toBe(
      "resolved",
    );
  });
  it("generates attachments from actual inspection and hides approved verdict tags", () => {
    let state = world();
    for (const artifactId of [
      "login-session-timeline",
      "vpn-context-1",
      "device-inventory-1",
      "travel-status-1",
    ])
      state = applyWorkplaceInteraction(state, {
        type: "open_artifact",
        artifactId,
      }).state;
    const payload = validateReasoning(state, cases.login, {
      ...required(good.login),
      context: ["login-evidence-4"],
    });
    expect(payload.sourceArtifactIds).toContain("travel-status-1");
    expect(JSON.stringify(toClientView(state).reasoningOptions)).not.toMatch(
      /verdict|close-wrong/,
    );
  });
  it("handoff follows closed login, self-approved finance and open scanner; rejects stale state", () => {
    const state = world();
    event(state, cases.login).status = "resolved";
    event(state, cases.finance).status = "resolved";
    event(state, cases.finance).resolution =
      "Access was approved without the data owner's authorization.";
    const offered = handoffOptions(state);
    expect(
      offered.options.find((o) => o.id === "carry-login")?.label,
    ).toContain("was closed");
    expect(
      offered.options.find((o) => o.id === "carry-finance")?.label,
    ).toContain("without the data owner");
    expect(
      offered.options.find((o) => o.id === "carry-scanner")?.label,
    ).toContain("remains open");
    expect(
      reviewHandoffSelections({
        version: "desk-options-v1",
        stateKey: offered.stateKey,
        optionIds: offered.options.map((o) => o.id),
      }).verdict,
    ).toBe("needs_more_evidence");
  });
});

it.each([
  "carry-login",
  "carry-finance",
  "carry-scanner",
  "cross-session",
  "grant-before-owner",
])("handoff option %s preserves its state-dependent verdict", (id) => {
  const state = world();
  const offered = handoffOptions(state);
  const result = reviewHandoffSelections(
    {
      version: "desk-options-v1",
      stateKey: offered.stateKey,
      optionIds: [
        ...new Set(["carry-login", "carry-finance", "carry-scanner", id]),
      ],
    },
    Object.keys(state.artifacts),
  );
  expect(result.verdict).toBe(
    id.startsWith("carry-") ? "supported" : "needs_more_evidence",
  );
});
it("rejects stale handoff state and duplicate selections before sending", () => {
  let state = world();
  const offered = handoffOptions(state);
  event(state, cases.scanner).status = "resolved";
  const original = JSON.stringify(state);
  expect(() =>
    applyAction(state, {
      id: "submit_shift_handoff",
      eventId: "shift-handoff-1",
      actorId: "user",
      handoffPayload: {
        sourceArtifactIds: [],
        followUp: "senior-review",
        selections: {
          version: "desk-options-v1",
          stateKey: offered.stateKey,
          optionIds: ["carry-scanner"],
        },
      },
    }),
  ).toThrow("Case state changed");
  expect(JSON.stringify(state)).toBe(original);
  state = world();
  expect(() =>
    validateReasoning(state, cases.login, {
      ...required(good.login),
      evidence: ["login-evidence-1", "login-evidence-1"],
    }),
  ).toThrow("Duplicate reasoning");
});
it.each([
  "rivera-followup-evidence-1",
  "rivera-followup-evidence-2",
  "rivera-followup-evidence-3",
  "rivera-followup-uncertainty-1",
  "rivera-followup-uncertainty-2",
  "rivera-followup-uncertainty-3",
  "rivera-followup-nextStep-1",
  "rivera-followup-nextStep-2",
  "rivera-followup-nextStep-3",
])("Rivera follow-up option %s uses the actual receipt phase", (id) => {
  const state = world();
  event(state, cases.rivera).status = "resolved";
  const selected: ReasoningSelection = {
    version: "desk-options-v1",
    phase: "follow-up",
    evidence: ["rivera-followup-evidence-1"],
    context: [],
    uncertainty: ["rivera-followup-uncertainty-1"],
    nextStep: ["rivera-followup-nextStep-1"],
  };
  const group = required(
    reasoningGroups(state, cases.rivera).find((g) =>
      g.options.some((o) => o.id === id),
    ),
  );
  selected[group.id] = [...new Set([...selected[group.id], id])];
  expect(
    reviewReasoning(cases.rivera, selected, [
      "rivera-result-receipt",
      "rivera-auth-summary",
      "ticket-login-help",
    ]).verdict,
  ).toBe(
    [
      "rivera-followup-evidence-3",
      "rivera-followup-uncertainty-2",
      "rivera-followup-nextStep-2",
      "rivera-followup-nextStep-3",
    ].includes(id)
      ? "needs_more_evidence"
      : "supported",
  );
  expect(() => validateReasoning(world(), cases.rivera, selected)).toThrow(
    "Follow-up options require a recorded result",
  );
});

it("handoff names deadline expiry without inventing a routed or reviewed outcome", () => {
  const state = world();
  for (const eventId of [cases.login, cases.finance, cases.scanner])
    event(state, eventId).status = "expired";
  const offered = handoffOptions(state);
  expect(
    offered.options
      .filter((o) => o.id.startsWith("carry-"))
      .every((o) => o.label.includes("expired")),
  ).toBe(true);
  expect(
    offered.options.find((o) => o.id === "carry-finance")?.label,
  ).not.toContain("waiting for the data owner");
});

it("handoff accepts an approval source inspected by its canonical check action", () => {
  let state = world();
  event(state, cases.scanner).completedActionIds = ["review_alert"];
  state = applyAction(state, {
    id: "search_knowledge_base",
    eventId: cases.scanner,
    actorId: "user",
  }).state;
  state = applyWorkplaceInteraction(state, {
    type: "open_artifact",
    artifactId: "scanner-run-log",
  }).state;
  const offered = handoffOptions(state);
  const sent = applyAction(state, {
    id: "submit_shift_handoff",
    eventId: "shift-handoff-1",
    actorId: "user",
    handoffPayload: {
      sourceArtifactIds: [],
      followUp: "senior-review",
      selections: {
        version: "desk-options-v1",
        stateKey: offered.stateKey,
        optionIds: ["carry-scanner"],
      },
    },
  }).state;
  expect(sent.workplace.handoffSourceArtifactIds).toEqual([
    "scanner-run-log",
    "scanner-window",
  ]);
});

describe("self-audit: readable options and bounded records", () => {
  it.each([...Object.values(cases), "rivera-followup"])(
    "keeps 3–5 options in every assessed field for %s",
    (caseId) => {
      const state = world();
      if (caseId === "rivera-followup")
        event(state, cases.rivera).status = "resolved";
      for (const group of reasoningGroups(
        state,
        caseId === "rivera-followup" ? cases.rivera : caseId,
      ).filter((g) => g.id !== "context")) {
        expect(group.options.length).toBeGreaterThanOrEqual(3);
        expect(group.options.length).toBeLessThanOrEqual(5);
      }
    },
  );
  it("uses receipt evidence without requiring redundant pre-action authentication opening", () => {
    const selected: ReasoningSelection = {
      version: "desk-options-v1",
      phase: "follow-up",
      evidence: ["rivera-followup-evidence-1"],
      context: [],
      uncertainty: ["rivera-followup-uncertainty-1"],
      nextStep: ["rivera-followup-nextStep-1"],
    };
    expect(
      reviewReasoning(cases.rivera, selected, ["rivera-result-receipt"])
        .verdict,
    ).toBe("supported");
    const state = world();
    event(state, cases.rivera).status = "resolved";
    for (const group of reasoningGroups(state, cases.rivera))
      selected[group.id] = group.options.map((o) => o.id);
    expect(
      reviewReasoning(cases.rivera, selected, [
        "rivera-result-receipt",
        "rivera-auth-summary",
        "ticket-login-help",
      ]).verdict,
    ).toBe("needs_more_evidence");
  });
  it("opens the prior-run and cross-case deciding details from the relevant case", () => {
    let state = world();
    for (const [id, caseId, detail] of [
      ["scanner-prior-run", cases.scanner, "RUN-FIN-030"],
      ["scanner-other-notice", cases.scanner, "monitor until the window ends"],
      [
        "scanner-window",
        cases.finance,
        "It grants no finance data-access role",
      ],
      ["prior-session-1", cases.login, "does not verify S-0741"],
    ]) {
      state = applyWorkplaceInteraction(state, {
        type: "open_artifact",
        artifactId: required(id),
      }).state;
      const source = required(
        toClientView(state).artifacts.find((a) => a.id === id),
      );
      expect(source.eventIds).toContain(caseId);
      expect(source.observed).toBe(true);
      expect(source.body).toContain(detail);
    }
  });
  it("keeps key records at 40–80 words, factual rows, and explicit source limits", () => {
    const state = world();
    for (const id of [
      "login-session-timeline",
      "prior-session-1",
      "vpn-context-1",
      "travel-status-1",
      "login-follow-up-guide",
      "suspicious-login-alert",
      "login-context-1",
      "account-history-1",
      "device-inventory-1",
      "handoff-email",
      "employee-login-reply",
      "scanner-alert",
      "scanner-run-log",
      "scanner-window",
      "scanner-prior-run",
      "scanner-other-notice",
      "access-request-email",
      "access-approval-guide",
      "rivera-login-email",
      "rivera-auth-summary",
      "rivera-device-inventory",
      "login-troubleshooting-guide",
    ]) {
      const body = required(state.artifacts[id]).body;
      expect(body.trim().split(/\s+/).length, id).toBeGreaterThanOrEqual(40);
      expect(body.trim().split(/\s+/).length, id).toBeLessThanOrEqual(80);
      expect(
        body.trim().split(/\n/).filter(Boolean).length,
        id,
      ).toBeGreaterThanOrEqual(4);
      expect(
        body.trim().split(/\n/).filter(Boolean).length,
        id,
      ).toBeLessThanOrEqual(7);
      expect(body, id).toContain("Limit:");
    }
    const timeline = required(state.artifacts["login-session-timeline"]).body;
    for (const fact of [
      "07:38:02–07:40:51",
      "203.0.113.44",
      "07:41:09",
      "07:43",
      "07:45",
      "S-0731",
      "S-0741",
      "V-218",
      "unknown-laptop-17",
      "extra-check result absent",
      "no file/mail activity collected",
      "not independent corroboration",
    ])
      expect(timeline).toContain(fact);
    expect(required(state.artifacts["scanner-run-log"]).body).toContain(
      "10:05–10:32",
    );
    expect(required(state.artifacts["scanner-window"]).body).toContain(
      "10:00–12:00",
    );
    expect(required(state.artifacts["rivera-auth-summary"]).body).toContain(
      "08:36–08:41",
    );
    expect(required(state.artifacts["rivera-auth-summary"]).body).toContain(
      "08:42",
    );
  });
});
