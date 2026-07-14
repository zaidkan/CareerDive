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
  const act = (
    state: ReturnType<typeof createInitialWorldState>,
    id: Parameters<typeof applyAction>[1]["id"],
    eventId: string,
  ) => applyAction(state, { id, eventId, actorId: "user" }).state;

  it("keeps hidden assessment state out of every client view", () => {
    const state = createInitialWorldState("session-1", 42);
    const view = toClientView(state);

    expect(view).not.toHaveProperty("hidden");
    expect(JSON.stringify(view)).not.toContain("trust");
    expect(JSON.stringify(view)).not.toMatch(/\b\d+%/);
  });

  it("advances simulated time and fires a delayed consequence", () => {
    let state = createInitialWorldState("session-1", 42);

    state = act(state, "review_alert", "suspicious-login-1");
    state = act(state, "dismiss_alert", "suspicious-login-1");
    state = act(state, "read_handoff", "handoff-1");
    state = act(state, "acknowledge_handoff", "handoff-1");
    state = act(state, "review_alert", "routine-alert-1");
    state = act(state, "search_knowledge_base", "routine-alert-1");
    const turn = applyAction(state, {
      id: "document_ticket",
      eventId: "routine-alert-1",
      actorId: "user",
    });

    expect(turn.state.simClock).toBe(75);
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
      { id: "inspect_account_history", actorId: "user" },
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

  it("starts a shift with guided handoff and scheduled workplace events", () => {
    const state = createInitialWorldState("session-1", 42);

    expect(state.events).toHaveLength(5);
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
    let state = createInitialWorldState("session-1", 42);
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
    let state = createInitialWorldState("session-1", 42);
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

  it("replays a complete expected shift with at least fifteen actions", () => {
    const initial = createInitialWorldState("session-1", 99);
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
      ["open_phishing_report", "phishing-report-1"],
      ["inspect_email_headers", "phishing-report-1"],
      ["check_link_destination", "phishing-report-1"],
      ["quarantine_message", "phishing-report-1"],
      ["notify_reporter", "phishing-report-1"],
      ["document_ticket", "phishing-report-1"],
      ["review_alert", "false-positive-1"],
      ["inspect_login_context", "false-positive-1"],
      ["document_ticket", "false-positive-1"],
      ["dismiss_alert", "false-positive-1"],
    ].map(([id, eventId]) => ({
      id: id as Parameters<typeof applyAction>[1]["id"],
      eventId: eventId ?? "",
      actorId: "user",
    }));

    const direct = actions.reduce(
      (state, action) => applyAction(state, action).state,
      initial,
    );
    const replayed = foldActionLog(
      initial,
      actions.map((action, index) => ({ sequence: index + 1, action })),
    );

    expect(actions.length).toBeGreaterThanOrEqual(15);
    expect(availableActions(direct).map(({ id }) => id)).toContain(
      "complete_shift",
    );
    expect(replayed).toEqual(direct);
  });
});
