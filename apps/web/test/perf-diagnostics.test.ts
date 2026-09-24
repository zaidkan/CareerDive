import { describe, expect, it } from "vitest";
import {
  FrameTimeRing,
  isPerfModeEnabled,
} from "../src/world/effects/perfDiagnostics.js";

describe("performance diagnostics", () => {
  it("only enables the explicit query flag", () => {
    expect(isPerfModeEnabled("?perf=1")).toBe(true);
    expect(isPerfModeEnabled("?perf=0")).toBe(false);
    expect(isPerfModeEnabled("?foo=1&perf=1&bar=2")).toBe(true);
  });

  it("ignores invalid and very long samples", () => {
    const ring = new FrameTimeRing();
    ring.push(0);
    ring.push(0.5);
    ring.push(0.02);
    const stats = ring.stats();
    expect(stats.avgFps).toBeCloseTo(50);
    expect(stats.p95Ms).toBeCloseTo(20);
    expect(stats.worstMs).toBeCloseTo(20);
  });
});
