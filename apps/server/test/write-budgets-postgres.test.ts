import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import postgres from "postgres";
import { expect, it } from "vitest";
import { PostgresRepository } from "../src/db/repository.js";
import { poolerCompatibleOptions } from "../src/db/connection.js";
import { createAppRouter } from "../src/trpc/router.js";

it.skipIf(!process.env.TEST_DATABASE_URL)(
  "durable budgets serialize replicas, free retries, isolate owners and preserve gameplay revisions",
  async () => {
    const sql = postgres(process.env.TEST_DATABASE_URL ?? "", {
      ...poolerCompatibleOptions,
      max: 4,
    });
    const owner = randomUUID();
    const other = randomUUID();
    try {
      await sql`INSERT INTO auth.users (id) VALUES (${owner}::uuid), (${other}::uuid)`;
      // Separate repository/router instances stand in for independent API replicas.
      const repository = new PostgresRepository(sql);
      const caller = createAppRouter(repository).createCaller({
        userId: owner,
      });
      const replica = createAppRouter(new PostgresRepository(sql)).createCaller(
        { userId: owner },
      );
      const foreign = createAppRouter(repository).createCaller({
        userId: other,
      });
      const input = { seed: 7, sessionKind: "assessed" as const, pacingMode: "standard" as const, createRequestId: randomUUID() };
      const starts = await Promise.all(
        Array.from({ length: 8 }, (_, index) =>
          (index % 2 ? caller : replica).session.create(input),
        ),
      );
      expect(new Set(starts.map((row) => row.sessionId)).size).toBe(1);
      const sessionId = starts[0]?.sessionId ?? "missing";
      const before = await repository.getSession(owner, sessionId);
      const reflection = {
        sessionId,
        eventId: "shift",
        enjoyment: "energizing" as const,
        confidence: "comfortable" as const,

      };
      const retries = await Promise.all(
        Array.from({ length: 8 }, (_, index) =>
          (index % 2 ? caller : replica).reflection.submit(reflection),
        ),
      );
      expect(new Set(retries.map((row) => row.id)).size).toBe(1);
      expect(new Set(retries.map((row) => row.createdAt)).size).toBe(1);
      const after = await repository.getSession(owner, sessionId);
      expect(after.state).toEqual(before.state);
      expect(after.evidence).toEqual(before.evidence);
      expect(after.actionLog).toEqual(before.actionLog);
      expect(after.revision).toBe((before.revision ?? 0) + 1);
      await expect(repository.saveSession(before)).rejects.toThrow(/changed/);
      await expect(foreign.reflection.submit(reflection)).rejects.toMatchObject(
        { code: "NOT_FOUND" },
      );
      const writes = await Promise.allSettled(
        Array.from({ length: 65 }, (_, index) =>
          (index % 2 ? caller : replica).reflection.submit({
            ...reflection,
            eventId: `reflection-${String(index)}`,
          }),
        ),
      );
      expect(writes.filter((row) => row.status === "fulfilled")).toHaveLength(
        59,
      );
      expect(
        writes
          .filter((row) => row.status === "rejected")
          .every(
            (row) =>
              row.reason instanceof TRPCError && row.reason.code === "TOO_MANY_REQUESTS",
          ),
      ).toBe(true);
      expect(await caller.reflection.submit(reflection)).toEqual(retries[0]);
      expect(
        (await repository.getSession(owner, sessionId)).reflections,
      ).toHaveLength(60);
      await sql`UPDATE session_write_limits SET window_started_at = now() - interval '1 hour' WHERE owner_id = ${owner}::uuid AND operation = 'reflection'`;
      for (let index = 0; index < 4; index++)
        await caller.reflection.submit({
          ...reflection,
          eventId: `next-hour-${String(index)}`,
        });
      const full = await repository.getSession(owner, sessionId);
      await expect(
        caller.reflection.submit({ ...reflection, eventId: "session-full" }),
      ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
      expect((await repository.getSession(owner, sessionId)).revision).toBe(
        full.revision,
      );
      expect(
        (
          await sql<
            { write_count: number }[]
          >`SELECT write_count FROM session_write_limits WHERE owner_id = ${owner}::uuid AND operation = 'reflection'`
        )[0]?.write_count,
      ).toBe(4);
      const newStarts = await Promise.allSettled(
        Array.from({ length: 12 }, (_, index) =>
          (index % 2 ? caller : replica).session.create({
            ...input,
            createRequestId: randomUUID(),
          }),
        ),
      );
      expect(
        newStarts.filter((row) => row.status === "fulfilled"),
      ).toHaveLength(9);
      expect(
        newStarts
          .filter((row) => row.status === "rejected")
          .every(
            (row) =>
              row.reason instanceof TRPCError && row.reason.code === "TOO_MANY_REQUESTS",
          ),
      ).toBe(true);
      expect(await replica.session.create(input)).toEqual(starts[0]);
      await repository.deleteSession(owner, sessionId);
      await expect(
        caller.session.create({ ...input, createRequestId: randomUUID() }),
      ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
      await expect(foreign.session.create(input)).resolves.toHaveProperty(
        "sessionId",
      );
      await sql`UPDATE session_write_limits SET window_started_at = now() - interval '1 hour' WHERE owner_id = ${owner}::uuid AND operation = 'session'`;
      await expect(
        caller.session.create({ ...input, createRequestId: randomUUID() }),
      ).resolves.toHaveProperty("sessionId");
      for (const role of ["anon", "authenticated"]) {
        await expect(
          sql.begin(async (tx) => {
            await tx.unsafe(`SET LOCAL ROLE ${role}`);
            await tx`SELECT * FROM session_write_limits`;
          }),
        ).rejects.toMatchObject({ code: "42501" });
      }
      await repository.deleteAccount(owner);
      expect(
        await sql`SELECT owner_id FROM session_write_limits WHERE owner_id = ${owner}::uuid`,
      ).toHaveLength(0);
    } finally {
      await sql`DELETE FROM auth.users WHERE id IN (${owner}::uuid, ${other}::uuid)`;
      await sql.end();
    }
  },
);

it.skipIf(!process.env.TEST_DATABASE_URL)(
  "new indexes support actual child/active-grant predicates",
  async () => {
    const sql = postgres(process.env.TEST_DATABASE_URL ?? "", {
      ...poolerCompatibleOptions,
      max: 1,
    });
    try {
      await sql.begin(async (tx) => {
        await tx`SET LOCAL enable_seqscan = off`;
        const owner = randomUUID();
        const session = randomUUID();
        for (const table of ["evidence_signals", "reflections"]) {
          const plan = await tx.unsafe(
            `EXPLAIN (FORMAT JSON) SELECT * FROM ${table} WHERE session_id = $1::uuid AND owner_id = $2::uuid`,
            [session, owner],
          );
          expect(JSON.stringify(plan)).toContain(`${table}_session_owner_idx`);
        }
        const plan =
          await tx`EXPLAIN (FORMAT JSON) SELECT * FROM sharing_grants WHERE owner_id = ${owner}::uuid AND revoked_at IS NULL AND expires_at > now()`;
        expect(JSON.stringify(plan)).toContain(
          "sharing_grants_active_owner_idx",
        );
        const indexes = await tx<
          { indexname: string; indexdef: string }[]
        >`SELECT indexname, indexdef FROM pg_indexes WHERE indexname IN ('evidence_signals_session_owner_idx', 'reflections_session_owner_idx', 'sharing_grants_active_owner_idx')`;
        expect(indexes).toHaveLength(3);
        expect(
          indexes.find(
            (row) => row.indexname === "sharing_grants_active_owner_idx",
          )?.indexdef,
        ).toContain("WHERE (revoked_at IS NULL)");
      });
    } finally {
      await sql.end();
    }
  },
);
