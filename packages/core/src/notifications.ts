import type {
  NotificationResponse,
  NotificationState,
  PackNotificationDefinition,
  WorldState,
} from "@sim/schemas";

export class NotificationUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationUnavailableError";
  }
}

export function notificationForEvent(
  state: WorldState,
  eventId: string,
): Array<{ definition: PackNotificationDefinition; state: NotificationState }> {
  const event = state.events.find(({ id }) => id === eventId);
  if (!event) return [];
  return Object.values(state.rules.notifications)
    .filter(({ eventTemplateId }) => eventTemplateId === event.templateId)
    .map((definition) => ({
      definition,
      state: {
        id: definition.id,
        eventId: event.id,
        status: "unread" as const,
        snoozeUsed: false,
      },
    }));
}

export function ensureNotificationsForEvent(
  state: WorldState,
  eventId: string,
): void {
  for (const candidate of notificationForEvent(state, eventId)) {
    if (!state.notifications.some(({ id }) => id === candidate.state.id)) {
      state.notifications.push(candidate.state);
    }
  }
}

export function wakeSnoozedNotifications(state: WorldState): void {
  for (const notification of state.notifications) {
    if (
      notification.status === "snoozed" &&
      notification.snoozedUntil !== undefined &&
      state.simClock >= notification.snoozedUntil
    ) {
      notification.status = "unread";
      delete notification.snoozedUntil;
    }
  }
}

export function respondToNotification(
  currentState: WorldState,
  response: NotificationResponse,
): WorldState {
  const state = structuredClone(currentState);
  const notification = state.notifications.find(
    ({ id }) => id === response.notificationId,
  );
  const definition = state.rules.notifications[response.notificationId];
  if (!notification || !definition) {
    throw new NotificationUnavailableError("Notification is not available");
  }
  const event = state.events.find(({ id }) => id === notification.eventId);
  if (!event || event.status !== "active") {
    throw new NotificationUnavailableError("Notification event is no longer active");
  }

  if (response.response === "snooze") {
    if (notification.snoozeUsed) {
      throw new NotificationUnavailableError(
        "This notification has already been snoozed once",
      );
    }
    notification.status = "snoozed";
    notification.snoozeUsed = true;
    notification.snoozedUntil = state.simClock + definition.snoozeMinutes;
  } else {
    notification.status = "acknowledged";
    delete notification.snoozedUntil;
  }
  return state;
}
