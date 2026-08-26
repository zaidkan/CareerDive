/**
 * Cheap ambient-motion helpers. Pure math stays allocation-free so useFrame
 * can call it every tick; reduced-motion is read inside the hook, never at
 * module scope.
 */
import { useEffect, useState } from "react";

/** Matches DualMonitor / MonitorArmDesk JSX defaults. */
export const DUAL_SCREEN_INTENSITY = 0.55;
export const DUAL_OS_SCREEN_INTENSITY = 0.15;
export const DUAL_BAR_INTENSITY = 1.05;
export const ARM_SCREEN_INTENSITY = 0.55;
export const RACK_STATUS_LED_INTENSITY = 0.8;
export const FIXTURE_LIT_INTENSITY = 1.7;
export const FIXTURE_UNLIT_INTENSITY = 0.35;
export const CAMERA_LED_REST = 1;

/** West-north emissive panel in SocRoom — the single fixture that auto-flickers. */
export const AUTO_FLICKER_POSITION: readonly [number, number, number] = [-8, 3.2, -4.5];

export const DUST_COUNT_MAX = 280;
export const STEAM_WISP_COUNT = 10;

export function clampParticleCount(count: number, max = DUST_COUNT_MAX): number {
  if (count < 1) return 1;
  if (count > max) return max;
  return Math.floor(count);
}

/** 1 at t=0 so screens match today's rest intensity on the first frame. */
export function screenBreath(elapsed: number, freq: number): number {
  return 1 + 0.06 * Math.sin(elapsed * freq);
}

/**
 * Rare, faint fluorescent-style dip. Returns 1 outside a short window so it
 * never strobes. Dips stay above 0.78 of rest brightness.
 */
export function screenFlickerMul(elapsed: number, burstAt: number): number {
  const u = elapsed - burstAt;
  if (u < 0 || u > 0.26) return 1;
  if (u < 0.06) return 0.88;
  if (u < 0.12) return 1;
  if (u < 0.2) return 0.8;
  return 1;
}

export function screenIntensity(
  elapsed: number,
  base: number,
  freq: number,
  burstAt: number,
): number {
  return base * screenBreath(elapsed, freq) * screenFlickerMul(elapsed, burstAt);
}

export function screenMapOffsetY(elapsed: number): number {
  return (elapsed * 0.008) % 1;
}

export function screenMapOffsetX(elapsed: number): number {
  return 0.01 * Math.sin(elapsed * 0.12);
}

/** phase = π/2 keeps the LED on at t=0 (matches today's rest pose). */
export function rackLedOn(
  elapsed: number,
  speed: number,
  phase: number,
  threshold: number,
): boolean {
  return Math.sin(elapsed * speed + phase) > threshold;
}

export function fixtureFlickerMul(elapsed: number, burstAt: number): number {
  const u = elapsed - burstAt;
  if (u < 0 || u > 0.38) return 1;
  if (u < 0.08) return 0.72;
  if (u < 0.16) return 1;
  if (u < 0.26) return 0.58;
  return 1;
}

export function isAutoFlickerFixture(position: readonly [number, number, number]): boolean {
  return (
    position[0] === AUTO_FLICKER_POSITION[0] &&
    position[1] === AUTO_FLICKER_POSITION[1] &&
    position[2] === AUTO_FLICKER_POSITION[2]
  );
}

export function readPrefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Decorative motion runs only when `animated` is true and the user has not
 * requested reduced motion. The matchMedia query is created in an effect so
 * nothing WebGL/window-related runs at module scope.
 */
export function useAmbientMotion(animated = true): boolean {
  const [reduced, setReduced] = useState(readPrefersReducedMotion);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReduced(mq.matches);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
    };
  }, []);

  return animated && !reduced;
}
