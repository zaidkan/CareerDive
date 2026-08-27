import type { ClientNotification } from "@sim/schemas";
import type { NotificationHandler } from "./shared.js";

export function NotificationBanner({
  notifications,
  onNotification,
}: {
  notifications: ClientNotification[];
  onNotification?: NotificationHandler;
}) {
  const notification = notifications.find(({ status }) => status === "unread");
  if (!notification) return null;
  return (
    <section aria-label="New work" className="work-notification" role="status">
      <div>
        <p className="eyebrow">New work · {notification.priority} priority</p>
        <h3>{notification.title}</h3>
        <p>{notification.body}</p>
      </div>
      <div className="work-notification-actions">
        <button
          onClick={() => void onNotification?.(notification, "handle")}
          type="button"
        >
          Handle now
        </button>
        {notification.canSnooze ? (
          <button
            onClick={() => void onNotification?.(notification, "snooze")}
            type="button"
          >
            Snooze 15 minutes
          </button>
        ) : null}
        <button
          onClick={() => void onNotification?.(notification, "continue")}
          type="button"
        >
          Continue current case
        </button>
      </div>
    </section>
  );
}
