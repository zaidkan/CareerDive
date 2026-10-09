// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AudioToggle } from "../src/world/dialogue/AudioToggle.js";
import { setSimulationMuted } from "../src/world/dialogue/audio.js";
// Node 24 can expose a placeholder localStorage even in jsdom. Keep this
// test's persisted sound preference independent of the host's storage flags.
beforeEach(() => {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, String(value)); },
  };
  vi.stubGlobal("localStorage", storage);
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});
it("names both current sound state and the toggle action", () => {
  setSimulationMuted(false);
  render(<AudioToggle />);
  const on = screen.getByRole("button", { name: "Sound on — turn sound off" });
  expect(on).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(on);
  expect(
    screen.getByRole("button", { name: "Sound off — turn sound on" }),
  ).toHaveAttribute("aria-pressed", "false");
  expect(localStorage.getItem("career-expo:simulation-muted")).toBe("true");
});
it.each([null, "false", "true"])(
  "defaults on but respects persisted mute %s, without creating audio on import",
  async (stored) => {
    vi.resetModules();
    localStorage.clear();
    if (stored !== null)
      localStorage.setItem("career-expo:simulation-muted", stored);
    const created = vi.fn();
    vi.stubGlobal(
      "AudioContext",
      class {
        state = "running";
        constructor() {
          created();
        }
      },
    );
    const audio = await import("../src/world/dialogue/audio.js");
    expect(created).not.toHaveBeenCalled();
    audio.unlockDialogueAudio();
    expect(created).toHaveBeenCalledTimes(stored === "true" ? 0 : 1);
  },
);
