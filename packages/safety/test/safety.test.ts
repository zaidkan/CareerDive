import { describe, expect, it } from "vitest";
import {
  BudgetExceededError,
  SessionBudget,
  validateNpcOutput,
  validateUserFacingText,
} from "../src/index.js";

describe("safety invariants", () => {
  it("rejects NPC references to restricted facts", () => {
    expect(() =>
      validateNpcOutput(
        {
          dialogue: "I know about the employee's trip.",
          tone: "neutral",
          referencedFactIds: ["employee-private-travel"],
          proposedMinorStateUpdates: [],
        },
        new Set(["alert-visible"]),
      ),
    ).toThrow("NPC referenced a restricted fact");
  });

  it("rejects diagnosis, recommendation, ranking, and numeric assessment claims", () => {
    for (const text of [
      "Manager trust: 72%",
      "You should become a cybersecurity analyst.",
      "You are an introvert.",
      "Your compatibility score is high.",
    ]) {
      expect(() => {
        validateUserFacingText(text);
      }).toThrow();
    }
  });

  it("prevents session cost from exceeding its hard ceiling", () => {
    const budget = new SessionBudget(0.05);
    budget.record(0.03);

    expect(() => {
      budget.record(0.03);
    }).toThrow(BudgetExceededError);
    expect(budget.spentUsd).toBe(0.03);
  });
});
