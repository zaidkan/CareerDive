import type { ActionLogEntry, WorldState } from "@sim/schemas";
import { applyAction } from "./reducer.js";

export function foldActionLog(
  initialState: WorldState,
  entries: ActionLogEntry[],
): WorldState {
  return [...entries]
    .sort((left, right) => left.sequence - right.sequence)
    .reduce(
      (state, entry) => applyAction(state, entry.action).state,
      initialState,
    );
}
