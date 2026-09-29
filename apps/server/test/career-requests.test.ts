import { randomUUID } from "node:crypto";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { InMemoryCareerRequestStore, type CareerRequestStore } from "../src/repository/career-requests.js";
import { careerRequestRoutes } from "../src/routes/career-requests.js";

const servers: FastifyInstance[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

async function setup(store: CareerRequestStore = new InMemoryCareerRequestStore()) {
  const server = Fastify();
  servers.push(server);
  await server.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await server.register(careerRequestRoutes, { store });
  return server;
}

describe("anonymous career request API", () => {
  it("requests, dedupes, restores, and unrequests per random key", async () => {
    const server = await setup();
    const key = randomUUID();
    const other = randomUUID();
    const write = (requesterKey: string, careerId: string, requested: boolean) =>
      server.inject({ method: "POST", url: "/api/career-requests", headers: { "x-requester-key": requesterKey },
        payload: { careerId, requested } });
    const state = (requesterKey: string) =>
      server.inject({ method: "POST", url: "/api/career-requests/state", headers: { "x-requester-key": requesterKey }, payload: {} });

    expect((await state(key)).json()).toEqual({ requestedCareerIds: [] });
    expect((await write(key, "registered-nurse", false)).statusCode).toBe(200);
    expect((await state(key)).json()).toEqual({ requestedCareerIds: [] });
    const concurrent = await Promise.all(Array.from({ length: 4 }, () => write(key, "registered-nurse", true)));
    expect(concurrent.every((response) => response.statusCode === 200)).toBe(true);
    expect(concurrent[0]?.json()).toEqual({ careerId: "registered-nurse", requested: true, saved: true });
    expect((await state(key)).json()).toEqual({ requestedCareerIds: ["registered-nurse"] });
    expect((await state(other)).json()).toEqual({ requestedCareerIds: [] });
    expect((await write(key, "registered-nurse", false)).statusCode).toBe(200);
    expect((await write(key, "registered-nurse", false)).statusCode).toBe(200);
    expect((await state(key)).json()).toEqual({ requestedCareerIds: [] });
    expect((await write(key, "registered-nurse", true)).statusCode).toBe(200);
    expect((await state(key)).json()).toEqual({ requestedCareerIds: ["registered-nurse"] });
    for (const careerId of ["mechanical-engineer", "electrician", "lawyer-attorney"]) {
      expect((await write(key, careerId, true)).statusCode).toBe(200);
    }
    expect((await state(key)).json()).toEqual({ requestedCareerIds: [
      "electrician", "lawyer-attorney", "mechanical-engineer", "registered-nurse",
    ] });
  });

  it("rejects invalid keys, career IDs, payloads, and extra fields", async () => {
    const server = await setup();
    const key = randomUUID();
    for (const [headers, payload] of [
      [{}, { careerId: "registered-nurse", requested: true }],
      [{ "x-requester-key": "not-a-uuid" }, { careerId: "registered-nurse", requested: true }],
      [{ "x-requester-key": key }, { careerId: "cybersecurity-analyst", requested: true }],
      [{ "x-requester-key": key }, { careerId: "lawyer", requested: true }],
      [{ "x-requester-key": key }, { careerId: "electrician", requested: "true" }],
      [{ "x-requester-key": key }, { careerId: "electrician", requested: true, email: "x@example.com" }],
    ] as const) {
      const response = await server.inject({ method: "POST", url: "/api/career-requests", headers, payload });
      expect(response.statusCode).toBe(400);
    }
    const badState = await server.inject({ method: "POST", url: "/api/career-requests/state",
      headers: { "x-requester-key": key }, payload: { careerId: "registered-nurse" } });
    expect(badState.statusCode).toBe(400);
  });

  it("returns unavailable without claiming a failed save", async () => {
    const store: CareerRequestStore = {
      getState: async () => { throw new Error("db down"); },
      setRequested: async () => { throw new Error("db down"); },
    };
    const server = await setup(store);
    const headers = { "x-requester-key": randomUUID() };
    const state = await server.inject({ method: "POST", url: "/api/career-requests/state", headers, payload: {} });
    const write = await server.inject({ method: "POST", url: "/api/career-requests", headers,
      payload: { careerId: "electrician", requested: true } });
    expect(state.statusCode).toBe(503);
    expect(write.statusCode).toBe(503);
    expect(write.json()).toEqual({ error: "unavailable" });
  });

  it("limits repeated requests by IP without storing IP in request rows", async () => {
    const server = await setup();
    const headers = { "x-requester-key": randomUUID() };
    const responses = [];
    for (let index = 0; index < 31; index += 1) {
      responses.push(await server.inject({ method: "POST", url: "/api/career-requests", headers,
        payload: { careerId: "lawyer-attorney", requested: true } }));
    }
    expect(responses.filter((response) => response.statusCode === 200)).toHaveLength(30);
    expect(responses.filter((response) => response.statusCode === 429)).toHaveLength(1);
  });
});
