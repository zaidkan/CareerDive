/** Presentation-only stamina. Never feeds evidence, deadlines, or sim clock. */
export const ENERGY_MAX = 100;
/** Empty after ~2.5 minutes of walking. */
export const WALK_DRAIN_PER_S = ENERGY_MAX / 150;
/** Empty after ~4 minutes seated. */
export const SEAT_DRAIN_PER_S = ENERGY_MAX / 240;
export const COFFEE_RESTORE = 44;
export const BAR_RESTORE = 58;
export const WAKE_ENERGY = 36;
export const LOW_ENERGY = 28;
/** Isolate the meter at 5 Hz instead of scheduling React work every frame. */
export const ENERGY_PUBLISH_INTERVAL_S = 0.2;
/** How long the player is out after a crash. Does not advance sim clock. */
export const SLEEP_MS = 2800;

export const MORGAN_SCOLD =
  "Morgan: You nodded off on shift. Eat a bar or get coffee from the break corner — this isn’t a nap room.";

export function clampEnergy(value: number): number {
  return Math.min(ENERGY_MAX, Math.max(0, value));
}

export function drainEnergy(
  current: number,
  dtSeconds: number,
  seated: boolean,
): number {
  const rate = seated ? SEAT_DRAIN_PER_S : WALK_DRAIN_PER_S;
  return clampEnergy(current - rate * Math.max(0, dtSeconds));
}

export function restoreEnergy(current: number, amount: number): number {
  return clampEnergy(current + Math.max(0, amount));
}

export function didCollapse(previous: number, next: number): boolean {
  return previous > 0 && next <= 0;
}

export function shouldPublishEnergy(
  elapsedSeconds: number,
  previous: number,
  next: number,
): boolean {
  return (
    elapsedSeconds >= ENERGY_PUBLISH_INTERVAL_S ||
    energyTone(previous) !== energyTone(next) ||
    didCollapse(previous, next)
  );
}

export function energyTone(value: number): "ok" | "low" | "critical" {
  if (value <= 12) return "critical";
  if (value <= LOW_ENERGY) return "low";
  return "ok";
}

/** Steal the gold marker for snacks only after the desk is known, or on collapse. */
export function energyRedirectsWayfinder(
  tone: ReturnType<typeof energyTone>,
  visitedDesk: boolean,
): boolean {
  if (tone === "ok") return false;
  return visitedDesk || tone === "critical";
}

type EnergyListener = () => void;
const energyListeners = new Set<EnergyListener>();
let energySnapshot = ENERGY_MAX;

export function getEnergy(): number {
  return energySnapshot;
}

export function subscribeEnergy(listener: EnergyListener): () => void {
  energyListeners.add(listener);
  return () => {
    energyListeners.delete(listener);
  };
}

export function setEnergySnapshot(next: number): void {
  const value = clampEnergy(next);
  if (value === energySnapshot) return;
  energySnapshot = value;
  for (const listener of energyListeners) listener();
}
