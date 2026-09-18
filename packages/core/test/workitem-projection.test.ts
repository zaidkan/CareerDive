import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { WorldStateSchema } from "@sim/schemas";
import {
  applyAction,
  applyWorkplaceInteraction,
  availableActions,
  createInitialWorldState,
  foldActionLog,
  toClientView,
} from "../src/index.js";

const pack = loadDefaultCybersecurityPack();

describe("P1-T02 WorkItem projection + hidden-state scoping", () => {
  it("does not expose raw templateId on client events", () => {
    const state = createInitialWorldState("p1-t02-leak", 7, {}, pack);
    const view = toClientView(state);
    expect(view.events.length).toBeGreaterThan(0);
    for (const event of view.events) {
      expect(event).not.toHaveProperty("templateId");
    }
    expect(JSON.stringify(view.events)).not.toMatch(/suspicious_login/);
  });

  it("projects a client-safe WorkItem category per event", () => {
    const state = createInitialWorldState("p1-t02-category", 7, {}, pack);
    const view = toClientView(state);
    const byId = new Map(view.events.map((event) => [event.id, event]));
    expect(byId.get("suspicious-login-1")).toMatchObject({
      category: "main_case",
    });
    expect(byId.get("handoff-1")).toMatchObject({ category: "handoff" });
    const withUnknown = WorldStateSchema.parse({
      ...state,
      events: [
        ...state.events,
        {
          id: "custom-1",
          templateId: "custom_template",
          title: "Custom item",
          summary: "",
          priority: "normal",
          systemId: "email",
          status: "active",
          triggeredAt: 0,
          deadlineAt: 60,
          managerConsulted: false,
          completedActionIds: [],
          observedArtifactIds: [],
          followUpRefs: [],
        },
      ],
    });
    const custom = toClientView(withUnknown).events.find(
      ({ id }) => id === "custom-1",
    );
    expect(custom).toMatchObject({ category: "general" });
  });

  it("serializes T01 Work Item fields on client events", () => {
    const state = createInitialWorldState("p1-t02-fields", 7, {}, pack);
    const withWorkItem = WorldStateSchema.parse({
      ...state,
      events: state.events.map((event) =>
        event.id === "handoff-1"
          ? {
              ...event,
              status: "acknowledged",
              acknowledgedAt: 12,
              linkedTicketId: "ticket-9",
              followUpRefs: ["follow-up-1"],
            }
          : event,
      ),
    });
    const event = toClientView(withWorkItem).events.find(
      ({ id }) => id === "handoff-1",
    );
    expect(event).toMatchObject({
      status: "acknowledged",
      acknowledgedAt: 12,
      linkedTicketId: "ticket-9",
      followUpRefs: ["follow-up-1"],
    });
  });

  it("does not emit relatedArtifactIds on client artifacts", () => {
    const state = createInitialWorldState("p1-t02-relations", 7, {}, pack);
    const opened = applyWorkplaceInteraction(state, {
      type: "open_artifact",
      artifactId: "handoff-email",
    }).state;
    const view = toClientView(opened);
    expect(
      view.artifacts.find(({ id }) => id === "handoff-email")?.observed,
    ).toBe(true);
    expect(view.artifacts.length).toBeGreaterThan(0);
    for (const artifact of view.artifacts) {
      expect(artifact).not.toHaveProperty("relatedArtifactIds");
    }
  });

  it("keeps hidden rules, facts, and assessment state out of the client view", () => {
    const state = createInitialWorldState("p1-t02-hidden", 7, {}, pack);
    const view = toClientView(state);
    for (const key of ["hidden", "rules", "facts", "npcs", "seed"]) {
      expect(view).not.toHaveProperty(key);
    }
    expect(JSON.stringify(view)).not.toMatch(
      /requiredOptionIds|coachOnFailure|successText/,
    );
  });

  it("keeps legacy task-view record lists working during compatibility", () => {
    let state = createInitialWorldState("p1-t02-compat", 7, {}, pack);
    // P3-T01 released handoff + initial inspections; verify a still-gated ticket task preserves its record list.
    state = applyAction(state, {
      id: "review_alert",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    state = applyAction(state, {
      id: "inspect_login_context",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    state = applyAction(state, {
      id: "inspect_account_history",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    state = applyAction(state, {
      id: "check_device_inventory",
      eventId: "suspicious-login-1",
      actorId: "user",
    }).state;
    const view = toClientView(state);
    const task = view.tasks.find(({ id }) => id === "login-ticket-summary");
    expect(task?.relatedArtifactIds).toContain("suspicious-login-alert");
  });

  it("replay behavior is unchanged by the projection", () => {
    const first = createInitialWorldState("p1-t02-replay", 7, {}, pack);
    const action = availableActions(first).find(
      ({ id, eventId }) => id === "ask_manager" && eventId === "handoff-1",
    );
    expect(action).toBeDefined();
    const turn = applyAction(first, {
      id: "ask_manager",
      eventId: "handoff-1",
      actorId: "user",
    });
    const replayed = foldActionLog(first, [
      {
        sequence: 1,
        interaction: {
          type: "action",
          action: { id: "ask_manager", eventId: "handoff-1", actorId: "user" },
        },
      },
    ]);
    expect(replayed).toEqual(turn.state);
    expect(toClientView(replayed).events).toEqual(
      toClientView(turn.state).events,
    );
  });
});
