import { z } from "zod";

import { TicketStatusSchema } from "./ticket.js";

/**
 * P4-T01: structured ticket-update payload, paired with the `document_ticket`
 * simulation action envelope.
 *
 * Mirrors `QueryRecordsPayloadSchema` (P2-T01) and its legality pairing
 * `query_records`/`queryPayload`: the envelope carries an optional
 * `ticketPayload` for `document_ticket`, with pairing legality
 * (required iff `id === "document_ticket"`) enforced in the reducer —
 * never here — keeping the envelope back-compatible.
 *
 * Legality has TWO phases split exactly the way Phase 2 split them:
 * - envelope: `ticketPayload` optional, back-compatible (this file);
 * - reducer: strict verified pairing + every legality/jurisdiction rule
 *   (undiscovered Evidence Fact ID reject, closed-terminal status reject,
 *   no grading vocabulary — P4-11e/11d) enforced BEFORE any mutation.
 *
 * TICKET vocabulary ONLY — canonical truth stays in the reducer's canonical
 * ticket store (`state.structuredTickets`, keyed by ticketId, winner-takes-all
 * like `queryHistory`). `entityRefs`/`attachEvidenceFactIds`/`noteText`/
 * `disposition`/`followUp` land on the CANONICAL store after legality; free
 * text is annotation only and never mutates facts.
 */
export const TicketUpdatePayloadSchema = z
  .object({
    ticketId: z.string().min(1),
    status: TicketStatusSchema.optional(),
    entityRefs: z.array(z.string()).optional(),
    attachEvidenceFactIds: z.array(z.string()).optional(),
    detachEvidenceFactIds: z.array(z.string()).optional(),
    disposition: z.string().max(500).optional(),
    noteText: z.string().max(2_000).optional(),
    followUp: z.string().max(500).optional(),
  })
  .strict();
export type TicketUpdatePayload = z.infer<typeof TicketUpdatePayloadSchema>;
