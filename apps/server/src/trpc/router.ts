import { randomUUID } from "node:crypto";
import type { LlmProvider } from "@sim/ai";
import {
  applyAction,
  applyTaskAttempt,
  createInitialWorldState,
  respondToNotification,
  toClientView,
} from "@sim/core";
import { buildDebrief, evidenceFromAction } from "@sim/evidence";
import { deterministicInputSafety, validateUserFacingText } from "@sim/safety";
import {
  ClientViewSchema,
  DebriefSchema,
  DomainEffectSchema,
  EvidenceSignalSchema,
  NotificationResponseSchema,
  ReflectionSchema,
  SimulationActionIdSchema,
  TaskAttemptSchema,
  type CareerPack,
} from "@sim/schemas";
import { z } from "zod";
import { generateSafeNpcReply } from "../ai/npc-dialogue.js";
import { getDefaultCareerPack } from "../career-pack.js";
import { EvidenceNotFoundError } from "../domain/errors.js";
import { toPublicGrant } from "../repository/in-memory.js";
import type { SimulationRepository } from "../repository/types.js";
import { authenticatedProcedure, t } from "./core.js";
import {
  SessionIdSchema,
  SessionInputSchema,
  SessionResultSchema,
  SharingCategorySchema,
  SharingGrantSchema,
} from "./schemas.js";

export function createAppRouter(
  repository: SimulationRepository,
  options: {
    llmProvider?: LlmProvider;
    aiBudgetUsd?: number;
    careerPack?: CareerPack;
  } = {},
) {
  const careerPack = options.careerPack ?? getDefaultCareerPack();
  return t.router({
    session: t.router({
      create: authenticatedProcedure
        .input(SessionInputSchema)
        .output(SessionResultSchema)
        .mutation(async ({ ctx, input }) => {
          const sessionId = randomUUID();
          const state = createInitialWorldState(
            sessionId,
            input.seed,
            input,
            careerPack,
          );
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
            freeText: z.string().max(2_000).optional(),
          }),
        )
        .output(
          z.object({
            view: ClientViewSchema,
            sequence: z.number().int().positive(),
            effects: z.array(DomainEffectSchema),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const session = await repository.getSession(
            ctx.userId,
            input.sessionId,
          );
          const action = {
            id: input.actionId,
            eventId: input.eventId,
            actorId: "user" as const,
            ...(input.freeText === undefined
              ? {}
              : { freeText: input.freeText }),
          };
          const turn = applyAction(session.state, action);
          const sequence = session.actionLog.length + 1;
          session.state = turn.state;
          session.actionLog.push({
            sequence,
            interaction: { type: "action", action },
          });
          if (session.state.sessionKind === "assessed") {
            session.evidence.push(
              evidenceFromAction({
                state: session.state,
                actionId: input.actionId,
                eventId: input.eventId,
              }),
            );
          }
          await repository.saveSession(session);
          return {
            view: toClientView(session.state),
            sequence,
            effects: turn.effects,
          };
        }),
      submitTaskAttempt: authenticatedProcedure
        .input(
          SessionIdSchema.extend({
            taskId: TaskAttemptSchema.shape.taskId,
            eventId: TaskAttemptSchema.shape.eventId,
            selectedOptionIds: TaskAttemptSchema.shape.selectedOptionIds,
          }),
        )
        .output(
          z.object({
            view: ClientViewSchema,
            sequence: z.number().int().positive(),
            effects: z.array(DomainEffectSchema),
            accepted: z.boolean(),
            completed: z.boolean(),
            feedback: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const session = await repository.getSession(
            ctx.userId,
            input.sessionId,
          );
          const attempt = {
            taskId: input.taskId,
            eventId: input.eventId,
            selectedOptionIds: input.selectedOptionIds,
          };
          const task = session.state.rules.tasks[input.taskId];
          const turn = applyTaskAttempt(session.state, attempt);
          const sequence = session.actionLog.length + 1;
          session.state = turn.state;
          session.actionLog.push({
            sequence,
            interaction: { type: "task_attempt", attempt },
          });
          if (
            turn.completed &&
            task &&
            session.state.sessionKind === "assessed"
          ) {
            session.evidence.push(
              evidenceFromAction({
                state: session.state,
                actionId: task.actionId,
                eventId: input.eventId,
              }),
            );
          }
          await repository.saveSession(session);
          return {
            view: toClientView(session.state),
            sequence,
            effects: turn.effects,
            accepted: turn.accepted,
            completed: turn.completed,
            feedback: turn.feedback,
          };
        }),
      respondToNotification: authenticatedProcedure
        .input(
          SessionIdSchema.extend({
            notificationId: NotificationResponseSchema.shape.notificationId,
            response: NotificationResponseSchema.shape.response,
          }),
        )
        .output(
          z.object({
            view: ClientViewSchema,
            sequence: z.number().int().positive(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const session = await repository.getSession(
            ctx.userId,
            input.sessionId,
          );
          const response = {
            notificationId: input.notificationId,
            response: input.response,
          };
          session.state = respondToNotification(session.state, response);
          const sequence = session.actionLog.length + 1;
          session.actionLog.push({
            sequence,
            interaction: { type: "notification_response", response },
          });
          await repository.saveSession(session);
          return { view: toClientView(session.state), sequence };
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
              budgetUsd:
                options.aiBudgetUsd ?? careerPack.scenario.maxAiCostUsd,
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
            careerTitle: careerPack.career.title,
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
            const signal = session.evidence.find(
              ({ id }) => id === input.evidenceId,
            );
            if (signal) {
              signal.annotation = input.annotation;
              await repository.saveSession(session);
              return signal;
            }
          }
          throw new EvidenceNotFoundError();
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
            categories: z.array(SharingCategorySchema).min(1),
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
            sessions: z.array(
              z.object({ sessionId: z.string(), view: ClientViewSchema }),
            ),
            actionLog: z.array(
              z.object({ sessionId: z.string(), entry: z.unknown() }),
            ),
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
