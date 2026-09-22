import { z } from "zod";

import { AvailableActionSchema } from "./actions.js";
import { EventInstanceSchema, WorkItemCategorySchema } from "./events.js";
import { QueryResultViewSchema } from "./query.js";
import { AlertRecordSchema } from "./records.js";
import { PacingModeSchema, SessionKindSchema } from "./session.js";
import { ClientNotificationSchema, ClientTaskViewSchema } from "./tasks.js";
import { ClientWorkplaceStateSchema } from "./workplace.js";
import { StructuredTicketSchema } from "./ticket.js";
import { LocationSchema, WorkArtifactSchema } from "./world.js";

/** Reviewed exact identifiers only, never record prose or enrollment status. */
export const InventoryLookupKeysSchema = z
  .array(z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/))
  .min(1)
  .max(32);

export const ClientArtifactSchema = WorkArtifactSchema.omit({
  body: true,
  metadata: true,
  relatedArtifactIds: true,
  searchableText: true,
}).extend({
  body: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  relatedArtifactIds: z.array(z.string()).optional(),
  searchableText: z.string().optional(),
  observed: z.boolean(),
  lookupKeys: InventoryLookupKeysSchema.optional(),
});
export type ClientArtifact = z.infer<typeof ClientArtifactSchema>;

export const ClientEventSchema = EventInstanceSchema.pick({
  id: true,
  title: true,
  summary: true,
  priority: true,
  systemId: true,
  status: true,
  deadlineAt: true,
  completedActionIds: true,
  observedArtifactIds: true,
  resolution: true,
  acknowledgedAt: true,
  linkedTicketId: true,
}).extend({
  category: WorkItemCategorySchema,
  // Present on newly serialized events; optional so legacy-shaped fixtures
  // and older clients stay valid.
  followUpRefs: z.array(z.string()).optional(),
});
export const ClientViewSchema = z.object({
  sessionId: z.string(),
  sessionKind: SessionKindSchema,
  simClock: z.number(),
  currentLocation: LocationSchema,
  events: z.array(ClientEventSchema),
  availableActions: z.array(AvailableActionSchema),
  operationalMessages: z.array(z.string()),
  pacingMode: PacingModeSchema,
  artifacts: z.array(ClientArtifactSchema),
  alertRecords: z.array(AlertRecordSchema).optional(),
  ticketNotes: z.record(z.string(), z.string()),
  structuredTickets: z.record(z.string(), StructuredTicketSchema).optional(),
  teamMessages: z
    .array(
      z.object({
        id: z.string(),
        eventId: z.string(),
        author: z.enum(["player", "morgan"]),
        body: z.string(),
        actionId: AvailableActionSchema.shape.id,
        simMinutes: z.number().int().nonnegative(),
      }),
    )
    .optional(),
  notebook: z.string(),
  kbQuery: z.string(),
  tasks: z.array(ClientTaskViewSchema).default([]),
  notifications: z.array(ClientNotificationSchema).default([]),
  // P2-T01: per-query result views only (never the full server-side history).
  queryResults: z.array(QueryResultViewSchema).default([]),
  workplace: ClientWorkplaceStateSchema,
});
export type ClientView = z.infer<typeof ClientViewSchema>;
