import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { fastifyTRPCPlugin, type CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { expect, it } from "vitest";
import { createOwnerResolver } from "../src/auth.js";
import { createAppRouter, InMemoryRepository } from "../src/index.js";

it("isolates anonymous owners through production HTTP auth, including retry and resume", async () => {
  const ownerA = randomUUID();
  const ownerB = randomUUID();
  const owners: Record<string, string> = {
    "visitor-a": ownerA,
    "refreshed-a": ownerA,
    "visitor-b": ownerB,
  };
  const repository = new InMemoryRepository();
  const router = createAppRouter(repository, { requireCreateRequestId: true });
  const resolveOwner = createOwnerResolver(true, {
    auth: {
      getUser: async (token: string) => ({
        data: { user: { id: owners[token], is_anonymous: true } },
        error: owners[token] ? null : new Error("Invalid token"),
      }),
    },
  } as never);
  const server = Fastify();
  await server.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router,
      createContext: async ({ req }: CreateFastifyContextOptions) => ({ userId: await resolveOwner(req) }),
    },
  });
  const post = (token: string, procedure: string, input: unknown) =>
    server.inject({
      method: "POST",
      url: `/trpc/${procedure}`,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify(input),
    });
  const get = (token: string, sessionId: string) =>
    server.inject({
      url: `/trpc/session.get?input=${encodeURIComponent(JSON.stringify({ sessionId }))}`,
      headers: { authorization: `Bearer ${token}` },
    });
  try {
    const input = {
      createRequestId: randomUUID(),
      seed: 7,
      sessionKind: "assessed",
      pacingMode: "standard",
    };
    const [a, b] = await Promise.all([
      post("visitor-a", "session.create", input),
      post("visitor-b", "session.create", input),
    ]);
    expect(a.statusCode).toBe(200);
    expect(b.statusCode).toBe(200);
    const sessionA = a.json<{ result: { data: { sessionId: string } } }>().result.data.sessionId;
    const sessionB = b.json<{ result: { data: { sessionId: string } } }>().result.data.sessionId;
    expect(sessionA).not.toBe(sessionB);
    const retry = await post("visitor-a", "session.create", input);
    expect(retry.statusCode).toBe(200);
    expect(retry.json<{ result: { data: { sessionId: string } } }>().result.data.sessionId).toBe(sessionA);

    const acted = await post("visitor-a", "simulation.performAction", {
      sessionId: sessionA, actionId: "read_handoff", eventId: "handoff-1",
    });
    expect(acted.statusCode).toBe(200);
    expect((await repository.getSession(ownerA, sessionA)).actionLog).toHaveLength(1);
    expect((await repository.getSession(ownerB, sessionB)).actionLog).toHaveLength(0);
    expect((await get("refreshed-a", sessionA)).statusCode).toBe(200);
    expect((await get("visitor-b", sessionA)).statusCode).toBe(404);
    expect((await post("visitor-b", "simulation.performWorkplaceInteraction", {
      sessionId: sessionA, interaction: { type: "open_fridge" },
    })).statusCode).toBe(404);
    expect((await post("visitor-b", "reflection.submit", {
      sessionId: sessionA, eventId: "handoff-1", enjoyment: "neutral", confidence: "uncertain",
    })).statusCode).toBe(404);
    expect((await post("visitor-b", "privacy.deleteSession", { sessionId: sessionA })).statusCode).toBe(404);
    expect((await repository.getSession(ownerA, sessionA)).actionLog).toHaveLength(1);

    expect((await server.inject({
      method: "POST", url: "/trpc/session.create",
      headers: { "x-user-id": ownerA }, payload: input,
    })).statusCode).toBe(401);
    expect((await post("invalid", "session.create", input)).statusCode).toBe(401);
    expect((await post("visitor-a", "simulation.submitFreeText", {
      sessionId: sessionA, text: "What should I do?",
    })).statusCode).toBe(404);
  } finally {
    await server.close();
  }
});
