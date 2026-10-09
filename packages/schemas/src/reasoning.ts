import { z } from "zod";

export const ReasoningSelectionSchema = z
  .object({
    version: z.literal("desk-options-v1"),
    phase: z.enum(["initial", "follow-up"]).optional(),
    evidence: z.array(z.string().min(1)).max(8),
    context: z.array(z.string().min(1)).max(8),
    uncertainty: z.array(z.string().min(1)).max(8),
    nextStep: z.array(z.string().min(1)).max(8),
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
