import { z } from "zod";

/**
 * P1-T06 schema-only sketch: scenario Evidence Facts.
 *
 * Canonical spec §5.2 (Evidence Discovery) + §6.4 (Discovery state).
 * Types-only forward contract for Phase 3. NO discovery evaluation,
 * NO absence detection runtime, NO attachment behavior here.
 *
 * Scenario Evidence Facts are NOT assessment `EvidenceSignal`
 * (see `assessment.ts`): definitions carry authored provenance rules,
 * never session/action/rhythm signal fields. Authored definitions and
 * runtime discovery state are separate schemas by design.
 *
 * Absence facts are normal facts with a coverage provenance rule
 * (spec §5.2 absence-proof semantics): the rule names required
 * dimensions plus a covered window — never an exact query string.
 */
export const EvidenceProvenanceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("single_record_open"),
    recordIds: z.array(z.string()).min(1).max(1),
  }),
  z.object({
    kind: z.literal("multi_record_open"),
    recordIds: z.array(z.string()).min(2),
  }),
  z.object({
    kind: z.literal("query_presence"),
    datasetId: z.string(),
    requiredDimensions: z.array(z.string()).min(1),
  }),
  z.object({
    kind: z.literal("query_absence_coverage"),
    datasetId: z.string(),
    requiredDimensions: z.array(z.string()).min(1),
    coveredWindowMinutes: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal("dialogue_fact"),
    npcId: z.string(),
    factIds: z.array(z.string()).min(1),
  }),
  z.object({
    kind: z.literal("kb_document"),
    documentIds: z.array(z.string()).min(1),
  }),
]);
export type EvidenceProvenance = z.infer<typeof EvidenceProvenanceSchema>;

export const EvidenceFactDefinitionSchema = z
  .object({
    id: z.string(),
    statement: z.string().min(1).max(2_000),
    relatedWorkItemIds: z.array(z.string()),
    provenance: EvidenceProvenanceSchema,
    attachable: z.boolean(),
    consequenceRelevance: z.string().max(500).optional(),
  })
  .strict();
export type EvidenceFactDefinition = z.infer<
  typeof EvidenceFactDefinitionSchema
>;

/** Runtime discovery state: which facts were established, when, how. */
export const EvidenceFactDiscoveryStateSchema = z
  .object({
    factId: z.string(),
    discoveredAtSimMinutes: z.number(),
    satisfiedProvenance: z.array(z.string()),
    attachedToTicketIds: z.array(z.string()).default([]),
  })
  .strict();
export type EvidenceFactDiscoveryState = z.infer<
  typeof EvidenceFactDiscoveryStateSchema
>;
