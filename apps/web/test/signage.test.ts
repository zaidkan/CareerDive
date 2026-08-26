import { describe, expect, it } from "vitest";
import { fitFontSize } from "../src/world/textures.js";

/**
 * Monospace advance width is a fixed fraction of the em, so a stub measurer
 * models canvas closely enough to prove signage fits its plate.
 */
const MONO_ADVANCE = 0.6;
const measureFor = (text: string) => (px: number) => text.length * px * MONO_ADVANCE;

/** Every world-space plate: label text, canvas width, canvas height. */
const PLATES: [string, number, number][] = [
  ["EMPLOYEE OF THE MONTH", 512, 72],
  ["PRIYA", 256, 72],
  ["TEAM AWARD", 256, 64],
  ["BREAK ROOM", 256, 64],
  ["CABLES", 256, 64],
  ["ADAPTERS", 256, 64],
  ["COFFEE", 256, 64],
  ["EXIT", 256, 64],
];

describe("signage text fitting", () => {
  it.each(PLATES)("keeps %s inside its plate", (text, w, h) => {
    const inset = Math.max(10, w * 0.07);
    const maxWidth = w - inset * 2;
    const size = fitFontSize({
      measure: measureFor(text),
      maxWidth,
      startPx: h * 0.5,
    });

    expect(measureFor(text)(size)).toBeLessThanOrEqual(maxWidth);
    // Anything under ~9px on a 64px plate would be unreadable in world space.
    expect(size).toBeGreaterThanOrEqual(9);
  });

  it("shrinks long text rather than overflowing", () => {
    const long = "EMPLOYEE OF THE MONTH";
    const short = "EXIT";
    const fitLong = fitFontSize({
      measure: measureFor(long),
      maxWidth: 440,
      startPx: 36,
    });
    const fitShort = fitFontSize({
      measure: measureFor(short),
      maxWidth: 440,
      startPx: 36,
    });

    expect(fitLong).toBeLessThan(fitShort);
    expect(fitShort).toBe(36);
  });

  it("never returns a size below the floor", () => {
    const absurd = "X".repeat(400);
    const size = fitFontSize({
      measure: measureFor(absurd),
      maxWidth: 40,
      startPx: 32,
    });

    expect(size).toBe(7);
  });
});
