import { z } from "zod";

import { SimulationActionIdSchema } from "./actions.js";
import { ScenarioRhythmSchema } from "./career-pack.js";
import { PacingModeSchema } from "./session.js";

export const ConfidenceLevelSchema = z.enum([
  "insufficient_evidence",
  "early_signal",
  "repeated_signal",
  "strong_repeated_pattern",
]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export const EvidenceSignalSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  actionId: SimulationActionIdSchema,
  eventId: z.string(),
  rhythm: ScenarioRhythmSchema,
  pacingMode: PacingModeSchema,
  category: z.enum(["behavioral", "outcome", "reflective"]),
  dimension: z.enum([
    "prioritization",
    "communication",
    "attention_to_detail",
    "analytical_reasoning",
    "enjoyment",
    "stress",
    "engagement",
  ]),
  observation: z.string(),
  occurredAt: z.string().datetime(),
  annotation: z.string().optional(),
});
export type EvidenceSignal = z.infer<typeof EvidenceSignalSchema>;

export const ReflectionSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  eventId: z.string(),
  enjoyment: z.enum(["draining", "neutral", "energizing"]),
  confidence: z.enum(["uncertain", "comfortable"]),
  note: z.string().max(2_000).optional(),
  createdAt: z.string().datetime(),
});
export type Reflection = z.infer<typeof ReflectionSchema>;

export const DebriefSchema = z.object({
  sessionId: z.string(),
  confidence: ConfidenceLevelSchema,
  sections: z.object({
    whatHappened: z.string(),
    whatYouDid: z.string(),
    consequences: z.string(),
    earlyEvidence: z.string(),
    yourExperience: z.string(),
    confidenceAndLimitations: z.string(),
    careerReality: z.string(),
    nextAction: z.string(),
  }),
  evidenceIds: z.array(z.string()),
  decisionReview: z.object({
    careerVersion: z.string(),
    decisions: z.array(z.object({
      decisionId: z.string(),
      userChoiceId: z.string().nullable(),
      availableChoiceIds: z.array(z.string()),
      comparisonEligible: z.boolean(),
      evidenceUsedIds: z.array(z.string()),
      rubricSignals: z.array(z.object({ id: z.string(), supported: z.boolean() })),
      outcomeLabel: z.enum(["supported", "partially_supported", "needs_more_evidence"]),
      explanation: z.string(),
      reasoningAnalysis: z.object({
        decisionId: z.string(),
        choice: z.string().nullable(),
        availableChoices: z.array(z.string()),
        evidenceUsedBeforeDecision: z.array(z.string()),
        whatSupportedIt: z.array(z.string()),
        whatWeakenedIt: z.array(z.string()),
        callbackText: z.array(z.string()),
        correctionHistory: z.array(z.object({
          stepId: z.string(),
          initialOptionIds: z.array(z.string()),
          correctedOptionIds: z.array(z.string()).optional(),
        })),
      }).optional(),
      cohort: z.discriminatedUnion("status", [
        z.object({ status: z.literal("ready"), sampleSize: z.number().int(), counts: z.record(z.string(), z.number().int()), percentages: z.record(z.string(), z.number().int()) }),
        z.object({ status: z.literal("insufficient") }),
        z.object({ status: z.literal("unavailable") }),
      ]),
    })),
    profile: z.array(z.object({ dimension: z.string(), state: z.enum(["strong", "developing", "needs_more_evidence"]), explanation: z.string() })),
  }).optional(),
});
export type Debrief = z.infer<typeof DebriefSchema>;
