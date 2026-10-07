import { apiOrigin, authHeaders } from "./transport.js";
import { createTRPCUntypedClient, httpLink } from "@trpc/client";
import {
  ClientViewSchema,
  DebriefSchema,
  TaskAttemptOutcomeSchema,
  WorkplaceFeedbackCodeSchema,
  WorkplaceInteractionSchema,
  type ClientView,
  type Debrief,
  type NotificationResponse,
  type SimulationActionId,
  type TicketUpdatePayload,
  type QueryRecordsPayload,
  type HandoffPayload,
  type WorkplaceFeedbackCode,
  type WorkplaceInteraction,
} from "@sim/schemas";
import { z } from "zod";
import { readTabValue, writeTabValue } from "./useTabDraft.js";

export const PENDING_SESSION_KEY = "career-expo-start-pending";

export interface SimulationClient {
  createSession(input: {
    createRequestId?: string;
    seed: number;
    sessionKind: "assessed";
    pacingMode: "standard" | "extended" | "pause_compatible" | "no_hard_timer";
  }): Promise<{ sessionId: string; view: ClientView }>;
  performAction(
    sessionId: string,
    actionId: SimulationActionId,
    eventId: string,
    freeText?: string,
    source?: { sourceRecordId: string; sourceArtifactId: string },
    ticketPayload?: TicketUpdatePayload,
    decisionOptionId?: string,
    queryPayload?: QueryRecordsPayload,
    handoffPayload?: HandoffPayload,
  ): Promise<ClientView>;
  performWorkplaceInteraction(
    sessionId: string,
    interaction: WorkplaceInteraction,
  ): Promise<WorkplaceInteractionResult>;
  submitTaskAttempt(
    sessionId: string,
    taskId: string,
    eventId: string,
    selectedOptionIds: string[],
  ): Promise<{
    view: ClientView;
    accepted: boolean;
    completed: boolean;
    feedback: string;
  }>;
  respondToNotification(
    sessionId: string,
    notificationId: string,
    response: NotificationResponse["response"],
  ): Promise<ClientView>;
  getSession?(
    sessionId: string,
  ): Promise<{ sessionId: string; view: ClientView }>;
  getDebrief(sessionId: string): Promise<Debrief>;
}

const SessionResultSchema = z.object({
  sessionId: z.string(),
  view: ClientViewSchema,
});
const TurnResultSchema = z.object({ view: ClientViewSchema });
const WorkplaceInteractionResultSchema = z.object({
  view: ClientViewSchema,
  sequence: z.number().int().positive(),
  feedback: WorkplaceFeedbackCodeSchema,
});
const TaskTurnResultSchema = TaskAttemptOutcomeSchema.extend({
  view: ClientViewSchema,
});

export type WorkplaceInteractionResult = {
  view: ClientView;
  sequence: number;
  feedback: WorkplaceFeedbackCode;
};

export class StartupFailure extends Error {
  constructor(
    public readonly safeToRetry: boolean,
    public readonly category: string,
  ) {
    super(
      safeToRetry
        ? "Service unavailable before session creation."
        : "Session creation could not be confirmed.",
    );
  }
}
export class HttpSimulationClient implements SimulationClient {
  readonly #baseUrl: string;
  readonly #client: ReturnType<typeof createTRPCUntypedClient>;

  constructor(baseUrl: string) {
    this.#baseUrl = baseUrl;
    this.#client = createTRPCUntypedClient({
      links: [
        // Unbatched: Fastify 404s on comma-joined batch paths with ≥7 procedures,
        // which StrictMode + Retry clicks can produce for session.create.
        httpLink({
          url: `${baseUrl}/trpc`,
          headers: authHeaders,
        }),
      ],
    });
  }

  async createSession(
    input: Parameters<SimulationClient["createSession"]>[0],
  ): Promise<{ sessionId: string; view: ClientView }> {
    if (input.createRequestId) {
      try {
        const key = `career-expo-create:${input.createRequestId}`;
        window.sessionStorage.setItem(key, JSON.stringify(input));
        if (window.sessionStorage.getItem(key) !== JSON.stringify(input))
          throw new Error("Storage unavailable");
      } catch {
        throw new StartupFailure(false, "storage-unavailable");
      }
    }
    // The default app preserves an ambiguous start across remounts/reloads.
    if (this === defaultClient && readTabValue<boolean>(PENDING_SESSION_KEY, false)) {
      throw new StartupFailure(false, "creation-unconfirmed");
    }
    // Stable createRequestId makes unknown outcomes safe to retry.
    // Only a failed read is safe to repeat; session.create has no idempotency contract.
    try {
      const response = await fetch(`${this.#baseUrl}/ready`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error("Unavailable");
    } catch {
      throw new StartupFailure(true, "service-unavailable");
    }
    if (this === defaultClient) writeTabValue(PENDING_SESSION_KEY, true);
    try {
      return SessionResultSchema.parse(
        await this.#client.mutation("session.create", input, {
          signal: AbortSignal.timeout(8000),
        }),
      );
    } catch {
      throw new StartupFailure(
        Boolean(input.createRequestId),
        "creation-unconfirmed",
      );
    }
  }

  async performAction(
    sessionId: string,
    actionId: SimulationActionId,
    eventId: string,
    freeText?: string,
    source?: { sourceRecordId: string; sourceArtifactId: string },
    ticketPayload?: TicketUpdatePayload,
    decisionOptionId?: string,
    queryPayload?: QueryRecordsPayload,
    handoffPayload?: HandoffPayload,
  ): Promise<ClientView> {
    return TurnResultSchema.parse(
      await this.#client.mutation("simulation.performAction", {
        sessionId,
        actionId,
        eventId,
        ...(freeText === undefined ? {} : { freeText }),
        ...source,
        ...(ticketPayload ? { ticketPayload } : {}),
        ...(decisionOptionId ? { decisionOptionId } : {}),
        ...(queryPayload ? { queryPayload } : {}),
        ...(handoffPayload ? { handoffPayload } : {}),
      }),
    ).view;
  }

  async performWorkplaceInteraction(
    sessionId: string,
    interaction: WorkplaceInteraction,
  ): Promise<WorkplaceInteractionResult> {
    return WorkplaceInteractionResultSchema.parse(
      await this.#client.mutation("simulation.performWorkplaceInteraction", {
        sessionId,
        interaction: WorkplaceInteractionSchema.parse(interaction),
      }),
    );
  }

  async submitTaskAttempt(
    sessionId: string,
    taskId: string,
    eventId: string,
    selectedOptionIds: string[],
  ) {
    return TaskTurnResultSchema.parse(
      await this.#client.mutation("simulation.submitTaskAttempt", {
        sessionId,
        taskId,
        eventId,
        selectedOptionIds,
      }),
    );
  }

  async respondToNotification(
    sessionId: string,
    notificationId: string,
    response: NotificationResponse["response"],
  ): Promise<ClientView> {
    return TurnResultSchema.parse(
      await this.#client.mutation("simulation.respondToNotification", {
        sessionId,
        notificationId,
        response,
      }),
    ).view;
  }

  async getSession(sessionId: string) {
    return SessionResultSchema.parse(
      await this.#client.query("session.get", { sessionId }),
    );
  }

  async getDebrief(sessionId: string): Promise<Debrief> {
    return DebriefSchema.parse(
      await this.#client.query("debrief.get", { sessionId }),
    );
  }
}

export const defaultClient = new HttpSimulationClient(apiOrigin);
