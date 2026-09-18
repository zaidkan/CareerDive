// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_MOUSE_SENSITIVITY,
  MAX_MOUSE_SENSITIVITY,
  MIN_MOUSE_SENSITIVITY,
  applyLookDelta,
  clampMouseSensitivity,
  loadMouseSensitivity,
  MOUSE_SENSITIVITY_STORAGE_KEY,
  saveMouseSensitivity,
} from "../src/world/mouseSensitivity.js";

const stored = new Map<string, string>();

beforeEach(() => {
  stored.clear();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => stored.get(key) ?? null,
      removeItem: (key: string) => {
        stored.delete(key);
      },
      setItem: (key: string, value: string) => {
        stored.set(key, value);
      },
    },
  });
});

afterEach(() => {
  stored.clear();
});

describe("mouse sensitivity preference", () => {
  it("uses current feel as default and clamps usable bounds", () => {
    expect(DEFAULT_MOUSE_SENSITIVITY).toBe(1);
    expect(loadMouseSensitivity()).toBe(DEFAULT_MOUSE_SENSITIVITY);
    expect(clampMouseSensitivity(MIN_MOUSE_SENSITIVITY - 1)).toBe(
      MIN_MOUSE_SENSITIVITY,
    );
    expect(clampMouseSensitivity(MAX_MOUSE_SENSITIVITY + 1)).toBe(
      MAX_MOUSE_SENSITIVITY,
    );
  });

  it("persists preference and ignores invalid stored values", () => {
    saveMouseSensitivity(1.7);
    expect(loadMouseSensitivity()).toBe(1.7);
    window.localStorage.setItem(MOUSE_SENSITIVITY_STORAGE_KEY, "not-a-number");
    expect(loadMouseSensitivity()).toBe(DEFAULT_MOUSE_SENSITIVITY);
  });

  it("scales look rotation without changing movement speed", () => {
    expect(applyLookDelta(10, -5, 1)).toEqual({ yaw: 0.02, pitch: -0.01 });
    expect(applyLookDelta(10, -5, 2)).toEqual({ yaw: 0.04, pitch: -0.02 });
  });
});
