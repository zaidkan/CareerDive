import { describe, expect, it } from "vitest";
import {
  BAR_RESTORE,
  ENERGY_MAX,
  WAKE_ENERGY,
  clampEnergy,
  didCollapse,
  drainEnergy,
  energyRedirectsWayfinder,
  energyTone,
  restoreEnergy,
  shouldPublishEnergy,
} from "../src/world/energy.js";

describe("energy meter", () => {
  it("drains faster while walking than while seated", () => {
    const walk = drainEnergy(ENERGY_MAX, 10, false);
    const seat = drainEnergy(ENERGY_MAX, 10, true);
    expect(walk).toBeLessThan(seat);
    expect(seat).toBeLessThan(ENERGY_MAX);
  });

  it("restores from a bar without exceeding the cap", () => {
    expect(restoreEnergy(80, BAR_RESTORE)).toBe(ENERGY_MAX);
    expect(restoreEnergy(10, BAR_RESTORE)).toBe(10 + BAR_RESTORE);
  });

  it("detects a collapse exactly when energy hits empty", () => {
    expect(didCollapse(4, 0)).toBe(true);
    expect(didCollapse(0, 0)).toBe(false);
    expect(didCollapse(8, 3)).toBe(false);
  });

  it("wakes groggy, not full", () => {
    expect(WAKE_ENERGY).toBeGreaterThan(0);
    expect(WAKE_ENERGY).toBeLessThan(ENERGY_MAX / 2);
    expect(clampEnergy(-3)).toBe(0);
  });

  it("marks low energy before a crash", () => {
    expect(energyTone(50)).toBe("ok");
    expect(energyTone(20)).toBe("low");
    expect(energyTone(8)).toBe("critical");
  });

  it("only steals the journey marker after desk visit or on critical energy", () => {
    expect(energyRedirectsWayfinder("low", false)).toBe(false);
    expect(energyRedirectsWayfinder("low", true)).toBe(true);
    expect(energyRedirectsWayfinder("critical", false)).toBe(true);
    expect(energyRedirectsWayfinder("ok", true)).toBe(false);
  });

  it("publishes meter updates at 5 Hz, immediately on tone changes and collapse", () => {
    expect(shouldPublishEnergy(0.19, 80, 79)).toBe(false);
    expect(shouldPublishEnergy(0.2, 80, 79)).toBe(true);
    expect(shouldPublishEnergy(0.01, 29, 28)).toBe(true);
    expect(shouldPublishEnergy(0.01, 2, 0)).toBe(true);
  });
});
