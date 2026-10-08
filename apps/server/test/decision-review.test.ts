import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState } from "@sim/core";
import type { ActionLogEntry, WorldState } from "@sim/schemas";
import {
  buildDecisionReview,
  cohortForDecision,
  completedDecisions,
  optionSetKey,
} from "../src/domain/decision-review.js";
import { InMemoryRepository } from "../src/repository/in-memory.js";
import { createAppRouter } from "../src/trpc/router.js";

const pack = loadDefaultCybersecurityPack();
const owner = "user-1";

function fixture(sessionId = "decision-test") {
  const state = createInitialWorldState(sessionId, 24, {}, pack);
  state.careerVersion = "1.0.0";
  const log: ActionLogEntry[] = [
    {
      sequence: 1,
      interaction: {
        type: "workplace_interaction",
        interaction: {
          type: "open_artifact",
          artifactId: "login-session-timeline",
        },
      },
    },
    {
      sequence: 2,
      interaction: {
        type: "workplace_interaction",
        interaction: {
          type: "open_artifact",
          artifactId: "device-inventory-1",
        },
      },
    },
    {
      sequence: 3,
      interaction: {
        type: "workplace_interaction",
        interaction: { type: "open_artifact", artifactId: "vpn-context-1" },
      },
    },
    {
      sequence: 4,
      interaction: {
        type: "action",
        action: {
          id: "escalate_alert",
          eventId: "suspicious-login-1",
          actorId: "user",
        },
      },
    },
    {
      sequence: 4,
      interaction: {
        type: "notification_response",
        response: {
          notificationId: "routine-scanner-arrived",
          response: "snooze",
        },
      },
    },
    {
      sequence: 5,
      interaction: {
        type: "workplace_interaction",
        interaction: { type: "open_artifact", artifactId: "scanner-run-log" },
      },
    },
    {
      sequence: 6,
      interaction: {
        type: "workplace_interaction",
        interaction: { type: "open_artifact", artifactId: "scanner-window" },
      },
    },
    {
      sequence: 7,
      interaction: {
        type: "action",
        action: {
          id: "dismiss_alert",
          eventId: "routine-alert-1",
          actorId: "user",
        },
      },
    },
    {
      sequence: 8,
      interaction: {
        type: "workplace_interaction",
        interaction: {
          type: "open_artifact",
          artifactId: "access-approval-guide",
        },
      },
    },
    {
      sequence: 9,
      interaction: {
        type: "task_attempt",
        attempt: {
          taskId: "access-authority-check",
          eventId: "access-request-1",
          selectedOptionIds: ["route-to-owner"],
        },
      },
    },
    {
      sequence: 10,
      interaction: {
        type: "workplace_interaction",
        interaction: {
          type: "open_artifact",
          artifactId: "rivera-auth-summary",
        },
      },
    },
    {
      sequence: 11,
      interaction: {
        type: "task_attempt",
        attempt: {
          taskId: "employee-login-troubleshooting",
          eventId: "login-help-1",
          selectedOptionIds: ["phone-retries", "laptop-success"],
        },
      },
    },
    {
      sequence: 12,
      interaction: {
        type: "task_attempt",
        attempt: {
          taskId: "employee-login-troubleshooting",
          eventId: "login-help-1",
          selectedOptionIds: ["update-saved-password"],
        },
      },
    },
    {
      sequence: 13,
      interaction: {
        type: "task_attempt",
        attempt: {
          taskId: "end-shift-continuity",
          eventId: "shift-handoff-1",
          selectedOptionIds: ["login-records-checked", "scanner-checked"],
        },
      },
    },
    {
      sequence: 14,
      interaction: {
        type: "task_attempt",
        attempt: {
          taskId: "end-shift-continuity",
          eventId: "shift-handoff-1",
          selectedOptionIds: ["reviewer-question"],
        },
      },
    },
    {
      sequence: 15,
      interaction: {
        type: "task_attempt",
        attempt: {
          taskId: "end-shift-continuity",
          eventId: "shift-handoff-1",
          selectedOptionIds: ["next-analyst-review"],
        },
      },
    },
  ];
  log.forEach((entry, index) => {
    entry.sequence = index + 1;
  });
  state.taskProgress["suspicious-login-1:login-ticket-summary"] = {
    currentStep: 4,
    attempts: 5,
    completed: true,
    selectedOptionIdsByStep: {
      "summary-collection-limits": ["collection-coverage-limit"],
    },
    outcomeIdsByStep: {}, correctionHistory: [],
  };
  state.taskProgress["routine-alert-1:scanner-ticket-summary"] = {
    currentStep: 3,
    attempts: 4,
    completed: true,
    selectedOptionIdsByStep: { "scanner-decision": ["expected-close"] },
    outcomeIdsByStep: {}, correctionHistory: [],
  };
  state.taskProgress["access-request-1:access-authority-check"] = {
    currentStep: 0,
    attempts: 1,
    completed: true,
    selectedOptionIdsByStep: {
      "identify-approval-boundary": ["route-to-owner"],
    },
    outcomeIdsByStep: {}, correctionHistory: [],
  };
  state.taskProgress["login-help-1:employee-login-troubleshooting"] = {
    currentStep: 1,
    attempts: 2,
    completed: true,
    selectedOptionIdsByStep: {
      "login-help-evidence": ["phone-retries", "laptop-success"],
      "login-help-next-step": ["update-saved-password"],
    },
    outcomeIdsByStep: {}, correctionHistory: [],
  };
  state.taskProgress["shift-handoff-1:end-shift-continuity"] = {
    currentStep: 2,
    attempts: 3,
    completed: true,
    selectedOptionIdsByStep: {
      "handoff-checked": ["login-records-checked", "scanner-checked"],
      "handoff-open-question": ["reviewer-question"],
      "handoff-next-owner": ["next-analyst-review"],
    },
    outcomeIdsByStep: {}, correctionHistory: [],
  };
  for (const [eventId, actionId] of [
    ["access-request-1", "route_access_request"],
    ["login-help-1", "resolve_login_help"],
    ["shift-handoff-1", "submit_shift_handoff"],
  ] as const) {
    const event = state.events.find(({ id }) => id === eventId);
    if (!event) throw new Error(`Missing event ${eventId}`);
    event.completedActionIds.push(actionId);
  }
  return { state, log };
}

describe("end-of-shift decision review", () => {
  it("uses recorded choices, inspected sources, accepted steps, and five canonical decisions", () => {
    const { state, log } = fixture();
    const review = buildDecisionReview(state, log);
    expect(
      review.decisions.map(({ decisionId, userChoiceId }) => [
        decisionId,
        userChoiceId,
      ]),
    ).toEqual([
      ["suspicious_login", "escalate_alert"],
      ["scanner_interruption", "snooze"],
      ["finance_access", "route_access_request"],
      ["routine_login", "resolve_login_help"],
      ["shift_handoff", "submit_shift_handoff"],
    ]);
    expect(review.decisions[0]?.evidenceUsedIds).toEqual([
      "device-inventory-1",
      "vpn-context-1",
      "login-session-timeline",
    ]);
    expect(review.decisions[0]?.outcomeLabel).toBe("supported");
    expect(review.decisions[1]?.outcomeLabel).toBe("supported");
    expect(review.decisions[1]?.reasoningAnalysis?.evidenceUsedBeforeDecision).toEqual([]);
    expect(review.decisions[1]?.evidenceUsedIds).toContain("scanner-run-log");
    expect(review.decisions[2]?.rubricSignals).toContainEqual({
      id: "stayed_in_role",
      supported: true,
    });
    expect(review.profile).toHaveLength(6);
  });

  it.each(["dismiss_alert", "escalate_alert"] as const)(
    "reviews A-1042 %s without inventing evidence",
    (choice) => {
      const { state, log } = fixture();
      const action = log[3]?.interaction;
      if (action?.type !== "action") throw new Error("Missing case action");
      action.action.id = choice;
      const review = buildDecisionReview(state, log);
      expect(review.decisions[0]?.userChoiceId).toBe(choice);
      expect(review.decisions[0]?.outcomeLabel).toBe(
        choice === "dismiss_alert" ? "partially_supported" : "supported",
      );
      expect(review.decisions[0]?.evidenceUsedIds).not.toContain(
        "travel-status-1",
      );
    },
  );

  it.each(["handle", "snooze", "continue"] as const)(
    "treats scanner timing %s as a defensible choice with follow-through",
    (choice) => {
      const { state, log } = fixture();
      const entry = log[4]?.interaction;
      if (entry?.type !== "notification_response")
        throw new Error("Missing scanner response");
      entry.response.response = choice;
      expect(buildDecisionReview(state, log).decisions[1]).toMatchObject({
        userChoiceId: choice,
        outcomeLabel: "supported",
      });
    },
  );

  it("requires scanner run and window inspections before a supported closure", () => {
    const { state, log } = fixture();
    const withoutRun = log.filter((entry) =>
      entry.interaction.type !== "workplace_interaction" ||
      entry.interaction.interaction.type !== "open_artifact" ||
      entry.interaction.interaction.artifactId !== "scanner-run-log"
    );
    const review = buildDecisionReview(state, withoutRun);
    expect(review.decisions[1]?.outcomeLabel).toBe("partially_supported");
    expect(review.decisions[1]?.rubricSignals.find(({ id }) => id === "checked_run"))
      .toEqual({ id: "checked_run", supported: false });
    expect(review.decisions[1]?.explanation).not.toContain("Your later run and window checks");
    const withoutBoth = withoutRun.filter((entry) =>
      entry.interaction.type !== "workplace_interaction" ||
      entry.interaction.interaction.type !== "open_artifact" ||
      entry.interaction.interaction.artifactId !== "scanner-window"
    );
    expect(buildDecisionReview(state, withoutBoth).decisions[1]?.outcomeLabel)
      .toBe("needs_more_evidence");
  });

  it("does not praise completed work without inspected support", () => {
    const { state, log } = fixture();
    const noSources = log.filter((entry) => entry.interaction.type !== "workplace_interaction");
    const review = buildDecisionReview(state, noSources);
    expect(review.decisions[0]?.outcomeLabel).toBe("needs_more_evidence");
    expect(review.decisions[1]?.outcomeLabel).toBe("needs_more_evidence");
    expect(review.decisions[2]?.outcomeLabel).toBe("partially_supported");
    expect(review.decisions[3]?.outcomeLabel).toBe("partially_supported");
    expect(review.decisions[4]?.outcomeLabel).toBe("partially_supported");
    expect(review.decisions[3]?.explanation).not.toContain("You compared the phone retries");
    expect(review.decisions[4]?.explanation).not.toContain("Your handoff named checked work");
  });

  it("keeps unsupported task work and missing handoff visible", () => {
    const { state, log } = fixture();
    state.taskProgress = {};
    const handoff = state.events.find(({ id }) => id === "shift-handoff-1");
    if (!handoff) throw new Error("Missing handoff event");
    handoff.completedActionIds = [];
    const review = buildDecisionReview(state, log);
    expect(review.decisions[4]?.userChoiceId).toBeNull();
    expect(review.decisions[4]?.outcomeLabel).toBe("needs_more_evidence");
    expect(review.decisions[3]?.outcomeLabel).toBe("needs_more_evidence");
  });

  it("credits default-effect inspections only before the committed decision", () => {
    const { state } = fixture();
    const log: ActionLogEntry[] = [
      { sequence: 1, interaction: { type: "action", action: { id: "inspect_login_context", eventId: "suspicious-login-1", actorId: owner } } },
      { sequence: 2, interaction: { type: "action", action: { id: "escalate_alert", eventId: "suspicious-login-1", actorId: owner } } },
      { sequence: 3, interaction: { type: "action", action: { id: "inspect_account_history", eventId: "suspicious-login-1", actorId: owner } } },
    ];
    expect(buildDecisionReview(state, log).decisions[0]?.evidenceUsedIds).toEqual(["login-context-1"]);
    const committed = log[1];
    if (!committed) throw new Error("Missing decision fixture");
    committed.sequence = 4;
    log.sort((a, b) => a.sequence - b.sequence);
    expect(buildDecisionReview(state, log).decisions[0]?.evidenceUsedIds).toEqual(["login-context-1", "account-history-1"]);
  });

  it("requires complete fields and key inspected attachments for strong documentation", () => {
    const { state, log } = fixture();
    delete state.taskProgress["suspicious-login-1:login-ticket-summary"];
    delete state.taskProgress["routine-alert-1:scanner-ticket-summary"];
    const caseTicket = {
      ticketId: "ticket-suspicious-login-1", linkedWorkItemIds: ["suspicious-login-1"],
      status: "pending_review" as const, entityRefs: [], evidenceFactIds: [],
      verifiedEvidence: "Timeline and VPN routes differ; device ownership unconfirmed.",
      uncertainty: "Session ownership is not verified.", followUp: "Ask senior reviewer to verify ownership.",
      disposition: "escalate-with-comparisons",
      sourceArtifactIds: ["login-session-timeline", "vpn-context-1", "device-inventory-1"],
    };
    const scannerTicket = {
      ...caseTicket, ticketId: "ticket-routine-alert-1", linkedWorkItemIds: ["routine-alert-1"],
      verifiedEvidence: "Run ID and target match the approved window.",
      disposition: "expected-close", sourceArtifactIds: ["scanner-run-log", "scanner-window"],
    };
    state.structuredTickets = { case: caseTicket, scanner: scannerTicket };
    const documentation = () => buildDecisionReview(state, log).profile.find(({ dimension }) => dimension === "Documentation");
    expect(documentation()?.state).toBe("strong");
    scannerTicket.sourceArtifactIds = ["scanner-run-log"];
    expect(documentation()?.state).toBe("developing");
    expect(documentation()?.explanation).toContain(state.artifacts["scanner-window"]?.title);
    caseTicket.followUp = "   ";
    expect(documentation()?.state).toBe("needs_more_evidence");
    expect(documentation()?.explanation).toContain("Next step");
    scannerTicket.sourceArtifactIds = ["scanner-run-log", "scanner-window"];
    caseTicket.followUp = "Senior review";
    scannerTicket.disposition = "unrelated text";
    expect(documentation()?.state).toBe("developing");
  });

  it("does not call a thin generated handoff supported; names missing references", () => {
    const { state, log } = fixture();
    state.careerVersion = "2.0.0";
    state.flags.b3_choice = "complete";
    const sources = ["login-session-timeline", "vpn-context-1", "device-inventory-1"];
    state.workplace.inspectedArtifactIds = sources;
    const payload = { sourceArtifactIds: ["device-inventory-1"], followUp: "senior-review" as const };
    log.push({ sequence: 20, interaction: { type: "action", action: {
      id: "submit_shift_handoff", eventId: "shift-handoff-1", actorId: owner, handoffPayload: payload,
    } } });
    let review = buildDecisionReview(state, log);
    expect(review.decisions[4]?.outcomeLabel).toBe("partially_supported");
    expect(review.decisions[4]?.explanation).toContain(state.artifacts["vpn-context-1"]?.title);
    expect(review.profile.find(({ dimension }) => dimension === "Handoff clarity")?.state).toBe("developing");
    payload.sourceArtifactIds = sources;
    expect(buildDecisionReview(state, log).decisions[4]?.outcomeLabel).toBe("supported");
    state.workplace.inspectedArtifactIds = ["device-inventory-1"];
    review = buildDecisionReview(state, log);
    expect(review.decisions[4]?.outcomeLabel).toBe("partially_supported");
    expect(review.decisions[4]?.rubricSignals).toContainEqual({ id: "named_confirmed_work", supported: false });
  });

  it("credits a later source-backed handoff without retroactively improving the earlier decision", () => {
    const { state, log } = fixture();
    delete state.taskProgress["suspicious-login-1:login-ticket-summary"];
    const sources = ["login-session-timeline", "vpn-context-1", "device-inventory-1"];
    state.workplace.inspectedArtifactIds = sources;
    const ticket = {
      ticketId: "ticket-suspicious-login-1", linkedWorkItemIds: ["suspicious-login-1"],
      status: "pending_review" as const, entityRefs: [], evidenceFactIds: [],
      sourceArtifactIds: sources, verifiedEvidence: "Timeline/VPN route difference and unverified device.",
      uncertainty: "Session owner is unverified.", followUp: "Senior reviewer checks ownership.",
      disposition: "escalate-with-comparisons",
    };
    state.structuredTickets.case = ticket;
    log.push({ sequence: 200, interaction: { type: "action", action: {
      id: "document_ticket", eventId: "suspicious-login-1", actorId: owner,
      ticketPayload: { ticketId: ticket.ticketId, sourceArtifactIds: sources,
        verifiedEvidence: ticket.verifiedEvidence, uncertainty: ticket.uncertainty,
        followUp: ticket.followUp, disposition: ticket.disposition },
    } } });
    log.push({ sequence: 210, interaction: { type: "action", action: {
      id: "submit_shift_handoff", eventId: "shift-handoff-1", actorId: owner,
      handoffPayload: { sourceArtifactIds: sources, followUp: "senior-review" },
    } } });
    const review = buildDecisionReview(state, log);
    expect(review.decisions[0]?.outcomeLabel).toBe("partially_supported");
    expect(review.decisions[0]?.rubricSignals).toContainEqual({ id: "documented_uncertainty", supported: false });
    expect(review.decisions[4]?.outcomeLabel).toBe("supported");
    expect(review.profile.find(({ dimension }) => dimension === "Handoff clarity")?.state).toBe("strong");
    expect(review.profile.find(({ dimension }) => dimension === "Documentation")?.state).toBe("developing");
  });

  it("hides small cohorts and derives whole percentages from counts", () => {
    const { state, log } = fixture();
    const decisions = buildDecisionReview(state, log).decisions;
    expect(decisions.find(({ decisionId }) => decisionId === "suspicious_login")?.comparisonEligible).toBe(true);
    expect(decisions.find(({ decisionId }) => decisionId === "scanner_interruption")?.comparisonEligible).toBe(true);
    expect(decisions.filter(({ comparisonEligible }) => !comparisonEligible)).toHaveLength(3);
    expect(cohortForDecision("finance_access", [
      { decisionId: "finance_access", choiceId: "route_access_request", count: 30 },
    ])).toEqual({ status: "unavailable" });
    expect(
      cohortForDecision("scanner_interruption", [
        { decisionId: "scanner_interruption", choiceId: "handle", count: 29 },
      ]),
    ).toEqual({ status: "insufficient" });
    const ready = cohortForDecision("scanner_interruption", [
      { decisionId: "scanner_interruption", choiceId: "handle", count: 10 },
      { decisionId: "scanner_interruption", choiceId: "snooze", count: 10 },
      { decisionId: "scanner_interruption", choiceId: "continue", count: 10 },
    ]);
    expect(ready.status).toBe("ready");
    if (ready.status === "ready") {
      expect(ready.sampleSize).toBe(30);
      expect(
        Object.values(ready.percentages).reduce((sum, value) => sum + value, 0),
      ).toBe(100);
      expect(ready.counts.handle).toBe(10);
      expect(ready.percentages).toEqual({ handle: 34, snooze: 33, continue: 33 });
    }
  });

  it("isolates cohorts by exact option set", () => {
    const choices = ["route-to-owner", "route-with-interim", "self-approve", "reject-as-attack"];
    const key = optionSetKey(choices);
    const rows = [
      { decisionId: "finance_access", choiceId: "route-to-owner", optionSetKey: key, count: 29 },
      { decisionId: "finance_access", choiceId: "route-to-owner", optionSetKey: optionSetKey(["route-to-owner", "self-approve"]), count: 100 },
    ];
    expect(cohortForDecision("finance_access", rows, choices)).toEqual({ status: "insufficient" });
    const firstRow = rows[0];
    if (!firstRow) throw new Error("Missing cohort fixture");
    firstRow.count = 30;
    expect(cohortForDecision("finance_access", rows, choices)).toEqual({
      status: "ready", sampleSize: 30,
      counts: Object.fromEntries(choices.map((choice) => [choice, choice === "route-to-owner" ? 30 : 0])),
      percentages: Object.fromEntries(choices.map((choice) => [choice, choice === "route-to-owner" ? 100 : 0])),
    });
    expect(cohortForDecision("finance_access", [{ ...firstRow, count: Number.NaN }], choices))
      .toEqual({ status: "unavailable" });
  });

  it("keeps authored V2 reasoning and correction history", () => {
    const { state, log } = fixture();
    state.careerVersion = "2.0.0";
    state.taskProgress["suspicious-login-1:final-disposition"] = {
      currentStep: 0, attempts: 1, completed: true, selectedOptionIdsByStep: {},
      outcomeIdsByStep: { disposition: "close-familiar-account" }, correctionHistory: [],
    };
    const handoffProgress = state.taskProgress["shift-handoff-1:end-shift-continuity"];
    if (!handoffProgress) throw new Error("Missing handoff fixture");
    handoffProgress.outcomeIdsByStep = { final: "corrected" };
    handoffProgress.correctionHistory = [
      { stepId: "handoff-checked", initialOptionIds: ["scanner-checked"], correctedOptionIds: ["scanner-checked", "login-records-checked"] },
    ];
    state.pendingCallbacks.push({
      id: "reviewer-follow-up", eventId: "suspicious-login-1", actionId: "dismiss_alert",
      delayMinutes: 1, dueAt: 1, applied: true, when: [], author: "reviewer",
      body: "Reviewer requested route verification.", activationMessages: [], requiredAtCompletion: true,
    });
    const review = buildDecisionReview(state, log);
    expect(review.decisions[0]?.userChoiceId).toBe("close-familiar-account");
    expect(review.decisions[0]?.reasoningAnalysis?.callbackText).toEqual(["Reviewer requested route verification."]);
    expect(review.decisions[4]?.userChoiceId).toBe("corrected");
    expect(review.decisions[4]?.reasoningAnalysis?.correctionHistory[0]?.initialOptionIds).toEqual(["scanner-checked"]);
  });

  it("cuts direct-ticket evidence off at the committed V2 decision", () => {
    const { state } = fixture();
    state.careerVersion = "2.0.0";
    state.flags.b1_choice = "close-location-explained";
    const log: ActionLogEntry[] = [
      { sequence: 1, interaction: { type: "workplace_interaction", interaction: { type: "open_artifact", artifactId: "device-inventory-1" } } },
      { sequence: 2, interaction: { type: "action", action: { id: "document_ticket", eventId: "suspicious-login-1", actorId: "user", decisionOptionId: "close-location-explained" } } },
      { sequence: 3, interaction: { type: "workplace_interaction", interaction: { type: "open_artifact", artifactId: "vpn-context-1" } } },
    ];
    expect(buildDecisionReview(state, log).decisions[0]?.reasoningAnalysis?.evidenceUsedBeforeDecision)
      .toEqual(["device-inventory-1"]);
  });

  it("keeps free-form notes out of comparison records", () => {
    const { state, log } = fixture();
    state.notebook = "PRIVATE LEARNER NOTE";
    state.completedActionIds.push("complete_shift");
    log.push({
      sequence: 17,
      interaction: {
        type: "action",
        action: {
          id: "update_notebook",
          eventId: "suspicious-login-1",
          actorId: "user",
          freeText: "PRIVATE LEARNER NOTE",
        },
      },
    });
    const rows = completedDecisions(state, log, pack.career.id);
    expect(rows).toHaveLength(5);
    expect(JSON.stringify(rows)).not.toContain("PRIVATE LEARNER NOTE");
    expect(Object.keys(rows[0] ?? {}).sort()).toEqual([
      "careerId",
      "careerVersion",
      "choiceId",
      "decisionId",
      "sessionId",
    ]);
  });

  it("excludes tutorials and journeys without a recorded career version", () => {
    const tutorial = { ...fixture().state, sessionKind: "tutorial" } as unknown as WorldState;
    const log = fixture().log;
    tutorial.completedActionIds.push("complete_shift");
    expect(completedDecisions(tutorial, log, pack.career.id)).toEqual([]);
    const oldJourney = fixture().state;
    oldJourney.completedActionIds.push("complete_shift");
    delete oldJourney.careerVersion;
    expect(completedDecisions(oldJourney, log, pack.career.id)).toEqual([]);
    expect(buildDecisionReview(oldJourney, log).careerVersion).toBe("unknown");
  });

  it("counts each completed journey once; excludes incomplete and other career versions", async () => {
    const repository = new InMemoryRepository();
    for (let index = 0; index < 31; index++) {
      const { state, log } = fixture(`journey-${String(index)}`);
      if (index === 30) state.careerVersion = "2.0.0";
      if (index !== 29) state.completedActionIds.push("complete_shift");
      await repository.createSession(owner, state);
      const session = await repository.getSession(owner, state.sessionId);
      session.actionLog = log;
      const rows = completedDecisions(state, log, pack.career.id);
      await repository.saveSession(session);
      await repository.saveCompletedDecisions(rows);
      await repository.saveCompletedDecisions(rows);
    }
    const counts = await repository.getCohortCounts(
      pack.career.id,
      "1.0.0",
    );
    expect(
      counts.find(
        ({ decisionId, choiceId }) =>
          decisionId === "scanner_interruption" && choiceId === "snooze",
      )?.count,
    ).toBe(29);
    expect(cohortForDecision("scanner_interruption", counts).status).toBe(
      "insufficient",
    );
    expect(
      await repository.getCohortCounts(pack.career.id, "2.0.0"),
    ).toContainEqual({
      decisionId: "scanner_interruption",
      choiceId: "snooze",
      optionSetKey: optionSetKey(["handle", "snooze", "continue"]),
      count: 1,
    });
    expect(JSON.stringify(counts)).not.toMatch(
      /noteText|freeText|ownerId|J\. Patel/,
    );
    await repository.deleteSession(owner, "journey-30");
    expect(await repository.getCohortCounts(pack.career.id, "2.0.0")).toEqual(
      [],
    );
  });

  it("persists choices on actual completion and preserves personal review when cohort lookup fails", async () => {
    const repository = new InMemoryRepository();
    const { state, log } = fixture("completed-test");
    state.events.forEach((event) => {
      event.status = "resolved";
    });
    await repository.createSession(owner, state);
    const session = await repository.getSession(owner, state.sessionId);
    session.actionLog = log;
    await repository.saveSession(session);
    const caller = createAppRouter(repository).createCaller({ userId: owner });
    await caller.simulation.performAction({
      sessionId: state.sessionId,
      actionId: "complete_shift",
      eventId: "shift",
    });
    const lengthAfterFirst = (
      await repository.getSession(owner, state.sessionId)
    ).actionLog.length;
    await caller.simulation.performAction({
      sessionId: state.sessionId,
      actionId: "complete_shift",
      eventId: "shift",
    });
    expect(
      (await repository.getSession(owner, state.sessionId)).actionLog,
    ).toHaveLength(lengthAfterFirst);
    expect(
      (
        await repository.getCohortCounts(
          pack.career.id,
          "1.0.0",
        )
      ).find(({ decisionId }) => decisionId === "suspicious_login")?.count,
    ).toBe(1);
    repository.getCohortCounts = async () => {
      throw new Error("cohort offline");
    };
    const debrief = await caller.debrief.get({ sessionId: state.sessionId });
    expect(debrief.decisionReview?.decisions).toHaveLength(5);
    expect(debrief.decisionReview?.decisions[0]?.cohort).toEqual({
      status: "unavailable",
    });
  });

  it("keeps completion and personal recap when review persistence fails", async () => {
    const repository = new InMemoryRepository();
    const { state, log } = fixture("review-write-failure");
    state.events.forEach((event) => { event.status = "resolved"; });
    await repository.createSession(owner, state);
    const session = await repository.getSession(owner, state.sessionId);
    session.actionLog = log;
    await repository.saveSession(session);
    const saveCompletedDecisions = repository.saveCompletedDecisions.bind(repository);
    repository.saveCompletedDecisions = async () => { throw new Error("review table unavailable"); };
    const caller = createAppRouter(repository).createCaller({ userId: owner });
    await caller.simulation.performAction({ sessionId: state.sessionId, actionId: "complete_shift", eventId: "shift" });
    const saved = await repository.getSession(owner, state.sessionId);
    expect(saved.state.completedActionIds).toContain("complete_shift");
    const debrief = await caller.debrief.get({ sessionId: state.sessionId });
    expect(debrief.decisionReview?.decisions).toHaveLength(5);
    expect(debrief.decisionReview?.decisions[0]?.cohort).toEqual({ status: "unavailable" });
    repository.saveCompletedDecisions = saveCompletedDecisions;
    await caller.simulation.performAction({ sessionId: state.sessionId, actionId: "complete_shift", eventId: "shift" });
    expect((await repository.getSession(owner, state.sessionId)).actionLog).toHaveLength(saved.actionLog.length);
    expect((await caller.debrief.get({ sessionId: state.sessionId }))
      .decisionReview?.decisions[0]?.cohort).toEqual({ status: "unavailable" });
  });

  it("deduplicates concurrent completion and retry", async () => {
    const repository = new InMemoryRepository();
    const { state, log } = fixture("concurrent-completion");
    state.events.forEach((event) => { event.status = "resolved"; });
    await repository.createSession(owner, state);
    const session = await repository.getSession(owner, state.sessionId);
    session.actionLog = log;
    await repository.saveSession(session);
    const caller = createAppRouter(repository).createCaller({ userId: owner });
    await Promise.all(Array.from({ length: 3 }, () =>
      caller.simulation.performAction({ sessionId: state.sessionId, actionId: "complete_shift", eventId: "shift" })
    ));
    const saved = await repository.getSession(owner, state.sessionId);
    expect(saved.actionLog.filter((entry) => entry.interaction.type === "action" &&
      entry.interaction.action.id === "complete_shift")).toHaveLength(1);
    expect((await repository.getCohortCounts(pack.career.id, "1.0.0"))
      .find(({ decisionId }) => decisionId === "suspicious_login")?.count).toBe(1);
  });
});
