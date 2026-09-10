import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createQualityMachine,
  isLowEndDevice,
  QUALITY,
  resolveEffects,
  smoothedFps,
  stepQuality,
  type NavBits,
} from "../src/world/effects/useAdaptiveQuality.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const FPS_60 = 1 / 60;
const FPS_30 = 1 / 30;
const FPS_58 = 1 / 58;
const FPS_44 = 1 / 44;

function drive(
  machine: ReturnType<typeof createQualityMachine>,
  delta: number,
  seconds: number,
  hidden = false,
): number {
  let changes = 0;
  const frames = Math.ceil(seconds / delta);
  for (let i = 0; i < frames; i += 1) {
    if (stepQuality(machine, delta, hidden)) changes += 1;
  }
  return changes;
}

describe("isLowEndDevice", () => {
  it("treats 4 cores as low-end", () => {
    expect(isLowEndDevice({ hardwareConcurrency: 4 })).toBe(true);
  });

  it("treats 4 GB deviceMemory as low-end even with many cores", () => {
    const nav: NavBits = { hardwareConcurrency: 8, deviceMemory: 4 };
    expect(isLowEndDevice(nav)).toBe(true);
  });

  it("does not treat missing deviceMemory as 4 GB", () => {
    expect(isLowEndDevice({ hardwareConcurrency: 8 })).toBe(false);
  });

  it("treats 8 cores and 8 GB as capable", () => {
    const nav: NavBits = { hardwareConcurrency: 8, deviceMemory: 8 };
    expect(isLowEndDevice(nav)).toBe(false);
  });

  it("is conservative when navigator is unavailable", () => {
    expect(isLowEndDevice(undefined)).toBe(true);
  });
});

describe("quality machine", () => {
  it("uses a fixed-size ring buffer", () => {
    const machine = createQualityMachine({ startOn: true, allowRestore: true });
    drive(machine, FPS_60, 3);
    expect(machine.sampler.deltas.length).toBe(QUALITY.sampleCount);
    expect(machine.sampler.count).toBe(QUALITY.sampleCount);
  });

  it("starts enabled on capable devices", () => {
    const machine = createQualityMachine({ startOn: true, allowRestore: true });
    expect(machine.composerOn).toBe(true);
  });

  it("does not disable during warmup even at 30 fps", () => {
    const machine = createQualityMachine({ startOn: true, allowRestore: true });
    const changes = drive(machine, FPS_30, QUALITY.warmupSeconds);
    expect(changes).toBe(0);
    expect(machine.composerOn).toBe(true);
  });

  it("drops off after smoothed fps stays below 45 for ~1.5s", () => {
    const machine = createQualityMachine({ startOn: true, allowRestore: true });
    drive(machine, FPS_30, QUALITY.warmupSeconds);
    const early = drive(machine, FPS_30, 1.0);
    expect(early).toBe(0);
    expect(machine.composerOn).toBe(true);
    drive(machine, FPS_30, 0.7);
    expect(machine.composerOn).toBe(false);
    expect(smoothedFps(machine.sampler)).toBeLessThan(QUALITY.disableFps);
  });

  it("does not drop from a single long hitch", () => {
    const machine = createQualityMachine({ startOn: true, allowRestore: true });
    drive(machine, FPS_60, QUALITY.warmupSeconds + 0.3);
    expect(stepQuality(machine, 0.5, false)).toBe(false);
    expect(machine.composerOn).toBe(true);
  });

  it("does not count frames while the document is hidden", () => {
    const machine = createQualityMachine({ startOn: true, allowRestore: true });
    drive(machine, FPS_30, QUALITY.warmupSeconds);
    const changes = drive(machine, FPS_30, 3, true);
    expect(changes).toBe(0);
    expect(machine.composerOn).toBe(true);
  });

  it("restores after smoothed fps holds near 58 for several seconds", () => {
    const machine = createQualityMachine({ startOn: true, allowRestore: true });
    drive(machine, FPS_30, QUALITY.warmupSeconds + QUALITY.disableHoldSeconds + 0.3);
    expect(machine.composerOn).toBe(false);
    drive(machine, FPS_58, 2);
    expect(machine.composerOn).toBe(false);
    drive(machine, FPS_58, QUALITY.restoreHoldSeconds);
    expect(machine.composerOn).toBe(true);
  });

  it("does not restore on a noisy 50 fps line", () => {
    const machine = createQualityMachine({ startOn: true, allowRestore: true });
    drive(machine, FPS_44, QUALITY.warmupSeconds + QUALITY.disableHoldSeconds + 0.3);
    expect(machine.composerOn).toBe(false);
    drive(machine, 1 / 50, QUALITY.restoreHoldSeconds + 1);
    expect(machine.composerOn).toBe(false);
  });

  it("never turns on when the device started low-end", () => {
    const machine = createQualityMachine({ startOn: false, allowRestore: false });
    expect(machine.composerOn).toBe(false);
    drive(machine, FPS_60, QUALITY.warmupSeconds + QUALITY.restoreHoldSeconds + 1);
    expect(machine.composerOn).toBe(false);
  });

  it("only reports a change when composer on/off flips", () => {
    const machine = createQualityMachine({ startOn: true, allowRestore: true });
    expect(stepQuality(machine, FPS_60, false)).toBe(false);
    drive(machine, FPS_30, QUALITY.warmupSeconds);
    const changes = drive(machine, FPS_30, QUALITY.disableHoldSeconds + 0.4);
    expect(changes).toBe(1);
    expect(stepQuality(machine, FPS_30, false)).toBe(false);
  });
});

describe("resolveEffects", () => {
  it("keeps bloom and vignette while dropping grain for reduced motion", () => {
    expect(
      resolveEffects({
        composerOn: true,
        seated: false,
        reducedMotion: true,
        lowEnd: false,
      }),
    ).toEqual({
      composer: true,
      grain: false,
      cheapGlass: true,
      dustMul: 0.5,
      contactShadows: true,
      dpr: 1,
      directionalShadows: true,
    });
  });

  it("turns the composer off while seated so desk UI text stays sharp", () => {
    expect(
      resolveEffects({
        composerOn: true,
        seated: true,
        reducedMotion: false,
        lowEnd: false,
      }),
    ).toEqual({
      composer: false,
      grain: false,
      cheapGlass: true,
      dustMul: 0,
      contactShadows: false,
      dpr: 1,
      directionalShadows: false,
    });
  });

  it("allows grain only when the composer is actually running", () => {
    expect(
      resolveEffects({
        composerOn: false,
        seated: false,
        reducedMotion: false,
        lowEnd: false,
      }),
    ).toEqual({
      composer: false,
      grain: false,
      cheapGlass: true,
      dustMul: 0,
      contactShadows: false,
      dpr: 1,
      directionalShadows: false,
    });
  });

  it("drops particles, DPR, and directional shadows with the composer", () => {
    expect(
      resolveEffects({
        composerOn: false,
        seated: false,
        reducedMotion: false,
        lowEnd: false,
      }),
    ).toMatchObject({
      composer: false,
      dustMul: 0,
      contactShadows: false,
      dpr: 1,
      directionalShadows: false,
    });
  });
});
