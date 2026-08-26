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
});
export type Debrief = z.infer<typeof DebriefSchema>;
