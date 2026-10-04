import Fastify from "fastify";
import { createOwnerResolver } from "../src/auth.js";
import { expect, it, vi } from "vitest";
import { careerRequestRoutes } from "../src/routes/career-requests.js";
import { InMemoryCareerRequestStore } from "../src/repository/career-requests.js";
import { randomUUID } from "node:crypto";
it("production requires verified bearer; forged IDs and failed auth never fall back", async () => {
  const id = randomUUID();
  const getUser = vi.fn(async (token: string) =>
    token === "valid"
      ? { data: { user: { id } }, error: null }
      : { data: { user: null }, error: new Error("bad token") },
  );
  const resolve = createOwnerResolver(true, { auth: { getUser } } as never);
  const server = Fastify();
  const store = new InMemoryCareerRequestStore();
  await server.register(careerRequestRoutes, { store, resolveOwner: resolve });
  server.get("/owner", async (req) => ({ owner: await resolve(req) }));
  expect(
    (
      await server.inject({
        url: "/owner",
        headers: { "x-user-id": "local-user" },
      })
    ).json(),
  ).toEqual({ owner: "" });
  expect(
    (
      await server.inject({
        url: "/owner",
        headers: { authorization: "Bearer bad", "x-user-id": id },
      })
    ).json(),
  ).toEqual({ owner: "" });
  expect(
    (
      await server.inject({
        url: "/owner",
        headers: { authorization: "Bearer valid" },
      })
    ).json(),
  ).toEqual({ owner: id });
  const spoofed = randomUUID();
  const requested = await server.inject({
    method: "POST",
    url: "/api/career-requests",
    headers: { authorization: "Bearer valid", "x-requester-key": spoofed },
    payload: { careerId: "electrician", requested: true },
  });
  expect(requested.statusCode).toBe(200);
  expect(await store.getState(id)).toEqual(["electrician"]);
  expect(await store.getState(spoofed)).toEqual([]);
  expect(
    (
      await server.inject({
        method: "POST",
        url: "/api/career-requests/state",
        headers: { "x-requester-key": id },
        payload: {},
      })
    ).statusCode,
  ).toBe(401);
  await server.close();
});
