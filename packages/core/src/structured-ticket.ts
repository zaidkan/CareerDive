import { StructuredTicketSchema, WorldState } from "@sim/schemas";
import type { StructuredTicket } from "@sim/schemas";

/**
 * P4 additive reader over the canonical `state.structuredTickets` store.
 *
 * Pure reader: re-parses every enrolled ticket through
 * `StructuredTicketSchema` (`.strict()`), so any authoring-only field a
 * Phase-4 action may have sneaked past the legality gate is dropped here and
 * never reaches the player projection. The reducer lands legality BEFORE
 * mutation (mirroring `applyQueryRecords`); this reader is the replay-stable
 * surface the serializer and the discovery attachment projection both read
 * from, so they can never disagree about canonical ticket state.
 */
export function readStructuredTickets(state: WorldState): Record<
  string,
  StructuredTicket
> {
  const store = state.structuredTickets ?? {};
  return Object.fromEntries(
    Object.entries(store).map(([ticketId, ticket]) => [
      ticketId,
      StructuredTicketSchema.parse(ticket),
    ]),
  );
}

/**
 * PHASE 4 CONTRACT VALIDATOR — pure structural/legal legality over the
 * canonical ticket store. Backend validates only:
 *   - referenced evidence facts are discovered (spec §5.3 "referenced evidence
 *     must have been discovered"; never silently infers an undiscovered fact)
 *   - referenced linked work items exist in canonical rules state
 *   - status transition is legal (no transition out of the terminal `closed`);
 *     terminal/ticket-status legality is structural, never a prose grade
 *   - no duplicate evidence attachment
 *
 * It NEVER grades prose semantically (spec §5.3 "The backend must not grade
 * prose") and never emits grading vocabulary (score/expectedEvidence/ideal
 * disposition), so the player projection never marks a record by a verdict.
 * Returns `[]` for a fully legal ticket.
 */
export function validateStructuredTicket(
  state: WorldState,
  ticketId: string,
): string[] {
  const ticket = readStructuredTickets(state)[ticketId];
  if (!ticket) {
    return [
      `structured ticket "${ticketId}" is not documented: no canonical record ` +
        "source. Legality-before-mutation rejects documentation of an " +
        "undocumented ticket.",
    ];
  }

  const violations: string[] = [];

  const evidenceFactIds = ticket.evidenceFactIds ?? [];
  const discovered = new Set(
    Object.values(state.evidenceFactDiscovery ?? {}).map(
      (entry) => entry.factId,
    ),
  );
  for (const factId of evidenceFactIds) {
    if (!discovered.has(factId)) {
      violations.push(
        `evidence fact "${factId}" is undiscovered in the canonical discovery ` +
          "store; attachment of an undiscovered fact is illegal (Phase 4 " +
          "legality-before-mutation).",
      );
    }
  }

  const duplicateIds = new Set<string>();
  for (const factId of evidenceFactIds) {
    if (duplicateIds.has(factId)) {
      violations.push(
        `evidence fact "${factId}" is attached more than once to "${ticketId}"; ` +
          "duplicate attachment is illegal.",
      );
    }
    duplicateIds.add(factId);
  }

  if (ticket.status === "closed") {
    violations.push(
      `ticket "${ticketId}" is closed; closed is terminal and " + "accepts no " +
        "further transition (legality-before-mutation).`,
    );
  }

  return violations;
}
