import { z } from "zod";

import { ActionEffectSchema, SimulationActionIdSchema } from "./actions.js";
import { WorkSystemIdSchema } from "./session.js";

export const EventStatusSchema = z.enum([
  "pending",
  "active",
  "resolved",
  "escalated",
  "expired",
]);
export const EventInstanceSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  title: z.string(),
  summary: z.string().default(""),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  systemId: WorkSystemIdSchema.default("alert_dashboard"),
  status: EventStatusSchema,
  triggeredAt: z.number().int().nonnegative(),
  deadlineAt: z.number().int().positive(),
  managerConsulted: z.boolean().default(false),
  completedActionIds: z.array(SimulationActionIdSchema).default([]),
  observedArtifactIds: z.array(z.string()).default([]),
  resolution: z.string().optional(),
});
export type EventInstance = z.infer<typeof EventInstanceSchema>;

export const ProgressionStageSchema = z.object({
  after: z.array(SimulationActionIdSchema).default([]),
  offer: z.array(SimulationActionIdSchema).min(1),
  mode: z.enum(["next_incomplete", "all_remaining"]).default("next_incomplete"),
  alsoOffer: z.array(SimulationActionIdSchema).default([]),
});
export type ProgressionStage = z.infer<typeof ProgressionStageSchema>;

export const EventProgressionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("linear"),
    sequence: z.array(SimulationActionIdSchema).min(1),
    allowManager: z.boolean().default(true),
    utilityActions: z.array(SimulationActionIdSchema).default([]),
  }),
  z.object({
    kind: z.literal("stages"),
    allowManager: z.boolean().default(true),
    utilityActions: z.array(SimulationActionIdSchema).default([]),
    stages: z.array(ProgressionStageSchema).min(1),
  }),
]);
export type EventProgression = z.infer<typeof EventProgressionSchema>;

export const PackEventTemplateSchema = z.object({
  instanceId: z.string(),
  title: z.string(),
  summary: z.string(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  systemId: WorkSystemIdSchema,
  triggerAt: z.number().int().nonnegative(),
  deadlineMinutes: z.number().int().positive(),
  initialStatus: z.enum(["pending", "active"]).default("pending"),
  prohibitedOutcomes: z.array(z.string()).default([]),
  progression: EventProgressionSchema,
  managerGuidance: z.string(),
  actionEffects: z
    .record(SimulationActionIdSchema, ActionEffectSchema)
    .default({}),
});
export type PackEventTemplate = z.infer<typeof PackEventTemplateSchema>;
