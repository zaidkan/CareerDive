export const DEFAULT_MOUSE_SENSITIVITY = 1;
export const MIN_MOUSE_SENSITIVITY = 0.5;
export const MAX_MOUSE_SENSITIVITY = 2;
export const MOUSE_SENSITIVITY_STEP = 0.1;
export const MOUSE_SENSITIVITY_STORAGE_KEY = "career-expo.mouse-sensitivity";

const LOOK_RADIANS_PER_PIXEL = 0.002;

export function clampMouseSensitivity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MOUSE_SENSITIVITY;
  return Math.min(
    MAX_MOUSE_SENSITIVITY,
    Math.max(MIN_MOUSE_SENSITIVITY, value),
  );
}

export function loadMouseSensitivity(): number {
  if (typeof window === "undefined") return DEFAULT_MOUSE_SENSITIVITY;
  try {
    const stored = window.localStorage.getItem(MOUSE_SENSITIVITY_STORAGE_KEY);
    if (stored === null) return DEFAULT_MOUSE_SENSITIVITY;
    const parsed = Number(stored);
    return Number.isFinite(parsed)
      ? clampMouseSensitivity(parsed)
      : DEFAULT_MOUSE_SENSITIVITY;
  } catch {
    return DEFAULT_MOUSE_SENSITIVITY;
  }
}

export function saveMouseSensitivity(value: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      MOUSE_SENSITIVITY_STORAGE_KEY,
      String(clampMouseSensitivity(value)),
    );
  } catch {
    // Preference persistence is optional; look control still works in memory.
  }
}

export function applyLookDelta(
  dx: number,
  dy: number,
  sensitivity: number,
): { yaw: number; pitch: number } {
  const scale = LOOK_RADIANS_PER_PIXEL * clampMouseSensitivity(sensitivity);
  return { yaw: dx * scale, pitch: dy * scale };
}
