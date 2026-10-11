import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import { InMemoryRepository } from "../src/repository/in-memory.js";
import { createAppRouter } from "../src/trpc/router.js";

it("owner write limits allow exact retries, preserve distinct reflection content and expire", async () => {
  const clock = vi.spyOn(Date, "now").mockReturnValue(0);
  try {
    const repository = new InMemoryRepository();
    const caller = createAppRouter(repository).createCaller({
      userId: "owner",
    });
    const other = createAppRouter(repository).createCaller({ userId: "other" });
    const input = { seed: 7, sessionKind: "assessed" as const, pacingMode: "standard" as const, createRequestId: randomUUID() };
    const first = await caller.session.create(input);
    const reflection = {
      sessionId: first.sessionId,
      eventId: "shift",
      enjoyment: "energizing" as const,
      confidence: "comfortable" as const,
      note: "Useful work",
    };
    const retries = await Promise.all(
      Array.from({ length: 8 }, () => caller.reflection.submit(reflection)),
    );
    expect(new Set(retries.map((row) => row.id)).size).toBe(1);
    expect(
      (await repository.getSession("owner", first.sessionId)).reflections,
    ).toHaveLength(1);
    await expect(other.reflection.submit(reflection)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    for (let index = 1; index < 60; index++)
      await caller.reflection.submit({ ...reflection, note: `Note ${String(index)}` });
    await expect(
      caller.reflection.submit({ ...reflection, note: "Over quota" }),
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(await caller.reflection.submit(reflection)).toEqual(retries[0]);
    for (let index = 1; index < 10; index++)
      await caller.session.create({ ...input, createRequestId: randomUUID() });
    expect(await caller.session.create(input)).toEqual(first);
    await repository.deleteSession("owner", first.sessionId);
    await expect(
      caller.session.create({ ...input, createRequestId: randomUUID() }),
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    await expect(other.session.create(input)).resolves.toHaveProperty(
      "sessionId",
    );
    clock.mockReturnValue(3_600_000);
    await expect(
      caller.session.create({ ...input, createRequestId: randomUUID() }),
    ).resolves.toHaveProperty("sessionId");
  } finally {
    clock.mockRestore();
  }
});
