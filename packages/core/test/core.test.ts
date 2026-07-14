import { describe, expect, it } from "vitest";
import {
  ActionUnavailableError,
  applyAction,
  availableActions,
  createInitialWorldState,
  foldActionLog,
  toClientView,
} from "../src/index.js";

describe("deterministic simulation core", () => {
  it("keeps hidden assessment state out of every client view", () => {
    const state = createInitialWorldState("session-1", 42);
    const view = toClientView(state);

    expect(view).not.toHaveProperty("hidden");
    expect(JSON.stringify(view)).not.toContain("trust");
    expect(JSON.stringify(view)).not.toMatch(/\b\d+%/);
  });

  it("advances simulated time and fires a delayed consequence", () => {
    let state = createInitialWorldState("session-1", 42);

    state = applyAction(state, {
      id: "review_alert",
      actorId: "user",
    }).state;
    state = applyAction(state, {
      id: "dismiss_alert",
      actorId: "user",
    }).state;
    const turn = applyAction(state, {
      id: "document_ticket",
      actorId: "user",
    });

    expect(turn.state.simClock).toBe(45);
    expect(turn.state.events[0]?.status).toBe("escalated");
    expect(turn.effects).toContainEqual(
      expect.objectContaining({
        type: "event_escalated",
        eventId: "suspicious-login-1",
      }),
    );
  });

  it("replays an action log into identical canonical state", () => {
    const initial = createInitialWorldState("session-1", 99);
    const actions = [
      { id: "review_alert", actorId: "user" },
      { id: "inspect_login_context", actorId: "user" },
      { id: "escalate_alert", actorId: "user" },
    ] as const;

    const direct = actions.reduce(
      (state, action) => applyAction(state, action).state,
      initial,
    );
    const replayed = foldActionLog(
      initial,
      actions.map((action, index) => ({
        sequence: index + 1,
        action,
      })),
    );

    expect(replayed).toEqual(direct);
  });

  it("rejects actions unavailable in current state without mutation", () => {
    const state = createInitialWorldState("session-1", 42);
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
    const initial = createInitialWorldState("session-1", 42);

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
    const initial = createInitialWorldState("session-1", 42);
    const consulted = applyAction(initial, {
      id: "ask_manager",
      actorId: "user",
    }).state;

    expect(availableActions(consulted).map(({ id }) => id)).not.toContain(
      "ask_manager",
    );
    expect(() =>
      applyAction(consulted, { id: "ask_manager", actorId: "user" }),
    ).toThrow(ActionUnavailableError);
  });

  it("targets every available action to a workplace event and system", () => {
    const state = createInitialWorldState("session-1", 42);

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
    const state = createInitialWorldState("session-1", 42);

    expect(() =>
      applyAction(state, {
        id: "review_alert",
        actorId: "user",
        eventId: "not-the-visible-event",
      }),
    ).toThrow(ActionUnavailableError);
  });
});
