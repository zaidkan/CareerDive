import type { Condition, WorldState } from "@sim/schemas";

export function conditionsMet(state: WorldState, conditions: Condition[]): boolean {
  return conditions.every(({ flag, equals }) => state.flags[flag] === equals);
}
