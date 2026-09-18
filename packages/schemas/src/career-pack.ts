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
    // P1-T03 canonical contract: a released binding offers the plain action,
    // so the flag is only meaningful when the template progression actually
    // offers the bound action (sequence/stage offers, utility actions, or
    // the allowManager ask_manager grant).
    const offeredByTemplate = new Map<string, Set<SimulationActionId>>();
    for (const [templateId, template] of Object.entries(
      pack.scenario.eventTemplates,
    )) {
      const offered = new Set<SimulationActionId>();
      for (const id of template.progression.utilityActions) offered.add(id);
      if (template.progression.allowManager) offered.add("ask_manager");
      if (template.progression.kind === "linear") {
        for (const id of template.progression.sequence) offered.add(id);
      } else {
        for (const stage of template.progression.stages) {
          for (const id of stage.offer) offered.add(id);
          for (const id of stage.alsoOffer) offered.add(id);
        }
      }
      offeredByTemplate.set(templateId, offered);
    }
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
      const offered = offeredByTemplate.get(task.eventTemplateId);
      if (
        task.releasesActionGate &&
        offered &&
        !offered.has(task.actionId)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Task "${task.id}" sets releasesActionGate for action "${task.actionId}", which event template "${task.eventTemplateId}" never offers`,
          path: ["scenario", "tasks"],
        });
      }
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
    // P1-T05 validation strengthening (Phase 1 invariants only).
    // Migration-gate flag consistency: P1-T03 froze `releasesActionGate` on
    // PackTaskDefinition (committed); validate authoring consistency here
    // without inventing a competing field.
    const instanceIdOwners = new Map<string, string>();
    for (const [templateId, template] of Object.entries(
      pack.scenario.eventTemplates,
    )) {
      const owner = instanceIdOwners.get(template.instanceId);
      if (owner) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate event instanceId "${template.instanceId}" on "${owner}" and "${templateId}"`,
          path: ["scenario", "eventTemplates", templateId],
        });
      } else {
        instanceIdOwners.set(template.instanceId, templateId);
      }
      if (template.deadlineMinutes <= template.triggerAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Event "${templateId}" deadlineMinutes (${String(template.deadlineMinutes)}) must come after triggerAt (${String(template.triggerAt)})`,
          path: ["scenario", "eventTemplates", templateId],
        });
      }
    }
    const instanceIds = new Set(instanceIdOwners.keys());
    for (const action of pack.scenario.actions) {
      for (const artifactId of action.defaultEffect?.observeArtifactIds ??
        []) {
        if (!artifactIds.has(artifactId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Action "${action.id}" observes unknown artifact "${artifactId}"`,
            path: ["scenario", "actions"],
          });
        }
      }
    }
    for (const [templateId, template] of Object.entries(
      pack.scenario.eventTemplates,
    )) {
      for (const [actionId, effect] of Object.entries(
        template.actionEffects,
      )) {
        for (const artifactId of effect.observeArtifactIds) {
          if (!artifactIds.has(artifactId)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Event "${templateId}" effect for "${actionId}" observes unknown artifact "${artifactId}"`,
              path: ["scenario", "eventTemplates", templateId],
            });
          }
        }
      }
    }
    const referencedActions = new Set<SimulationActionId>();
    for (const template of Object.values(pack.scenario.eventTemplates)) {
      const collect = (ids: SimulationActionId[]) => {
        for (const id of ids) referencedActions.add(id);
      };
      if (template.progression.kind === "linear") {
        collect(template.progression.sequence);
        collect(template.progression.utilityActions);
      } else {
        for (const stage of template.progression.stages) {
          collect(stage.after);
          collect(stage.offer);
          collect(stage.alsoOffer);
        }
        collect(template.progression.utilityActions);
      }
      if (template.progression.allowManager) {
        referencedActions.add("ask_manager");
      }
      for (const actionId of Object.keys(template.actionEffects)) {
        referencedActions.add(actionId as SimulationActionId);
      }
    }
    for (const task of pack.scenario.tasks) {
      referencedActions.add(task.actionId);
    }
    const seenActionIds = new Set<SimulationActionId>();
    for (const action of pack.scenario.actions) {
      if (seenActionIds.has(action.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate action id "${action.id}"`,
          path: ["scenario", "actions"],
        });
      }
      seenActionIds.add(action.id);
      if (!referencedActions.has(action.id) && action.tracksCompletion) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Action "${action.id}" is not referenced by any progression, effect, or task`,
          path: ["scenario", "actions"],
        });
      }
    }
    const seenArtifactIds = new Set<string>();
    for (const artifact of pack.scenario.artifacts) {
      if (seenArtifactIds.has(artifact.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate artifact id "${artifact.id}"`,
          path: ["scenario", "artifacts"],
        });
      }
      seenArtifactIds.add(artifact.id);
      for (const eventId of artifact.eventIds) {
        if (!instanceIds.has(eventId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Artifact "${artifact.id}" references unknown event instance "${eventId}"`,
            path: ["scenario", "artifacts"],
          });
        }
      }
    }
  });
export type CareerPack = z.infer<typeof CareerPackSchema>;
