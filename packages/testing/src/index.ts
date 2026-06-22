import type { ClientView, SimulationActionId } from "@sim/schemas";

export function assertViewParity(
  left: ClientView,
  right: ClientView,
): SimulationActionId[] {
  const leftIds = left.availableActions.map(({ id }) => id).sort();
  const rightIds = right.availableActions.map(({ id }) => id).sort();
  if (JSON.stringify(leftIds) !== JSON.stringify(rightIds)) {
    throw new Error("View adapters expose different action sets");
  }
  return leftIds;
}
