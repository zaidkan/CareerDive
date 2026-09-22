import { z } from "zod";

import { QueryRecordsPayloadSchema } from "./query.js";
import { WorkSystemIdSchema } from "./session.js";
import { TicketUpdatePayloadSchema } from "./ticket-update.js";

export const SimulationActionIdSchema = z.enum([
  "read_handoff",
  "acknowledge_handoff",
  "review_alert",
  "inspect_login_context",
  "inspect_account_history",
  "check_device_inventory",
  "search_knowledge_base",
  "query_records",
  "dismiss_alert",
  "escalate_alert",
  "document_ticket",
  "update_ticket_notes",
  "update_notebook",
  "open_phishing_report",
  "inspect_email_headers",
  "check_link_destination",
  "quarantine_message",
  "notify_reporter",
  "ask_manager",
  "complete_shift",
]);
export type SimulationActionId = z.infer<typeof SimulationActionIdSchema>;

export const SimulationActionSchema = z.object({
  id: SimulationActionIdSchema,
  actorId: z.string().min(1),
  eventId: z.string().min(1).optional(),
  freeText: z.string().max(2_000).optional(),
  /**
   * P2-T01: structured query payload. Present only for `query_records`;
   * legality of the pairing (payload required iff id === "query_records") is
   * enforced in the reducer, keeping the envelope back-compatible.
   */
  queryPayload: QueryRecordsPayloadSchema.optional(),
  ticketPayload: TicketUpdatePayloadSchema.optional(),
  sourceRecordId: z.string().min(1).optional(),
  sourceArtifactId: z.string().min(1).optional(),
});
export type SimulationAction = z.infer<typeof SimulationActionSchema>;

export const AvailableActionSchema = z.object({
  id: SimulationActionIdSchema,
  eventId: z.string().min(1),
  systemId: WorkSystemIdSchema,
  label: z.string(),
  description: z.string(),
  simulatedMinutes: z.number().int().nonnegative(),
  taskId: z.string().min(1).optional(),
  sourceRecordId: z.string().min(1).optional(),
  sourceArtifactId: z.string().min(1).optional(),
  ticketPayload: TicketUpdatePayloadSchema.optional(),
});
export type AvailableAction = z.infer<typeof AvailableActionSchema>;

export const HiddenDeltaSchema = z.object({
  cognitiveLoad: z.number().optional(),
  accuracy: z.number().optional(),
  riskExposure: z.number().optional(),
  taskBacklog: z.number().optional(),
});
export type HiddenDelta = z.infer<typeof HiddenDeltaSchema>;

export const ActionConsequenceSchema = z.object({
  description: z.string(),
  delayMinutes: z.number().int().nonnegative().optional(),
  escalateOnApply: z.boolean().default(false),
  escalateResolution: z.string().optional(),
});
export type ActionConsequence = z.infer<typeof ActionConsequenceSchema>;

export const ActionEffectSchema = z.object({
  hidden: HiddenDeltaSchema.optional(),
  observeArtifactIds: z.array(z.string()).default([]),
  resolve: z.boolean().default(false),
  resolution: z.string().optional(),
  consequence: ActionConsequenceSchema.optional(),
  emitEventResolved: z.boolean().default(false),
  setTicketNotesFromFreeText: z.boolean().default(false),
  setKbQueryFromFreeText: z.boolean().default(false),
  setNotebookFromFreeText: z.boolean().default(false),
});
export type ActionEffect = z.infer<typeof ActionEffectSchema>;

export const ActionDefinitionSchema = z.object({
  id: SimulationActionIdSchema,
  systemId: WorkSystemIdSchema,
  label: z.string(),
  description: z.string(),
  simulatedMinutes: z.number().int().nonnegative(),
  energyCost: z.number().int().nonnegative().default(0),
  tracksCompletion: z.boolean().default(true),
  defaultEffect: ActionEffectSchema.optional(),
});
export type ActionDefinition = z.infer<typeof ActionDefinitionSchema>;
