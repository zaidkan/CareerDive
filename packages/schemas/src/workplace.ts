import { z } from "zod";

export const CoffeeStageSchema = z.enum(["idle", "brewing", "ready", "poured"]);
export type CoffeeStage = z.infer<typeof CoffeeStageSchema>;

export const JulesTopicSchema = z.enum([
  "first_day",
  "current_work",
  "break_room",
  "team_context",
]);
export type JulesTopic = z.infer<typeof JulesTopicSchema>;

export const WorkplaceStateSchema = z.object({
  energy: z.object({
    current: z.number().int().min(0),
    max: z.number().int().positive(),
  }),
  carriedSnackBites: z.number().int().min(0).max(3),
  fridgeSnackBars: z.number().int().min(0),
  fridgeOpen: z.boolean(),
  coffeeServings: z.number().int().min(0),
  coffeeStage: CoffeeStageSchema,
  julesTopicsSeen: z.array(JulesTopicSchema),
  julesConsultations: z
    .array(z.object({ eventId: z.string(), topic: JulesTopicSchema }))
    .optional(),
  handoffSourceArtifactIds: z.array(z.string()).optional(),
  emergencyRecoveryUsed: z.boolean(),
  lastInspectedArtifactId: z.string().optional(),
  inspectedArtifactIds: z.array(z.string()).optional(),
  inspectedRecordIds: z.array(z.string()).optional(),
  inspectedRecordIdsByEvent: z.record(z.string(), z.array(z.string())).optional(),
  comparisons: z
    .array(
      z.object({
        eventId: z.string(),
        artifactIds: z.array(z.string()).length(2),
      }),
    )
    .optional(),
  selectedAlertIdsByEvent: z.record(z.string(), z.string()).optional(),
});
export type WorkplaceState = z.infer<typeof WorkplaceStateSchema>;

export const WorkplaceInteractionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("movement_exertion"),
    distanceMeters: z.literal(5),
  }),
  z.object({ type: z.literal("open_fridge") }),
  z.object({ type: z.literal("close_fridge") }),
  z.object({ type: z.literal("take_snack") }),
  z.object({ type: z.literal("eat_snack_bite") }),
  z.object({ type: z.literal("start_coffee") }),
  z.object({ type: z.literal("finish_coffee") }),
  z.object({ type: z.literal("pour_coffee") }),
  z.object({ type: z.literal("drink_coffee") }),
  z.object({
    type: z.literal("talk_to_jules"),
    topic: JulesTopicSchema,
    eventId: z.string().optional(),
  }),
  z.object({ type: z.literal("open_artifact"), artifactId: z.string().min(1) }),
  z.object({
    type: z.literal("open_alert_record"),
    recordId: z.string().min(1),
  }),
  z.object({
    type: z.literal("inspect_query_record"),
    queryId: z.string(),
    recordId: z.string(),
  }),
  z.object({
    type: z.literal("compare_artifacts"),
    eventId: z.string(),
    artifactIds: z.array(z.string()).length(2),
  }),
  z.object({ type: z.literal("emergency_recovery") }),
]);
export type WorkplaceInteraction = z.infer<typeof WorkplaceInteractionSchema>;

export const PackWorkplaceDefaultsSchema = z.object({
  energyMax: z.number().int().positive(),
  fridgeSnackBars: z.number().int().min(0).max(10),
  snackBitesPerBar: z.literal(3),
  coffeeServings: z.number().int().min(0).max(10),
});
export type PackWorkplaceDefaults = z.infer<typeof PackWorkplaceDefaultsSchema>;

export const WorkplaceFeedbackCodeSchema = z.enum([
  "movement_recorded",
  "fridge_opened",
  "fridge_closed",
  "snack_taken",
  "snack_bite_eaten",
  "coffee_started",
  "coffee_ready",
  "coffee_poured",
  "coffee_drunk",
  "jules_replied",
  "artifact_opened",
  "alert_record_opened",
  "energy_recovered",
  "query_record_inspected",
  "records_compared",
]);
export type WorkplaceFeedbackCode = z.infer<typeof WorkplaceFeedbackCodeSchema>;

export const WorkplaceInteractionOutcomeSchema = z.object({
  feedbackCode: WorkplaceFeedbackCodeSchema,
});
export type WorkplaceInteractionOutcome = z.infer<
  typeof WorkplaceInteractionOutcomeSchema
>;

export const ClientWorkplaceStateSchema = WorkplaceStateSchema;
export type ClientWorkplaceState = z.infer<typeof ClientWorkplaceStateSchema>;
