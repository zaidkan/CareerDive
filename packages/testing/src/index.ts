import type { ClientView } from "@sim/schemas";

export function assertViewParity(
  left: ClientView,
  right: ClientView,
): string[] {
  const actionKey = ({
    id,
    eventId,
    systemId,
  }: ClientView["availableActions"][number]) => `${id}:${eventId}:${systemId}`;
  const leftIds = left.availableActions.map(actionKey).sort();
  const rightIds = right.availableActions.map(actionKey).sort();
  if (JSON.stringify(leftIds) !== JSON.stringify(rightIds)) {
    throw new Error("View adapters expose different action sets");
  }
  return leftIds;
}
