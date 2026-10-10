import Fastify from "fastify";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { createInitialWorldState } from "@sim/core";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { expect, it } from "vitest";
import { createAppRouter, InMemoryRepository } from "../src/index.js";

it("returns actionable HTTP 400 for an unread status source, saves nothing, and succeeds after opening it", async () => {
  const repository = new InMemoryRepository();
  const state = createInitialWorldState(
    "status-http",
    7,
    {},
    loadDefaultCybersecurityPack(),
  );
  const status = state.events.find((e) => e.id === "status-check-1");
  if (!status) throw new Error("Missing status fixture");
  status.status = "active";
  state.simClock = 65;
  await repository.createSession("user-1", state);
  const router = createAppRouter(repository);
  const app = Fastify();
  await app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: { router, createContext: () => ({ userId: "user-1" }) },
  });
  const payload = {
    sessionId: state.sessionId,
    actionId: "send_status_update",
    eventId: "status-check-1",
    ticketPayload: {
      ticketId: "ticket-status-check-1",
      statusOptionIds: ["confirmed-sequence"],
    },
  };
  try {
    const response = await app.inject({
      method: "POST",
      url: "/trpc/simulation.performAction",
      payload,
    });
    expect(response.statusCode).toBe(400);
    const error = response.json<{
      error: { message: string; data: { code: string } };
    }>().error;
    expect(error.data.code).toBe("BAD_REQUEST");
    expect(error.message).toMatch(
      /Open .*Unfamiliar successful login.*before sending/,
    );
    const unchanged = await repository.getSession("user-1", state.sessionId);
    expect(unchanged.state).toEqual(state);
    expect(unchanged.actionLog).toHaveLength(0);
    const caller = router.createCaller({ userId: "user-1" });
    await caller.simulation.performWorkplaceInteraction({
      sessionId: state.sessionId,
      interaction: {
        type: "open_artifact",
        artifactId: "suspicious-login-alert",
      },
    });
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/trpc/simulation.performAction",
          payload,
        })
      ).statusCode,
    ).toBe(200);
    const saved = await repository.getSession("user-1", state.sessionId);
    expect(saved.actionLog).toHaveLength(2);
    expect(
      saved.state.events.find((e) => e.id === "status-check-1")?.status,
    ).toBe("resolved");
  } finally {
    await app.close();
  }
});
