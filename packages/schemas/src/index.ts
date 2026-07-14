import { z } from "zod";

export const PacingModeSchema = z.enum([
  "standard",
  "extended",
  "pause_compatible",
  "no_hard_timer",
  "practice",
]);
export type PacingMode = z.infer<typeof PacingModeSchema>;

export const SessionKindSchema = z.enum(["tutorial", "assessed"]);
export type SessionKind = z.infer<typeof SessionKindSchema>;

export const SimulationActionIdSchema = z.enum([
  "review_alert",
  "inspect_login_context",
  "dismiss_alert",
  "escalate_alert",
  "document_ticket",
  "ask_manager",
  "complete_shift",
]);
export type SimulationActionId = z.infer<typeof SimulationActionIdSchema>;

export const SimulationActionSchema = z.object({
  id: SimulationActionIdSchema,
  actorId: z.string().min(1),
  freeText: z.string().max(2_000).optional(),
});
export type SimulationAction = z.infer<typeof SimulationActionSchema>;

export const AvailableActionSchema = z.object({
  id: SimulationActionIdSchema,
  label: z.string(),
  description: z.string(),
  simulatedMinutes: z.number().int().nonnegative(),
});
export type AvailableAction = z.infer<typeof AvailableActionSchema>;

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

export const NpcKnowledgeViewSchema = z.object({
  npc: NpcStateSchema,
  facts: z.array(FactSchema),
  publicSceneMemory: z.array(z.string()),
});
export type NpcKnowledgeView = z.infer<typeof NpcKnowledgeViewSchema>;

export const EventStatusSchema = z.enum([
  "pending",
  "active",
  "resolved",
  "escalated",
  "expired",
]);
export const EventInstanceSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  title: z.string(),
  status: EventStatusSchema,
  triggeredAt: z.number().int().nonnegative(),
  deadlineAt: z.number().int().positive(),
  reviewed: z.boolean(),
  contextInspected: z.boolean(),
  managerConsulted: z.boolean().default(false),
  resolution: z.string().optional(),
});
export type EventInstance = z.infer<typeof EventInstanceSchema>;

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
  rngState: z.number().int(),
  simClock: z.number().int().nonnegative(),
  currentLocationId: z.string(),
  locations: z.record(z.string(), LocationSchema),
  facts: z.record(z.string(), FactSchema),
  npcs: z.record(z.string(), NpcStateSchema),
  events: z.array(EventInstanceSchema),
  ledger: z.array(ConsequenceEntrySchema),
  completedActionIds: z.array(SimulationActionIdSchema),
  pacingMode: PacingModeSchema,
  hidden: HiddenStateSchema,
});
export type WorldState = z.infer<typeof WorldStateSchema>;

export const ClientEventSchema = EventInstanceSchema.pick({
  id: true,
  title: true,
  status: true,
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
});
export type ClientView = z.infer<typeof ClientViewSchema>;

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

export const ActionLogEntrySchema = z.object({
  sequence: z.number().int().positive(),
  action: SimulationActionSchema,
});
export type ActionLogEntry = z.infer<typeof ActionLogEntrySchema>;

export const ScenarioRhythmSchema = z.enum([
  "routine_monitoring",
  "quiet_investigation",
]);
export type ScenarioRhythm = z.infer<typeof ScenarioRhythmSchema>;

export const CareerPackSchema = z.object({
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
    systems: z.array(z.string()).min(1),
    events: z.array(z.string()).min(1),
    rhythmBiasReview: z.object({
      ordinaryWorkRepresented: z.literal(true),
      calmWorkRepresented: z.literal(true),
      technicalAndRelationalWorkRepresented: z.literal(true),
    }),
  }),
});
export type CareerPack = z.infer<typeof CareerPackSchema>;

export const EventTemplateSchema = z.object({
  id: z.string(),
  triggerAt: z.number().int().nonnegative(),
  deadlineMinutes: z.number().int().positive(),
  prohibitedOutcomes: z.array(z.string()),
});
export type EventTemplate = z.infer<typeof EventTemplateSchema>;

export const ConfidenceLevelSchema = z.enum([
  "insufficient_evidence",
  "early_signal",
  "repeated_signal",
  "strong_repeated_pattern",
]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export const EvidenceSignalSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  actionId: SimulationActionIdSchema,
  eventId: z.string(),
  rhythm: ScenarioRhythmSchema,
  pacingMode: PacingModeSchema,
  category: z.enum(["behavioral", "outcome", "reflective"]),
  dimension: z.enum([
    "prioritization",
    "communication",
    "attention_to_detail",
    "analytical_reasoning",
    "enjoyment",
    "stress",
    "engagement",
  ]),
  observation: z.string(),
  occurredAt: z.string().datetime(),
  annotation: z.string().optional(),
});
export type EvidenceSignal = z.infer<typeof EvidenceSignalSchema>;

export const ReflectionSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  eventId: z.string(),
  enjoyment: z.enum(["draining", "neutral", "energizing"]),
  confidence: z.enum(["uncertain", "comfortable"]),
  note: z.string().max(2_000).optional(),
  createdAt: z.string().datetime(),
});
export type Reflection = z.infer<typeof ReflectionSchema>;

export const DebriefSchema = z.object({
  sessionId: z.string(),
  confidence: ConfidenceLevelSchema,
  sections: z.object({
    whatHappened: z.string(),
    whatYouDid: z.string(),
    consequences: z.string(),
    earlyEvidence: z.string(),
    yourExperience: z.string(),
    confidenceAndLimitations: z.string(),
    careerReality: z.string(),
    nextAction: z.string(),
  }),
  evidenceIds: z.array(z.string()),
});
export type Debrief = z.infer<typeof DebriefSchema>;

export const PathwayRecordSchema = z.object({
  id: z.string(),
  careerId: z.string(),
  region: z.string(),
  jurisdiction: z.string(),
  credentialType: z.string(),
  requirement: z.string(),
  authorityName: z.string(),
  authorityUrl: z.string().url(),
  lastVerified: z.string().date(),
  nextReview: z.string().date(),
});
export type PathwayRecord = z.infer<typeof PathwayRecordSchema>;

export const NpcTurnOutputSchema = z.object({
  dialogue: z.string().min(1).max(2_000),
  tone: z.enum([
    "neutral",
    "concerned",
    "impatient",
    "warm",
    "curt",
    "encouraging",
  ]),
  referencedFactIds: z.array(z.string()),
  proposedMinorStateUpdates: z.array(
    z.object({
      field: z.literal("npcMood"),
      value: z.string(),
    }),
  ),
});
export type NpcTurnOutput = z.infer<typeof NpcTurnOutputSchema>;

export const SafetyResultSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
  fallback: z.string().optional(),
});
export type SafetyResult = z.infer<typeof SafetyResultSchema>;

export const TokenUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  totalCostUsd: z.number().nonnegative(),
});
export type TokenUsage = z.infer<typeof TokenUsageSchema>;

export interface SystemModule {
  id: string;
  availableActions(state: WorldState): AvailableAction[];
}

export interface ViewAdapter {
  id: string;
  actionIds(view: ClientView): SimulationActionId[];
}

export interface SafetyCheck {
  id: string;
  run(input: string): Promise<SafetyResult> | SafetyResult;
}

export interface EvidenceInterpreter {
  interpret(signals: EvidenceSignal[]): {
    confidence: ConfidenceLevel;
    statement: string;
  };
}

export interface Cache {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
}
