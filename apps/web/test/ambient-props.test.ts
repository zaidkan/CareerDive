// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  AUTO_FLICKER_POSITION,
  CAMERA_LED_REST,
  DUAL_BAR_INTENSITY,
  DUAL_OS_SCREEN_INTENSITY,
  DUAL_SCREEN_INTENSITY,
  DUST_COUNT_MAX,
  FIXTURE_LIT_INTENSITY,
  FIXTURE_UNLIT_INTENSITY,
  RACK_STATUS_LED_INTENSITY,
  STEAM_WISP_COUNT,
  clampParticleCount,
  fixtureFlickerMul,
  isAutoFlickerFixture,
  rackLedOn,
  readPrefersReducedMotion,
  screenBreath,
  screenFlickerMul,
  screenIntensity,
  screenMapOffsetX,
  screenMapOffsetY,
} from "../src/world/props/ambient.js";

describe("ambient motion rest pose", () => {
  it("keeps screen brightness at today's JSX values at t=0", () => {
    expect(screenBreath(0, 0.48)).toBe(1);
    expect(screenFlickerMul(0, 9.5)).toBe(1);
    expect(screenIntensity(0, DUAL_SCREEN_INTENSITY, 0.48, 9.5)).toBe(DUAL_SCREEN_INTENSITY);
    expect(screenIntensity(0, DUAL_OS_SCREEN_INTENSITY, 0.48, 9.5)).toBe(
      DUAL_OS_SCREEN_INTENSITY,
    );
    expect(screenIntensity(0, DUAL_BAR_INTENSITY, 0.22, 9.5)).toBe(DUAL_BAR_INTENSITY);
    expect(screenMapOffsetX(0)).toBe(0);
    expect(screenMapOffsetY(0)).toBe(0);
  });

  it("keeps rack LEDs on at t=0", () => {
    expect(rackLedOn(0, 1.15, Math.PI / 2, 0.62)).toBe(true);
    expect(RACK_STATUS_LED_INTENSITY).toBe(0.8);
  });

  it("does not dim fixtures at t=0", () => {
    expect(fixtureFlickerMul(0, 18)).toBe(1);
    expect(FIXTURE_LIT_INTENSITY).toBe(1.7);
    expect(FIXTURE_UNLIT_INTENSITY).toBe(0.35);
    expect(CAMERA_LED_REST).toBe(1);
  });
});

describe("ambient motion character", () => {
  it("breathes only a few percent around rest", () => {
    const hi = screenBreath(Math.PI / (2 * 0.48), 0.48);
    const lo = screenBreath((3 * Math.PI) / (2 * 0.48), 0.48);
    expect(hi).toBeLessThan(1.07);
    expect(lo).toBeGreaterThan(0.93);
  });

  it("keeps rare screen flicker faint, never a strobe to black", () => {
    const samples = [0, 0.03, 0.08, 0.15, 0.22, 0.3].map((u) =>
      screenFlickerMul(10 + u, 10),
    );
    for (const mul of samples) {
      expect(mul).toBeGreaterThanOrEqual(0.8);
      expect(mul).toBeLessThanOrEqual(1);
    }
  });

  it("caps dust at a few hundred motes", () => {
    expect(clampParticleCount(12_000)).toBe(DUST_COUNT_MAX);
    expect(DUST_COUNT_MAX).toBeLessThanOrEqual(280);
    expect(clampParticleCount(0)).toBe(1);
    expect(STEAM_WISP_COUNT).toBeLessThanOrEqual(16);
  });

  it("auto-flickers only the west-north emissive panel", () => {
    expect(isAutoFlickerFixture(AUTO_FLICKER_POSITION)).toBe(true);
    expect(isAutoFlickerFixture([0, 3.2, 0.5])).toBe(false);
    expect(AUTO_FLICKER_POSITION).toEqual([-8, 3.2, -4.5]);
  });
});

describe("prefers-reduced-motion", () => {
  it("treats a missing matchMedia as motion-ok", () => {
    const previous = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    expect(readPrefersReducedMotion()).toBe(false);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: previous,
    });
  });

  it("reads the reduce media query when present", () => {
    const previous = window.matchMedia;
    window.matchMedia = (query: string): MediaQueryList => ({
        matches: query.includes("prefers-reduced-motion: reduce"),
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      });
    expect(readPrefersReducedMotion()).toBe(true);
    window.matchMedia = previous;
  });
});
