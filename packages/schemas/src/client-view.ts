import { z } from "zod";

import { AvailableActionSchema } from "./actions.js";
import { EventInstanceSchema } from "./events.js";
import { PacingModeSchema, SessionKindSchema } from "./session.js";
import { ClientNotificationSchema, ClientTaskViewSchema } from "./tasks.js";
import { ClientWorkplaceStateSchema } from "./workplace.js";
import { LocationSchema, WorkArtifactSchema } from "./world.js";

export const ClientArtifactSchema = WorkArtifactSchema.omit({
  // all fields public for workplace tools
}).extend({
  observed: z.boolean(),
});
export type ClientArtifact = z.infer<typeof ClientArtifactSchema>;

export const ClientEventSchema = EventInstanceSchema.pick({
  id: true,
  templateId: true,
  title: true,
  summary: true,
  priority: true,
  systemId: true,
  status: true,
  deadlineAt: true,
  completedActionIds: true,
  observedArtifactIds: true,
  resolution: true,
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
  ticketNotes: z.record(z.string(), z.string()),
  notebook: z.string(),
  kbQuery: z.string(),
  tasks: z.array(ClientTaskViewSchema).default([]),
  notifications: z.array(ClientNotificationSchema).default([]),
  workplace: ClientWorkplaceStateSchema,
});
export type ClientView = z.infer<typeof ClientViewSchema>;
