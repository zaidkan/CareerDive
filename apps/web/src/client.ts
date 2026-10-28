import { apiOrigin, authHeaders } from "./transport.js";
import {
  createTRPCUntypedClient,
  httpLink,
  TRPCClientError,
} from "@trpc/client";
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

/** Preserve only handled status validation guidance; unexpected errors stay generic. */
export function actionFailureMessage(
  cause: unknown,
  actionId: SimulationActionId,
): string {
  if (actionId === "send_status_update" && cause instanceof TRPCClientError) {
    const data: unknown = cause.data;
    if (
      data &&
      typeof data === "object" &&
      "code" in data &&
      data.code === "BAD_REQUEST"
    )
      return cause.message;
  }
  return "That action could not be completed.";
}

export const PENDING_SESSION_KEY = "career-expo-start-pending";

export interface SimulationClient {
  createSession(
    input: {
      createRequestId?: string;
      seed: number;
      sessionKind: "assessed";
      pacingMode: "standard" | "extended" | "pause_compatible" | "no_hard_timer";
    },
    options?: { signal?: AbortSignal },
  ): Promise<{ sessionId: string; view: ClientView }>;
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

/** Poll only the safe readiness read while a sleeping service starts. */
async function waitForReady(baseUrl: string, signal?: AbortSignal): Promise<void> {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    signal?.throwIfAborted();
    try {
      const timeout = AbortSignal.timeout(Math.max(1, Math.min(10_000, deadline - Date.now())));
      const response = await fetch(`${baseUrl}/ready`, {
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
      if (response.ok) {
        const body: unknown = await response.json();
        if (
          body && typeof body === "object" &&
          "status" in body && body.status === "ready"
        ) {
          signal?.throwIfAborted();
          return;
        }
      }
    } catch {
      // A proxy loading page, temporary 503, or timed-out GET is safe to retry.
    }
    signal?.throwIfAborted();
    const remaining = deadline - Date.now();
    if (remaining > 0)
      await new Promise((resolve) => setTimeout(resolve, Math.min(2000, remaining)));
  }
  throw new StartupFailure(true, "service-startup-timeout");
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
    options?: { signal?: AbortSignal },
  ): Promise<{ sessionId: string; view: ClientView }> {
    const pending = this === defaultClient &&
      readTabValue<boolean>(PENDING_SESSION_KEY, false);
    if (input.createRequestId) {
      try {
        const key = `career-expo-create:${input.createRequestId}`;
        const serialized = JSON.stringify(input);
        // The API deduplicates this exact owner/request. Preserve legacy unknown
        // starts, but allow a lost response to recover the original shift.
        if (pending && window.sessionStorage.getItem(key) !== serialized)
          throw new StartupFailure(false, "creation-unconfirmed");
        window.sessionStorage.setItem(key, serialized);
        if (window.sessionStorage.getItem(key) !== serialized)
          throw new Error("Storage unavailable");
      } catch (cause) {
        if (cause instanceof StartupFailure) throw cause;
        throw new StartupFailure(false, "storage-unavailable");
      }
    } else if (pending) {
      throw new StartupFailure(false, "creation-unconfirmed");
    }
    await waitForReady(this.#baseUrl, options?.signal);
    options?.signal?.throwIfAborted();
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
