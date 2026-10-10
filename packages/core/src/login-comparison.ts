import type { WorldState } from "@sim/schemas";
import { sourceBundle } from "./reasoning-options.js";

/** Exact comparison references can come from curated sources or inspected query rows. */
export function hasLoginRouteComparison(
  comparisons: WorldState["workplace"]["comparisons"],
  eventId: string,
): boolean {
  return (
    comparisons?.some(
      (item) =>
        item.eventId === eventId &&
        [
          ["login-session-timeline", "AUTH-0741-PATEL"],
          ["vpn-context-1", "V-218"],
        ].every((ids) => ids.some((id) => item.artifactIds.includes(id))),
    ) ?? false
  );
}

/** Name missing saved steps without inferring a belief from absent records. */
export function missingLoginComparisonSteps(
  state: WorldState,
  eventId: string,
): string[] {
  const steps: string[] = [];
  if (!hasLoginRouteComparison(state.workplace.comparisons, eventId)) {
    steps.push(
      "Record the session timeline (S-0741 / S-0731) + VPN catalogue NET-VPN-04 comparison in Sources for this case, or select both records together in the saved case note.",
    );
  }
  const ticket = state.structuredTickets[`ticket-${eventId}`];
  for (const [id, label] of [
    ["login-session-timeline", "session timeline"],
    ["vpn-context-1", "VPN catalogue NET-VPN-04"],
    ["device-inventory-1", "device inventory"],
  ] as const) {
    if (
      !sourceBundle(id, [
        ...(state.workplace.inspectedArtifactIds ?? []),
        ...(state.workplace.inspectedRecordIds ?? []),
      ]).length
    )
      steps.push(`Open the ${label} source.`);
    if (
      !sourceBundle(id, [
        ...(ticket?.sourceArtifactIds ?? []),
        ...(ticket?.sourceRecordIds ?? []),
      ]).length
    )
      steps.push(`Attach the ${label} source to the saved case ticket.`);
  }
  return steps;
}
