import { describe, expect, it } from "vitest";
import {
  BLINK_MAX_S,
  BLINK_MIN_S,
  MAX_LOOK_PITCH,
  MAX_LOOK_YAW,
  breathHz,
  computeLookTarget,
  createMotionState,
  resolvePhase,
  stepMotion,
  type MotionInput,
  type MotionState,
} from "../src/world/figure/motion.js";

const ORIGIN: [number, number, number] = [0, 0, 0];

function input(overrides: Partial<MotionInput> = {}): MotionInput {
  return {
    time: 0,
    delta: 1 / 60,
    phase: 0,
    seated: false,
    activity: "idle",
    hasLookAt: false,
    lookAtX: 0,
    lookAtY: 0,
    lookAtZ: 0,
    figureX: 0,
    figureY: 0,
    figureZ: 0,
    rotationY: 0,
    headHeight: 1.82,
    ...overrides,
  };
}

function sample(state: MotionState, overrides: Partial<MotionInput>): void {
  stepMotion(state, input(overrides));
}

describe("resolvePhase", () => {
  it("uses an explicit seed instead of position", () => {
    const fromSeed = resolvePhase(3, [8, 0, -2]);
    const otherPos = resolvePhase(3, [-4, 0, 9]);
    expect(fromSeed).toBe(otherPos);
    expect(fromSeed).not.toBe(0);
  });

  it("derives a phase from position when seed is omitted", () => {
    const a = resolvePhase(undefined, [7.6, 0, -6.05]);
    const b = resolvePhase(undefined, [-1.65, 0, 2.5]);
    expect(a).not.toBe(b);
  });

  it("keeps the same omitted-seed phase for the same position", () => {
    const pos: [number, number, number] = [3.2, 0, 1.1];
    expect(resolvePhase(undefined, pos)).toBe(resolvePhase(undefined, pos));
  });

  it("spreads integer seeds so figures do not start in lockstep", () => {
    expect(resolvePhase(0, ORIGIN)).not.toBe(resolvePhase(1, ORIGIN));
    expect(resolvePhase(1, ORIGIN)).not.toBe(resolvePhase(2, ORIGIN));
  });
});

describe("breathHz", () => {
  it("stays in the idle breathing band for any phase", () => {
    for (let i = 0; i < 20; i += 1) {
      const hz = breathHz(i * 0.37);
      expect(hz).toBeGreaterThanOrEqual(0.2);
      expect(hz).toBeLessThanOrEqual(0.3);
    }
  });
});

describe("stepMotion rest and desync", () => {
  it("leaves the rest pose untouched at t=0", () => {
    const state = createMotionState(1.2);
    sample(state, { time: 0, phase: 1.2, activity: "talking", seated: true });
    expect(state.pose.spineY).toBe(0);
    expect(state.pose.spineX).toBe(0);
    expect(state.pose.spineZ).toBe(0);
    expect(state.pose.spineRotX).toBe(0);
    expect(state.pose.headYaw).toBe(0);
    expect(state.pose.headPitch).toBe(0);
    expect(state.pose.headY).toBe(0);
    expect(state.pose.leftArmRotX).toBe(0);
    expect(state.pose.rightArmRotX).toBe(0);
    expect(state.pose.leftHandY).toBe(0);
    expect(state.pose.rightHandY).toBe(0);
    expect(state.pose.leftLowerArmRotX).toBe(0);
    expect(state.pose.rightLowerArmRotX).toBe(0);
    expect(state.pose.eyeScaleY).toBe(1);
  });

  it("desynchronizes breathing across phases after motion starts", () => {
    const a = createMotionState(0);
    const b = createMotionState(2.1);
    sample(a, { time: 4, phase: 0 });
    sample(b, { time: 4, phase: 2.1 });
    expect(a.pose.spineY).not.toBeCloseTo(b.pose.spineY, 5);
  });

  it("keeps breathing displacement in millimetres", () => {
    const state = createMotionState(0);
    let peak = 0;
    for (let t = 0.5; t < 8; t += 0.05) {
      sample(state, { time: t, phase: 0 });
      peak = Math.max(peak, Math.abs(state.pose.spineY));
    }
    expect(peak).toBeGreaterThan(0.002);
    expect(peak).toBeLessThan(0.02);
  });
});

describe("head tracking", () => {
  const look = { yaw: 0, pitch: 0 };

  it("looks forward when the target is ahead", () => {
    computeLookTarget(look, 0, 1.82, 4, 0, 0, 0, 0, 1.82);
    expect(look.yaw).toBeCloseTo(0, 5);
    expect(look.pitch).toBeCloseTo(0, 5);
  });

  it("clamps yaw to about ±70°", () => {
    computeLookTarget(look, 20, 1.82, 0, 0, 0, 0, 0, 1.82);
    expect(look.yaw).toBeCloseTo(MAX_LOOK_YAW, 5);
    computeLookTarget(look, -20, 1.82, 0, 0, 0, 0, 0, 1.82);
    expect(look.yaw).toBeCloseTo(-MAX_LOOK_YAW, 5);
  });

  it("clamps pitch to about ±25°", () => {
    computeLookTarget(look, 0, 20, 2, 0, 0, 0, 0, 1.82);
    expect(look.pitch).toBeLessThanOrEqual(MAX_LOOK_PITCH);
    expect(look.pitch).toBeGreaterThan(0.2);
    computeLookTarget(look, 0, -20, 2, 0, 0, 0, 0, 1.82);
    expect(look.pitch).toBeGreaterThanOrEqual(-MAX_LOOK_PITCH);
    expect(look.pitch).toBeLessThan(-0.2);
  });

  it("eases toward a look target instead of snapping", () => {
    const state = createMotionState(0);
    sample(state, {
      time: 1,
      hasLookAt: true,
      lookAtX: 2,
      lookAtY: 1.82,
      lookAtZ: 4,
      delta: 1 / 60,
    });
    const first = state.pose.headYaw;
    expect(Math.abs(first)).toBeGreaterThan(0);
    computeLookTarget(look, 2, 1.82, 4, 0, 0, 0, 0, 1.82);
    expect(Math.abs(first)).toBeLessThan(Math.abs(look.yaw) * 0.5);

    for (let i = 0; i < 180; i += 1) {
      sample(state, {
        time: 1 + (i + 1) / 60,
        hasLookAt: true,
        lookAtX: 2,
        lookAtY: 1.82,
        lookAtZ: 4,
        delta: 1 / 60,
      });
    }
    expect(state.pose.headYaw).toBeCloseTo(look.yaw, 2);
  });

  it("uses idle glances when no look target is set", () => {
    const state = createMotionState(0.4);
    sample(state, { time: 3, phase: 0.4, activity: "idle" });
    expect(
      Math.abs(state.pose.headYaw) + Math.abs(state.pose.headPitch),
    ).toBeGreaterThan(0);
  });
});

describe("activities", () => {
  it("alternates seated keystrokes", () => {
    const state = createMotionState(0);
    let leftDown = false;
    let rightDown = false;
    let opposite = false;
    for (let t = 1; t < 3; t += 0.04) {
      sample(state, { time: t, seated: true, activity: "typing", phase: 0 });
      if (state.pose.leftHandY < -0.004) leftDown = true;
      if (state.pose.rightHandY < -0.004) rightDown = true;
      if (state.pose.leftHandY < -0.004 && state.pose.rightHandY > -0.002) {
        opposite = true;
      }
    }
    expect(leftDown).toBe(true);
    expect(rightDown).toBe(true);
    expect(opposite).toBe(true);
  });

  it("scans the head slowly while reading", () => {
    const state = createMotionState(0);
    const yaws: number[] = [];
    for (let t = 1; t < 8; t += 0.25) {
      sample(state, { time: t, activity: "reading", phase: 0 });
      yaws.push(state.pose.headYaw);
    }
    const span = Math.max(...yaws) - Math.min(...yaws);
    expect(span).toBeGreaterThan(0.15);
    expect(span).toBeLessThan(0.8);
  });

  it("nods and leans while talking", () => {
    const state = createMotionState(0.8);
    let pitchSpan = 0;
    let lean = 0;
    let prevPitch = 0;
    for (let t = 1; t < 4; t += 0.05) {
      sample(state, { time: t, activity: "talking", phase: 0.8 });
      pitchSpan = Math.max(pitchSpan, Math.abs(state.pose.headPitch - prevPitch));
      lean = Math.max(lean, Math.abs(state.pose.spineRotX));
      prevPitch = state.pose.headPitch;
    }
    expect(pitchSpan).toBeGreaterThan(0.002);
    expect(lean).toBeGreaterThan(0.01);
  });

  it("shifts standing weight more than a seated idle", () => {
    const stand = createMotionState(0);
    const sit = createMotionState(0);
    let standPeak = 0;
    let sitPeak = 0;
    for (let t = 1; t < 10; t += 0.1) {
      sample(stand, { time: t, seated: false, activity: "idle", phase: 0 });
      sample(sit, { time: t, seated: true, activity: "idle", phase: 0 });
      standPeak = Math.max(standPeak, Math.abs(stand.pose.spineX));
      sitPeak = Math.max(sitPeak, Math.abs(sit.pose.spineX));
    }
    expect(standPeak).toBeGreaterThan(0.006);
    expect(standPeak).toBeGreaterThan(sitPeak * 1.5);
  });
});

describe("Figure module", () => {
  it("loads without touching WebGL at import time", async () => {
    const mod = await import("../src/world/Figure.js");
    expect(typeof mod.Figure).toBe("function");
  });
});

describe("blinking", () => {
  it("starts with eyes open and blinks within 3–7s", () => {
    const state = createMotionState(0.9);
    expect(state.pose.eyeScaleY).toBe(1);
    let blinked = false;
    let blinkTime = -1;
    for (let t = 0; t <= BLINK_MAX_S + 0.2; t += 1 / 60) {
      sample(state, { time: t, phase: 0.9, delta: 1 / 60 });
      if (state.pose.eyeScaleY < 0.4) {
        blinked = true;
        blinkTime = t;
        break;
      }
    }
    expect(blinked).toBe(true);
    expect(blinkTime).toBeGreaterThanOrEqual(BLINK_MIN_S);
    expect(blinkTime).toBeLessThanOrEqual(BLINK_MAX_S);
  });

  it("does not blink in lockstep across figures", () => {
    const a = createMotionState(0.2);
    const b = createMotionState(4.4);
    let aTime = -1;
    let bTime = -1;
    for (let t = 0; t <= BLINK_MAX_S + 0.2; t += 1 / 60) {
      sample(a, { time: t, phase: 0.2, delta: 1 / 60 });
      sample(b, { time: t, phase: 4.4, delta: 1 / 60 });
      if (aTime < 0 && a.pose.eyeScaleY < 0.4) aTime = t;
      if (bTime < 0 && b.pose.eyeScaleY < 0.4) bTime = t;
      if (aTime >= 0 && bTime >= 0) break;
    }
    expect(aTime).toBeGreaterThan(0);
    expect(bTime).toBeGreaterThan(0);
    expect(Math.abs(aTime - bTime)).toBeGreaterThan(0.2);
  });
});
