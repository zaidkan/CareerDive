import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { CareerPackSchema } from "@sim/schemas";
import { loadCareerPack } from "../src/index.js";

const career = {
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
};

const artifact = (id: string) => ({
  id,
  systemId: "alert_dashboard",
  kind: "login_record",
  title: `Artifact ${id}`,
  summary: "Summary",
  body: "Body with quoted evidence.",
});

const validPack = (): {
  career: Record<string, unknown> & { events: string[] };
  scenario: {
    actions: Array<Record<string, unknown>>;
    eventTemplates: Record<string, Record<string, unknown>>;
    artifacts: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
} => ({
  career: structuredClone(career),
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
        defaultEffect: { observeArtifactIds: ["a-1"] },
      },
      {
        id: "ask_manager",
        systemId: "team_chat",
        label: "Ask manager",
        description: "Request guidance.",
        simulatedMinutes: 1,
        tracksCompletion: false,
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
        deadlineMinutes: 10,
        initialStatus: "pending",
        prohibitedOutcomes: [],
        progression: {
          kind: "linear",
          sequence: ["review_alert"],
        },
        managerGuidance: "Ask for help.",
        actionEffects: {},
      },
    },
    artifacts: [artifact("a-1")],
    tasks: [],
    notifications: [],
    workplaceDefaults: {
      energyMax: 100,
      fridgeSnackBars: 2,
      snackBitesPerBar: 3,
      coffeeServings: 2,
    },
  },
});

type PackDraft = ReturnType<typeof validPack>;

function draftAction(pack: PackDraft, index: number): Record<string, unknown> {
  const found = pack.scenario.actions[index];
  if (!found) throw new Error("missing fixture action");
  return found;
}

function draftTemplate(pack: PackDraft, key: string): Record<string, unknown> {
  const found = pack.scenario.eventTemplates[key];
  if (!found) throw new Error(`missing fixture template ${key}`);
  return found;
}

function draftTasks(pack: PackDraft): Array<Record<string, unknown>> {
  const found = pack.scenario.tasks;
  if (!Array.isArray(found)) throw new Error("missing fixture tasks");
  return found as Array<Record<string, unknown>>;
}

describe("P1-T05 pack validation", () => {
  it("rejects observeArtifactIds pointing at undefined artifacts", () => {
    const pack = validPack();
    draftAction(pack, 0).defaultEffect = {
      observeArtifactIds: ["missing-artifact"],
    };
    expect(() => CareerPackSchema.parse(pack)).toThrow(/missing-artifact/);
  });

  it("rejects observeArtifactIds in template actionEffects with no definition", () => {
    const pack = validPack();
    draftTemplate(pack, "test-event").actionEffects = {
      review_alert: { observeArtifactIds: ["ghost-artifact"] },
    };
    expect(() => CareerPackSchema.parse(pack)).toThrow(/ghost-artifact/);
  });

  it("accepts valid artifact references from effects", () => {
    expect(() => CareerPackSchema.parse(validPack())).not.toThrow();
  });

  it("rejects duplicate event instanceIds", () => {
    const pack = validPack();
    pack.scenario.eventTemplates["second-event"] = structuredClone(
      draftTemplate(pack, "test-event"),
    );
    pack.career.events.push("second-event");
    expect(() => CareerPackSchema.parse(pack)).toThrow(/test-event-1/);
  });

  it("rejects progression-unreferenced tracked actions as orphans", () => {
    const pack = validPack();
    pack.scenario.actions.push({
      id: "dismiss_alert",
      systemId: "alert_dashboard",
      label: "Dismiss",
      description: "Dismiss.",
      simulatedMinutes: 1,
    });
    expect(() => CareerPackSchema.parse(pack)).toThrow(/dismiss_alert/);
  });

  it("exempts global non-tracking actions from the orphan detector", () => {
    const pack = validPack();
    pack.scenario.actions.push({
      id: "update_notebook",
      systemId: "ticket_queue",
      label: "Notebook",
      description: "Notes.",
      simulatedMinutes: 0,
      tracksCompletion: false,
    });
    expect(() => CareerPackSchema.parse(pack)).not.toThrow();
  });

  it("rejects deadlines that do not come after their trigger", () => {
    const pack = validPack();
    draftTemplate(pack, "test-event").triggerAt = 30;
    draftTemplate(pack, "test-event").deadlineMinutes = 10;
    expect(() => CareerPackSchema.parse(pack)).toThrow(/deadline/i);
  });

  it("rejects duplicate action definition ids", () => {
    const pack = validPack();
    pack.scenario.actions.push(structuredClone(draftAction(pack, 0)));
    expect(() => CareerPackSchema.parse(pack)).toThrow(/review_alert/);
  });

  it("rejects artifact eventIds pointing at unknown instances", () => {
    const pack = validPack();
    pack.scenario.artifacts.push({
      ...artifact("a-2"),
      eventIds: ["no-such-instance"],
    });
    expect(() => CareerPackSchema.parse(pack)).toThrow(/no-such-instance/);
  });

  it("accepts a released gate on an action offered by its template progression", () => {
    const pack = validPack();
    draftTasks(pack).push({
      id: "release-review",
      eventTemplateId: "test-event",
      actionId: "review_alert",
      systemId: "alert_dashboard",
      kind: "select_clues",
      title: "Released review",
      whyItMatters: "Migrated off the quiz gate.",
      releasesActionGate: true,
      steps: [
        {
          id: "step-1",
          title: "Step",
          prompt: "Prompt.",
          instruction: "Do the work.",
          minSelections: 1,
          maxSelections: 1,
          options: [
            { id: "opt-a", label: "A" },
            { id: "opt-b", label: "B" },
          ],
          requiredOptionIds: ["opt-a"],
          coachOnFailure: "Coach.",
          successText: "Done.",
        },
      ],
    });
    expect(() => CareerPackSchema.parse(pack)).not.toThrow();
  });

  it("rejects a released gate bound to an action its template never offers", () => {
    const pack = validPack();
    pack.scenario.actions.push({
      id: "update_notebook",
      systemId: "ticket_queue",
      label: "Notebook",
      description: "Notes.",
      simulatedMinutes: 0,
      tracksCompletion: false,
    });
    draftTasks(pack).push({
      id: "release-unoffered",
      eventTemplateId: "test-event",
      actionId: "update_notebook",
      systemId: "ticket_queue",
      kind: "select_clues",
      title: "Dangling release",
      whyItMatters: "Flag with no gated offer.",
      releasesActionGate: true,
      steps: [
        {
          id: "step-1",
          title: "Step",
          prompt: "Prompt.",
          instruction: "Do the work.",
          minSelections: 1,
          maxSelections: 1,
          options: [
            { id: "opt-a", label: "A" },
            { id: "opt-b", label: "B" },
          ],
          requiredOptionIds: ["opt-a"],
          coachOnFailure: "Coach.",
          successText: "Done.",
        },
      ],
    });
    expect(() => CareerPackSchema.parse(pack)).toThrow(
      /releasesActionGate.*update_notebook/,
    );
  });

  it("keeps a legacy binding accepted when its action is not offered", () => {
    const pack = validPack();
    pack.scenario.actions.push({
      id: "update_notebook",
      systemId: "ticket_queue",
      label: "Notebook",
      description: "Notes.",
      simulatedMinutes: 0,
      tracksCompletion: false,
    });
    draftTasks(pack).push({
      id: "legacy-unoffered",
      eventTemplateId: "test-event",
      actionId: "update_notebook",
      systemId: "ticket_queue",
      kind: "select_clues",
      title: "Legacy binding",
      whyItMatters: "Unreleased legacy stays accepted.",
      steps: [
        {
          id: "step-1",
          title: "Step",
          prompt: "Prompt.",
          instruction: "Do the work.",
          minSelections: 1,
          maxSelections: 1,
          options: [
            { id: "opt-a", label: "A" },
            { id: "opt-b", label: "B" },
          ],
          requiredOptionIds: ["opt-a"],
          coachOnFailure: "Coach.",
          successText: "Done.",
        },
      ],
    });
    expect(() => CareerPackSchema.parse(pack)).not.toThrow();
  });

  it("loads the checked-in cybersecurity pack", async () => {
    const source = await readFile(
      new URL(
        "../../../content/packs/cybersecurity-analyst/pack.yaml",
        import.meta.url,
      ),
      "utf8",
    );
    expect(() =>
      loadCareerPack(source, new Date("2026-06-22")),
    ).not.toThrow();
  });
});
