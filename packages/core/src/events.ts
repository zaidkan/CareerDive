import type { EventStatus } from "@sim/schemas";

/**
 * Approved Work Item lifecycle transitions over extended `EventInstance`
 * status (Phase 1 contract). Legacy direct transitions (active →
 * resolved/escalated/expired) remain legal so existing flows are unaffected;
 * terminal states accept no outgoing transitions (reopen is Phase 5 scope).
 */
const EVENT_TRANSITIONS: Record<EventStatus, readonly EventStatus[]> = {
  pending: ["active", "expired"],
  active: ["acknowledged", "monitoring", "resolved", "escalated", "expired"],
  acknowledged: ["monitoring", "waiting", "resolved", "escalated", "expired"],
  monitoring: ["waiting", "resolved", "escalated", "expired"],
  waiting: ["monitoring", "acknowledged", "resolved", "escalated", "expired"],
  resolved: [],
  escalated: [],
  expired: [],
};

export function isLegalEventTransition(
  from: EventStatus,
  to: EventStatus,
): boolean {
  return EVENT_TRANSITIONS[from].includes(to);
}
