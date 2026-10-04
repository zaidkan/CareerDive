/**
 * Migration source of truth, consumed by drizzle-kit via drizzle.config.ts —
 * not by application code, which queries through `postgres` tagged templates
 * in db/repository.ts. Nothing imports this file; that is expected. Deleting it
 * would break `drizzle-kit generate`.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey(),
  ageTier: text("age_tier").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  institutionalUseAllowed: boolean("institutional_use_allowed")
    .notNull()
    .default(false),
  createdAt: createdAt(),
});
export const guardianRelationships = pgTable("guardian_relationships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  guardianUserId: uuid("guardian_user_id").notNull(),
  status: text("status").notNull(),
  permittedCategories: text("permitted_categories").array().notNull(),
  createdAt: createdAt(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
export const simulationSessions = pgTable("simulation_sessions", {
  id: uuid("id").primaryKey(),
  ownerId: uuid("owner_id").notNull(),
  careerId: text("career_id").notNull(),
  sessionKind: text("session_kind").notNull(),
  pacingMode: text("pacing_mode").notNull(),
  seed: integer("seed").notNull(),
  createRequestId: uuid("create_request_id"),
  revision: integer("revision").notNull().default(0),
  currentState: jsonb("current_state").notNull(),
  createdAt: createdAt(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [uniqueIndex("simulation_sessions_owner_create_request_idx").on(table.ownerId, table.createRequestId)]);
export const decisionReviews = pgTable("decision_reviews", {
  sessionId: uuid("session_id").notNull().references(() => simulationSessions.id, { onDelete: "cascade" }),
  careerId: text("career_id").notNull(),
  careerVersion: text("career_version").notNull(),
  decisionId: text("decision_id").notNull(),
  choiceId: text("choice_id").notNull(),
  optionSetKey: text("option_set_key").notNull().default(""),
  createdAt: createdAt(),
}, (table) => [
  primaryKey({ columns: [table.sessionId, table.decisionId] }),
  index("decision_reviews_cohort_idx").on(table.careerId, table.careerVersion, table.decisionId, table.optionSetKey, table.choiceId),
]);
export const careerRequests = pgTable("career_requests", {
  requesterKey: uuid("requester_key").notNull(),
  careerId: text("career_id").notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  unrequestedAt: timestamp("unrequested_at", { withTimezone: true }),
  lastActionAt: timestamp("last_action_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.requesterKey, table.careerId] }),
  check("career_requests_career_id_check", sql`${table.careerId} IN ('registered-nurse', 'mechanical-engineer', 'electrician', 'lawyer-attorney')`),
  index("career_requests_career_idx").on(table.careerId),
]);
export const actionLog = pgTable("action_log", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  sessionId: uuid("session_id").notNull(),
  ownerId: uuid("owner_id").notNull(),
  sequence: integer("sequence").notNull(),
  action: jsonb("action").notNull(),
  acceptedDelta: jsonb("accepted_delta").notNull(),
  createdAt: createdAt(),
});
export const stateSnapshots = pgTable("state_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull(),
  ownerId: uuid("owner_id").notNull(),
  sequence: integer("sequence").notNull(),
  state: jsonb("state").notNull(),
  createdAt: createdAt(),
});
export const evidenceSignals = pgTable("evidence_signals", {
  id: uuid("id").primaryKey(),
  sessionId: uuid("session_id").notNull(),
  ownerId: uuid("owner_id").notNull(),
  category: text("category").notNull(),
  dimension: text("dimension").notNull(),
  observation: text("observation").notNull(),
  provenance: jsonb("provenance").notNull(),
  userAnnotation: text("user_annotation"),
  createdAt: createdAt(),
});
export const reflections = pgTable("reflections", {
  id: uuid("id").primaryKey(),
  sessionId: uuid("session_id").notNull(),
  ownerId: uuid("owner_id").notNull(),
  eventId: text("event_id").notNull(),
  enjoyment: text("enjoyment").notNull(),
  confidence: text("confidence").notNull(),
  note: text("note"),
  createdAt: createdAt(),
});
export const interpretations = pgTable("interpretations", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull(),
  evidenceIds: uuid("evidence_ids").array().notNull(),
  confidence: text("confidence").notNull(),
  statement: text("statement").notNull(),
  createdAt: createdAt(),
});
export const sharingGrants = pgTable("sharing_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull(),
  recipientId: uuid("recipient_id").notNull(),
  categories: text("categories").array().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: createdAt(),
});
export const pathwayRecords = pgTable("pathway_records", {
  id: text("id").primaryKey(),
  careerId: text("career_id").notNull(),
  region: text("region").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  payload: jsonb("payload").notNull(),
  lastVerified: date("last_verified").notNull(),
  nextReview: date("next_review").notNull(),
  createdAt: createdAt(),
});
export const telemetry = pgTable("telemetry", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  sessionId: uuid("session_id").notNull(),
  ownerId: uuid("owner_id").notNull(),
  turnSequence: integer("turn_sequence").notNull(),
  interactionKind: text("interaction_kind").notNull(),
  modelRole: text("model_role"),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costUsd: numeric("cost_usd", { precision: 12, scale: 8 })
    .notNull()
    .default("0"),
  latencyMs: integer("latency_ms").notNull(),
  cacheHit: boolean("cache_hit").notNull().default(false),
  deepValidationUsed: boolean("deep_validation_used").notNull().default(false),
  safetyResult: text("safety_result").notNull(),
  createdAt: createdAt(),
});
export const consentRecords = pgTable("consent_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  guardianUserId: uuid("guardian_user_id"),
  jurisdiction: text("jurisdiction").notNull(),
  consentVersion: text("consent_version").notNull(),
  categories: text("categories").array().notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
export const deletionJobs = pgTable("deletion_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull(),
  scope: text("scope").notNull(),
  targetId: text("target_id"),
  status: text("status").notNull(),
  createdAt: createdAt(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const supportReports = pgTable(
  "support_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    createRequestId: uuid("create_request_id").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    contact: text("contact").notNull().default(""),
    diagnostics: jsonb("diagnostics"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("support_reports_owner_id_create_request_id_key").on(
      table.ownerId,
      table.createRequestId,
    ),
    index("support_reports_owner_time_idx").on(table.ownerId, table.createdAt),
  ],
);
export const launchEvents = pgTable("launch_events", {
  eventId: uuid("event_id").primaryKey(),
  eventName: text("event_name").notNull(),
  careerId: text("career_id"),
  createdAt: createdAt(),
});

export const launchEventLimits = pgTable("launch_event_limits", {
  ownerId: uuid("owner_id").primaryKey(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  eventCount: integer("event_count").notNull().default(0),
});
