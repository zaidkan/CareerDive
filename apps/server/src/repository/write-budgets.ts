import type { Reflection } from "@sim/schemas";

export const SESSION_CREATIONS_PER_HOUR = 10;
export const REFLECTIONS_PER_HOUR = 60;
export const REFLECTIONS_PER_SESSION = 64;

/** Exact-content retries return the original reflection, including its ID/time. */
export function sameReflection(left: Reflection, right: Reflection) {
  return (
    left.eventId === right.eventId &&
    left.enjoyment === right.enjoyment &&
    left.confidence === right.confidence &&
    left.note === right.note
  );
}
