import type { FastifyPluginAsync } from "fastify";
import { CareerRequestSchema, RequesterKeySchema } from "../domain/career-requests.js";
import type { CareerRequestStore } from "../repository/career-requests.js";

export const careerRequestRoutes: FastifyPluginAsync<{ store: CareerRequestStore }> = async (
  server,
  { store },
) => {
  // These routes carry a bearer-like random key; suppress default request logs
  // (including remoteAddress) as well as redacting the header at server level.
  server.post("/api/career-requests/state", { logLevel: "silent", config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (request, reply) => {
    const key = RequesterKeySchema.safeParse(request.headers["x-requester-key"]);
    if (!key.success) return reply.code(400).send({ error: "invalid_requester_key" });
    if (request.body !== undefined &&
      (typeof request.body !== "object" || request.body === null || Array.isArray(request.body) ||
        Object.keys(request.body).length !== 0)) {
      return reply.code(400).send({ error: "invalid_body" });
    }
    try {
      return { requestedCareerIds: await store.getState(key.data) };
    } catch {
      return reply.code(503).send({ error: "unavailable" });
    }
  });

  server.post("/api/career-requests", { logLevel: "silent", config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (request, reply) => {
    const key = RequesterKeySchema.safeParse(request.headers["x-requester-key"]);
    if (!key.success) return reply.code(400).send({ error: "invalid_requester_key" });
    const body = CareerRequestSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_body" });
    try {
      await store.setRequested(key.data, body.data.careerId, body.data.requested);
      return { ...body.data, saved: true };
    } catch {
      return reply.code(503).send({ error: "unavailable" });
    }
  });
};
