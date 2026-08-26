// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { isTypingTarget } from "../src/world/useFullscreen.js";

describe("isTypingTarget", () => {
  it("treats form fields as typing so F can still type in them", () => {
    const input = document.createElement("input");
    const area = document.createElement("textarea");
    expect(isTypingTarget(input)).toBe(true);
    expect(isTypingTarget(area)).toBe(true);
    expect(isTypingTarget(document.createElement("button"))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
