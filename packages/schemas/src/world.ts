import { z } from "zod";

import { ActionDefinitionSchema, SimulationActionIdSchema } from "./actions.js";
import { EventInstanceSchema, PackEventTemplateSchema } from "./events.js";
import { QueryHistoryEntrySchema } from "./query.js";
import { DatasetIdSchema, RuntimeDatasetSchema } from "./records.js";
import {
  PacingModeSchema,
  SessionKindSchema,
  WorkSystemIdSchema,
} from "./session.js";
import {
  NotificationStateSchema,
  PackNotificationDefinitionSchema,
  PackTaskDefinitionSchema,
  TaskProgressSchema,
} from "./tasks.js";
import { WorkplaceStateSchema } from "./workplace.js";
import { EvidenceFactDefinitionSchema } from "./evidence-facts.js";
import { StructuredTicketSchema } from "./ticket.js";

export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  connectedLocationIds: z.array(z.string()),
  interactableIds: z.array(z.string()),
});
export type Location = z.infer<typeof LocationSchema>;

export const FactVisibilitySchema = z.enum([
  "public",
  "role_restricted",
  "private",
]);
export const FactSchema = z.object({
  id: z.string(),
  content: z.string(),
  visibility: FactVisibilitySchema,
  knownBy: z.array(z.string()),
  notKnownBy: z.array(z.string()),
});
export type Fact = z.infer<typeof FactSchema>;

export const NpcStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  mood: z.enum(["neutral", "concerned", "impatient", "warm", "curt"]),
  memoryFactIds: z.array(z.string()),
});
export type NpcState = z.infer<typeof NpcStateSchema>;

export const WorkArtifactKindSchema = z.enum([
  "alert",
  "email",
  "ticket",
  "kb_document",
  "chat_thread",
  "login_record",
  "device_record",
  "account_history",
  "note",
]);
export type WorkArtifactKind = z.infer<typeof WorkArtifactKindSchema>;

export const WorkArtifactSchema = z.object({
  id: z.string(),
  systemId: WorkSystemIdSchema,
  kind: WorkArtifactKindSchema,
  title: z.string(),
  summary: z.string(),
  body: z.string(),
  eventIds: z.array(z.string()).default([]),
  relatedArtifactIds: z.array(z.string()).default([]),
  searchableText: z.string().default(""),
  metadata: z.record(z.string(), z.string()).default({}),
});
export type WorkArtifact = z.infer<typeof WorkArtifactSchema>;

export const ScenarioRulesSchema = z.object({
  actions: z.record(z.string(), ActionDefinitionSchema),
  eventTemplates: z.record(z.string(), PackEventTemplateSchema),
  tasks: z.record(z.string(), PackTaskDefinitionSchema).default({}),
  notifications: z
    .record(z.string(), PackNotificationDefinitionSchema)
    .default({}),
  // Phase 3: authored definitions are immutable scenario content. Discovery
  // state remains instance-derived and is never serialized through this map.
  evidenceFacts: z.record(z.string(), EvidenceFactDefinitionSchema).optional(),
  // P2-T01: immutable structured datasets, versioned with the scenario.
  // Keyed by datasetId; default {} keeps pre-Phase-2 packs valid.
  datasets: z.record(DatasetIdSchema, RuntimeDatasetSchema).default({}),
});
export type ScenarioRules = z.infer<typeof ScenarioRulesSchema>;

export const ConsequenceEntrySchema = z.object({
  id: z.string(),
  eventId: z.string(),
  actionId: SimulationActionIdSchema,
  description: z.string(),
  createdAt: z.number().int().nonnegative(),
  dueAt: z.number().int().nonnegative().optional(),
  applied: z.boolean(),
});
export type ConsequenceEntry = z.infer<typeof ConsequenceEntrySchema>;

export const HiddenStateSchema = z.object({
  stress: z.number(),
  fatigue: z.number(),
  trust: z.record(z.string(), z.number()),
  reputation: z.number(),
  cognitiveLoad: z.number(),
  taskBacklog: z.number(),
  accuracy: z.number(),
  riskExposure: z.number(),
});
export type HiddenState = z.infer<typeof HiddenStateSchema>;

export const WorldStateSchema = z.object({
  sessionId: z.string(),
  sessionKind: SessionKindSchema,
  seed: z.number().int(),
  simClock: z.number().int().nonnegative(),
  currentLocationId: z.string(),
  locations: z.record(z.string(), LocationSchema),
  facts: z.record(z.string(), FactSchema),
  npcs: z.record(z.string(), NpcStateSchema),
  events: z.array(EventInstanceSchema),
  ledger: z.array(ConsequenceEntrySchema),
  completedActionIds: z.array(SimulationActionIdSchema),
  pacingMode: PacingModeSchema,
  rules: ScenarioRulesSchema,
  artifacts: z.record(z.string(), WorkArtifactSchema),
  observedArtifactIds: z.array(z.string()).default([]),
  ticketNotes: z.record(z.string(), z.string()).default({}),
  structuredTickets: z
    .record(z.string(), StructuredTicketSchema)
    .default({}),
  notebook: z.string().default(""),
  kbQuery: z.string().default(""),
  taskProgress: z.record(z.string(), TaskProgressSchema).default({}),
  notifications: z.array(NotificationStateSchema).default([]),
  // P2-T01: append-only, reducer-local, replayed query history (server-side).
  queryHistory: z.array(QueryHistoryEntrySchema).default([]),
  workplace: WorkplaceStateSchema,
  hidden: HiddenStateSchema,
});
export type WorldState = z.infer<typeof WorldStateSchema>;
