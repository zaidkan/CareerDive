/** First-person walk bob. Vertical must stay a soft sway, not a bounce. */
export const WALK_BOB_Y = 0.007;
export const WALK_BOB_Z = 0.01;

export function walkBobOffset(
  phase: number,
  amount: number,
): { y: number; z: number } {
  const amp = Math.max(0, amount);
  return {
    y: Math.sin(phase) * WALK_BOB_Y * amp,
    z: Math.cos(phase) * WALK_BOB_Z * amp,
  };
}
