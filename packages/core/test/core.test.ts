import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import {
  ActionUnavailableError,
  applyAction,
  applyTaskAttempt,
  applyWorkplaceInteraction,
  availableActions,
  createInitialWorldState,
  foldActionLog,
  toClientView,
} from "../src/index.js";
import type { DomainEffect, LoggedInteraction, WorldState } from "@sim/schemas";

const pack = loadDefaultCybersecurityPack();
const world = (sessionId: string, seed: number) =>
  createInitialWorldState(sessionId, seed, {}, pack);

function perform(
  initial: WorldState,
  id: Parameters<typeof applyAction>[1]["id"],
  eventId: string,
): {
  state: WorldState;
  interactions: LoggedInteraction[];
  effects: DomainEffect[];
} {
  let state = initial;
  const interactions: LoggedInteraction[] = [];
  const effects: DomainEffect[] = [];
  const available = availableActions(state).find(
    (action) => action.id === id && action.eventId === eventId,
  );
  if (available?.taskId) {
    const task = state.rules.tasks[available.taskId];
    if (!task) throw new Error(`Missing task ${available.taskId}`);
    while (!state.taskProgress[`${eventId}:${task.id}`]?.completed) {
      const stepIndex =
        state.taskProgress[`${eventId}:${task.id}`]?.currentStep ?? 0;
      const step = task.steps[stepIndex];
      if (!step) throw new Error(`Missing task step ${String(stepIndex)}`);
      for (const artifactId of new Set(
        step.options.flatMap(({ source }) =>
          source ? [source.artifactId] : [],
        ),
      )) {
        if (state.observedArtifactIds.includes(artifactId)) continue;
        const interaction = { type: "open_artifact" as const, artifactId };
        state = applyWorkplaceInteraction(state, interaction).state;
        interactions.push({ type: "workplace_interaction", interaction });
      }
      const attempt = {
        taskId: task.id,
        eventId,
        selectedOptionIds: step.requiredOptionIds,
      };
      const turn = applyTaskAttempt(state, attempt);
      state = turn.state;
      effects.push(...turn.effects);
      interactions.push({ type: "task_attempt", attempt });
    }
    return { state, interactions, effects };
  }
  const action = { id, eventId, actorId: "user" as const };
  const turn = applyAction(state, action);
  state = turn.state;
  effects.push(...turn.effects);
  interactions.push({ type: "action", action });
  return { state, interactions, effects };
}

describe("deterministic simulation core", () => {
  const act = (
    state: ReturnType<typeof createInitialWorldState>,
    id: Parameters<typeof applyAction>[1]["id"],
    eventId: string,
  ) => perform(state, id, eventId).state;

  it("keeps hidden assessment state out of every client view", () => {
    const state = world("session-1", 42);
    const view = toClientView(state);

    expect(view).not.toHaveProperty("hidden");
    expect(JSON.stringify(view)).not.toContain("trust");
    expect(JSON.stringify(view)).not.toMatch(/\b\d+%/);
  });

  it("builds the shift entirely from the career pack", () => {
    const state = world("session-1", 42);
    expect(state.rules.eventTemplates.suspicious_login).toBeDefined();
    expect(Object.keys(state.artifacts).length).toBeGreaterThan(5);
    expect(state.events.every((event) => !("reviewed" in event))).toBe(true);
    expect(state.events.every((event) => !("contextInspected" in event))).toBe(
      true,
    );
  });

  it("initializes finite workplace defaults and serializes an isolated client copy", () => {
    const state = world("session-1", 42);
    const view = toClientView(state);

    expect(state.workplace).toMatchObject({
      energy: { current: 100, max: 100 },
      carriedSnackBites: 0,
      fridgeSnackBars: 2,
      fridgeOpen: false,
      coffeeServings: 2,
      coffeeStage: "idle",
      emergencyRecoveryUsed: false,
    });
    expect(view.workplace).toEqual(state.workplace);
    view.workplace.energy.current = 0;
    expect(state.workplace.energy.current).toBe(100);
  });

  it("advances simulated time and fires a delayed consequence", () => {
    let state = world("session-1", 42);

    state = act(state, "review_alert", "suspicious-login-1");
    state = act(state, "dismiss_alert", "suspicious-login-1");
    state = act(state, "read_handoff", "handoff-1");
    state = act(state, "acknowledge_handoff", "handoff-1");
    state = act(state, "review_alert", "routine-alert-1");
    state = act(state, "search_knowledge_base", "routine-alert-1");
    const turn = perform(state, "document_ticket", "routine-alert-1");

    expect(turn.state.simClock).toBe(75);
    expect(turn.state.events[0]?.status).toBe("escalated");
    expect(turn.effects).toContainEqual(
      expect.objectContaining({
        type: "event_escalated",
        eventId: "suspicious-login-1",
      }),
    );
  });

  it("replays task attempts and actions into identical canonical state", () => {
    const initial = world("session-1", 99);
    const actions = [
      ["review_alert", "suspicious-login-1"],
      ["inspect_login_context", "suspicious-login-1"],
      ["inspect_account_history", "suspicious-login-1"],
    ] as const;
    let direct = initial;
    const interactions: LoggedInteraction[] = [];
    for (const [id, eventId] of actions) {
      const turn = perform(direct, id, eventId);
      direct = turn.state;
      interactions.push(...turn.interactions);
    }
    const replayed = foldActionLog(
      initial,
      interactions.map((interaction, index) => ({
        sequence: index + 1,
        interaction,
      })),
    );

    expect(replayed).toEqual(direct);
  });

  it("rejects actions unavailable in current state without mutation", () => {
    const state = world("session-1", 42);
    const before = structuredClone(state);

    expect(() =>
      applyAction(state, { id: "escalate_alert", actorId: "user" }),
    ).toThrow(ActionUnavailableError);
    expect(state).toEqual(before);
    expect(availableActions(state).map(({ id }) => id)).not.toContain(
      "escalate_alert",
    );
  });

  it("records deterministic manager guidance after consultation", () => {
    const initial = world("session-1", 42);

    const turn = applyAction(initial, {
      id: "ask_manager",
      actorId: "user",
    });
    const view = toClientView(turn.state);

    expect(view.simClock).toBe(5);
    expect(view.operationalMessages).toContain(
      "Morgan recommends reviewing the alert details, checking device and location context, and documenting uncertainty before deciding.",
    );
  });

  it("allows manager consultation only once per event", () => {
    const initial = world("session-1", 42);
    const consulted = applyAction(initial, {
      id: "ask_manager",
      actorId: "user",
    }).state;

    expect(
      availableActions(consulted)
        .filter(({ eventId }) => eventId === "suspicious-login-1")
        .map(({ id }) => id),
    ).not.toContain("ask_manager");
    expect(() =>
      applyAction(consulted, {
        id: "ask_manager",
        eventId: "suspicious-login-1",
        actorId: "user",
      }),
    ).toThrow(ActionUnavailableError);
  });

  it("targets every available action to a workplace event and system", () => {
    const state = world("session-1", 42);

    expect(availableActions(state)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "review_alert",
          eventId: "suspicious-login-1",
          systemId: "alert_dashboard",
        }),
      ]),
    );
  });

  it("rejects an action aimed at the wrong event", () => {
    const state = world("session-1", 42);

    expect(() =>
      applyAction(state, {
        id: "review_alert",
        actorId: "user",
        eventId: "not-the-visible-event",
      }),
    ).toThrow(ActionUnavailableError);
  });

  it("starts a shift with guided handoff and scheduled workplace events", () => {
    const state = world("session-1", 42);

    expect(state.events).toHaveLength(3);
    expect(
      state.events.find(({ templateId }) => templateId === "incomplete_handoff")
        ?.status,
    ).toBe("active");
    expect(
      state.events.find(
        ({ templateId }) => templateId === "routine_alert_review",
      )?.status,
    ).toBe("pending");
    expect(
      availableActions(state).map(({ id, eventId }) => `${id}:${eventId}`),
    ).toContain("read_handoff:handoff-1");
  });

  it("activates routine work while the login investigation remains open", () => {
    let state = world("session-1", 42);
    state = act(state, "review_alert", "suspicious-login-1");
    state = act(state, "read_handoff", "handoff-1");
    state = act(state, "acknowledge_handoff", "handoff-1");
    state = act(state, "inspect_login_context", "suspicious-login-1");

    expect(state.simClock).toBeGreaterThanOrEqual(25);
    expect(
      state.events.find(
        ({ templateId }) => templateId === "routine_alert_review",
      )?.status,
    ).toBe("active");
    expect(
      state.events.find(({ templateId }) => templateId === "suspicious_login")
        ?.status,
    ).toBe("active");
  });

  it("applies a delayed consequence from an earlier dismissal", () => {
    let state = world("session-1", 42);
    state = act(state, "review_alert", "suspicious-login-1");
    state = act(state, "dismiss_alert", "suspicious-login-1");
    state = act(state, "read_handoff", "handoff-1");
    state = act(state, "acknowledge_handoff", "handoff-1");
    state = act(state, "review_alert", "routine-alert-1");
    state = act(state, "search_knowledge_base", "routine-alert-1");
    state = act(state, "document_ticket", "routine-alert-1");

    expect(
      state.events.find(({ id }) => id === "suspicious-login-1")?.status,
    ).toBe("escalated");
    expect(
      state.ledger.some(
        ({ eventId, applied }) => eventId === "suspicious-login-1" && applied,
      ),
    ).toBe(true);
  });

  it("replays a complete expected shift with at least fifteen interactions", () => {
    const initial = world("session-1", 99);
    const actions = [
      ["read_handoff", "handoff-1"],
      ["acknowledge_handoff", "handoff-1"],
      ["review_alert", "suspicious-login-1"],
      ["inspect_login_context", "suspicious-login-1"],
      ["inspect_account_history", "suspicious-login-1"],
      ["check_device_inventory", "suspicious-login-1"],
      ["document_ticket", "suspicious-login-1"],
      ["escalate_alert", "suspicious-login-1"],
      ["review_alert", "routine-alert-1"],
      ["search_knowledge_base", "routine-alert-1"],
      ["document_ticket", "routine-alert-1"],
      ["dismiss_alert", "routine-alert-1"],
    ] as const;

    let direct = initial;
    const interactions: LoggedInteraction[] = [];
    for (const [id, eventId] of actions) {
      const turn = perform(direct, id, eventId);
      direct = turn.state;
      interactions.push(...turn.interactions);
    }
    const replayed = foldActionLog(
      initial,
      interactions.map((interaction, index) => ({
        sequence: index + 1,
        interaction,
      })),
    );

    expect(interactions.length).toBeGreaterThanOrEqual(15);
    expect(availableActions(direct).map(({ id }) => id)).toContain(
      "complete_shift",
    );
    expect(replayed).toEqual(direct);
  });

  it("records ticket notes and observed artifacts from pack-driven effects", () => {
    let state = world("session-1", 42);
    state = act(state, "review_alert", "suspicious-login-1");
    state = applyAction(state, {
      id: "update_ticket_notes",
      eventId: "suspicious-login-1",
      actorId: "user",
      freeText: "Need device inventory before escalate.",
    }).state;

    expect(state.ticketNotes["suspicious-login-1"]).toBe(
      "Need device inventory before escalate.",
    );
    expect(state.observedArtifactIds).toContain("suspicious-login-alert");
  });
});
