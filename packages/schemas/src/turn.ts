import { z } from "zod";

import { SimulationActionIdSchema, SimulationActionSchema } from "./actions.js";
import { WorldStateSchema } from "./world.js";
import {
  NotificationResponseSchema,
  TaskAttemptOutcomeSchema,
  TaskAttemptSchema,
} from "./tasks.js";

export const DomainEffectSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("action_applied"),
    actionId: SimulationActionIdSchema,
  }),
  z.object({
    type: z.literal("event_escalated"),
    eventId: z.string(),
  }),
  z.object({
    type: z.literal("event_resolved"),
    eventId: z.string(),
  }),
  z.object({
    type: z.literal("consequence_recorded"),
    consequenceId: z.string(),
  }),
]);
export type DomainEffect = z.infer<typeof DomainEffectSchema>;

export const TurnResultSchema = z.object({
  state: WorldStateSchema,
  effects: z.array(DomainEffectSchema),
});
export type TurnResult = z.infer<typeof TurnResultSchema>;

export const TaskAttemptTurnSchema = TaskAttemptOutcomeSchema.extend({
  state: WorldStateSchema,
  effects: z.array(DomainEffectSchema),
});
export type TaskAttemptTurn = z.infer<typeof TaskAttemptTurnSchema>;

export const LoggedInteractionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("action"),
    action: SimulationActionSchema,
  }),
  z.object({
    type: z.literal("task_attempt"),
    attempt: TaskAttemptSchema,
  }),
  z.object({
    type: z.literal("notification_response"),
    response: NotificationResponseSchema,
  }),
]);
export type LoggedInteraction = z.infer<typeof LoggedInteractionSchema>;

export const ActionLogEntrySchema = z.object({
  sequence: z.number().int().positive(),
  interaction: LoggedInteractionSchema,
});
export type ActionLogEntry = z.infer<typeof ActionLogEntrySchema>;
