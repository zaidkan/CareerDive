import { z } from "zod";

/**
 * P1-T06 schema-only sketch: NPC conversation intents.
 *
 * Canonical spec §5.5 (Workplace Interactions) + §6.6 (NPC state).
 * Types-only forward contract for Phase 6. NO availability runtime,
 * NO pending/delayed replies, NO response generation here.
 *
 * AI boundary: the backend selects the intent and its factual payload;
 * AI may only phrase it, and deterministic `fallbackText` preserves
 * identical facts when AI is unavailable. Availability is declarative
 * data (work-item/discovery references), never a callback: predicates
 * must remain serializable for deterministic replay.
 */
export const NpcIntentAvailabilitySchema = z
  .object({
    requiresWorkItemActive: z.array(z.string()).default([]),
    requiresDiscoveredFactIds: z.array(z.string()).default([]),
    requiresTicketStatus: z.array(z.string()).default([]),
  })
  .strict();
export type NpcIntentAvailability = z.infer<
  typeof NpcIntentAvailabilitySchema
>;

export const NpcIntentPayloadSchema = z
  .object({
    allowedTone: z.enum([
      "neutral",
      "concerned",
      "impatient",
      "warm",
      "curt",
      "encouraging",
    ]),
    linkedFactIds: z.array(z.string()),
    requiredClaims: z.array(z.string()).default([]),
    forbiddenClaims: z.array(z.string()).default([]),
  })
  .strict();
export type NpcIntentPayload = z.infer<typeof NpcIntentPayloadSchema>;

export const NpcIntentSchema = z
  .object({
    intentId: z.string(),
    npcId: z.string(),
    availability: NpcIntentAvailabilitySchema,
    payload: NpcIntentPayloadSchema,
    fallbackText: z.string().min(1).max(2_000),
  })
  .strict();
export type NpcIntent = z.infer<typeof NpcIntentSchema>;
