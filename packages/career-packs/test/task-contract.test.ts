import { describe, expect, it } from "vitest";
import * as schemas from "@sim/schemas";

describe("public task contract", () => {
  it("exports safe client task and attempt schemas", () => {
    expect(schemas).toHaveProperty("PackTaskDefinitionSchema");
    expect(schemas).toHaveProperty("ClientTaskViewSchema");
    expect(schemas).toHaveProperty("TaskAttemptSchema");
  });
});

describe("public workplace contract", () => {
  it("parses workplace state and movement interactions", () => {
    const workplace = schemas as unknown as {
      WorkplaceStateSchema: { parse(value: unknown): unknown };
      WorkplaceInteractionSchema: { parse(value: unknown): unknown };
    };

    expect(
      workplace.WorkplaceStateSchema.parse({
        energy: { current: 100, max: 100 },
        carriedSnackBites: 0,
        fridgeSnackBars: 2,
        fridgeOpen: false,
        coffeeServings: 2,
        coffeeStage: "idle",
        julesTopicsSeen: [],
        emergencyRecoveryUsed: false,
      }),
    ).toBeDefined();

    expect(
      workplace.WorkplaceInteractionSchema.parse({
        type: "movement_exertion",
        distanceMeters: 5,
      }),
    ).toEqual({ type: "movement_exertion", distanceMeters: 5 });
  });

  it("logs workplace interactions and defaults action energy cost", () => {
    const workplace = schemas as unknown as {
      LoggedInteractionSchema: { parse(value: unknown): unknown };
    };

    expect(
      workplace.LoggedInteractionSchema.parse({
        type: "workplace_interaction",
        interaction: { type: "open_fridge" },
      }),
    ).toEqual({
      type: "workplace_interaction",
      interaction: { type: "open_fridge" },
    });

    const action = schemas.ActionDefinitionSchema.parse({
      id: "review_alert",
      systemId: "alert_dashboard",
      label: "Review alert",
      description: "Review the alert.",
      simulatedMinutes: 1,
    });
    expect(action.energyCost).toBe(0);
  });
});

const validPack = () => ({
  career: {
    id: "test-pack",
    title: "Test Pack",
    packVersion: "1.0.0",
    reviewStatus: "approved",
    lastReviewed: "2026-01-01",
    nextReview: "2027-01-01",
    reviewingRoles: ["designer", "engineer", "educator"],
    sources: [{ title: "Source", url: "https://example.com/source" }],
    rhythms: ["routine_monitoring", "quiet_investigation"],
    systems: ["alert_dashboard"],
    events: ["test-event"],
    rhythmBiasReview: {
      ordinaryWorkRepresented: true,
      calmWorkRepresented: true,
      technicalAndRelationalWorkRepresented: true,
    },
  },
  scenario: {
    location: {
      id: "office",
      name: "Office",
      connectedLocationIds: [],
      interactableIds: [],
    },
    maxAiCostUsd: 0,
    briefing: "Briefing",
    initialTaskBacklog: 0,
    facts: [
      {
        id: "fact-1",
        content: "A fact.",
        visibility: "public",
        knownBy: [],
        notKnownBy: [],
      },
    ],
    npcs: [
      {
        id: "npc-1",
        name: "Jules",
        role: "Peer",
        mood: "neutral",
        memoryFactIds: [],
      },
    ],
    actions: [
      {
        id: "review_alert",
        systemId: "alert_dashboard",
        label: "Review alert",
        description: "Review the alert.",
        simulatedMinutes: 1,
      },
    ],
    eventTemplates: {
      "test-event": {
        instanceId: "test-event-1",
        title: "Test event",
        summary: "An event.",
        priority: "normal",
        systemId: "alert_dashboard",
        triggerAt: 0,
        deadlineMinutes: 1,
        progression: {
          kind: "linear",
          sequence: ["review_alert"],
        },
        managerGuidance: "Ask for help.",
      },
    },
    workplaceDefaults: {
      energyMax: 100,
      fridgeSnackBars: 2,
      snackBitesPerBar: 3,
      coffeeServings: 2,
    },
  },
});

describe("career pack workplace defaults", () => {
  it.each([
    ["zero energy maximum", { energyMax: 0 }],
    ["negative snack stock", { fridgeSnackBars: -1 }],
    ["non-three snack bites", { snackBitesPerBar: 2 }],
  ])("rejects %s", (_label, invalidDefaults) => {
    const pack = validPack();
    Object.assign(pack.scenario.workplaceDefaults, invalidDefaults);

    expect(() => schemas.CareerPackSchema.parse(pack)).toThrow();
  });
});
