import { z } from "zod";

import { FactSchema, NpcStateSchema } from "./world.js";

export const NpcKnowledgeViewSchema = z.object({
  npc: NpcStateSchema,
  facts: z.array(FactSchema),
  publicSceneMemory: z.array(z.string()),
});
export type NpcKnowledgeView = z.infer<typeof NpcKnowledgeViewSchema>;

export const NpcTurnOutputSchema = z.object({
  dialogue: z.string().min(1).max(2_000),
  tone: z.enum([
    "neutral",
    "concerned",
    "impatient",
    "warm",
    "curt",
    "encouraging",
  ]),
  referencedFactIds: z.array(z.string()),
  proposedMinorStateUpdates: z.array(
    z.object({
      field: z.literal("npcMood"),
      value: z.string(),
    }),
  ),
});
export type NpcTurnOutput = z.infer<typeof NpcTurnOutputSchema>;

export const TokenUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  totalCostUsd: z.number().nonnegative(),
});
export type TokenUsage = z.infer<typeof TokenUsageSchema>;
