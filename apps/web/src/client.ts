import { createTRPCUntypedClient, httpBatchLink } from "@trpc/client";
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
  type WorkplaceFeedbackCode,
  type WorkplaceInteraction,
} from "@sim/schemas";
import { z } from "zod";

export interface SimulationClient {
  createSession(input: {
    seed: number;
    sessionKind: "tutorial" | "assessed";
    pacingMode:
      | "standard"
      | "extended"
      | "pause_compatible"
      | "no_hard_timer"
      | "practice";
  }): Promise<{ sessionId: string; view: ClientView }>;
  performAction(
    sessionId: string,
    actionId: SimulationActionId,
    eventId: string,
    freeText?: string,
    source?: { sourceRecordId: string; sourceArtifactId: string },
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

export class HttpSimulationClient implements SimulationClient {
  readonly #client: ReturnType<typeof createTRPCUntypedClient>;

  constructor(baseUrl: string) {
    this.#client = createTRPCUntypedClient({
      links: [
        httpBatchLink({
          url: `${baseUrl}/trpc`,
          headers: { "x-user-id": "local-user" },
        }),
      ],
    });
  }

  async createSession(
    input: Parameters<SimulationClient["createSession"]>[0],
  ): Promise<{ sessionId: string; view: ClientView }> {
    return SessionResultSchema.parse(
      await this.#client.mutation("session.create", input),
    );
  }

  async performAction(
    sessionId: string,
    actionId: SimulationActionId,
    eventId: string,
    freeText?: string,
    source?: { sourceRecordId: string; sourceArtifactId: string },
  ): Promise<ClientView> {
    return TurnResultSchema.parse(
      await this.#client.mutation("simulation.performAction", {
        sessionId,
        actionId,
        eventId,
        ...(freeText === undefined ? {} : { freeText }),
        ...source,
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

  async getDebrief(sessionId: string): Promise<Debrief> {
    return DebriefSchema.parse(
      await this.#client.query("debrief.get", { sessionId }),
    );
  }
}

const configuredServerUrl: unknown = import.meta.env.VITE_SERVER_URL;
export const defaultClient = new HttpSimulationClient(
  typeof configuredServerUrl === "string"
    ? configuredServerUrl
    : "http://localhost:3001",
);
