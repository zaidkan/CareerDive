import { describe, expect, it } from "vitest";
import {
  createQualityMachine,
  isLowEndDevice,
  initialQualityProfile,
  readWebGLRenderer,
  QUALITY,
  resolveEffects,
  smoothedFps,
  stepQuality,
  type NavBits,
  type QualityMachine,
} from "../src/world/effects/useAdaptiveQuality.js";

const FPS_60 = 1 / 60;
const FPS_30 = 1 / 30;
const FPS_58 = 1 / 58;
const FPS_56 = 1 / 56;

function drive(
  machine: QualityMachine,
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
    const machine = createQualityMachine({ startTier: 2, allowRestore: true });
    drive(machine, FPS_60, 3);
    expect(machine.sampler.deltas.length).toBe(QUALITY.sampleCount);
    expect(machine.sampler.count).toBe(QUALITY.sampleCount);
  });

  it("starts capable devices at medium and restores high only after sustained stable frames", () => {
    const profile = initialQualityProfile(
      { hardwareConcurrency: 8, deviceMemory: 8 },
      "Google Inc. / ANGLE (NVIDIA GeForce RTX 2060)",
    );
    expect(profile).toEqual({
      lowEnd: false,
      startTier: 1,
      allowRestore: true,
    });
    const machine = createQualityMachine({
      startTier: profile.startTier,
      allowRestore: profile.allowRestore,
    });
    expect(machine.tier).toBe(1);
    drive(machine, FPS_60, QUALITY.warmupSeconds + QUALITY.restoreHoldSeconds + 0.5);
    expect(machine.tier).toBe(2);
  });

  it("starts software renderers at low with restoration disabled", () => {
    const profile = initialQualityProfile(
      { hardwareConcurrency: 8, deviceMemory: 16 },
      "Google Inc. / ANGLE (Google SwiftShader)",
    );
    expect(profile).toEqual({
      lowEnd: true,
      startTier: 0,
      allowRestore: false,
    });
  });

  it("reads the unmasked GPU renderer when the browser exposes it", () => {
    const extension = {
      UNMASKED_VENDOR_WEBGL: 0x9245,
      UNMASKED_RENDERER_WEBGL: 0x9246,
    };
    const context = {
      getExtension: () => extension,
      getParameter: (parameter: number) =>
        parameter === extension.UNMASKED_VENDOR_WEBGL
          ? "NVIDIA"
          : "ANGLE (NVIDIA GeForce RTX 2060)",
    } as unknown as WebGLRenderingContext;
    expect(readWebGLRenderer({ getContext: () => context })).toContain("RTX 2060");
    expect(readWebGLRenderer(undefined)).toBeUndefined();
  });

  it("does not degrade during warmup", () => {
    const machine = createQualityMachine({ startTier: 2, allowRestore: true });
    const changes = drive(machine, FPS_30, QUALITY.warmupSeconds);
    expect(changes).toBe(0);
    expect(machine.tier).toBe(2);
  });

  it("drops one tier after sustained sub-55 fps", () => {
    const machine = createQualityMachine({ startTier: 2, allowRestore: true });
    drive(machine, FPS_30, QUALITY.warmupSeconds);
    expect(drive(machine, FPS_30, 1)).toBe(0);
    expect(machine.tier).toBe(2);
    drive(machine, FPS_30, QUALITY.degradeHoldSeconds + 0.2);
    expect(machine.tier).toBe(1);
  });

  it("continues dropping to low after another sustained interval", () => {
    const machine = createQualityMachine({ startTier: 2, allowRestore: true });
    drive(machine, FPS_30, QUALITY.warmupSeconds + QUALITY.degradeHoldSeconds + 0.2);
    drive(machine, FPS_30, QUALITY.degradeHoldSeconds + 0.2);
    expect(machine.tier).toBe(0);
  });

  it("degrades even when every visible frame is below 10 fps", () => {
    const machine = createQualityMachine({ startTier: 2, allowRestore: true });
    drive(machine, 0.2, 5);
    expect(machine.tier).toBe(0);
    expect(machine.sampler.count).toBe(0);
    drive(machine, FPS_60, 10);
    expect(machine.tier).toBe(2);
  });

  it("does not degrade for a single long suspension or accumulate hidden stalls", () => {
    const machine = createQualityMachine({ startTier: 2, allowRestore: true });
    drive(machine, FPS_60, 1);
    expect(stepQuality(machine, 10, false)).toBe(false);
    expect(machine.tier).toBe(2);
    drive(machine, 0.2, 0.8);
    drive(machine, 0.2, 20, true);
    expect(machine.stalledSeconds).toBe(0);
    drive(machine, 0.2, 0.8);
    expect(machine.tier).toBe(2);
  });

  it("does not count a single long hitch", () => {
    const machine = createQualityMachine({ startTier: 2, allowRestore: true });
    drive(machine, FPS_60, QUALITY.warmupSeconds + 0.3);
    expect(stepQuality(machine, 0.5, false)).toBe(false);
    expect(machine.tier).toBe(2);
  });

  it("does not count hidden frames", () => {
    const machine = createQualityMachine({ startTier: 2, allowRestore: true });
    drive(machine, FPS_30, QUALITY.warmupSeconds);
    const count = machine.sampler.count;
    expect(drive(machine, FPS_30, 3, true)).toBe(0);
    expect(machine.sampler.count).toBe(count);
    expect(machine.tier).toBe(2);
  });

  it("restores one tier after sustained 58 fps", () => {
    const machine = createQualityMachine({ startTier: 1, allowRestore: true });
    drive(machine, FPS_30, QUALITY.warmupSeconds);
    drive(machine, FPS_30, QUALITY.degradeHoldSeconds + 0.2);
    expect(machine.tier).toBe(0);
    drive(machine, FPS_58, QUALITY.restoreHoldSeconds + 1);
    expect(machine.tier).toBe(1);
  });

  it("does not restore in the hysteresis dead zone", () => {
    const machine = createQualityMachine({ startTier: 1, allowRestore: true });
    drive(machine, FPS_60, QUALITY.warmupSeconds);
    expect(drive(machine, FPS_56, QUALITY.restoreHoldSeconds + 1)).toBe(0);
    expect(machine.tier).toBe(1);
  });

  it("does not sample when a low-end machine cannot restore", () => {
    const machine = createQualityMachine({ startTier: 0, allowRestore: false });
    drive(machine, FPS_60, 5);
    expect(machine.tier).toBe(0);
    expect(machine.sampler.count).toBe(0);
  });

  it("reports a smoothed frame rate", () => {
    const machine = createQualityMachine({ startTier: 2, allowRestore: true });
    drive(machine, FPS_60, 2);
    expect(smoothedFps(machine.sampler)).toBeGreaterThan(59);
  });
});

describe("resolveEffects", () => {
  it("keeps the high walking scene at bounded DPR", () => {
    expect(
      resolveEffects({
        tier: 2,
        seated: false,
        reducedMotion: false,
        lowEnd: false,
      }),
    ).toEqual({
      tier: 2,
      composer: true,
      grain: false,
      cheapGlass: true,
      dustMul: 1,
      contactShadows: true,
      dpr: 1,
      directionalShadows: true,
      ambientEnabled: true,
      ambientHz: 12,
    });
  });

  it("uses the medium tier without the composer", () => {
    expect(
      resolveEffects({
        tier: 1,
        seated: false,
        reducedMotion: false,
        lowEnd: false,
      }),
    ).toMatchObject({
      tier: 1,
      composer: false,
      grain: false,
      dustMul: 0.5,
      contactShadows: false,
      dpr: 1,
      directionalShadows: true,
      ambientEnabled: true,
      ambientHz: 8,
    });
  });

  it("freezes effects and ambient motion on the low tier", () => {
    expect(
      resolveEffects({
        tier: 0,
        seated: false,
        reducedMotion: false,
        lowEnd: true,
      }),
    ).toEqual({
      tier: 0,
      composer: false,
      grain: false,
      cheapGlass: true,
      dustMul: 0,
      contactShadows: false,
      dpr: 1,
      directionalShadows: false,
      ambientEnabled: false,
      ambientHz: 6,
    });
  });

  it("drops the composer and scene motion while seated", () => {
    expect(
      resolveEffects({
        tier: 2,
        seated: true,
        reducedMotion: false,
        lowEnd: false,
      }),
    ).toEqual({
      tier: 2,
      composer: false,
      grain: false,
      cheapGlass: true,
      dustMul: 0,
      contactShadows: false,
      dpr: 1,
      directionalShadows: false,
      ambientEnabled: false,
      ambientHz: 6,
    });
  });

  it("halves particles for reduced motion", () => {
    expect(
      resolveEffects({
        tier: 2,
        seated: false,
        reducedMotion: true,
        lowEnd: false,
      }),
    ).toMatchObject({
      composer: true,
      grain: false,
      dustMul: 0.5,
      contactShadows: true,
      ambientEnabled: false,
    });
  });
});
