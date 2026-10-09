// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AudioToggle } from "../src/world/dialogue/AudioToggle.js";
import { setSimulationMuted } from "../src/world/dialogue/audio.js";
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
