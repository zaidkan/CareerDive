import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { InMemoryRepository } from "../src/repository/in-memory.js";
import { createAppRouter } from "../src/trpc/router.js";

describe("durable start contract", () => {
  it("returns one canonical session for concurrent duplicate starts and isolates owners", async () => {
    const repository = new InMemoryRepository();
    const caller = createAppRouter(repository).createCaller({
      userId: "owner",
    });
    const input = {
      seed: 24,
      sessionKind: "assessed" as const,
      pacingMode: "standard" as const,
      createRequestId: randomUUID(),
    };
    const results = await Promise.all(
      Array.from({ length: 8 }, () => caller.session.create(input)),
    );
    expect(new Set(results.map((result) => result.sessionId)).size).toBe(1);
    expect(await repository.listSessions("owner")).toHaveLength(1);
    const other = await createAppRouter(repository)
      .createCaller({ userId: "other" })
      .session.create(input);
    expect(other.sessionId).not.toBe(results[0]?.sessionId);
    await expect(
      caller.session.create({ ...input, seed: 25 }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      createAppRouter(repository)
        .createCaller({ userId: "other" })
        .session.get({ sessionId: results[0]?.sessionId ?? "missing" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
