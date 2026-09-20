import type { StructuredTicket, WorldState } from "@sim/schemas";
import { StructuredTicketSchema } from "@sim/schemas";

import { discoverEvidenceFacts } from "./evidence-facts.js";

/**
 * P4 additive reader + legality validator over the canonical
 * `state.structuredTickets` store.
 *
 * Two pure exports (no mutation, no prose grading):
 *
 * - `readStructuredTickets(state)` — the canonical reader. Re-parses every
 *   enrolled ticket through the `.strict()` `StructuredTicketSchema`, so any
 *   authoring-only field that slipped past a legality gate is dropped here
 *   and never reaches the player projection or the discovery attachment
 *   projection. This is the replay-stable surface the serializer and the
 *   validator both read from, so they can never disagree about canonical
 *   ticket state.
 *
 * - `validateStructuredTicket(state, ticketId)` — legality BEFORE mutation.
 *   The backend validates only structural/legal constraints (spec §5.3):
 *     - referenced linked work items exist in canonical state (unknown work
 *       items are illegal — P4-1b);
 *     - every referenced evidence fact is DISCOVERED in the canonical
 *       discovery store (never silently infers an undiscovered fact — P4-2b)
 *       and is a real fact id, never raw authoring metadata posing as a
 *       reference (P4-2d);
 *     - no duplicate evidence attachment (P4-2c);
 *     - no transition out of the terminal `closed` status.
 *   It NEVER grades prose semantically (spec §5.3 "The backend must not
 *   grade prose") and never emits grading vocabulary, so the player
 *   projection never marks a record by a verdict. Returns `[]` for a fully
 *   legal ticket.
 */
export function readStructuredTickets(state: WorldState): Record<
  string,
  StructuredTicket
> {
  return Object.fromEntries(
    Object.entries(state.structuredTickets).map(([ticketId, ticket]) => [
      ticketId,
      StructuredTicketSchema.parse(ticket),
    ]),
  );
}

/** Authoring-metadata key refs that must never pose as evidence-fact ids. */
const AUTHORING_METADATA_REF =
  /(?:^|[/.])(statements?|expected|ideal|correct|incorrect|score)(?:\b|$)/i;

export function validateStructuredTicket(
  state: WorldState,
  ticketId: string,
): string[] {
  const ticket = readStructuredTickets(state)[ticketId];
  if (!ticket) {
    return [
      `structured ticket "${ticketId}" is not documented in the canonical ` +
        "store; legality-before-mutation rejects documenting an " +
        "undocumented ticket.",
    ];
  }

  const violations: string[] = [];

  for (const workItemId of ticket.linkedWorkItemIds) {
    const known = state.events.some((event) => event.id === workItemId);
    if (!known) {
      violations.push(
        `ticket "${ticketId}" references work item "${workItemId}" that ` +
          "does not exist in canonical state; referencing an unknown work " +
          "item is illegal.",
      );
    }
  }

  const discoveredFactIds = new Set(
    discoverEvidenceFacts(state).map((entry) => entry.factId),
  );
  for (const factId of ticket.evidenceFactIds) {
    if (discoveredFactIds.has(factId)) continue;
    violations.push(
      AUTHORING_METADATA_REF.test(factId)
        ? `"${factId}" is authoring metadata posing as an evidence-fact ` +
          "reference; non-canonical references are illegal."
        : `evidence fact "${factId}" is undiscovered in the canonical ` +
          "discovery store; attachment of an undiscovered fact is illegal.",
    );
  }

  const attested = new Set<string>();
  for (const factId of ticket.evidenceFactIds) {
    if (attested.has(factId)) {
      violations.push(
        `evidence fact "${factId}" is attached more than once to ` +
          `"${ticketId}"; duplicate attachment is illegal.`,
      );
    } else {
      attested.add(factId);
    }
  }

  if (ticket.status === "closed") {
    violations.push(
      `ticket "${ticketId}" is closed; closed is terminal and accepts no ` +
        "further transition.",
    );
  }

  return violations;
}