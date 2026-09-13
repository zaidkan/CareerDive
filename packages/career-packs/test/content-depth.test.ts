import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "../src/index.js";

describe("finished shift copy", () => {
  const pack = loadDefaultCybersecurityPack();
  it("uses workplace instructions instead of question or answer-count prompts", () => {
    for (const task of pack.scenario.tasks)
      for (const step of task.steps) {
        expect(`${step.prompt} ${step.instruction}`).not.toMatch(
          /\bWhich\b|Select exactly|Select one|Choose two|Mark two|the two verified/i,
        );
      }
  });
  it("keeps distinct review and rework consequences without claiming an attacker was identified", () => {
    const escalation = pack.scenario.actions.find(
      ({ id }) => id === "escalate_alert",
    )?.defaultEffect?.consequence?.description;
    const dismissal =
      pack.scenario.eventTemplates.suspicious_login?.actionEffects
        .dismiss_alert;
    expect(escalation).toMatch(/review|uncertainty/i);
    expect(dismissal?.resolution).toMatch(/review|reopen/i);
    expect(dismissal?.consequence?.escalateResolution).toMatch(
      /reopen|reconstruct/i,
    );
    expect(`${escalation ?? ""} ${dismissal?.resolution ?? ""}`).not.toMatch(
      /identified the attacker|definitely compromised/i,
    );
  });
});
