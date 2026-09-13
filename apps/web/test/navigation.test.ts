import { describe, expect, it } from "vitest";
import { isStandable } from "../src/world/collision.js";
import {
  SAFE_ANCHORS,
  blockedWalkDetector,
  nearestStandableTarget,
} from "../src/world/navigation.js";
import { socColliders } from "../src/world/rooms/socLayout.js";

describe("recoverable click navigation", () => {
  const colliders = socColliders(false);

  it("resolves a click inside a desk to a standable point", () => {
    const target = nearestStandableTarget(
      { x: 3.8, z: -2 },
      colliders,
      SAFE_ANCHORS,
    );
    expect(isStandable(target, colliders)).toBe(true);
  });

  it("reports stuck after twenty blocked frames", () => {
    expect(blockedWalkDetector(20).status).toBe("stuck");
  });

  it("keeps the aisle recovery anchor standable", () => {
    expect(
      isStandable(SAFE_ANCHORS.aisle, colliders),
    ).toBe(true);
  });
});
