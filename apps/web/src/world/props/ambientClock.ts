/**
 * Single shared driver for cosmetic ambient animation.
 *
 * Instead of dozens of independent `useFrame` subscribers (LEDs, screen
 * breath, fans, papers), components register a callback at a modest Hz and
 * one driver invokes whoever is due. Gameplay systems — player, doors,
 * figures, hotspots — keep their own full-rate `useFrame`.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect } from "react";

export type AmbientUpdate = (elapsed: number, delta: number) => void;

type AmbientEntry = {
  fn: AmbientUpdate;
  hz: number;
  nextDue: number;
};

const entries = new Set<AmbientEntry>();

/** Test/diagnostic helper — how many cosmetic callbacks are registered. */
export function ambientSubscriberCount(): number {
  return entries.size;
}

/**
 * Register a cosmetic updater. Returns an unsubscribe function.
 * `hz` defaults low on purpose: LEDs and screen breath do not need 60 Hz.
 */
export function registerAmbient(fn: AmbientUpdate, hz = 10): () => void {
  const entry: AmbientEntry = {
    fn,
    hz: hz > 0 ? hz : 1,
    nextDue: 0,
  };
  entries.add(entry);
  return () => {
    entries.delete(entry);
  };
}

/** useEffect wrapper around registerAmbient so refs are settled first. */
export function useAmbient(
  fn: AmbientUpdate,
  hz = 10,
  enabled = true,
  deps: readonly unknown[] = [],
): void {
  useEffect(() => {
    if (!enabled) return undefined;
    return registerAmbient(fn, hz);
  }, [enabled, hz, ...deps]);
}

/**
 * Mount exactly once inside the Canvas. When `enabled` is false (seated,
 * hidden, LOW tier) nothing cosmetic runs.
 */
export function AmbientClockDriver({ enabled }: { enabled: boolean }) {
  useFrame((state, delta) => {
    if (!enabled || entries.size === 0) return;
    const t = state.clock.elapsedTime;
    for (const entry of entries) {
      if (t < entry.nextDue) continue;
      entry.nextDue = t + 1 / entry.hz;
      entry.fn(t, delta);
    }
  });
  return null;
}
