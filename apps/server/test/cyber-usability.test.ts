import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type {
  ActionLogEntry,
  SimulationAction,
  WorkplaceInteraction,
} from "@sim/schemas";
import {
  applyAction,
  applyTaskAttempt,
  applyWorkplaceInteraction,
  createInitialWorldState,
  foldActionLog,
  toClientView,
} from "@sim/core";
import { buildDecisionReview } from "../src/domain/decision-review.js";

function shift() {
  const initial = createInitialWorldState(
    "usability",
    7,
    {},
    loadDefaultCybersecurityPack(),
  );
  let state = initial;
  const log: ActionLogEntry[] = [];
  const action = (
    id: SimulationAction["id"],
    eventId = "suspicious-login-1",
    extra: Partial<SimulationAction> = {},
  ) => {
    const value = { id, eventId, actorId: "user", ...extra };
    state = applyAction(state, value).state;
    log.push({
      sequence: log.length + 1,
      interaction: { type: "action", action: value },
    });
  };
  const inspect = (interaction: WorkplaceInteraction) => {
    state = applyWorkplaceInteraction(state, interaction).state;
    log.push({
      sequence: log.length + 1,
      interaction: { type: "workplace_interaction", interaction },
    });
  };
  return {
    initial,
    log,
    action,
    inspect,
    get state() {
      return state;
    },
  };
}
function investigate(order: string[]) {
  const run = shift();
  run.action("read_handoff", "handoff-1");
  run.action("acknowledge_handoff", "handoff-1", {
    freeText: "I will investigate the login first.",
  });
  run.action("review_alert");
  run.action("inspect_login_context");
  for (const id of order) run.action(id as SimulationAction["id"]);
  return run;
}
const ticket = {
  ticketId: "ticket-suspicious-login-1",
  verifiedEvidence: "The device is not managed.",
  uncertainty: "Session owner is not verified.",
  followUp: "Senior review.",
  sourceArtifactIds: ["device-inventory-1"],
};
describe("current Cyber shift usability and truthful provenance", () => {
  it("queries existing records, handles no match, revisits rows and replays without losing the case", () => {
    const run = shift();
    run.action("query_records", "suspicious-login-1", {
      queryPayload: {
        datasetId: "auth",
        filters: { user: "j.patel@example.com" },
      },
    });
    const result = toClientView(run.state).queryResults[0];
    expect(
      result?.records.some((record) => record.id === "AUTH-0741-PATEL"),
    ).toBe(true);
    if (!result) throw new Error("Missing query result");
    run.inspect({
      type: "inspect_query_record",
      queryId: result.queryId,
      recordId: "AUTH-0741-PATEL",
    });
    run.action("query_records", "suspicious-login-1", {
      queryPayload: { datasetId: "auth", filters: { user: "no-such-account" } },
    });
    expect(toClientView(run.state).queryResults[1]?.totalCount).toBe(0);
    run.inspect({
      type: "inspect_query_record",
      queryId: result.queryId,
      recordId: "AUTH-0741-PATEL",
    });
    expect(run.state.workplace.inspectedRecordIds).toEqual(["AUTH-0741-PATEL"]);
    expect(
      run.state.events.find(({ id }) => id === "suspicious-login-1")?.status,
    ).toBe("active");
    expect(foldActionLog(run.initial, run.log)).toEqual(run.state);
  });
  it.each([
    ["inspect_account_history", "check_device_inventory"],
    ["check_device_inventory", "inspect_account_history"],
  ])("preserves checks in alternate order %j", (...order) => {
    const run = investigate(order);
    expect(run.state.workplace.inspectedArtifactIds).toEqual(
      expect.arrayContaining([
        "login-context-1",
        "account-history-1",
        "device-inventory-1",
      ]),
    );
    expect(run.state.flags.d3_vpn).toBe("not-recorded");
    run.action("document_ticket", undefined, {
      ticketPayload: ticket,
      decisionOptionId: "escalate-with-comparisons",
    });
    run.action("escalate_alert");
    const review = buildDecisionReview(run.state, run.log).decisions[0];
    expect(
      review?.rubricSignals.find(({ id }) => id === "checked_device")
        ?.supported,
    ).toBe(true);
    expect(
      review?.rubricSignals.find(({ id }) => id === "compared_records")
        ?.supported,
    ).toBe(false);
    expect(review?.explanation).toContain(
      "Record the session timeline (S-0741 / S-0731) + VPN catalogue NET-VPN-04 comparison",
    );
    expect(
      run.state.pendingCallbacks.find(({ id }) => id === "b1-comparison-review")
        ?.body,
    ).not.toContain("comparisons are attached");
    expect(foldActionLog(run.initial, run.log)).toEqual(run.state);
  });
  it("names the unsaved comparison when every required source was opened and attached", () => {
    const run = investigate([
      "inspect_account_history",
      "check_device_inventory",
    ]);
    const sourceArtifactIds = [
      "login-session-timeline",
      "vpn-context-1",
      "device-inventory-1",
    ];
    for (const artifactId of sourceArtifactIds)
      run.inspect({ type: "open_artifact", artifactId });
    run.action("document_ticket", undefined, {
      ticketPayload: { ...ticket, sourceArtifactIds },
      decisionOptionId: "escalate-with-comparisons",
    });
    run.action("escalate_alert");
    const review = buildDecisionReview(run.state, run.log).decisions[0];
    expect(review?.outcomeLabel).toBe("partially_supported");
    expect(review?.explanation).toContain("using Record this comparison");
    expect(review?.explanation).not.toContain("Attach the");
    expect(
      run.state.pendingCallbacks.find(({ id }) => id === "b1-comparison-review")
        ?.body,
    ).toContain("reading or attaching them alone does not save that step");
    expect(run.state.flags.d3_vpn).toBe("not-recorded");
  });
  it("opening two records alone is not a comparison; explicit comparison is preserved before decision", () => {
    const run = investigate([
      "inspect_account_history",
      "check_device_inventory",
    ]);
    for (const artifactId of ["login-session-timeline", "vpn-context-1"])
      run.inspect({ type: "open_artifact", artifactId });
    run.inspect({
      type: "compare_artifacts",
      eventId: "suspicious-login-1",
      artifactIds: ["login-session-timeline", "vpn-context-1"],
    });
    expect(run.state.flags.d3_vpn).toBe("route-compared");
    run.action("document_ticket", undefined, {
      ticketPayload: {
        ...ticket,
        sourceArtifactIds: [
          "device-inventory-1",
          "login-session-timeline",
          "vpn-context-1",
        ],
      },
      decisionOptionId: "escalate-with-comparisons",
    });
    run.action("escalate_alert");
    expect(
      buildDecisionReview(run.state, run.log).decisions[0]?.rubricSignals.find(
        ({ id }) => id === "compared_records",
      )?.supported,
    ).toBe(true);
    expect(
      run.state.pendingCallbacks.find(({ id }) => id === "b1-comparison-review")
        ?.body,
    ).toContain(
      "flagged-session/VPN comparison and device inventory source are attached",
    );
  });
  it("does not describe completed review work as a future obligation in a later status update", () => {
    const run = investigate([
      "inspect_account_history",
      "check_device_inventory",
    ]);
    run.action("document_ticket", undefined, {
      ticketPayload: ticket,
      decisionOptionId: "escalate-identifiers-only",
    });
    run.action("escalate_alert");
    let state = run.state;
    const task = state.rules.tasks["morgan-midshift-update"];
    if (!task) throw new Error("Missing status task");
    for (const step of task.steps) {
      for (const source of step.options.flatMap(({ source }) =>
        source ? [source] : [],
      ))
        state = applyWorkplaceInteraction(state, {
          type: "open_artifact",
          artifactId: source.artifactId,
        }).state;
      state = applyTaskAttempt(state, {
        eventId: "status-check-1",
        taskId: task.id,
        selectedOptionIds: step.requiredOptionIds,
      }).state;
    }
    expect(state.ledger.at(-1)?.description).toContain(
      "login decision is already recorded",
    );
    expect(state.ledger.at(-1)?.description).not.toContain("finish the ticket");
  });
  it("offers only the recorded next step after escalation and rejects its obsolete option", () => {
    const run = investigate([
      "inspect_account_history",
      "check_device_inventory",
    ]);
    run.action("document_ticket", undefined, {
      ticketPayload: ticket,
      decisionOptionId: "escalate-with-comparisons",
    });
    run.action("escalate_alert");
    let state = run.state;
    const task = state.rules.tasks["morgan-midshift-update"];
    if (!task) throw new Error("Missing status task");
    for (const step of task.steps) {
      for (const source of step.options.flatMap(({ source }) =>
        source ? [source] : [],
      ))
        state = applyWorkplaceInteraction(state, {
          type: "open_artifact",
          artifactId: source.artifactId,
        }).state;
      const visible = toClientView(state).tasks.find(
        ({ id }) => id === task.id,
      );
      if (step.options.some(({ id }) => id === "review-in-progress")) {
        expect(visible?.options.map(({ id }) => id)).toEqual([
          "review-in-progress",
          "close-on-location",
        ]);
        expect(JSON.stringify(visible?.options)).not.toMatch(
          /notEquals|escalate-with-comparisons/,
        );
        expect(visible?.options.every((option) => !("when" in option))).toBe(
          true,
        );
        expect(
          applyTaskAttempt(state, {
            eventId: "status-check-1",
            taskId: task.id,
            selectedOptionIds: ["document-and-review"],
          }).accepted,
        ).toBe(false);
      }
      const turn = applyTaskAttempt(state, {
        eventId: "status-check-1",
        taskId: task.id,
        selectedOptionIds: step.options.some(
          ({ id }) => id === "review-in-progress",
        )
          ? ["review-in-progress"]
          : step.requiredOptionIds,
      });
      expect(turn.accepted).toBe(true);
      state = turn.state;
    }
    expect(state.taskProgress[`status-check-1:${task.id}`]?.completed).toBe(
      true,
    );
  });
  it("rejects uninspected handoff references and leaves uncompleted scanner work open", () => {
    const run = investigate([
      "inspect_account_history",
      "check_device_inventory",
    ]);
    run.action("document_ticket", undefined, {
      ticketPayload: ticket,
      decisionOptionId: "escalate-identifiers-only",
    });
    run.action("escalate_alert");
    run.action("ask_manager", "routine-alert-1", {
      freeText: "Which scanner record?",
    });
    run.action("ask_manager", "access-request-1", {
      freeText: "Access approval owner?",
    });
    expect(
      run.state.events.find(({ id }) => id === "shift-handoff-1")?.status,
    ).toBe("active");
    expect(() => {
      run.action("submit_shift_handoff", "shift-handoff-1", {
        handoffPayload: {
          sourceArtifactIds: ["scanner-run-log"],
          followUp: "senior-review",
        },
      });
    }).toThrow(/inspected/);
    run.action("submit_shift_handoff", "shift-handoff-1", {
      handoffPayload: {
        sourceArtifactIds: ["device-inventory-1"],
        followUp: "senior-review",
        note: "I checked VPN (typed claim only).",
      },
    });
    const body = run.state.teamMessages?.find(({ id }) =>
      id.endsWith("-handoff"),
    )?.body;
    expect(body).toContain(
      "Scanner connection alert review still needs a final decision",
    );
    expect(body).not.toContain("scanner run and approved window matched");
    expect(body).toContain("Additional note (your words)");
    const review = buildDecisionReview(run.state, run.log).decisions.find(
      ({ decisionId }) => decisionId === "shift_handoff",
    );
    expect(review?.evidenceUsedIds).toEqual(["device-inventory-1"]);
    expect(foldActionLog(run.initial, run.log)).toEqual(run.state);
  });
  it("irrelevant chat receives clarification without consuming procedural help", () => {
    const run = shift();
    run.action("ask_manager", undefined, {
      freeText: "Purple banana spaceship, where is lunch?",
    });
    expect(run.state.teamMessages?.at(-1)?.body).toContain(
      "device lookup, route/VPN comparison, or what remains uncertain",
    );
    expect(
      run.state.events.find(({ id }) => id === "suspicious-login-1")
        ?.managerConsulted,
    ).toBe(false);
    run.action("ask_manager", undefined, {
      freeText: "What login evidence should I check?",
    });
    expect(
      run.state.events.find(({ id }) => id === "suspicious-login-1")
        ?.managerConsulted,
    ).toBe(true);
  });
});
