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
const oscillatorGate = vi.fn();
const gainRamp = vi.fn();
const oscillators: Array<{
  type: string;
  frequency: { value: number };
  disconnect: ReturnType<typeof vi.fn>;
}> = [];
class TestAudioContext {
  state = "running";
  currentTime = 0;
  destination = {};
  constructor() {
    created();
  }
  resume = vi.fn(() => Promise.resolve());
  createOscillator() {
    oscillatorGate();
    const voice = {
      type: "",
      frequency: { value: 0 },
      connect: () => ({ connect() {} }),
      disconnect: vi.fn(),
      start,
      stop,
      onended: null,
    };
    oscillators.push(voice);
    return voice;
  }
  createGain() {
    return {
      gain: { setValueAtTime() {}, linearRampToValueAtTime: gainRamp },
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
  oscillatorGate.mockReset();
  gainRamp.mockClear();
  oscillators.length = 0;
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
    expect(created).not.toHaveBeenCalled();
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

it("varies bounded pitches without changing gain, duration, waveform, or single-voice ordering", () => {
  setSimulationMuted(false);
  for (let now = 3000; now < 4200; now += 100) dialogueTick(now);
  const pitches = oscillators.map(({ frequency }) => frequency.value);
  expect(new Set(pitches).size).toBeGreaterThanOrEqual(3);
  expect(pitches.every((pitch) => pitch >= 780 && pitch <= 1200)).toBe(true);
  expect(pitches.slice(6)).toEqual(pitches.slice(0, 6));
  expect(oscillators.every(({ type }) => type === "sine")).toBe(true);
  expect(
    gainRamp.mock.calls.every(([value]) => value === 0 || value === 0.009),
  ).toBe(true);
  expect(
    stop.mock.calls.filter(([when]) => typeof when === "number"),
  ).toHaveLength(12);
  expect(
    stop.mock.calls
      .filter(([when]) => typeof when === "number")
      .every(([when]) => when === 0.024),
  ).toBe(true);
  // Before the second start, the first voice is both scheduled to end and stopped.
  expect(stop.mock.invocationCallOrder[1]).toBeLessThan(
    start.mock.invocationCallOrder[1] ?? 0,
  );
});

it("silently handles failed audio creation without catch-up ticks", () => {
  setSimulationMuted(false);
  oscillatorGate.mockImplementationOnce(() => {
    throw new Error("Audio blocked");
  });
  expect(() => { dialogueTick(5000); }).not.toThrow();
  dialogueTick(5010);
  expect(start).not.toHaveBeenCalled();
  dialogueTick(5100);
  expect(start).toHaveBeenCalledTimes(1);
});

it("stops and disconnects a voice if starting audio fails", () => {
  setSimulationMuted(false);
  start.mockImplementationOnce(() => {
    throw new Error("Start blocked");
  });
  expect(() => { dialogueTick(6000); }).not.toThrow();
  expect(stop).toHaveBeenCalled();
  expect(oscillators[0]?.disconnect).toHaveBeenCalled();
});

it("degrades silently when AudioContext construction is blocked", async () => {
  vi.resetModules();
  vi.stubGlobal(
    "AudioContext",
    vi.fn(function blockedAudioContext() {
      throw new Error("AudioContext blocked");
    }),
  );
  const audio = await import("../src/world/dialogue/audio.js");
  expect(() => { audio.setSimulationMuted(false); }).not.toThrow();
  expect(() => { audio.dialogueTick(7000); }).not.toThrow();
  expect(start).not.toHaveBeenCalled();
  audio.setSimulationMuted(true);
});
