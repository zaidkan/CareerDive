/**
 * Pure idle-motion math for workplace figures.
 * Kept free of React / Three so jsdom tests never touch WebGL.
 */

export type FigureActivity = "idle" | "typing" | "reading" | "talking";

export const BLINK_MIN_S = 3;
export const BLINK_MAX_S = 7;
export const BLINK_DURATION_S = 0.12;
export const MAX_LOOK_YAW = (70 * Math.PI) / 180;
export const MAX_LOOK_PITCH = (25 * Math.PI) / 180;

const GOLDEN = 1.618033988749895;
const LOOK_RATE = 6;
const BREATH_AMP = 0.006;
const HEAD_FOLLOW_AMP = 0.002;
const STAND_SHIFT_AMP = 0.012;
const SIT_SHIFT_AMP = 0.0035;
const TYPE_HAND_AMP = 0.016;
const TYPE_OMEGA = 9;
const FADE_TIME = 0.5;

export type MotionPose = {
  spineY: number;
  spineX: number;
  spineZ: number;
  spineRotX: number;
  headYaw: number;
  headPitch: number;
  headY: number;
  leftArmRotX: number;
  rightArmRotX: number;
  leftArmRotZ: number;
  rightArmRotZ: number;
  leftHandY: number;
  rightHandY: number;
  leftLowerArmRotX: number;
  rightLowerArmRotX: number;
  eyeScaleY: number;
};

export type MotionState = {
  lookYaw: number;
  lookPitch: number;
  blinkAt: number;
  blinkIndex: number;
  pose: MotionPose;
};

export type MotionInput = {
  time: number;
  delta: number;
  phase: number;
  seated: boolean;
  activity: FigureActivity;
  hasLookAt: boolean;
  lookAtX: number;
  lookAtY: number;
  lookAtZ: number;
  figureX: number;
  figureY: number;
  figureZ: number;
  rotationY: number;
  headHeight: number;
};

const lookScratch = { yaw: 0, pitch: 0 };

function fract(n: number): number {
  return n - Math.floor(n);
}

function hash3(x: number, y: number, z: number): number {
  return fract(Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + 1) * 43758.5453);
}

function blinkGap(phase: number, index: number): number {
  const u = fract(Math.abs(phase) * GOLDEN + index * 0.371 + 0.08);
  return BLINK_MIN_S + u * (BLINK_MAX_S - BLINK_MIN_S);
}

function fadeIn(time: number): number {
  if (time <= 0) return 0;
  if (time >= FADE_TIME) return 1;
  return time / FADE_TIME;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function easeToward(current: number, target: number, delta: number): number {
  const dt = delta > 0.05 ? 0.05 : Math.max(delta, 0);
  const k = 1 - Math.exp(-LOOK_RATE * dt);
  return current + (target - current) * k;
}

function emptyPose(): MotionPose {
  return {
    spineY: 0,
    spineX: 0,
    spineZ: 0,
    spineRotX: 0,
    headYaw: 0,
    headPitch: 0,
    headY: 0,
    leftArmRotX: 0,
    rightArmRotX: 0,
    leftArmRotZ: 0,
    rightArmRotZ: 0,
    leftHandY: 0,
    rightHandY: 0,
    leftLowerArmRotX: 0,
    rightLowerArmRotX: 0,
    eyeScaleY: 1,
  };
}

export function resolvePhase(
  seed: number | undefined,
  position: readonly [number, number, number],
): number {
  if (seed !== undefined) {
    return seed * GOLDEN;
  }
  return hash3(position[0], position[1], position[2]) * Math.PI * 2;
}

export function breathHz(phase: number): number {
  return 0.2 + fract(Math.abs(phase) * 0.618 + 0.13) * 0.1;
}

export function createMotionState(phase: number): MotionState {
  return {
    lookYaw: 0,
    lookPitch: 0,
    blinkAt: blinkGap(phase, 0),
    blinkIndex: 0,
    pose: emptyPose(),
  };
}

export function createMotionInput(): MotionInput {
  return {
    time: 0,
    delta: 0,
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
  };
}

export function computeLookTarget(
  out: { yaw: number; pitch: number },
  lookAtX: number,
  lookAtY: number,
  lookAtZ: number,
  figureX: number,
  figureY: number,
  figureZ: number,
  rotationY: number,
  headHeight: number,
): void {
  const dx = lookAtX - figureX;
  const dy = lookAtY - (figureY + headHeight);
  const dz = lookAtZ - figureZ;
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);
  const lx = cosY * dx - sinY * dz;
  const lz = sinY * dx + cosY * dz;
  const horiz = Math.hypot(lx, lz);
  let yaw = 0;
  let pitch = 0;
  if (horiz < 1e-8) {
    pitch = dy >= 0 ? MAX_LOOK_PITCH : -MAX_LOOK_PITCH;
  } else {
    yaw = Math.atan2(lx, lz);
    pitch = Math.atan2(dy, horiz);
  }
  out.yaw = clamp(yaw, -MAX_LOOK_YAW, MAX_LOOK_YAW);
  out.pitch = clamp(pitch, -MAX_LOOK_PITCH, MAX_LOOK_PITCH);
}

function eyeScaleAt(time: number, blinkAt: number): number {
  const elapsed = time - blinkAt;
  if (elapsed < 0 || elapsed > BLINK_DURATION_S) return 1;
  const u = elapsed / BLINK_DURATION_S;
  const close = u < 0.5 ? u * 2 : (1 - u) * 2;
  return 1 - close * 0.92;
}

export function stepMotion(state: MotionState, input: MotionInput): void {
  const fade = fadeIn(input.time);
  const phase = input.phase;
  const time = input.time;
  const pose = state.pose;

  const hz = breathHz(phase);
  const omega = hz * Math.PI * 2;
  const breath = Math.sin(time * omega + phase);
  const headFollow = Math.sin(time * omega + phase - 0.35);

  pose.spineY = breath * BREATH_AMP * fade;
  pose.headY = headFollow * HEAD_FOLLOW_AMP * fade;

  const shiftAmp = input.seated ? SIT_SHIFT_AMP : STAND_SHIFT_AMP;
  pose.spineX = Math.sin(time * 0.55 + phase) * shiftAmp * fade;

  let spineZ = 0;
  let spineRotX = 0;
  let leftArmRotX = 0;
  let rightArmRotX = 0;
  let leftArmRotZ = 0;
  let rightArmRotZ = 0;
  let leftHandY = 0;
  let rightHandY = 0;
  let leftLowerArmRotX = 0;
  let rightLowerArmRotX = 0;
  let glanceYaw = 0;
  let glancePitch = 0;

  glanceYaw =
    Math.sin(time * 0.35 + phase) * 0.12 + Math.sin(time * 0.17 + phase * 1.7) * 0.06;
  glancePitch = Math.sin(time * 0.28 + phase * 0.9) * 0.05;

  if (input.activity === "typing") {
    const leftWave = Math.sin(time * TYPE_OMEGA + phase);
    const rightWave = Math.sin(time * TYPE_OMEGA + phase + Math.PI);
    const leftStrike = leftWave > 0 ? leftWave : 0;
    const rightStrike = rightWave > 0 ? rightWave : 0;
    leftHandY = -leftStrike * TYPE_HAND_AMP;
    rightHandY = -rightStrike * TYPE_HAND_AMP;
    leftArmRotX = leftStrike * 0.07;
    rightArmRotX = rightStrike * 0.07;
    leftArmRotZ = leftStrike * 0.03;
    rightArmRotZ = -rightStrike * 0.03;
    glancePitch = -0.08 + glancePitch * 0.35;
    glanceYaw *= 0.35;
  } else if (input.activity === "reading") {
    glanceYaw = Math.sin(time * 0.45 + phase) * 0.28;
    glancePitch = -0.06 + Math.sin(time * 0.22 + phase) * 0.03;
  } else if (input.activity === "talking") {
    glancePitch = Math.sin(time * 2.4 + phase) * 0.055;
    glanceYaw = Math.sin(time * 0.9 + phase) * 0.04;
    spineRotX = 0.025 + Math.sin(time * 1.1 + phase) * 0.012;
    spineZ = 0.006 + Math.sin(time * 1.1 + phase) * 0.004;
  }

  if (!input.seated && input.activity !== "typing") {
    leftArmRotX += Math.sin(time * 0.8 + phase) * 0.03;
    rightArmRotX += Math.sin(time * 0.74 + phase + 0.9) * 0.03;
    leftArmRotZ += Math.sin(time * 0.62 + phase * 1.2) * 0.02;
    rightArmRotZ += Math.sin(time * 0.58 + phase * 0.7) * 0.02;
    leftLowerArmRotX = Math.sin(time * 0.65 + phase * 1.3) * 0.025;
    rightLowerArmRotX = Math.sin(time * 0.7 + phase * 0.8) * 0.025;
  }

  if (input.hasLookAt) {
    computeLookTarget(
      lookScratch,
      input.lookAtX,
      input.lookAtY,
      input.lookAtZ,
      input.figureX,
      input.figureY,
      input.figureZ,
      input.rotationY,
      input.headHeight,
    );
    state.lookYaw = easeToward(state.lookYaw, lookScratch.yaw, input.delta);
    state.lookPitch = easeToward(state.lookPitch, lookScratch.pitch, input.delta);
  } else {
    state.lookYaw = glanceYaw;
    state.lookPitch = glancePitch;
  }

  pose.spineZ = spineZ * fade;
  pose.spineRotX = spineRotX * fade;
  pose.headYaw = state.lookYaw * fade;
  pose.headPitch = state.lookPitch * fade;
  pose.leftArmRotX = leftArmRotX * fade;
  pose.rightArmRotX = rightArmRotX * fade;
  pose.leftArmRotZ = leftArmRotZ * fade;
  pose.rightArmRotZ = rightArmRotZ * fade;
  pose.leftHandY = leftHandY * fade;
  pose.rightHandY = rightHandY * fade;
  pose.leftLowerArmRotX = leftLowerArmRotX * fade;
  pose.rightLowerArmRotX = rightLowerArmRotX * fade;

  let guard = 0;
  while (time > state.blinkAt + BLINK_DURATION_S && guard < 12) {
    state.blinkIndex += 1;
    state.blinkAt += BLINK_DURATION_S + blinkGap(phase, state.blinkIndex);
    guard += 1;
  }
  pose.eyeScaleY = eyeScaleAt(time, state.blinkAt);
}
