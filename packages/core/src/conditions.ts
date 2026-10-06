import type { Condition, WorldState } from "@sim/schemas";

/**
 * Server-only pack predicate. Every condition must match recorded flags.
 * `equals` and `notEquals` are mutually exclusive; an unset flag only
 * satisfies `notEquals` (a flag that was never set is not equal to anything).
 */
export function conditionsMet(
  state: WorldState,
  conditions: Condition[],
): boolean {
  return conditions.every((condition) => {
    const value = state.flags[condition.flag];
    if (condition.notEquals !== undefined) return value !== condition.notEquals;
    return value === condition.equals;
  });
}
