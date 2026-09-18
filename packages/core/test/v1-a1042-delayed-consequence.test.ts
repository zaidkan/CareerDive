import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type { SimulationActionId, WorldState } from "@sim/schemas";
import {
  applyAction,
  applyTaskAttempt,
  applyWorkplaceInteraction,
  availableActions,
  createInitialWorldState,
  foldActionLog,
  toClientView,
} from "../src/index.js";

/**
 * V1 thin delayed-consequence slice — A-1042 only.
 *
 * Pins the canonical occupational experience:
 *
 *   investigate -> make/document a decision -> resume work ->
 *   later canonical action boundary -> believable follow-up.
 *
 * Uses ONLY the existing deterministic scheduler
 * (`consequence.delayMinutes` + `applyDueConsequences` in @sim/core) and the
 * shipped pack consequence on `dismiss_alert` for `suspicious-login-1`
 * (`content/packs/cybersecurity-analyst/pack.yaml`: delayMinutes 40,
 * escalateOnApply true). No second scheduler, no RNG, no wall clock, no
 * grading, no ticket-lite dependency (schema exists but runtime is a later
 * lane).
 *
 * Assertions cover the V1 contract:
 * - the decision schedules exactly one consequence
 * - it does not fire immediately
 * - intervening work can occur before it fires
 * - it fires at a deterministic later action boundary
 * - replay reproduces the identical consequence and never duplicates it
 * - repeated post-fire actions do not re-apply or re-schedule it
 * - the wrong/nonqualifying state (escalate instead of dismiss) never
 *   triggers the reopen consequence
 * - player-visible output carries no correctness grading
 * - hidden assessment state remains hidden after the follow-up
 */

const EVENT_ID = "suspicious-login-1";
const ROUTINE_EVENT = "routine-alert-1";
const CONSEQUENCE_MINUTES = 40;
const GRADING_PATTERN = /correct|incorrect|good job|good work|right answer|wrong (answer|decision|choice)|score|grade\b|expected.?(nocase|verdict|answer)|ideal/i;

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing fixture");
  return value;
}

function world(sessionId = "v1-consequence") {
  return createInitialWorldState(sessionId, 7, {}, loadDefaultCybersecurityPack());
}

/** Open every source artifact and answer each step of a legacy task. */
function completeTask(
  initial: WorldState,
  actionId: SimulationActionId,
  eventId: string,
): WorldState {
  let state = initial;
  const action = toClientView(state).availableActions.find(
    (a) => a.id === actionId && a.eventId === eventId,
  );
  if (!action?.taskId) {
    const turn = applyAction(state, { id: actionId, eventId, actorId: "user" });
    return turn.state;
  }
  const task = required(state.rules.tasks[action.taskId]);
  for (const step of task.steps) {
    for (const artifactId of new Set(
      step.options.flatMap((o) => (o.source ? [o.source.artifactId] : [])),
    )) {
      if (state.observedArtifactIds.includes(artifactId)) continue;
      state = applyWorkplaceInteraction(state, {
        type: "open_artifact",
        artifactId,
      }).state;
    }
    const turn = applyTaskAttempt(state, {
      taskId: task.id,
      eventId,
      selectedOptionIds: step.requiredOptionIds,
    });
    state = turn.state;
  }
  return state;
}

/** Run the full A-1042 investigation chain (all released P3 actions). */
function investigate(initial: WorldState): WorldState {
  let state = initial;
  for (const id of [
    "review_alert",
    "inspect_login_context",
    "inspect_account_history",
    "check_device_inventory",
  ] as const) {
    state = completeTask(state, id, EVENT_ID);
  }
  return state;
}

/** Routine work the player can do between the decision and its fire point. */
function routineWork(initial: WorldState): WorldState {
  let state = initial;
  for (const id of ["review_alert", "search_knowledge_base"] as const) {
    state = completeTask(state, id, ROUTINE_EVENT);
  }
  state = completeTask(state, "document_ticket", ROUTINE_EVENT);
  return state;
}

function dismissConsequence(state: WorldState) {
  return state.ledger.filter(
    (e) => e.eventId === EVENT_ID && e.actionId === "dismiss_alert",
  );
}

describe("V1 A-1042 delayed consequence", () => {
  it("schedules exactly one consequence at dismissal, not applied immediately", () => {
    const state = investigate(world());
    const dismissed = completeTask(state, "dismiss_alert", EVENT_ID);

    const entries = dismissConsequence(dismissed);
    expect(entries).toHaveLength(1);
    const [entry] = entries;
    expect(entry?.applied).toBe(false);
    expect(entry?.dueAt).toBe(dismissed.simClock + CONSEQUENCE_MINUTES);
    expect(entry?.createdAt).toBe(dismissed.simClock);
    // The reopened/related-activity message is not visible to the player yet.
    expect(toClientView(dismissed).operationalMessages.join(" ")).not.toMatch(
      /needs renewed attention|related activity/i,
    );
  });

  it("does not fire immediately after the decision", () => {
    const state = investigate(world());
    const dismissed = completeTask(state, "dismiss_alert", EVENT_ID);

    expect(dismissed.events.find((e) => e.id === EVENT_ID)?.status).toBe(
      "resolved",
    );
    expect(dismissConsequence(dismissed)[0]?.applied).toBe(false);
    expect(dismissed.events.find((e) => e.id === EVENT_ID)?.resolution).toMatch(
      /VPN/i,
    );
  });

  it("lets intervening work happen before the follow-up fires", () => {
    const state = investigate(world());
    const dismissed = completeTask(state, "dismiss_alert", EVENT_ID);
    // Lighter interim work that stays inside the 40-minute window.
    const afterInterim = completeTask(
      completeTask(dismissed, "review_alert", ROUTINE_EVENT),
      "search_knowledge_base",
      ROUTINE_EVENT,
    );

    expect(afterInterim.simClock).toBeGreaterThan(dismissed.simClock);
    expect(afterInterim.simClock).toBeLessThan(
      dismissed.simClock + CONSEQUENCE_MINUTES,
    );
    const entry = dismissConsequence(afterInterim)[0];
    expect(entry?.applied).toBe(false);
    expect(afterInterim.events.find((e) => e.id === EVENT_ID)?.status).toBe(
      "resolved",
    );
  });

  it("fires at a deterministic later action boundary", () => {
    const state = investigate(world());
    const dismissed = completeTask(state, "dismiss_alert", EVENT_ID);
    expect(dismissed.events.find((e) => e.id === EVENT_ID)?.status).toBe(
      "resolved",
    );

    const fired = routineWork(dismissed);
    const entry = dismissConsequence(fired)[0];
    expect(entry?.applied).toBe(true);
    expect(entry?.dueAt).toBeLessThanOrEqual(fired.simClock);
    expect(fired.events.find((e) => e.id === EVENT_ID)?.status).toBe(
      "escalated",
    );
    const view = toClientView(fired);
    expect(view.operationalMessages.join(" ")).toMatch(
      /needs renewed attention/i,
    );
    expect(
      fired.events.find((e) => e.id === EVENT_ID)?.resolution,
    ).toMatch(/reopen the review/i);
  });

  it("replays to an identical state with no duplicate delivery", () => {
    const initial = investigate(world("replay"));
    const interactions: Parameters<typeof foldActionLog>[1] = [];
    let state = initial;
    const push = (id: SimulationActionId, eventId: string) => {
      state = completeTask(state, id, eventId);
      interactions.push({
        sequence: interactions.length + 1,
        interaction: { type: "action", action: { id, eventId, actorId: "user" } },
      });
    };
    push("dismiss_alert", EVENT_ID);
    push("review_alert", ROUTINE_EVENT);
    push("search_knowledge_base", ROUTINE_EVENT);
    push("document_ticket", ROUTINE_EVENT);

    const replayed = foldActionLog(initial, interactions);
    expect(replayed).toEqual(state);
    expect(dismissConsequence(replayed)).toHaveLength(1);
    expect(dismissConsequence(replayed)[0]?.applied).toBe(true);
    expect(dismissConsequence(state)[0]?.applied).toBe(true);
  });

  it("never re-applies or re-schedules after additional post-fire work", () => {
    let state = investigate(world());
    state = completeTask(state, "dismiss_alert", EVENT_ID);
    state = routineWork(state); // fires here
    expect(dismissConsequence(state)[0]?.applied).toBe(true);

    let post = routineWork(state);
    // conventional closing actions after the reopen stay legal on the routine item
    for (const id of ["dismiss_alert"] as const) {
      post = completeTask(post, id, ROUTINE_EVENT);
    }
    expect(dismissConsequence(post)).toHaveLength(1);
    expect(dismissConsequence(post)[0]?.applied).toBe(true);
    expect(post.events.find((e) => e.id === EVENT_ID)?.status).toBe(
      "escalated",
    );
  });

  it("escalating instead of dismissing never schedules the reopen consequence", () => {
    let state = investigate(world());
    state = completeTask(state, "document_ticket", EVENT_ID);
    state = completeTask(state, "escalate_alert", EVENT_ID);
    state = routineWork(state);

    expect(dismissConsequence(state)).toHaveLength(0);
    expect(state.events.find((e) => e.id === EVENT_ID)?.status).toBe(
      "resolved",
    );
    expect(toClientView(state).operationalMessages.join(" ")).not.toMatch(
      /needs renewed attention/i,
    );
  });

  it("keeps correctness grading out of every player-visible follow-up surface", () => {
    const state = investigate(world());
    const dismissed = completeTask(state, "dismiss_alert", EVENT_ID);
    const fired = routineWork(dismissed);
    const view = toClientView(fired);

    const surfaces = [
      ...view.operationalMessages,
      view.events.find((e) => e.id === EVENT_ID)?.resolution ?? "",
      JSON.stringify(view.events),
    ].join("\n");
    expect(surfaces).not.toMatch(GRADING_PATTERN);
  });

  it("keeps hidden assessment state private after the follow-up fires", () => {
    const state = investigate(world());
    const dismissed = completeTask(state, "dismiss_alert", EVENT_ID);
    const fired = routineWork(dismissed);
    const serialized = JSON.stringify(toClientView(fired));

    expect(serialized).not.toMatch(
      /riskExposure|accuracy|cognitiveLoad|taskBacklog|hidden/,
    );
    // the recorded delta exists in canonical state but never leaks
    const event = fired.events.find((e) => e.id === EVENT_ID);
    expect(required(event).status).toBe("escalated");
  });

  it("resuming work never marks the follow-up as a requiredUnlockable task", () => {
    const state = investigate(world());
    const dismissed = completeTask(state, "dismiss_alert", EVENT_ID);
    const fired = routineWork(dismissed);

    const suspended = fired.events.find((e) => e.id === EVENT_ID);
    expect(required(suspended).status).toBe("escalated");
    // The reopened item offers no quiz-style next step.
    expect(
      availableActions(fired)
        .filter((a) => a.eventId === EVENT_ID)
        .map((a) => a.id),
    ).toEqual([]);
  });
});