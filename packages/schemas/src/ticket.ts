import { z } from "zod";

/**
 * P1-T06 schema-only sketch: structured ticket/case.
 *
 * Canonical spec §5.3 (Case Notebook and Ticket) + §6.7 (Documentation).
 * Types-only forward contract for Phase 4. NO status machine, NO
 * attachment legality checks, NO reducer wiring here.
 *
 * `noteText` is annotation only: the backend must never treat free text
 * as authoritative world truth. Status transitions are validated by the
 * Phase 4 runtime, not by this shape.
 */
export const TicketStatusSchema = z.enum([
  "open",
  "in_progress",
  "pending_review",
  "closed",
  "escalated",
]);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const StructuredTicketSchema = z
  .object({
    ticketId: z.string(),
    linkedWorkItemIds: z.array(z.string()),
    status: TicketStatusSchema,
    entityRefs: z.array(z.string()).default([]),
    evidenceFactIds: z.array(z.string()).default([]),
    disposition: z.string().max(500).optional(),
    noteText: z.string().max(2_000).optional(),
    followUp: z.string().max(500).optional(),
  })
  .strict();
export type StructuredTicket = z.infer<typeof StructuredTicketSchema>;
