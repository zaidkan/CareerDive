import type { ClientNotification } from "@sim/schemas";
import type { NotificationHandler } from "./shared.js";
import {
  EMPTY_MUTATION_STATE,
  notificationMutationKey,
  type MutationState,
} from "../useMutationCoordinator.js";

export function NotificationBanner({
  notifications,
  onNotification,
  mutationState = EMPTY_MUTATION_STATE,
}: {
  notifications: ClientNotification[];
  onNotification?: NotificationHandler;
  mutationState?: MutationState;
}) {
  const notification = notifications.find(({ status }) => status === "unread");
  if (!notification) return null;
  const pending = Boolean(mutationState.pendingKey) || !onNotification;
  const pendingResponse = (response: "handle" | "snooze" | "continue") =>
    mutationState.pendingKey ===
    notificationMutationKey(notification, response);
  return (
    <section aria-label="New work" className="work-notification" role="status">
      <div>
        <p className="eyebrow">New work · {notification.priority} priority</p>
        <h3>{notification.title}</h3>
        <p>{notification.body}</p>
      </div>
      <div className="work-notification-actions">
        <button
          disabled={pending}
          onClick={() => void onNotification?.(notification, "handle")}
          type="button"
        >
          {pendingResponse("handle") ? "Opening…" : "Handle now"}
        </button>
        {notification.canSnooze ? (
          <button
            disabled={pending}
            onClick={() => void onNotification?.(notification, "snooze")}
            type="button"
          >
            {pendingResponse("snooze") ? "Snoozing…" : "Snooze 15 minutes"}
          </button>
        ) : null}
        <button
          disabled={pending}
          onClick={() => void onNotification?.(notification, "continue")}
          type="button"
        >
          {pendingResponse("continue") ? "Saving…" : "Continue current case"}
        </button>
      </div>
    </section>
  );
}
