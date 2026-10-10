import { describe, expect, it } from "vitest";
import { applyLookDelta } from "../src/world/lookDelta.js";

describe("fixed default mouse look", () => {
  it("preserves the original default rotation for both axes", () => {
    expect(applyLookDelta(10, -5)).toEqual({ yaw: 0.02, pitch: -0.01 });
    expect(applyLookDelta(-10, 5)).toEqual({ yaw: -0.02, pitch: 0.01 });
    expect(applyLookDelta(0, 0)).toEqual({ yaw: 0, pitch: 0 });
  });
});
