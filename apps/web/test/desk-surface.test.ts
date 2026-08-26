import { describe, expect, it } from "vitest";
import {
  DESK_SLAB_THICKNESS,
  DESK_SLAB_Y,
  DESK_SURFACE_Y,
  DESK_VENEER_THICKNESS,
  DESK_VENEER_Y,
} from "../src/world/props/furniture.js";

describe("desk surface", () => {
  it("puts the finished top on the veneer, not the guessed 0.84 clutter height", () => {
    expect(DESK_SURFACE_Y).toBeCloseTo(
      DESK_VENEER_Y + DESK_VENEER_THICKNESS / 2,
      5,
    );
    expect(DESK_SURFACE_Y).toBeCloseTo(0.8225, 4);
    expect(DESK_SLAB_Y + DESK_SLAB_THICKNESS / 2).toBeLessThan(DESK_SURFACE_Y);
  });
});
