import type { ActionLogEntry, WorldState } from "@sim/schemas";
import { respondToNotification } from "./notifications.js";
import { applyAction } from "./reducer.js";
import { applyTaskAttempt } from "./tasks.js";
import { applyWorkplaceInteraction } from "./workplace.js";

export function foldActionLog(
  initialState: WorldState,
  entries: ActionLogEntry[],
): WorldState {
  return [...entries]
    .sort((left, right) => left.sequence - right.sequence)
    .reduce((state, entry) => {
      switch (entry.interaction.type) {
        case "action":
          return applyAction(state, entry.interaction.action).state;
        case "task_attempt":
          return applyTaskAttempt(state, entry.interaction.attempt).state;
        case "notification_response":
          return respondToNotification(state, entry.interaction.response);
        case "workplace_interaction":
          return applyWorkplaceInteraction(state, entry.interaction.interaction)
            .state;
      }
    }, initialState);
}
