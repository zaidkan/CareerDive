import { z } from "zod";

import { SimulationActionIdSchema } from "./actions.js";
import { WorkSystemIdSchema } from "./session.js";

export const WorkTaskKindSchema = z.enum([
  "compare_records",
  "select_clues",
  "match_reference",
  "build_summary",
  "choose_response",
]);
export type WorkTaskKind = z.infer<typeof WorkTaskKindSchema>;

export const PackTaskOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().min(1).optional(),
  term: z.string().min(1).optional(),
  termHelp: z.string().min(1).optional(),
  source: z
    .object({ artifactId: z.string().min(1), quote: z.string().min(1) })
    .optional(),
});
export type PackTaskOption = z.infer<typeof PackTaskOptionSchema>;

export const PackTaskStepSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    prompt: z.string().min(1),
    instruction: z.string().min(1),
    relatedArtifactIds: z.array(z.string()).default([]),
    minSelections: z.number().int().positive(),
    maxSelections: z.number().int().positive(),
    options: z.array(PackTaskOptionSchema).min(2),
    requiredOptionIds: z.array(z.string()).min(1),
    coachOnFailure: z.string().min(1),
    successText: z.string().min(1),
  })
  .superRefine((step, ctx) => {
    if (step.minSelections > step.maxSelections) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Task step minSelections cannot exceed maxSelections",
        path: ["minSelections"],
      });
    }
    const optionIds = step.options.map(({ id }) => id);
    const uniqueOptionIds = new Set(optionIds);
    if (uniqueOptionIds.size !== optionIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Task step contains duplicate option ids",
        path: ["options"],
      });
    }
    for (const requiredId of step.requiredOptionIds) {
      if (!uniqueOptionIds.has(requiredId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Task step references unknown required option "${requiredId}"`,
          path: ["requiredOptionIds"],
        });
      }
    }
    if (
      step.requiredOptionIds.length < step.minSelections ||
      step.requiredOptionIds.length > step.maxSelections
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required option count must fit selection limits",
        path: ["requiredOptionIds"],
      });
    }
  });
export type PackTaskStep = z.infer<typeof PackTaskStepSchema>;

export const PackTaskDefinitionSchema = z.object({
  id: z.string().min(1),
  eventTemplateId: z.string().min(1),
  actionId: SimulationActionIdSchema,
  systemId: WorkSystemIdSchema,
  kind: WorkTaskKindSchema,
  title: z.string().min(1),
  whyItMatters: z.string().min(1),
  steps: z.array(PackTaskStepSchema).min(1),
  /**
   * P1-T03 migration compatibility: when true, this binding's legacy
   * WorkTask no longer gates its canonical action. Narrow flag — it
   * controls only the legacy WorkTask requirement, nothing else.
   * Cross-binding consistency is P1-T05 validation territory.
   */
  releasesActionGate: z.boolean().default(false),
});
export type PackTaskDefinition = z.infer<typeof PackTaskDefinitionSchema>;

export const TaskProgressSchema = z.object({
  currentStep: z.number().int().nonnegative().default(0),
  attempts: z.number().int().nonnegative().default(0),
  completed: z.boolean().default(false),
  selectedOptionIdsByStep: z
    .record(z.string(), z.array(z.string()))
    .default({}),
});
export type TaskProgress = z.infer<typeof TaskProgressSchema>;

export const ClientTaskOptionSchema = PackTaskOptionSchema.omit({
  source: true,
}).extend({
  source: z
    .object({
      artifactId: z.string().min(1),
      quote: z.string().min(1).optional(),
    })
    .optional(),
});
export const ClientTaskViewSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  actionId: SimulationActionIdSchema,
  systemId: WorkSystemIdSchema,
  kind: WorkTaskKindSchema,
  title: z.string(),
  prompt: z.string(),
  instruction: z.string(),
  whyItMatters: z.string(),
  relatedArtifactIds: z.array(z.string()),
  stepIndex: z.number().int().nonnegative(),
  stepCount: z.number().int().positive(),
  options: z.array(ClientTaskOptionSchema),
  minSelections: z.number().int().positive(),
  maxSelections: z.number().int().positive(),
});
export type ClientTaskView = z.infer<typeof ClientTaskViewSchema>;

export const TaskAttemptSchema = z.object({
  taskId: z.string().min(1),
  eventId: z.string().min(1),
  selectedOptionIds: z.array(z.string().min(1)),
});
export type TaskAttempt = z.infer<typeof TaskAttemptSchema>;

export const TaskAttemptOutcomeSchema = z.object({
  accepted: z.boolean(),
  completed: z.boolean(),
  feedback: z.string(),
});
export type TaskAttemptOutcome = z.infer<typeof TaskAttemptOutcomeSchema>;

export const PackNotificationDefinitionSchema = z.object({
  id: z.string().min(1),
  eventTemplateId: z.string().min(1),
  systemId: WorkSystemIdSchema,
  title: z.string().min(1),
  body: z.string().min(1),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  snoozeMinutes: z.number().int().positive().default(15),
});
export type PackNotificationDefinition = z.infer<
  typeof PackNotificationDefinitionSchema
>;

export const NotificationStatusSchema = z.enum([
  "unread",
  "acknowledged",
  "snoozed",
]);
export const NotificationStateSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  status: NotificationStatusSchema,
  snoozeUsed: z.boolean().default(false),
  snoozedUntil: z.number().int().nonnegative().optional(),
});
export type NotificationState = z.infer<typeof NotificationStateSchema>;

export const ClientNotificationSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  systemId: WorkSystemIdSchema,
  title: z.string(),
  body: z.string(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  status: NotificationStatusSchema,
  canSnooze: z.boolean(),
});
export type ClientNotification = z.infer<typeof ClientNotificationSchema>;

export const NotificationResponseSchema = z.object({
  notificationId: z.string().min(1),
  response: z.enum(["handle", "snooze", "continue"]),
});
export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;
