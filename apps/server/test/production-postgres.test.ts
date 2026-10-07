import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { expect, it } from "vitest";
import { createInitialWorldState } from "@sim/core";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { PostgresRepository } from "../src/db/repository.js";
import {
  PostgresSupportStore,
  SupportRateLimitError,
} from "../src/repository/support.js";
import {
  PostgresLaunchStore,
  LaunchRateLimitError,
} from "../src/repository/launch.js";
import { createAppRouter } from "../src/trpc/router.js";

it.skipIf(!process.env.TEST_DATABASE_URL)(
  "Postgres dedupes concurrent starts/reports and denies browser authoritative/private writes",
  async () => {
    const sql = postgres(process.env.TEST_DATABASE_URL ?? "", { max: 8 });
    const owner = randomUUID();
    const other = randomUUID();
    try {
      await sql`INSERT INTO auth.users (id) VALUES (${owner}::uuid), (${other}::uuid)`;
      const repository = new PostgresRepository(sql);
      const caller = createAppRouter(repository, {
        requireCreateRequestId: true,
      }).createCaller({ userId: owner });
      const input = {
        seed: 24,
        sessionKind: "assessed" as const,
        pacingMode: "standard" as const,
        createRequestId: randomUUID(),
      };
      const sessions = await Promise.all(
        Array.from({ length: 8 }, () => caller.session.create(input)),
      );
      const sessionId = sessions[0]?.sessionId ?? "missing";
      expect(new Set(sessions.map((row) => row.sessionId)).size).toBe(1);
      expect(await repository.listSessions(owner)).toHaveLength(1);
      await expect(
        caller.session.create({ ...input, seed: 25 }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      const foreign = createAppRouter(repository).createCaller({
        userId: other,
      });
      await expect(foreign.session.get({ sessionId })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
      await expect(foreign.debrief.get({ sessionId })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
      await expect(
        foreign.simulation.performAction({
          sessionId,
          actionId: "complete_shift",
          eventId: "shift",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        foreign.simulation.performWorkplaceInteraction({
          sessionId,
          interaction: {
            type: "open_artifact",
            artifactId: "device-inventory-1",
          },
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      const [firstWriter, staleWriter] = await Promise.all([
        repository.getSession(owner, sessionId),
        repository.getSession(owner, sessionId),
      ]);
      firstWriter.state.simClock = 1;
      staleWriter.state.simClock = 2;
      const saves = await Promise.allSettled([
        repository.saveSession(firstWriter),
        repository.saveSession(staleWriter),
      ]);
      expect(
        saves.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        saves.filter((result) => result.status === "rejected"),
      ).toHaveLength(1);
      const winningClock = saves[0].status === "fulfilled" ? 1 : 2;
      expect(
        (await repository.getSession(owner, sessionId)).state.simClock,
      ).toBe(winningClock);
      const launches = new PostgresLaunchStore(sql);
      const firstEvent = {
        eventId: randomUUID(),
        name: "shift_started" as const,
      };
      await launches.save(firstEvent, owner);
      await Promise.all(
        Array.from({ length: 59 }, () =>
          launches.save({ eventId: randomUUID(), name: "decision" }, owner),
        ),
      );
      await launches.save(firstEvent, owner);
      const rejectedEvent = {
        eventId: randomUUID(),
        name: "shift_completed" as const,
      };
      await expect(launches.save(rejectedEvent, owner)).rejects.toBeInstanceOf(
        LaunchRateLimitError,
      );
      expect(
        await sql`SELECT event_id FROM launch_events WHERE event_id = ${rejectedEvent.eventId}::uuid`,
      ).toHaveLength(0);
      expect(
        (
          await sql<
            { event_count: number }[]
          >`SELECT event_count FROM launch_event_limits WHERE owner_id = ${owner}::uuid`
        )[0]?.event_count,
      ).toBe(60);
      const report = {
        createRequestId: randomUUID(),
        category: "Workplace" as const,
        description: "Report",
        contact: "",
      };
      const store = new PostgresSupportStore(sql);
      const reports = await Promise.all(
        Array.from({ length: 8 }, () => store.save(owner, report)),
      );
      expect(new Set(reports).size).toBe(1);
      for (let index = 0; index < 4; index++)
        await store.save(owner, { ...report, createRequestId: randomUUID() });
      await expect(
        store.save(owner, { ...report, createRequestId: randomUUID() }),
      ).rejects.toBeInstanceOf(SupportRateLimitError);
      for (const role of ["anon", "authenticated"] as const) {
        await expect(
          sql.begin(async (tx) => {
            await tx.unsafe(`SET LOCAL ROLE ${role}`);
            await tx`SELECT set_config('request.jwt.claim.sub', ${owner}, true)`;
            await tx`UPDATE simulation_sessions SET current_state = '{}'::jsonb WHERE id = ${sessionId}::uuid`;
          }),
        ).rejects.toMatchObject({ code: "42501" });
        for (const table of [
          "support_reports",
          "career_requests",
          "decision_reviews",
          "launch_events",
          "launch_event_limits",
        ]) {
          await expect(
            sql.begin(async (tx) => {
              await tx.unsafe(`SET LOCAL ROLE ${role}`);
              await tx.unsafe(`SELECT * FROM public.${table}`);
            }),
          ).rejects.toMatchObject({ code: "42501" });
        }
      }
      // Even accidental future UPDATE grants cannot bypass the tightened RLS policy.
      await sql.begin(async (tx) => {
        await tx`GRANT SELECT, UPDATE ON simulation_sessions TO authenticated`;
        await tx`SET LOCAL ROLE authenticated`;
        await tx`SELECT set_config('request.jwt.claim.sub', ${owner}, true)`;
        expect(
          await tx`UPDATE simulation_sessions SET current_state = '{}'::jsonb WHERE id = ${sessionId}::uuid RETURNING id`,
        ).toHaveLength(0);
        await tx`RESET ROLE`;
        await tx`REVOKE SELECT, UPDATE ON simulation_sessions FROM authenticated`;
      });
      expect((await repository.getSession(owner, sessionId)).state).toEqual({
        ...createInitialWorldState(
          sessionId,
          24,
          input,
          loadDefaultCybersecurityPack(),
        ),
        simClock: winningClock,
      });
    } finally {
      await sql`DELETE FROM auth.users WHERE id IN (${owner}::uuid, ${other}::uuid)`;
      await sql.end();
    }
  },
);
