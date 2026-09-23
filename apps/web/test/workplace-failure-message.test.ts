// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { workplaceFailureMessage } from "../src/index.js";

describe("workplaceFailureMessage", () => {
  it("maps the movement rate limit to a retry hint", () => {
    expect(
      workplaceFailureMessage(
        new Error("Movement submissions are temporarily limited"),
      ),
    ).toBe("You moved a little too quickly — try that again in a moment.");
  });

  it("maps a lost session to a restart hint", () => {
    expect(workplaceFailureMessage(new Error("Session not found"))).toBe(
      "Your shift session ended. Start a new shift to continue.",
    );
  });

  it("walks the cause chain", () => {
    const inner = new Error("Movement submissions are temporarily limited");
    const outer = new Error("wrapped", { cause: inner });
    expect(workplaceFailureMessage(outer)).toBe(
      "You moved a little too quickly — try that again in a moment.",
    );
  });

  it("maps network failures instead of the opaque fallback", () => {
    const cause = new TypeError("fetch failed");
    (cause as { cause?: unknown }).cause = new Error(
      "connect ECONNREFUSED 127.0.0.1:3001",
    );
    expect(workplaceFailureMessage(cause)).toBe(
      "Could not reach the workplace. Check the connection and try again.",
    );
  });

  it("keeps a generic fallback for unknown causes", () => {
    expect(workplaceFailureMessage(new Error("boom"))).toBe(
      "That workplace interaction could not be completed.",
    );
    expect(workplaceFailureMessage(undefined)).toBe(
      "That workplace interaction could not be completed.",
    );
  });
});
