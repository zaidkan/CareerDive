import { describe, expect, it } from "vitest";
import type { ClientView } from "@sim/schemas";
import { assertViewParity } from "../src/index.js";

const baseView = {
  sessionId: "session-1",
  sessionKind: "assessed",
  simClock: 0,
  currentLocation: {
    id: "operations-center",
    name: "Security Operations Center",
    connectedLocationIds: [],
    interactableIds: [],
  },
  events: [],
  operationalMessages: [],
  pacingMode: "standard",
  artifacts: [],
  ticketNotes: {},
  notebook: "",
  kbQuery: "",
  tasks: [],
  notifications: [],
  workplace: {
    energy: { current: 100, max: 100 },
    carriedSnackBites: 0,
    fridgeSnackBars: 2,
    fridgeOpen: false,
    coffeeServings: 2,
    coffeeStage: "idle",
    julesTopicsSeen: [],
    emergencyRecoveryUsed: false,
  },
} satisfies Omit<ClientView, "availableActions">;

describe("view adapter parity", () => {
  it("treats event target as part of action identity", () => {
    const action = {
      id: "review_alert" as const,
      eventId: "alert-1",
      systemId: "alert_dashboard" as const,
      label: "Review alert",
      description: "Review details.",
      simulatedMinutes: 10,
    };
    const left: ClientView = { ...baseView, availableActions: [action] };
    const right: ClientView = {
      ...baseView,
      availableActions: [{ ...action, eventId: "alert-2" }],
    };

    expect(() => assertViewParity(left, right)).toThrow(
      "different action sets",
    );
  });
});
