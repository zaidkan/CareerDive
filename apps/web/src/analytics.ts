import { LaunchEventSchema, type LaunchEventName } from "@sim/schemas";
import { apiOrigin, authHeaders } from "./transport.js";
/** Best effort; analytics never blocks the product or creates an identity. */
export function launchEvent(
  name: LaunchEventName,
  careerId?: string,
  occurrenceKey?: string,
): void {
  if (import.meta.env.VITE_LAUNCH_ANALYTICS_ENABLED !== "true") return;
  let eventId: string = crypto.randomUUID();
  if (occurrenceKey) {
    try {
      const key = `career-expo-event:${name}:${occurrenceKey}`;
      eventId = window.sessionStorage.getItem(key) ?? eventId;
      window.sessionStorage.setItem(key, eventId);
    } catch {
      /* Analytics remains optional when storage is blocked. */
    }
  }
  const parsed = LaunchEventSchema.safeParse({
    eventId,
    name,
    ...(careerId ? { careerId } : {}),
  });
  if (!parsed.success) return;
  void (async () => {
    const authenticated = ![
      "landing",
      "career_viewed",
      "start_initiated",
    ].includes(name);
    const headers = authenticated ? await authHeaders() : {};
    await fetch(`${apiOrigin}/api/launch-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(parsed.data),
      keepalive: true,
      signal: AbortSignal.timeout(5000),
    });
  })().catch(() => {
    /* Product never depends on analytics delivery. */
  });
}
