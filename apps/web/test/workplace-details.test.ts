import { describe, expect, it } from "vitest";
import {
  WORKPLACE_DETAIL_GROUPS,
  WORKPLACE_DETAIL_SURFACES,
} from "../src/world/props/WorkplaceDetails.js";

describe("workplace detail placement", () => {
  it("keeps every detail footprint inside its supporting surface", () => {
    for (const group of WORKPLACE_DETAIL_GROUPS) {
      const surface = WORKPLACE_DETAIL_SURFACES[group.surface];
      for (const item of group.items) {
        expect(
          item.x - item.width / 2,
          `${group.id}/${item.id} west edge`,
        ).toBeGreaterThanOrEqual(-surface.width / 2);
        expect(
          item.x + item.width / 2,
          `${group.id}/${item.id} east edge`,
        ).toBeLessThanOrEqual(surface.width / 2);
        expect(
          item.z - item.depth / 2,
          `${group.id}/${item.id} north edge`,
        ).toBeGreaterThanOrEqual(-surface.depth / 2);
        expect(
          item.z + item.depth / 2,
          `${group.id}/${item.id} south edge`,
        ).toBeLessThanOrEqual(surface.depth / 2);
      }
    }
  });

  it("rests decorative groups on surfaces instead of the navigation floor", () => {
    for (const group of WORKPLACE_DETAIL_GROUPS) {
      const surface = WORKPLACE_DETAIL_SURFACES[group.surface];
      expect(group.surfaceY, group.id).toBeCloseTo(surface.y, 5);
      expect(group.surfaceY, group.id).toBeGreaterThan(0.8);
    }
  });

  it("uses the approved desk, table, and counter only", () => {
    expect(WORKPLACE_DETAIL_GROUPS.map((group) => group.surface)).toEqual(
      expect.arrayContaining(["desk", "breakTable", "coffeeCounter"]),
    );
    expect(WORKPLACE_DETAIL_GROUPS.every((group) => group.surfaceY > 0)).toBe(
      true,
    );
  });
});
