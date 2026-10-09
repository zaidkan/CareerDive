import { ReasoningSelectionSchema } from "./reasoning.js";
import { z } from "zod";

import { TicketStatusSchema } from "./ticket.js";

/**
 * Versioned selections produce the assessed note and inspected references.
 * Text fields remain for saved-shift replay and limited legacy evaluation.
 * The reducer validates action pairing and references before any mutation;
 * it owns revisions and recorded dispositions.
 */
export const TicketUpdatePayloadSchema = z
  .object({
    ticketId: z.string().min(1),
    status: TicketStatusSchema.optional(),
    statusOptionIds: z.array(z.string().min(1)).max(3).optional(),
    ownershipCaseId: z.string().min(1).optional(),
    entityRefs: z.array(z.string()).optional(),
    attachEvidenceFactIds: z.array(z.string()).optional(),
    detachEvidenceFactIds: z.array(z.string()).optional(),
    disposition: z.string().max(500).optional(),
    noteText: z.string().max(2_000).optional(),
    followUp: z.string().max(500).optional(),
    verifiedEvidence: z.string().max(2_000).optional(),
    uncertainty: z.string().max(2_000).optional(),
    reasoning: ReasoningSelectionSchema.optional(),
    /** One memo dispatch, including the existing consequential alert action. */
    dispatch: z.enum(["escalate_alert", "dismiss_alert"]).optional(),
    sourceRecordIds: z.array(z.string()).optional(),
    sourceArtifactIds: z.array(z.string()).optional(),
  })
  .strict();
export type TicketUpdatePayload = z.infer<typeof TicketUpdatePayloadSchema>;
