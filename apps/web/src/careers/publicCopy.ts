/** Shared public journey metadata; internal availability enums stay unchanged. */
export const FIRST_SHIFT_DURATION = "About 10–15 minutes";
export const FIRST_SHIFT_DURATION_COMPACT = "~10–15 min";

export function availabilityLabel(availability: string): string {
  return availability === "ready_now" ? "Playable now" : "Taking shape";
}
