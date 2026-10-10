const LOOK_RADIANS_PER_PIXEL = 0.002;

/** Fixed default mouse-look speed, for drag input. */
export function applyLookDelta(
  dx: number,
  dy: number,
): { yaw: number; pitch: number } {
  return {
    yaw: dx * LOOK_RADIANS_PER_PIXEL,
    pitch: dy * LOOK_RADIANS_PER_PIXEL,
  };
}
