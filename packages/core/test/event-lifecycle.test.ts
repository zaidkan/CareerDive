import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import {
  EventInstanceSchema,
  EventStatusSchema,
  WorldStateSchema,
  type EventStatus,
  type WorldState,
} from "@sim/schemas";
import {
  applyAction,
  availableActions,
  createInitialWorldState,
  foldActionLog,
  isLegalEventTransition,
} from "../src/index.js";

const pack = loadDefaultCybersecurityPack();

const legacyEvent = {
  id: "event-1",
  templateId: "suspicious_login",
  title: "Unfamiliar successful login",
  summary: "Repeated failures followed by a successful sign-in.",
  priority: "high",
  systemId: "alert_dashboard",
  status: "active",
  triggeredAt: 0,
  deadlineAt: 180,
  managerConsulted: false,
  completedActionIds: [],
  observedArtifactIds: [],
} as const;

describe("P1-T01 event lifecycle + field schema extension", () => {
  it("legacy event statuses still validate", () => {
    for (const status of [
      "pending",
      "active",
      "resolved",
      "escalated",
      "expired",
    ] as const) {
      expect(EventStatusSchema.parse(status)).toBe(status);
    }
    expect(EventInstanceSchema.parse(legacyEvent).status).toBe("active");
  });

  it("new Work Item lifecycle statuses validate", () => {
    for (const status of ["acknowledged", "monitoring", "waiting"] as const) {
      expect(EventStatusSchema.parse(status)).toBe(status);
    }
  });

  it("new optional Work Item fields survive schema parsing", () => {
    const parsed = EventInstanceSchema.parse({
      ...legacyEvent,
      acknowledgedAt: 25,
      linkedTicketId: "ticket-1",
      followUpRefs: ["follow-up-1"],
    });
    expect(parsed.acknowledgedAt).toBe(25);
    expect(parsed.linkedTicketId).toBe("ticket-1");
    expect(parsed.followUpRefs).toEqual(["follow-up-1"]);
  });

  it("new fields default on legacy content", () => {
    const parsed = EventInstanceSchema.parse(legacyEvent);
    expect(parsed.acknowledgedAt).toBeUndefined();
    expect(parsed.linkedTicketId).toBeUndefined();
    expect(parsed.followUpRefs).toEqual([]);
  });

  it("legal lifecycle transitions validate", () => {
    const legal: Array<[EventStatus, EventStatus]> = [
      ["pending", "active"],
      ["active", "acknowledged"],
      ["active", "monitoring"],
      ["acknowledged", "monitoring"],
      ["acknowledged", "waiting"],
      ["monitoring", "waiting"],
      ["waiting", "monitoring"],
      ["monitoring", "resolved"],
      ["waiting", "escalated"],
      ["acknowledged", "expired"],
      // Legacy direct transitions keep working.
      ["active", "resolved"],
      ["active", "escalated"],
      ["active", "expired"],
      ["pending", "expired"],
    ];
    for (const [from, to] of legal) {
      expect(isLegalEventTransition(from, to)).toBe(true);
    }
  });

  it("illegal lifecycle transitions are rejected", () => {
    const illegal: Array<[EventStatus, EventStatus]> = [
      ["pending", "resolved"],
      ["pending", "acknowledged"],
      ["resolved", "active"],
      ["resolved", "monitoring"],
      ["escalated", "waiting"],
      ["expired", "monitoring"],
      ["acknowledged", "pending"],
      ["monitoring", "pending"],
      ["waiting", "active"],
    ];
    for (const [from, to] of illegal) {
      expect(isLegalEventTransition(from, to)).toBe(false);
    }
  });

  it("WorldState round-trips new fields and SOC pack init stays valid", () => {
    const state = createInitialWorldState("p1-t01", 7, {}, pack);
    expect(() =>
      WorldStateSchema.parse(state),
    ).not.toThrow();
    const withWorkItem = WorldStateSchema.parse({
      ...state,
      events: [
        {
          ...legacyEvent,
          status: "acknowledged",
          acknowledgedAt: 25,
          linkedTicketId: "ticket-1",
          followUpRefs: ["follow-up-1"],
        },
      ],
    });
    const roundTripped = WorldStateSchema.parse(
      JSON.parse(JSON.stringify(withWorkItem)) as unknown,
    );
    expect(roundTripped.events[0]).toMatchObject({
      status: "acknowledged",
      acknowledgedAt: 25,
      linkedTicketId: "ticket-1",
      followUpRefs: ["follow-up-1"],
    });
  });

  it("new canonical state survives action turns and replay deterministically", () => {
    const base = createInitialWorldState("p1-t01-replay", 7, {}, pack);
    const withWorkItem = WorldStateSchema.parse({
      ...base,
      events: [
        {
          ...legacyEvent,
          id: "work-item-9",
          templateId: "incomplete_handoff",
          title: "Shift handoff",
          systemId: "email",
          status: "acknowledged",
          acknowledgedAt: 12,
          linkedTicketId: "ticket-9",
          followUpRefs: [],
        },
        ...base.events,
      ],
    });
    const action = availableActions(withWorkItem).find(
      (entry) => entry.id === "read_handoff" && entry.eventId === "handoff-1",
    );
    expect(action).toBeDefined();
    const turn = applyAction(withWorkItem, {
      id: "read_handoff",
      eventId: "handoff-1",
      actorId: "user",
    });
    const extra = turn.state.events.find(({ id }) => id === "work-item-9");
    expect(extra).toMatchObject({
      status: "acknowledged",
      acknowledgedAt: 12,
      linkedTicketId: "ticket-9",
    });
    const replayed = foldActionLog(withWorkItem, [
      {
        sequence: 1,
        interaction: {
          type: "action",
          action: { id: "read_handoff", eventId: "handoff-1", actorId: "user" },
        },
      },
    ]);
    expect(replayed).toEqual(turn.state);
    expect(foldActionLog(withWorkItem, [])).toEqual(withWorkItem);
  });
});
