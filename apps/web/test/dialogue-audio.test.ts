// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  dialogueTick,
  setSimulationMuted,
  stopDialogueAudio,
  unlockDialogueAudio,
} from "../src/world/dialogue/audio.js";
const start = vi.fn();
const stop = vi.fn();
const created = vi.fn();
class TestAudioContext {
  state = "running";
  currentTime = 0;
  destination = {};
  constructor() {
    created();
  }
  resume = vi.fn(() => Promise.resolve());
  createOscillator() {
    return {
      type: "",
      frequency: { value: 0 },
      connect: () => ({ connect() {} }),
      disconnect() {},
      start,
      stop,
      onended: null,
    };
  }
  createGain() {
    return {
      gain: { setValueAtTime() {}, linearRampToValueAtTime() {} },
      connect() {},
      disconnect() {},
    };
  }
}
beforeEach(() => {
  vi.stubGlobal("AudioContext", TestAudioContext);
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
  setSimulationMuted(true);
  start.mockClear();
  stop.mockClear();
});
afterEach(() => {
  stopDialogueAudio();
  setSimulationMuted(true);
  delete (document as unknown as { hidden?: boolean }).hidden;
  vi.unstubAllGlobals();
});
describe("dialogue audio lifecycle", () => {
  it("does not start before explicit unlock and caps cadence at ten ticks per second", () => {
    dialogueTick(0);
    expect(start).not.toHaveBeenCalled();
    setSimulationMuted(false);
    unlockDialogueAudio();
    for (let now = 0; now < 1000; now += 10) dialogueTick(now);
    expect(start).toHaveBeenCalledTimes(10);
    expect(created).toHaveBeenCalledTimes(1);
  });
  it("stops immediately on mute and never starts a hidden-tab tick", () => {
    setSimulationMuted(false);
    dialogueTick(2000);
    expect(start).toHaveBeenCalledTimes(1);
    setSimulationMuted(true);
    expect(stop).toHaveBeenCalled();
    dialogueTick(2200);
    expect(start).toHaveBeenCalledTimes(1);
    setSimulationMuted(false);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    dialogueTick(2400);
    expect(start).toHaveBeenCalledTimes(1);
  });
});
