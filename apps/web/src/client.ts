import { createTRPCUntypedClient, httpBatchLink } from "@trpc/client";
import {
  ClientViewSchema,
  DebriefSchema,
  type ClientView,
  type Debrief,
  type SimulationActionId,
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
  ): Promise<ClientView>;
  getDebrief(sessionId: string): Promise<Debrief>;
}

const SessionResultSchema = z.object({
  sessionId: z.string(),
  view: ClientViewSchema,
});
const TurnResultSchema = z.object({ view: ClientViewSchema });

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
  ): Promise<ClientView> {
    return TurnResultSchema.parse(
      await this.#client.mutation("simulation.performAction", {
        sessionId,
        actionId,
        eventId,
        ...(freeText === undefined ? {} : { freeText }),
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
