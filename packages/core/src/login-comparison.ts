import type { WorldState } from "@sim/schemas";

/** Name missing saved steps without inferring a belief from absent records. */
export function missingLoginComparisonSteps(
  state: WorldState,
  eventId: string,
): string[] {
  const steps: string[] = [];
  const pair = ["login-session-timeline", "vpn-context-1"];
  if (
    !state.workplace.comparisons?.some(
      (item) =>
        item.eventId === eventId &&
        pair.every((id) => item.artifactIds.includes(id)),
    )
  ) {
    steps.push(
      "Record the session timeline (S-0741 / S-0731) + VPN catalogue NET-VPN-04 comparison using Record this comparison in Sources for this case; reading or attaching them alone does not save that step.",
    );
  }
  const ticket = state.structuredTickets[`ticket-${eventId}`];
  for (const [id, label] of [
    ["login-session-timeline", "session timeline"],
    ["vpn-context-1", "VPN catalogue NET-VPN-04"],
    ["device-inventory-1", "device inventory"],
  ] as const) {
    if (!state.workplace.inspectedArtifactIds?.includes(id))
      steps.push(`Open the ${label} source.`);
    if (!ticket?.sourceArtifactIds?.includes(id))
      steps.push(`Attach the ${label} source to the saved case ticket.`);
  }
  return steps;
}
