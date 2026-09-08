import { z } from "zod";

import { ActionDefinitionSchema, type SimulationActionId } from "./actions.js";
import { PackEventTemplateSchema } from "./events.js";
import { WorkSystemIdSchema } from "./session.js";
import {
  PackNotificationDefinitionSchema,
  PackTaskDefinitionSchema,
} from "./tasks.js";
import {
  FactSchema,
  LocationSchema,
  NpcStateSchema,
  WorkArtifactSchema,
} from "./world.js";
import { PackWorkplaceDefaultsSchema } from "./workplace.js";

export const ScenarioRhythmSchema = z.enum([
  "routine_monitoring",
  "quiet_investigation",
]);
export type ScenarioRhythm = z.infer<typeof ScenarioRhythmSchema>;

export const CareerPackSchema = z
  .object({
    career: z.object({
      id: z.string(),
      title: z.string(),
      packVersion: z.string(),
      reviewStatus: z.enum(["draft", "in_review", "approved"]),
      lastReviewed: z.string().date(),
      nextReview: z.string().date(),
      reviewingRoles: z.array(z.string()).min(3),
      sources: z
        .array(z.object({ title: z.string(), url: z.string().url() }))
        .min(1),
      rhythms: z.array(ScenarioRhythmSchema).min(2),
      systems: z.array(WorkSystemIdSchema).min(1),
      events: z.array(z.string()).min(1),
      rhythmBiasReview: z.object({
        ordinaryWorkRepresented: z.literal(true),
        calmWorkRepresented: z.literal(true),
        technicalAndRelationalWorkRepresented: z.literal(true),
      }),
    }),
    scenario: z.object({
      location: LocationSchema,
      maxAiCostUsd: z.number().nonnegative(),
      briefing: z.string(),
      initialTaskBacklog: z.number().int().nonnegative(),
      facts: z.array(FactSchema).min(1),
      npcs: z.array(NpcStateSchema).min(1),
      actions: z.array(ActionDefinitionSchema).min(1),
      eventTemplates: z.record(z.string(), PackEventTemplateSchema),
      artifacts: z.array(WorkArtifactSchema).default([]),
      tasks: z.array(PackTaskDefinitionSchema).default([]),
      notifications: z.array(PackNotificationDefinitionSchema).default([]),
      workplaceDefaults: PackWorkplaceDefaultsSchema,
    }),
  })
  .superRefine((pack, ctx) => {
    const templateIds = Object.keys(pack.scenario.eventTemplates);
    for (const eventId of pack.career.events) {
      if (!templateIds.includes(eventId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Career event "${eventId}" has no scenario.eventTemplates entry`,
          path: ["career", "events"],
        });
      }
    }
    for (const templateId of templateIds) {
      if (!pack.career.events.includes(templateId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `scenario.eventTemplates.${templateId} is not listed in career.events`,
          path: ["scenario", "eventTemplates", templateId],
        });
      }
    }
    const actionIds = new Set(pack.scenario.actions.map(({ id }) => id));
    for (const [templateId, template] of Object.entries(
      pack.scenario.eventTemplates,
    )) {
      const referenced = new Set<SimulationActionId>();
      if (template.progression.kind === "linear") {
        for (const id of template.progression.sequence) referenced.add(id);
        for (const id of template.progression.utilityActions)
          referenced.add(id);
      } else {
        for (const stage of template.progression.stages) {
          for (const id of stage.after) referenced.add(id);
          for (const id of stage.offer) referenced.add(id);
          for (const id of stage.alsoOffer) referenced.add(id);
        }
        for (const id of template.progression.utilityActions)
          referenced.add(id);
      }
      if (template.progression.allowManager) {
        referenced.add("ask_manager");
      }
      for (const actionId of referenced) {
        if (!actionIds.has(actionId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Event "${templateId}" references unknown action "${actionId}"`,
            path: ["scenario", "eventTemplates", templateId],
          });
        }
      }
    }
    const artifactIds = new Set(pack.scenario.artifacts.map(({ id }) => id));
    for (const artifact of pack.scenario.artifacts) {
      for (const relatedId of artifact.relatedArtifactIds) {
        if (!artifactIds.has(relatedId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Artifact "${artifact.id}" references unknown related artifact "${relatedId}"`,
            path: ["scenario", "artifacts"],
          });
        }
      }
    }
    const taskIds = new Set<string>();
    const taskBindings = new Set<string>();
    for (const task of pack.scenario.tasks) {
      if (taskIds.has(task.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate task id "${task.id}"`,
          path: ["scenario", "tasks"],
        });
      }
      taskIds.add(task.id);
      if (!templateIds.includes(task.eventTemplateId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Task "${task.id}" references unknown event template "${task.eventTemplateId}"`,
          path: ["scenario", "tasks"],
        });
      }
      if (!actionIds.has(task.actionId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Task "${task.id}" references unknown action "${task.actionId}"`,
          path: ["scenario", "tasks"],
        });
      }
      const action = pack.scenario.actions.find(
        ({ id }) => id === task.actionId,
      );
      if (action && action.systemId !== task.systemId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Task "${task.id}" system does not match action "${task.actionId}"`,
          path: ["scenario", "tasks"],
        });
      }
      const binding = `${task.eventTemplateId}:${task.actionId}`;
      if (taskBindings.has(binding)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate task binding "${binding}"`,
          path: ["scenario", "tasks"],
        });
      }
      taskBindings.add(binding);
      for (const step of task.steps) {
        const sourced = step.options.filter(({ source }) => source);
        if (sourced.length && sourced.length !== step.options.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Source-based steps must map every option",
            path: ["scenario", "tasks"],
          });
        }
        for (const { source } of sourced) {
          if (!source) continue;
          const artifact = pack.scenario.artifacts.find(
            ({ id }) => id === source.artifactId,
          );
          if (
            !step.relatedArtifactIds.includes(source.artifactId) ||
            !artifact?.body.includes(source.quote)
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Task source must quote a related artifact exactly",
              path: ["scenario", "tasks"],
            });
          }
        }
        for (const artifactId of step.relatedArtifactIds) {
          if (!artifactIds.has(artifactId)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Task "${task.id}" references unknown artifact "${artifactId}"`,
              path: ["scenario", "tasks"],
            });
          }
        }
      }
    }
    const notificationIds = new Set<string>();
    for (const notification of pack.scenario.notifications) {
      if (notificationIds.has(notification.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate notification id "${notification.id}"`,
          path: ["scenario", "notifications"],
        });
      }
      notificationIds.add(notification.id);
      if (!templateIds.includes(notification.eventTemplateId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Notification "${notification.id}" references unknown event template "${notification.eventTemplateId}"`,
          path: ["scenario", "notifications"],
        });
      }
    }
  });
export type CareerPack = z.infer<typeof CareerPackSchema>;
