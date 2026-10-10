import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { trustOneProxyHop } from "../src/config.js";

describe("Render one-hop proxy trust", () => {
  it("uses only the client immediately before ingress and ignores additional forwarded hops", async () => {
    const app = Fastify({ trustProxy: trustOneProxyHop });
    app.get("/", (request) => ({
      ip: request.ip,
      ips: request.ips,
      host: request.host,
      protocol: request.protocol,
    }));
    try {
      const response = await app.inject({
        url: "/",
        remoteAddress: "10.0.0.2",
        headers: {
          "x-forwarded-for": "192.0.2.99, 203.0.113.7",
          "x-forwarded-host": "careerdive.example.com",
          "x-forwarded-proto": "https",
        },
      });
      expect(response.json()).toEqual({
        ip: "203.0.113.7",
        ips: ["10.0.0.2", "203.0.113.7"],
        host: "careerdive.example.com",
        protocol: "https",
      });
      expect(trustOneProxyHop("10.0.0.2", 0)).toBe(true);
      expect(trustOneProxyHop("203.0.113.7", 1)).toBe(false);
      expect(trustOneProxyHop("192.0.2.99", 2)).toBe(false);
    } finally {
      await app.close();
    }
  });
  it("keeps development forwarding untrusted", async () => {
    const app = Fastify({ trustProxy: false });
    app.get("/", (request) => ({
      ip: request.ip,
      host: request.host,
      protocol: request.protocol,
    }));
    try {
      const response = await app.inject({
        url: "/",
        remoteAddress: "127.0.0.1",
        headers: {
          host: "localhost",
          "x-forwarded-for": "203.0.113.7",
          "x-forwarded-host": "spoof.example",
          "x-forwarded-proto": "https",
        },
      });
      expect(response.json()).toEqual({
        ip: "127.0.0.1",
        host: "localhost",
        protocol: "http",
      });
    } finally {
      await app.close();
    }
  });
});
