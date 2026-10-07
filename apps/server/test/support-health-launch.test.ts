import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { expect, it, vi } from "vitest";
import { supportRoutes } from "../src/routes/support.js";
import { launchRoutes } from "../src/routes/launch.js";
import { healthRoutes } from "../src/routes/health.js";
import { InMemorySupportStore } from "../src/repository/support.js";

it("persists validated private reports, dedupes retries, isolates owners and limits anonymous owners", async () => {
  const store = new InMemorySupportStore();
  const server = Fastify();
  await server.register(rateLimit, { max: 120 });
  await server.register(supportRoutes, {
    store,
    resolveOwner: async (req) =>
      req.headers.authorization === "Bearer owner"
        ? "owner"
        : req.headers.authorization === "Bearer other"
          ? "other"
          : "",
  });
  const payload = {
    createRequestId: randomUUID(),
    category: "Workplace",
    description: "Cannot open ticket",
  };
  let address = 1;
  const post = (body: unknown, token = "owner") =>
    server.inject({
      method: "POST",
      url: "/api/support-reports",
      remoteAddress: `192.0.2.${String(address++)}`,
      headers: { authorization: `Bearer ${token}` },
      payload: body as never,
    });
  expect((await post(payload, "invalid")).statusCode).toBe(401);
  const first = await post(payload);
  expect(first.json<{ saved: boolean }>().saved).toBe(true);
  expect((await post(payload)).json()).toEqual(first.json());
  expect(
    (await post(payload, "other")).json<{ reportId: string }>().reportId,
  ).not.toBe(first.json<{ reportId: string }>().reportId);
  expect((await post({ ...payload, sessionId: randomUUID() })).statusCode).toBe(
    400,
  );
  expect(
    (await post({ ...payload, description: "x".repeat(5001) })).statusCode,
  ).toBe(400);
  expect(
    (await post({ ...payload, technicalDetails: { userAgent: "secret" } }))
      .statusCode,
  ).toBe(400);
  for (let index = 0; index < 4; index++)
    expect(
      (await post({ ...payload, createRequestId: randomUUID() })).statusCode,
    ).toBe(200);
  expect(
    (await post({ ...payload, createRequestId: randomUUID() })).statusCode,
  ).toBe(429);
  await server.close();
});
it("safe persistence failures and first-party payload allowlist", async () => {
  const server = Fastify();
  await server.register(supportRoutes, {
    store: {
      save: async () => {
        throw new Error("secret connection string");
      },
    },
    resolveOwner: async () => "owner",
  });
  const save = vi.fn(async () => {});
  await server.register(launchRoutes, { save, resolveOwner: async () => "" });
  const report = await server.inject({
    method: "POST",
    url: "/api/support-reports",
    payload: {
      createRequestId: randomUUID(),
      category: "Other",
      description: "Help",
    },
  });
  expect(report.statusCode).toBe(503);
  expect(report.json()).toEqual({ error: "unavailable" });
  expect(
    (
      await server.inject({
        method: "POST",
        url: "/api/launch-events",
        payload: { eventId: randomUUID(), name: "landing", email: "private" },
      })
    ).statusCode,
  ).toBe(400);
  expect(
    (
      await server.inject({
        method: "POST",
        url: "/api/launch-events",
        payload: { eventId: randomUUID(), name: "landing" },
      })
    ).statusCode,
  ).toBe(200);
  expect(
    (
      await server.inject({
        method: "POST",
        url: "/api/launch-events",
        payload: { eventId: randomUUID(), name: "shift_completed" },
      })
    ).statusCode,
  ).toBe(401);
  expect(save).toHaveBeenCalledTimes(1);
  await server.close();
});
it("process alive remains separate from database readiness", async () => {
  const server = Fastify();
  let ready = false;
  await server.register(healthRoutes, {
    checkReady: async () => {
      if (!ready) throw new Error("DB offline");
    },
  });
  expect((await server.inject("/health")).statusCode).toBe(200);
  expect((await server.inject("/ready")).statusCode).toBe(503);
  ready = true;
  expect((await server.inject("/ready")).json()).toEqual({ status: "ready" });
  await server.close();
});
