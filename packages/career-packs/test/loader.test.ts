import { describe, expect, it } from "vitest";
import { loadCareerPack } from "../src/index.js";
import { readFile } from "node:fs/promises";

async function readCheckedInPack(): Promise<string> {
  return readFile(
    new URL(
      "../../../content/packs/cybersecurity-analyst/pack.yaml",
      import.meta.url,
    ),
    "utf8",
  );
}

describe("career pack governance", () => {
  it("loads the checked-in cybersecurity pack with authoritative scenario", async () => {
    const pack = loadCareerPack(
      await readCheckedInPack(),
      new Date("2026-06-22"),
    );
    expect(pack.career.systems).toContain("ticket_queue");
    expect(pack.scenario.eventTemplates.suspicious_login?.instanceId).toBe(
      "suspicious-login-1",
    );
    expect(pack.scenario.actions.some(({ id }) => id === "review_alert")).toBe(
      true,
    );
    expect(pack.scenario.artifacts.length).toBeGreaterThan(5);
    expect(
      pack.scenario.eventTemplates.suspicious_login?.progression.kind,
    ).toBe("stages");
  });

  it("ships the approved beginner workday breadth without draft scenarios", async () => {
    const pack = loadCareerPack(
      await readCheckedInPack(),
      new Date("2026-06-22"),
    );
    expect(pack.career.events).toEqual([
      "incomplete_handoff",
      "suspicious_login",
      "access_request",
      "routine_alert_review",
      "employee_login_help",
      "morgan_status_check",
      "end_shift_handoff",
    ]);
    expect(pack.scenario.tasks.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "handoff-open-items",
        "handoff-priority-message",
        "login-alert-compare",
        "login-context-clues",
        "account-pattern-compare",
        "device-owner-match",
        "login-ticket-summary",
        "scanner-alert-compare",
        "scanner-window-match",
        "scanner-ticket-summary",
        "access-authority-check",
        "employee-login-troubleshooting",
        "morgan-midshift-update",
        "end-shift-continuity",
      ]),
    );
    expect(pack.scenario.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "routine-scanner-arrived",
          eventTemplateId: "routine_alert_review",
        }),
        expect.objectContaining({
          id: "login-help-arrived",
          eventTemplateId: "employee_login_help",
        }),
        expect.objectContaining({
          id: "handoff-reminder",
          eventTemplateId: "end_shift_handoff",
        }),
      ]),
    );
    expect(pack.career.events).not.toContain("blocked_spray_review");
    expect(pack.career.events).not.toContain("phishing_report");
  });

  it.each([
    ["zero energy maximum", "energyMax: 100", "energyMax: 0"],
    ["negative snack stock", "fridgeSnackBars: 2", "fridgeSnackBars: -1"],
    ["non-three snack bites", "snackBitesPerBar: 3", "snackBitesPerBar: 2"],
  ])("rejects %s through the loader", async (_label, expected, replacement) => {
    const source = await readCheckedInPack();
    const broken = source.replace(expected, replacement);

    expect(broken).not.toBe(source);
    expect(() => loadCareerPack(broken, new Date("2026-06-22"))).toThrow();
  });

  it("rejects incomplete workplace defaults through the loader", async () => {
    const source = await readCheckedInPack();
    const broken = source.replace(
      `  workplaceDefaults:
    energyMax: 100
    fridgeSnackBars: 2
    snackBitesPerBar: 3
    coffeeServings: 2
`,
      "",
    );

    expect(broken).not.toBe(source);
    expect(() => loadCareerPack(broken, new Date("2026-06-22"))).toThrow();
  });

  it("rejects packs missing scenario event templates for listed events", async () => {
    const source = await readCheckedInPack();
    const broken = source.replace(
      /\n {4}suspicious_login:[\s\S]*?\n {4}incomplete_handoff:/,
      "\n    incomplete_handoff:",
    );
    expect(() => loadCareerPack(broken, new Date("2026-06-22"))).toThrow(
      /suspicious_login/,
    );
  });

  it("rejects unapproved packs", async () => {
    const source = (await readCheckedInPack()).replace(
      "reviewStatus: approved",
      "reviewStatus: draft",
    );
    expect(() => loadCareerPack(source, new Date("2026-06-22"))).toThrow(
      "Career pack must be approved",
    );
  });

  it("rejects packs after their review date", async () => {
    const source = await readCheckedInPack();
    expect(() => loadCareerPack(source, new Date("2028-01-01"))).toThrow(
      "Career pack review is stale",
    );
  });

  it("rejects unknown action references in progression", async () => {
    const source = (await readCheckedInPack()).replace(
      "offer: [review_alert]",
      "offer: [review_alert, invent_credentials]",
    );
    expect(() => loadCareerPack(source, new Date("2026-06-22"))).toThrow();
  });

  it("loads deterministic multi-step work tasks", async () => {
    const source = (await readCheckedInPack()).replace(
      "  tasks:\n",
      `  tasks:
    - id: test-manager-context
      eventTemplateId: suspicious_login
      actionId: ask_manager
      systemId: team_chat
      kind: select_clues
      title: Find unfinished work
      whyItMatters: Handoffs keep work from getting lost.
      steps:
        - id: open-item
          title: What still needs attention?
          prompt: Pick the unfinished item.
          instruction: Select one clue from the handoff.
          relatedArtifactIds: [handoff-email]
          minSelections: 1
          maxSelections: 1
          options:
            - id: inventory-check
              label: Device inventory was not checked
            - id: coffee-order
              label: Coffee order was completed
          requiredOptionIds: [inventory-check]
          coachOnFailure: Look for work described as unfinished.
          successText: You found the open device check.
`,
    );
    const pack = loadCareerPack(source, new Date("2026-06-22"));
    expect(
      pack.scenario.tasks.find(({ id }) => id === "test-manager-context")
        ?.steps,
    ).toHaveLength(1);
  });

  it("rejects duplicate option ids inside a task step", async () => {
    const source = (await readCheckedInPack()).replace(
      "  tasks:\n",
      `  tasks:
    - id: duplicate-options
      eventTemplateId: suspicious_login
      actionId: ask_manager
      systemId: team_chat
      kind: select_clues
      title: Duplicate test
      whyItMatters: Test validation.
      steps:
        - id: step-one
          title: Pick
          prompt: Pick one.
          instruction: Pick one.
          relatedArtifactIds: [handoff-email]
          minSelections: 1
          maxSelections: 1
          options:
            - { id: same, label: First }
            - { id: same, label: Second }
          requiredOptionIds: [same]
          coachOnFailure: Try again.
          successText: Done.
`,
    );
    expect(() => loadCareerPack(source, new Date("2026-06-22"))).toThrow(
      /duplicate option/i,
    );
  });

  it("rejects task answer ids that are not public options", async () => {
    const source = (await readCheckedInPack()).replace(
      "  tasks:\n",
      `  tasks:
    - id: missing-answer-option
      eventTemplateId: suspicious_login
      actionId: ask_manager
      systemId: team_chat
      kind: select_clues
      title: Missing answer test
      whyItMatters: Test validation.
      steps:
        - id: step-one
          title: Pick
          prompt: Pick one.
          instruction: Pick one.
          relatedArtifactIds: [handoff-email]
          minSelections: 1
          maxSelections: 1
          options:
            - { id: visible, label: Visible }
          requiredOptionIds: [not-visible]
          coachOnFailure: Try again.
          successText: Done.
`,
    );
    expect(() => loadCareerPack(source, new Date("2026-06-22"))).toThrow(
      /unknown required option/i,
    );
  });
});
