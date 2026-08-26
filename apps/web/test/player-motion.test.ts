import { describe, expect, it } from "vitest";
import {
  WALK_BOB_Y,
  WALK_BOB_Z,
  walkBobOffset,
} from "../src/world/playerMotion.js";

describe("walkBobOffset", () => {
  it("keeps vertical travel well below the old bounce amplitude", () => {
    expect(WALK_BOB_Y).toBeLessThanOrEqual(0.01);
    expect(WALK_BOB_Y).toBeLessThanOrEqual(WALK_BOB_Z);
  });

  it("uses the same phase for up/down as for forward sway", () => {
    const atQuarter = walkBobOffset(Math.PI / 4, 1);
    expect(atQuarter.y).toBeCloseTo(Math.sin(Math.PI / 4) * WALK_BOB_Y, 10);
    expect(atQuarter.y).not.toBeCloseTo(WALK_BOB_Y, 5);
    expect(atQuarter.z).toBeCloseTo(Math.cos(Math.PI / 4) * WALK_BOB_Z, 10);
  });

  it("scales with movement amount and ignores negatives", () => {
    const full = walkBobOffset(Math.PI / 2, 1);
    const half = walkBobOffset(Math.PI / 2, 0.5);
    expect(half.y).toBeCloseTo(full.y * 0.5);
    expect(walkBobOffset(1, -2)).toEqual({ y: 0, z: 0 });
  });
});
