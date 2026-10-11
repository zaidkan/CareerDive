import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { expect, it } from "vitest";
import { allowedWebOrigins, trustOneProxyHop } from "../src/config.js";

it("allows production bearer preflight only for the exact web origin and trusts one forwarded hop", async () => {
  const server = Fastify({ trustProxy: trustOneProxyHop });
  const origin = "https://careerdive-web.example";
  await server.register(cors, { origin: allowedWebOrigins(true, origin) });
  server.post("/api/probe", async (req) => ({ ip: req.ip }));
  try {
    const preflight = (webOrigin: string) =>
      server.inject({
        method: "OPTIONS",
        url: "/api/probe",
        headers: {
          origin: webOrigin,
          "access-control-request-method": "POST",
          "access-control-request-headers": "authorization,content-type",
        },
      });
    const allowed = await preflight(origin);
    expect(allowed.statusCode).toBe(204);
    expect(allowed.headers["access-control-allow-origin"]).toBe(origin);
    expect(allowed.headers["access-control-allow-headers"]).toBe(
      "authorization,content-type",
    );
    for (const rejected of [
      "http://localhost:5173",
      "https://careerdive-web.example.evil",
      "https://www.careerdive-web.example",
    ])
      expect(
        (await preflight(rejected)).headers["access-control-allow-origin"],
      ).toBeUndefined();
    const response = await server.inject({
      method: "POST",
      url: "/api/probe",
      remoteAddress: "192.0.2.10",
      headers: { origin, "x-forwarded-for": "203.0.113.99, 198.51.100.50" },
    });
    expect(response.json()).toEqual({ ip: "198.51.100.50" });
    expect(response.headers["access-control-allow-origin"]).toBe(origin);
  } finally {
    await server.close();
  }
});

it("documents the current shared-IP quota even with different bearer identities", async () => {
  const server = Fastify();
  await server.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  server.get("/probe", async () => ({ ok: true }));
  try {
    for (let index = 0; index < 120; index++) {
      const response = await server.inject({
        url: "/probe",
        remoteAddress: "192.0.2.1",
        headers: { authorization: `Bearer owner-${String(index % 20)}` },
      });
      expect(response.statusCode).toBe(200);
    }
    expect(
      (await server.inject({ url: "/probe", remoteAddress: "192.0.2.1" }))
        .statusCode,
    ).toBe(429);
    expect(
      (await server.inject({ url: "/probe", remoteAddress: "192.0.2.2" }))
        .statusCode,
    ).toBe(200);
  } finally {
    await server.close();
  }
});
