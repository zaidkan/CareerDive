import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import type { ActionLogEntry, WorldState } from "@sim/schemas";
import { InMemoryRepository } from "../src/repository/in-memory.js";
import { createAppRouter } from "../src/trpc/router.js";

// Browser fixture starts at the final decision. Completion and debrief still
// run through the real tRPC router and repository.
class BrowserReviewRepository extends InMemoryRepository {
  override async createSession(ownerId: string, state: WorldState): Promise<void> {
    state.events.forEach((event) => { event.status = "resolved"; });
    await super.createSession(ownerId, state);
    const session = await super.getSession(ownerId, state.sessionId);
    session.state.flags.b1_choice = "escalate-with-comparisons";
    session.state.flags.b2_choice = "route-to-owner";
    session.state.flags.b3_choice = "complete";
    const actions: ActionLogEntry["interaction"][] = [
      { type: "workplace_interaction", interaction: { type: "open_artifact", artifactId: "device-inventory-1" } },
      { type: "workplace_interaction", interaction: { type: "open_artifact", artifactId: "vpn-context-1" } },
      { type: "workplace_interaction", interaction: { type: "open_artifact", artifactId: "login-session-timeline" } },
      { type: "action", action: { id: "document_ticket", eventId: "suspicious-login-1", actorId: "user", decisionOptionId: "escalate-with-comparisons" } },
      { type: "notification_response", response: { notificationId: "routine-scanner-arrived", response: "snooze" } },
      { type: "workplace_interaction", interaction: { type: "open_artifact", artifactId: "scanner-run-log" } },
      { type: "workplace_interaction", interaction: { type: "open_artifact", artifactId: "scanner-window" } },
      { type: "action", action: { id: "dismiss_alert", eventId: "routine-alert-1", actorId: "user" } },
      { type: "action", action: { id: "route_access_request", eventId: "access-request-1", actorId: "user" } },
      { type: "action", action: { id: "resolve_login_help", eventId: "login-help-1", actorId: "user" } },
      { type: "action", action: { id: "submit_shift_handoff", eventId: "shift-handoff-1", actorId: "user" } },
    ];
    session.actionLog = actions.map((interaction, index) => ({ sequence: index + 1, interaction }));
    await super.saveSession(session);
  }
}

const server = Fastify();
const repository = process.env.ASSESSED_BROWSER_FIXTURE === "1"
  ? new InMemoryRepository()
  : new BrowserReviewRepository();
await server.register(cors, { origin: true });
await server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: createAppRouter(repository),
    createContext: () => ({ userId: "local-user" }),
  },
});
server.get("/health", () => ({ status: "ok" }));
await server.listen({ host: "127.0.0.1", port: Number(process.env.PORT ?? 3001) });
