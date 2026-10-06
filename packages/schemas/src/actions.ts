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
  "route_access_request",
  "resolve_login_help",
  "send_status_update",
  "submit_shift_handoff",
  "ask_manager",
  "complete_shift",
]);
export type SimulationActionId = z.infer<typeof SimulationActionIdSchema>;

export const HandoffPayloadSchema = z.object({
  sourceArtifactIds: z.array(z.string().min(1)).max(30),
  followUp: z.enum([
    "senior-review",
    "verify-employee",
    "review-device",
    "monitor",
  ]),
  note: z.string().max(300).optional(),
});
export type HandoffPayload = z.infer<typeof HandoffPayloadSchema>;

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
  handoffPayload: HandoffPayloadSchema.optional(),
  ticketPayload: TicketUpdatePayloadSchema.optional(),
  decisionOptionId: z.string().min(1).optional(),
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
  queryPayload: QueryRecordsPayloadSchema.optional(),
  handoffPayload: HandoffPayloadSchema.optional(),
  ticketPayload: TicketUpdatePayloadSchema.optional(),
  stateNote: z.string().min(1).optional(),
  decisionOptions: z
    .array(z.object({ id: z.string(), label: z.string() }))
    .optional(),
  decisionOptionId: z.string().min(1).optional(),
});
export type AvailableAction = z.infer<typeof AvailableActionSchema>;

export const HiddenDeltaSchema = z.object({
  cognitiveLoad: z.number().optional(),
  accuracy: z.number().optional(),
  riskExposure: z.number().optional(),
  taskBacklog: z.number().optional(),
});
export type HiddenDelta = z.infer<typeof HiddenDeltaSchema>;

/**
 * Small, server-only pack predicate. Multiple conditions are an AND.
 * `equals` and `notEquals` are mutually exclusive; exactly one is required.
 */
export const ConditionSchema = z
  .object({
    flag: z.string().min(1),
    equals: z.string().min(1).optional(),
    notEquals: z.string().min(1).optional(),
  })
  .refine(
    (condition) =>
      Object.hasOwn(condition, "equals") !==
      Object.hasOwn(condition, "notEquals"),
    {
      message: "Condition requires exactly one of `equals` or `notEquals`",
    },
  );
export type Condition = z.infer<typeof ConditionSchema>;

export const PackCallbackSchema = z.object({
  id: z.string().min(1),
  decisionId: z.string().min(1).optional(),
  delayMinutes: z.number().int().positive(),
  when: z.array(ConditionSchema).default([]),
  author: z.enum(["morgan", "reviewer", "employee"]),
  body: z.string().min(1),
  emitEvent: z.string().min(1).optional(),
  activationMessages: z.array(z.string().min(1)).default([]),
  acknowledgement: z.string().min(1).optional(),
  requiredAtCompletion: z.boolean().default(false),
});
export type PackCallback = z.infer<typeof PackCallbackSchema>;

export const ActionConsequenceSchema = z.object({
  description: z.string(),
  delayMinutes: z.number().int().nonnegative().optional(),
  escalateOnApply: z.boolean().optional(),
  escalateResolution: z.string().optional(),
  requiredAtCompletion: z.boolean().default(false),
});
export type ActionConsequence = z.infer<typeof ActionConsequenceSchema>;

export const ActionEffectSchema = z.object({
  hidden: HiddenDeltaSchema.optional(),
  observeArtifactIds: z.array(z.string()).default([]),
  resolve: z.boolean().default(false),
  resolution: z.string().optional(),
  consequence: ActionConsequenceSchema.optional(),
  callbacks: z.array(PackCallbackSchema).default([]),
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
