import { z } from "zod";

/** Authored rows and claims, never a free-text assertion of world truth. */
export const CaseFindingSchema = z
  .object({
    questionId: z.string().min(1),
    rowIds: z.array(z.string().min(1)).max(12),
    rowSelections: z.array(z.array(z.string()).max(12)).max(8).optional(),
    claimId: z.string().min(1),
  })
  .strict();
export type CaseFinding = z.infer<typeof CaseFindingSchema>;

export const ReasoningSelectionSchema = z
  .object({
    version: z.literal("desk-options-v1"),
    phase: z.enum(["initial", "follow-up"]).optional(),
    evidence: z.array(z.string().min(1)).max(8),
    context: z.array(z.string().min(1)).max(8),
    uncertainty: z.array(z.string().min(1)).max(8),
    nextStep: z.array(z.string().min(1)).max(8),
    caseFindings: z.array(CaseFindingSchema).max(8).optional(),
  })
  .strict();
export type ReasoningSelection = z.infer<typeof ReasoningSelectionSchema>;

export const ReasoningGroupSchema = z.object({
  id: z.enum(["evidence", "context", "uncertainty", "nextStep"]),
  prompt: z.string(),
  options: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      sourceArtifactIds: z.array(z.string()),
      inspectedSourceIds: z.array(z.string()),
    }),
  ),
});
export type ReasoningGroup = z.infer<typeof ReasoningGroupSchema>;

export const HandoffSelectionSchema = z
  .object({
    version: z.literal("desk-options-v1"),
    stateKey: z.string(),
    optionIds: z.array(z.string().min(1)).max(8),
  })
  .strict();
export type HandoffSelection = z.infer<typeof HandoffSelectionSchema>;
