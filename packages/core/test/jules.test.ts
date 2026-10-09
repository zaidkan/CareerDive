import { legacyCyberPack } from "./legacy-cyber.js";
import type { SimulationActionId, WorldState } from "@sim/schemas";
import { describe, expect, it } from "vitest";
import {
  applyWorkplaceInteraction,
  createInitialWorldState,
  julesDialogue,
  julesDialogueFromClientView,
  toClientView,
} from "../src/index.js";

const pack = legacyCyberPack();

function world(): WorldState {
  return createInitialWorldState("jules-session", 42, {}, pack);
}

function withLoginContext(
  completedActionIds: SimulationActionId[] = [
    "review_alert",
    "inspect_login_context",
  ],
): WorldState {
  const state = world();
  const event = state.events.find(({ id }) => id === "suspicious-login-1");
  if (!event) throw new Error("Missing suspicious login event");
  event.completedActionIds = completedActionIds;
  event.observedArtifactIds = ["suspicious-login-alert", "login-context-1"];
  state.observedArtifactIds = ["suspicious-login-alert", "login-context-1"];
  return state;
}

describe("purposeful deterministic Jules dialogue", () => {
  it("explains the first-day rhythm and gives purposeful topic guidance", () => {
    const initial = world();
    const firstDay = julesDialogue(initial, "first_day");

    expect(firstDay.speaker).toBe("Jules");
    expect(firstDay.text).toMatch(/monitor|notes|interrupt/i);
    expect(julesDialogue(initial, "break_room").text).toMatch(
      /short break|next step/i,
    );
    expect(julesDialogue(initial, "team_context").text).toMatch(
      /peer|Morgan|decision/i,
    );
  });

  it("changes current-work guidance with the safe public action stage", () => {
    const afterLoginContext = withLoginContext();
    const afterInvestigation = withLoginContext([
      "review_alert",
      "inspect_login_context",
      "inspect_account_history",
      "check_device_inventory",
    ]);
    const initialReply = julesDialogue(world(), "current_work");
    const contextReply = julesDialogue(afterLoginContext, "current_work");
    const investigationReply = julesDialogue(
      afterInvestigation,
      "current_work",
    );

    expect(initialReply.text).toMatch(/alert/i);
    expect(initialReply.nextSystemId).toBe("alert_dashboard");
    expect(contextReply.text).toMatch(/device|inventory/i);
    expect(contextReply.nextSystemId).toBe("knowledge_base");
    expect(investigationReply.text).toMatch(/notes|ticket/i);
    expect(investigationReply.nextSystemId).toBe("ticket_queue");
  });

  it("keeps required investigation ahead of an early dismiss option", () => {
    const afterReview = withLoginContext(["review_alert"]);
    const afterDeviceCheck = withLoginContext([
      "review_alert",
      "inspect_login_context",
      "check_device_inventory",
    ]);

    const contextReply = julesDialogue(afterReview, "current_work");
    const historyReply = julesDialogue(afterDeviceCheck, "current_work");
    const afterReviewActions = toClientView(afterReview).availableActions.map(
      ({ id }) => id,
    );
    const afterDeviceCheckActions = toClientView(
      afterDeviceCheck,
    ).availableActions.map(({ id }) => id);

    expect(afterReviewActions).toContain("dismiss_alert");
    expect(afterReviewActions).toContain("inspect_login_context");
    expect(contextReply.text).toMatch(/login context|context in Alerts/i);
    expect(contextReply.text).not.toMatch(/decision point/i);
    expect(contextReply.nextSystemId).toBe("alert_dashboard");
    expect(afterDeviceCheckActions).toContain("dismiss_alert");
    expect(afterDeviceCheckActions).toContain("inspect_account_history");
    expect(historyReply.text).toMatch(/account history/i);
    expect(historyReply.text).not.toMatch(/decision point/i);
    expect(historyReply.nextSystemId).toBe("alert_dashboard");
  });

  it("guides the visible shift handoff without exposing action identifiers", () => {
    const handoffStage = world();
    const login = handoffStage.events.find(
      ({ id }) => id === "suspicious-login-1",
    );
    if (!login) throw new Error("Missing suspicious login event");
    login.status = "resolved";

    const reply = julesDialogue(handoffStage, "current_work");
    const serialized = JSON.stringify(reply);

    expect(reply.text).toMatch(/open|read/i);
    expect(reply.text).toMatch(/shift handoff|unfinished work/i);
    expect(reply.nextSystemId).toBe("email");
    expect(serialized).not.toMatch(/read_handoff|action id|requiredOptionIds/i);
  });

  it("does not deny public work when an available action is unrecognized", () => {
    const view = toClientView(world());
    const utility = view.availableActions.find(
      ({ id }) => id === "update_notebook",
    );
    if (!utility) throw new Error("Missing public utility action");
    view.availableActions = [utility];

    const reply = julesDialogueFromClientView(view, "current_work");

    expect(reply.text).toMatch(/there is work available/i);
    expect(reply.text).not.toMatch(/isn't a new|no public work/i);
    expect(JSON.stringify(reply)).not.toContain("update_notebook");
  });

  it("ignores hidden facts, hidden assessment, and task answer keys", () => {
    const publicStage = withLoginContext();
    const poisoned = structuredClone(publicStage);
    poisoned.hidden = {
      stress: 9_001,
      fatigue: 9_002,
      trust: { jules: 9_003 },
      reputation: 9_004,
      cognitiveLoad: 9_005,
      taskBacklog: 9_006,
      accuracy: 9_007,
      riskExposure: 9_008,
    };
    poisoned.facts["employee-private-travel"] = {
      id: "employee-private-travel",
      content: "PRIVATE FACT CONTENT MUST NEVER APPEAR",
      visibility: "private",
      knownBy: ["employee"],
      notKnownBy: ["manager", "user"],
    };
    const task = poisoned.rules.tasks["device-owner-match"];
    if (!task?.steps[0]) throw new Error("Missing device inventory task");
    task.steps[0].requiredOptionIds = ["correct-answer-do-not-reveal"];

    const expected = julesDialogue(publicStage, "current_work");
    const actual = julesDialogue(poisoned, "current_work");
    const serialized = JSON.stringify(actual);

    expect(actual).toEqual(expected);
    expect(serialized).not.toMatch(
      /employee-private-travel|PRIVATE FACT CONTENT|requiredOptionIds|correct[- ]answer|correct final decision|9_00[1-8]/i,
    );
    expect(serialized).not.toMatch(
      /unknown-windows-device|not-enrolled|denied-login|escalate-evidence/i,
    );
  });

  it("uses the same resolver for a ClientView without exposing WorldState", () => {
    const state = withLoginContext();

    expect(
      julesDialogueFromClientView(toClientView(state), "current_work"),
    ).toEqual(julesDialogue(state, "current_work"));
  });

  it("uses canonical seen-topic state for deterministic follow-up wording", () => {
    const initial = world();
    const first = julesDialogue(initial, "first_day");
    const turn = applyWorkplaceInteraction(initial, {
      type: "talk_to_jules",
      topic: "first_day",
    });
    const repeat = julesDialogue(turn.state, "first_day");

    expect(repeat).not.toEqual(first);
    expect(julesDialogue(turn.state, "first_day")).toEqual(repeat);
    expect(turn.state.workplace.julesTopicsSeen).toEqual(["first_day"]);
    expect(turn.state.simClock).toBe(initial.simClock);
    expect(turn.state.ledger).toEqual(initial.ledger);
    expect(turn.effects).toEqual([]);

    const duplicate = applyWorkplaceInteraction(turn.state, {
      type: "talk_to_jules",
      topic: "first_day",
    });
    expect(duplicate.state.workplace.julesTopicsSeen).toEqual(["first_day"]);
  });
});
