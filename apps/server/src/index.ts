import { randomUUID } from "node:crypto";
import {
  buildNpcContext,
  type LlmProvider,
} from "@sim/ai";
import {
  applyAction,
  createInitialWorldState,
  toClientView,
} from "@sim/core";
import { buildDebrief, recordEvidence } from "@sim/evidence";
import {
  SessionBudget,
  deterministicInputSafety,
  validateNpcOutput,
  validateUserFacingText,
} from "@sim/safety";
import {
  ClientViewSchema,
  DebriefSchema,
  EvidenceSignalSchema,
  PacingModeSchema,
  ReflectionSchema,
  SessionKindSchema,
  SimulationActionIdSchema,
  type ActionLogEntry,
  type EvidenceSignal,
  type Reflection,
  type WorldState,
} from "@sim/schemas";
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";

export type AppContext = {
  userId: string;
};

export type JurisdictionPolicy = {
  minimumUserAge: number;
  adultAge: number;
  guardianConsentUnderAdultAge: boolean;
  institutionalUseAllowed: boolean;
};

export const DEFAULT_JURISDICTION_POLICIES: Record<
  string,
  JurisdictionPolicy
> = {
  "US-NY": {
    minimumUserAge: 13,
    adultAge: 18,
    guardianConsentUnderAdultAge: true,
    institutionalUseAllowed: false,
  },
  "US-DEFAULT": {
    minimumUserAge: 13,
    adultAge: 18,
    guardianConsentUnderAdultAge: true,
    institutionalUseAllowed: false,
  },
};

export function resolveConsentRequirement(
  policies: Record<string, JurisdictionPolicy>,
  jurisdiction: string,
  age: number,
): {
  ageTier: "teen" | "adult";
  guardianConsentRequired: boolean;
  institutionalUseAllowed: boolean;
} {
  const policy = policies[jurisdiction] ?? policies["US-DEFAULT"];
  if (!policy) {
    throw new Error("No jurisdiction policy is configured");
  }
  if (age < policy.minimumUserAge) {
    throw new Error("User is below the configured minimum age");
  }
  const ageTier = age < policy.adultAge ? "teen" : "adult";
  return {
    ageTier,
    guardianConsentRequired:
      ageTier === "teen" && policy.guardianConsentUnderAdultAge,
    institutionalUseAllowed: policy.institutionalUseAllowed,
  };
}

const DIALOGUE_FALLBACK =
  "Open-ended dialogue is temporarily unavailable. You can continue using the approved workplace actions.";

export async function generateSafeNpcReply(input: {
  provider: LlmProvider;
  state: WorldState;
  npcId: string;
  userText: string;
  budgetUsd: number;
}): Promise<{
  source: "generated" | "fallback";
  dialogue: string;
  costUsd: number;
}> {
  const inputSafety = deterministicInputSafety(input.userText);
  if (!inputSafety.allowed) {
    return {
      source: "fallback",
      dialogue: inputSafety.fallback ?? DIALOGUE_FALLBACK,
      costUsd: 0,
    };
  }
  try {
    const context = buildNpcContext(input.state, input.npcId);
    const budget = new SessionBudget(input.budgetUsd);
    const generated = await input.provider.generate({
      role: "primary",
      system:
        "Write only workplace dialogue. Do not change world state, procedure, consequences, or facts.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            question: input.userText,
            context,
          }),
        },
      ],
      maxTokens: 300,
    });
    budget.record(generated.usage.totalCostUsd);
    const output = validateNpcOutput(
      generated.value,
      new Set(context.facts.map(({ id }) => id)),
    );
    return {
      source: "generated",
      dialogue: output.dialogue,
      costUsd: generated.usage.totalCostUsd,
    };
  } catch {
    return { source: "fallback", dialogue: DIALOGUE_FALLBACK, costUsd: 0 };
  }
}

export type StoredSession = {
  ownerId: string;
  state: WorldState;
  actionLog: ActionLogEntry[];
  evidence: EvidenceSignal[];
  reflections: Reflection[];
};

export type SharingGrant = {
  id: string;
  ownerId: string;
  recipientId: string;
  categories: ("debrief" | "pathways" | "reflections")[];
  expiresAt: string;
  revokedAt?: string;
};

const SharingGrantSchema = z.object({
  id: z.string(),
  recipientId: z.string(),
  categories: z.array(z.enum(["debrief", "pathways", "reflections"])),
  expiresAt: z.string().datetime(),
});

function toPublicGrant(grant: SharingGrant) {
  return {
    id: grant.id,
    recipientId: grant.recipientId,
    categories: grant.categories,
    expiresAt: grant.expiresAt,
  };
}

export interface SimulationRepository {
  createSession(ownerId: string, state: WorldState): Promise<void>;
  getSession(ownerId: string, sessionId: string): Promise<StoredSession>;
  saveSession(session: StoredSession): Promise<void>;
  deleteSession(ownerId: string, sessionId: string): Promise<void>;
  deleteAccount(ownerId: string): Promise<void>;
  listSessions(ownerId: string): Promise<StoredSession[]>;
  createGrant(
    ownerId: string,
    input: Omit<SharingGrant, "id" | "ownerId">,
  ): Promise<SharingGrant>;
  listGrants(ownerId: string): Promise<SharingGrant[]>;
  revokeGrant(ownerId: string, grantId: string): Promise<void>;
}

export class InMemoryRepository implements SimulationRepository {
  readonly #sessions = new Map<string, StoredSession>();
  readonly #grants = new Map<string, SharingGrant>();

  async createSession(ownerId: string, state: WorldState): Promise<void> {
    this.#sessions.set(state.sessionId, {
      ownerId,
      state,
      actionLog: [],
      evidence: [],
      reflections: [],
    });
  }

  async getSession(ownerId: string, sessionId: string): Promise<StoredSession> {
    const session = this.#sessions.get(sessionId);
    if (!session || session.ownerId !== ownerId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
    }
    return session;
  }

  async saveSession(session: StoredSession): Promise<void> {
    this.#sessions.set(session.state.sessionId, session);
  }

  async deleteSession(ownerId: string, sessionId: string): Promise<void> {
    await this.getSession(ownerId, sessionId);
    this.#sessions.delete(sessionId);
  }

  async deleteAccount(ownerId: string): Promise<void> {
    for (const [sessionId, session] of this.#sessions) {
      if (session.ownerId === ownerId) {
        this.#sessions.delete(sessionId);
      }
    }
    for (const [grantId, grant] of this.#grants) {
      if (grant.ownerId === ownerId) {
        this.#grants.delete(grantId);
      }
    }
  }

  async listSessions(ownerId: string): Promise<StoredSession[]> {
    return [...this.#sessions.values()].filter(
      (session) => session.ownerId === ownerId,
    );
  }

  async createGrant(
    ownerId: string,
    input: Omit<SharingGrant, "id" | "ownerId">,
  ): Promise<SharingGrant> {
    const grant: SharingGrant = {
      id: randomUUID(),
      ownerId,
      ...input,
    };
    this.#grants.set(grant.id, grant);
    return grant;
  }

  async listGrants(ownerId: string): Promise<SharingGrant[]> {
    return [...this.#grants.values()].filter(
      (grant) => grant.ownerId === ownerId && grant.revokedAt === undefined,
    );
  }

  async revokeGrant(ownerId: string, grantId: string): Promise<void> {
    const grant = this.#grants.get(grantId);
    if (!grant || grant.ownerId !== ownerId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Grant not found" });
    }
    grant.revokedAt = new Date().toISOString();
  }

  evidenceFor(ownerId: string, sessionId: string): EvidenceSignal[] {
    const session = this.#sessions.get(sessionId);
    return session?.ownerId === ownerId ? session.evidence : [];
  }
}

const t = initTRPC.context<AppContext>().create();
const authenticatedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});

const SessionInputSchema = z.object({
  seed: z.number().int(),
  sessionKind: SessionKindSchema,
  pacingMode: PacingModeSchema,
});
const SessionResultSchema = z.object({
  sessionId: z.string(),
  view: ClientViewSchema,
});
const SessionIdSchema = z.object({ sessionId: z.string() });

function evidenceForAction(
  session: StoredSession,
  actionId: z.infer<typeof SimulationActionIdSchema>,
  eventId: string,
): EvidenceSignal {
  const dimension =
    actionId === "document_ticket"
      ? "communication"
      : actionId === "inspect_login_context"
        ? "analytical_reasoning"
        : "prioritization";
  return recordEvidence({
    id: randomUUID(),
    sessionId: session.state.sessionId,
    actionId,
    eventId,
    rhythm: session.state.events
      .find(({ id }) => id === eventId)
      ?.completedActionIds.includes("inspect_login_context")
      ? "quiet_investigation"
      : "routine_monitoring",
    pacingMode: session.state.pacingMode,
    category: "behavioral",
    dimension,
    observation: `Chose ${actionId.replaceAll("_", " ")} when it was available.`,
    occurredAt: new Date().toISOString(),
  });
}

export function createAppRouter(
  repository: SimulationRepository,
  options: {
    llmProvider?: LlmProvider;
    aiBudgetUsd?: number;
  } = {},
) {
  return t.router({
    session: t.router({
      create: authenticatedProcedure
        .input(SessionInputSchema)
        .output(SessionResultSchema)
        .mutation(async ({ ctx, input }) => {
          const sessionId = randomUUID();
          const state = createInitialWorldState(sessionId, input.seed, input);
          await repository.createSession(ctx.userId, state);
          return { sessionId, view: toClientView(state) };
        }),
      get: authenticatedProcedure
        .input(SessionIdSchema)
        .output(SessionResultSchema)
        .query(async ({ ctx, input }) => {
          const session = await repository.getSession(
            ctx.userId,
            input.sessionId,
          );
          return {
            sessionId: session.state.sessionId,
            view: toClientView(session.state),
          };
        }),
      resume: authenticatedProcedure
        .input(SessionIdSchema)
        .output(SessionResultSchema)
        .query(async ({ ctx, input }) => {
          const session = await repository.getSession(
            ctx.userId,
            input.sessionId,
          );
          return {
            sessionId: session.state.sessionId,
            view: toClientView(session.state),
          };
        }),
    }),
    simulation: t.router({
      availableActions: authenticatedProcedure
        .input(SessionIdSchema)
        .output(ClientViewSchema.shape.availableActions)
        .query(async ({ ctx, input }) => {
          const session = await repository.getSession(
            ctx.userId,
            input.sessionId,
          );
          return toClientView(session.state).availableActions;
        }),
      performAction: authenticatedProcedure
        .input(
          SessionIdSchema.extend({
            actionId: SimulationActionIdSchema,
            eventId: z.string().min(1),
          }),
        )
        .output(
          z.object({
            view: ClientViewSchema,
            sequence: z.number().int().positive(),
            effects: z.array(z.object({ type: z.string() }).passthrough()),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const session = await repository.getSession(
            ctx.userId,
            input.sessionId,
          );
          const turn = applyAction(session.state, {
            id: input.actionId,
            eventId: input.eventId,
            actorId: "user",
          });
          const sequence = session.actionLog.length + 1;
          session.state = turn.state;
          session.actionLog.push({
            sequence,
            action: {
              id: input.actionId,
              eventId: input.eventId,
              actorId: "user",
            },
          });
          if (session.state.sessionKind === "assessed") {
            session.evidence.push(
              evidenceForAction(session, input.actionId, input.eventId),
            );
          }
          await repository.saveSession(session);
          return { view: toClientView(session.state), sequence, effects: turn.effects };
        }),
      submitFreeText: authenticatedProcedure
        .input(SessionIdSchema.extend({ text: z.string().max(2_000) }))
        .output(
          z.object({
            accepted: z.boolean(),
            response: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const session = await repository.getSession(
            ctx.userId,
            input.sessionId,
          );
          const safety = deterministicInputSafety(input.text);
          if (!safety.allowed) {
            return {
              accepted: false,
              response: safety.fallback ?? "That input cannot be used here.",
            };
          }
          if (options.llmProvider) {
            const reply = await generateSafeNpcReply({
              provider: options.llmProvider,
              state: session.state,
              npcId: "manager",
              userText: input.text,
              budgetUsd: options.aiBudgetUsd ?? 0.05,
            });
            return {
              accepted: reply.source === "generated",
              response: reply.dialogue,
            };
          }
          return {
            accepted: true,
            response: validateUserFacingText(
              "Morgan recommends reviewing available evidence and documenting uncertainty before deciding.",
            ),
          };
        }),
    }),
    reflection: t.router({
      submit: authenticatedProcedure
        .input(
          z.object({
            sessionId: z.string(),
            eventId: z.string(),
            enjoyment: z.enum(["draining", "neutral", "energizing"]),
            confidence: z.enum(["uncertain", "comfortable"]),
            note: z.string().max(2_000).optional(),
          }),
        )
        .output(ReflectionSchema)
        .mutation(async ({ ctx, input }) => {
          const session = await repository.getSession(
            ctx.userId,
            input.sessionId,
          );
          const reflection = ReflectionSchema.parse({
            id: randomUUID(),
            sessionId: input.sessionId,
            eventId: input.eventId,
            enjoyment: input.enjoyment,
            confidence: input.confidence,
            ...(input.note === undefined ? {} : { note: input.note }),
            createdAt: new Date().toISOString(),
          });
          session.reflections.push(reflection);
          await repository.saveSession(session);
          return reflection;
        }),
    }),
    debrief: t.router({
      get: authenticatedProcedure
        .input(SessionIdSchema)
        .output(DebriefSchema)
        .query(async ({ ctx, input }) => {
          const session = await repository.getSession(
            ctx.userId,
            input.sessionId,
          );
          return buildDebrief({
            sessionId: session.state.sessionId,
            careerTitle: "Junior Cybersecurity Analyst",
            signals: session.evidence,
            reflections: session.reflections,
            consequences: session.state.ledger
              .filter(({ applied }) => applied)
              .map(({ description }) => description),
          });
        }),
    }),
    profile: t.router({
      get: authenticatedProcedure
        .output(
          z.object({
            userId: z.string(),
            sessionCount: z.number().int().nonnegative(),
            evidence: z.array(EvidenceSignalSchema),
          }),
        )
        .query(async ({ ctx }) => {
          const sessions = await repository.listSessions(ctx.userId);
          return {
            userId: ctx.userId,
            sessionCount: sessions.length,
            evidence: sessions.flatMap(({ evidence }) => evidence),
          };
        }),
      annotateEvidence: authenticatedProcedure
        .input(z.object({ evidenceId: z.string(), annotation: z.string() }))
        .output(EvidenceSignalSchema)
        .mutation(async ({ ctx, input }) => {
          const sessions = await repository.listSessions(ctx.userId);
          for (const session of sessions) {
            const signal = session.evidence.find(({ id }) => id === input.evidenceId);
            if (signal) {
              signal.annotation = input.annotation;
              await repository.saveSession(session);
              return signal;
            }
          }
          throw new TRPCError({ code: "NOT_FOUND", message: "Evidence not found" });
        }),
      reset: authenticatedProcedure
        .output(z.object({ reset: z.literal(true) }))
        .mutation(async ({ ctx }) => {
          const sessions = await repository.listSessions(ctx.userId);
          for (const session of sessions) {
            session.evidence = [];
            session.reflections = [];
            await repository.saveSession(session);
          }
          return { reset: true as const };
        }),
    }),
    sharing: t.router({
      list: authenticatedProcedure
        .output(z.array(SharingGrantSchema))
        .query(async ({ ctx }) => {
          const grants = await repository.listGrants(ctx.userId);
          return grants.map(toPublicGrant);
        }),
      grant: authenticatedProcedure
        .input(
          z.object({
            recipientId: z.string(),
            categories: z
              .array(z.enum(["debrief", "pathways", "reflections"]))
              .min(1),
            expiresAt: z.string().datetime(),
          }),
        )
        .output(SharingGrantSchema)
        .mutation(async ({ ctx, input }) => {
          const grant = await repository.createGrant(ctx.userId, input);
          return toPublicGrant(grant);
        }),
      revoke: authenticatedProcedure
        .input(z.object({ grantId: z.string() }))
        .output(z.object({ revoked: z.literal(true) }))
        .mutation(async ({ ctx, input }) => {
          await repository.revokeGrant(ctx.userId, input.grantId);
          return { revoked: true as const };
        }),
    }),
    privacy: t.router({
      exportData: authenticatedProcedure
        .output(
          z.object({
            sessions: z.array(z.object({ sessionId: z.string(), view: ClientViewSchema })),
            actionLog: z.array(z.object({ sessionId: z.string(), entry: z.unknown() })),
            evidence: z.array(EvidenceSignalSchema),
            reflections: z.array(ReflectionSchema),
          }),
        )
        .query(async ({ ctx }) => {
          const sessions = await repository.listSessions(ctx.userId);
          return {
            sessions: sessions.map(({ state }) => ({
              sessionId: state.sessionId,
              view: toClientView(state),
            })),
            actionLog: sessions.flatMap(({ state, actionLog }) =>
              actionLog.map((entry) => ({ sessionId: state.sessionId, entry })),
            ),
            evidence: sessions.flatMap(({ evidence }) => evidence),
            reflections: sessions.flatMap(({ reflections }) => reflections),
          };
        }),
      deleteSession: authenticatedProcedure
        .input(SessionIdSchema)
        .output(z.object({ deleted: z.literal(true) }))
        .mutation(async ({ ctx, input }) => {
          await repository.deleteSession(ctx.userId, input.sessionId);
          return { deleted: true as const };
        }),
      deleteAccount: authenticatedProcedure
        .output(z.object({ deleted: z.literal(true) }))
        .mutation(async ({ ctx }) => {
          await repository.deleteAccount(ctx.userId);
          return { deleted: true as const };
        }),
    }),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
