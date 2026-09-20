import { z } from "zod";

import {
  StructuredTicketSchema,
  TicketStatusSchema,
  WorldState,
} from "@sim/schemas";

/**
 * P4-1/P4-2 — structured-ticket reader + legality validator over the canonical
 * `WorldState.structuredTickets` store.
 *
 * This module is Phase 4's pure, additive read/view substrate. Two functions:
 *
 * - `readStructuredTickets(state)` — the canonical reader. Returns the
 *   `structuredTickets` store keyed by ticketId, each entry re-parsed through
 *   the `.strict()` canonical `StructuredTicketSchema`. A ticket's `status`
 *   and `evidenceFactIds` are structural/canonical truth; nothing here grades
 *   prose or reads wall-clock values.
 *
 * - `validateStructuredTicket(state, ticketId)` — legality BEFORE mutation.
 *   Returns `string[]` of human-readable violations; `[]` when the ticket is
 *   fully legal. Mirrors Phase 2 `runQuery`-style legality: an attachment may
 *   only reference an `EvidenceFact` that is DISCOVERED and currently
 *   attached (`P4-2b` -> "undiscovered"), may never duplicate an attachment
 *   (`P4-2c`), and may never carry authoring-metadata refs posing as fact IDs
 *   (`P4-2d`). The backend never grades prose — legal-prose text is never a
 *   violation and semantic grading vocabulary is never emitted.
 */
export function readStructuredTickets(state: WorldState): Record<
  string,
  z.infer<typeof StructuredTicketSchema>
> {
  const store = state.structuredTickets ?? {};
  return Object.fromEntries(
    Object.entries(store).map(([ticketId, ticket]) => [
      ticketId,
      StructuredTicketSchema.parse(ticket),
    ]),
  );
}

const AUTHORING_METADATA_REF = /(?:^|[/.])(statements?|expected|ideal|correct|incorrect|score)(?:\b|$)/i;

export function validateStructuredTicket(
  state: WorldState,
  ticketId: string,
): string[] {
  const ticket = readStructuredTickets(state)[ticketId];
  if (!ticket) {
    return [
      `structured ticket "${ticketId}" has no document in the canonical store; ` +
        "documenting an undocumented ticket is itself illegal (P4-11-device).",
    ];
  }

  const violations: string[] = [];
  for (const ref of ticket.entityRefs ?? []) {
    if (AUTHORING_METADATA_REF.test(ref)) {
      violations.push(
        `"${ref}" is authoring metadata posing as an evidence-fact reference; ` +
        "legality forbids grading vocabulary (P4-2d).",
      );
    }
  }

  const evidenceFactIds = ticket.evidenceFactIds ?? [];
  const discovered = state.discoveredFactIds ?? [];
  for (const factId of evidenceFactIds) {
    if (!discovered.includes(factId)) {
      violations.push(
        `undiscovered evidence-fact "${factId}" is attached to ${ticketId}; ` +
          "legality-before-mutation rejects attachments to undiscovered facts " +
          "(P4-2b).",
      );
    }
  }

  if (new Set(evidenceFactIds).size !== evidenceFactIds.length) {
    violations.push(
      `${ticketId} duplicates an evidence-fact attachment; duplicate ` +
        "attachment is illegal (P4-2c).",
    );
  }

  return violations;
}

/**
 * P4-11 legality check via the same canonical store used by the reducer's
 * `document_ticket` branch. Exists so the reducer and the serializer disagree
 * on NOTHING: the reducer gates mutation on this exact validator.
 */
export * from "./structured-ticket-exports.js";
