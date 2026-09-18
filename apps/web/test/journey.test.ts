import { describe, expect, it } from "vitest";
import type { ClientView } from "@sim/schemas";
import { getJourneyStep, JOURNEY_TOTAL } from "../src/journey.js";

const handoffEvent: ClientView["events"][number] = {
  id: "handoff-1",
  category: "handoff",
  title: "Shift handoff",
  summary: "The previous analyst left incomplete notes.",
  priority: "normal",
  systemId: "email",
  status: "active",
  deadlineAt: 35,
  completedActionIds: [],
  observedArtifactIds: [],
};

const baseView: ClientView = {
  sessionId: "session-1",
  sessionKind: "tutorial",
  simClock: 0,
  currentLocation: {
    id: "operations-center",
    name: "Security Operations Center",
    connectedLocationIds: [],
    interactableIds: [],
  },
  events: [handoffEvent],
  availableActions: [
    {
      id: "read_handoff",
      eventId: "handoff-1",
      systemId: "email",
      label: "Read shift handoff",
      description: "Review the previous analyst's incomplete notes.",
      simulatedMinutes: 5,
    },
  ],
  operationalMessages: [],
  pacingMode: "practice",
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
};

describe("day-one journey", () => {
  it("sends the player to the SOC while on the floor map", () => {
    const step = getJourneyStep({ phase: "floor_map", view: baseView });

    expect(step.id).toBe("find_room");
    expect(step.index).toBe(1);
    expect(step.total).toBe(JOURNEY_TOTAL);
    expect(step.target).toEqual({ kind: "room", roomId: "soc" });
    expect(step.body).not.toMatch(/email/i);
  });

  it("points at the desk while walking the room", () => {
    const step = getJourneyStep({ phase: "room_walk", view: baseView });

    expect(step.id).toBe("find_desk");
    expect(step.title).toMatch(/find your desk/i);
    expect(step.body).toMatch(/gold floor marker/i);
    expect(step.target).toEqual({ kind: "hotspot", hotspotId: "desk_player" });
  });

  it("invites the player to sit back down once the desk has been used", () => {
    const step = getJourneyStep({
      phase: "room_walk",
      view: baseView,
      visitedDesk: true,
    });

    expect(step.id).toBe("find_desk");
    expect(step.title).toMatch(/sit back down/i);
  });

  it("asks for credentials on the lock screen", () => {
    const step = getJourneyStep({ phase: "desk_login", view: baseView });

    expect(step.id).toBe("sign_in");
    expect(step.body).toMatch(/note/i);
    expect(step.target).toBeUndefined();
  });

  it("only asks for the handoff once the player is seated", () => {
    const step = getJourneyStep({ phase: "seated_monitor", view: baseView });

    expect(step.id).toBe("read_handoff");
    expect(step.target).toEqual({ kind: "system", systemId: "email" });
    expect(step.title).not.toMatch(/^Step \d/);
  });

  it("advances past the handoff once it has been read", () => {
    const step = getJourneyStep({
      phase: "seated_monitor",
      view: {
        ...baseView,
        events: [{ ...handoffEvent, completedActionIds: ["read_handoff"] }],
        availableActions: [
          {
            id: "acknowledge_handoff",
            eventId: "handoff-1",
            systemId: "team_chat",
            label: "Acknowledge the handoff",
            description: "Tell Morgan what you will pick up first.",
            simulatedMinutes: 5,
          },
        ],
      },
    });

    expect(step.id).toBe("confirm_handoff");
    expect(step.index).toBe(5);
  });
});
