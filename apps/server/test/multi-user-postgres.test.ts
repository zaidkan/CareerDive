import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { expect, it } from "vitest";
import { PostgresRepository } from "../src/db/repository.js";
import { poolerCompatibleOptions } from "../src/db/connection.js";
import { createAppRouter } from "../src/trpc/router.js";
import { SessionNotFoundError } from "../src/domain/errors.js";
import { createInitialWorldState } from "@sim/core";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";

it.skipIf(!process.env.TEST_DATABASE_URL)(
  "keeps concurrent owners isolated through one small pool and one shared router",
  async () => {
    const sql = postgres(process.env.TEST_DATABASE_URL ?? "", {
      ...poolerCompatibleOptions,
      max: 2,
    });
    const owners = Array.from({ length: 16 }, () => randomUUID());
    try {
      await sql`INSERT INTO auth.users ${sql(owners.map((id) => ({ id })))}`;
      const repository = new PostgresRepository(sql);
      const router = createAppRouter(repository, {
        requireCreateRequestId: true,
      });
      const requestId = randomUUID();
      const sessions = await Promise.all(
        owners.map(async (owner, index) => {
          const caller = router.createCaller({ userId: owner });
          const input = {
            createRequestId: requestId,
            seed: index + 1,
            sessionKind: "assessed" as const,
            pacingMode: "standard" as const,
          };
          const [first, retry] = await Promise.all([
            caller.session.create(input),
            caller.session.create(input),
          ]);
          expect(retry.sessionId).toBe(first.sessionId);
          expect(
            (await repository.getSession(owner, first.sessionId)).state.seed,
          ).toBe(index + 1);
          return first.sessionId;
        }),
      );
      expect(new Set(sessions).size).toBe(owners.length);
      await Promise.all(
        owners.map(async (owner, index) => {
          const sessionId = sessions[index];
          const foreignOwner = owners[(index + 1) % owners.length];
          if (!sessionId || !foreignOwner)
            throw new Error("Missing test owner/session");
          const session = await repository.getSession(owner, sessionId);
          session.state.simClock = index + 1;
          await repository.saveSession(session);
          await expect(
            repository.getSession(foreignOwner, sessionId),
          ).rejects.toBeInstanceOf(SessionNotFoundError);
          const own = await repository.listSessions(owner);
          expect(own).toHaveLength(1);
          expect(own[0]?.ownerId).toBe(owner);
          expect(own[0]?.state.simClock).toBe(index + 1);
          expect(own[0]?.revision).toBe(1);
        }),
      );
    } finally {
      await sql`DELETE FROM auth.users WHERE id IN ${sql(owners)}`;
      await sql.end();
    }
  },
);

it.skipIf(!process.env.TEST_DATABASE_URL)(
  "rolls back a timed-out owner's write without blocking another owner or leaving partial state",
  async () => {
    const sql = postgres(process.env.TEST_DATABASE_URL ?? "", {
      ...poolerCompatibleOptions,
      max: 3,
      connection: { statement_timeout: 500 },
    });
    const owners = [randomUUID(), randomUUID()];
    let release: () => void = () => {};
    let locked: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const acquired = new Promise<void>((resolve) => {
      locked = resolve;
    });
    let holder: Promise<unknown> | undefined;
    try {
      await sql`INSERT INTO auth.users ${sql(owners.map((id) => ({ id })))}`;
      const repository = new PostgresRepository(sql);
      const [blocked, healthy] = await Promise.all(
        owners.map((owner) =>
          repository.createSession(
            owner,
            createInitialWorldState(
              randomUUID(),
              24,
              {},
              loadDefaultCybersecurityPack(),
            ),
          ),
        ),
      );
      if (!blocked || !healthy) throw new Error("Missing test sessions");
      holder = sql.begin(async (tx) => {
        await tx`SELECT id FROM simulation_sessions WHERE id = ${blocked.state.sessionId}::uuid FOR UPDATE`;
        locked();
        await gate;
      });
      // Surface lock-acquisition failures rather than waiting for the test timeout.
      await Promise.race([acquired, holder]);
      blocked.state.simClock = 100;
      healthy.state.simClock = 200;
      const results = await Promise.allSettled([
        repository.saveSession(blocked),
        repository.saveSession(healthy),
      ]);
      expect(results[0]).toMatchObject({
        status: "rejected",
        reason: { code: "57014" },
      });
      expect(results[1].status).toBe("fulfilled");
      release();
      await holder;
      expect(
        (await repository.getSession(blocked.ownerId, blocked.state.sessionId))
          .state.simClock,
      ).toBe(0);
      expect(
        (await repository.getSession(healthy.ownerId, healthy.state.sessionId))
          .state.simClock,
      ).toBe(200);
      expect(blocked.revision).toBe(0);
      expect(healthy.revision).toBe(1);
    } finally {
      release();
      await holder;
      await sql`DELETE FROM auth.users WHERE id IN ${sql(owners)}`;
      await sql.end();
    }
  },
);
