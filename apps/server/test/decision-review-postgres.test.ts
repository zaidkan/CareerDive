import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState } from "@sim/core";
import { PostgresRepository } from "../src/db/repository.js";
import type { CompletedDecision } from "../src/domain/decision-review.js";
import { createAppRouter } from "../src/trpc/router.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const databaseUrlWithoutReview = process.env.TEST_DATABASE_URL_WITHOUT_REVIEW;

it.skipIf(!databaseUrl)("uses migrated Postgres schema for isolated, unique completed cohorts", async () => {
  const sql = postgres(databaseUrl ?? "", { max: 2 });
  const repository = new PostgresRepository(sql);
  const pack = loadDefaultCybersecurityPack();
  const owner = randomUUID();
  const current = randomUUID();
  const otherVersion = randomUUID();
  const incomplete = randomUUID();
  const tutorial = randomUUID();
  const concurrent = randomUUID();
  const row = (sessionId: string, careerVersion: string): CompletedDecision => ({
    sessionId, careerId: pack.career.id, careerVersion,
    decisionId: "scanner_interruption", choiceId: "snooze",
  });
  try {
    await sql`INSERT INTO auth.users (id) VALUES (${owner}::uuid)`;
    for (const [sessionId, version, completed] of [
      [current, pack.career.packVersion, true],
      [otherVersion, "2.0.0", true],
      [incomplete, pack.career.packVersion, false],
    ] as const) {
      const state = createInitialWorldState(sessionId, 24, {}, pack);
      state.careerVersion = version;
      await repository.createSession(owner, state);
      if (completed) {
        state.completedActionIds.push("complete_shift");
        await repository.saveSession({ ownerId: owner, state, actionLog: [], evidence: [], reflections: [] });
      }
      await repository.saveCompletedDecisions([row(sessionId, version)]);
      await repository.saveCompletedDecisions([row(sessionId, version)]);
    }
    await sql`
      INSERT INTO simulation_sessions
        (id, owner_id, career_id, session_kind, pacing_mode, seed, current_state, completed_at)
      VALUES (${tutorial}::uuid, ${owner}::uuid, ${pack.career.id}, 'tutorial',
        'standard', 24, '{}'::jsonb, now())
    `;
    await repository.saveCompletedDecisions([row(tutorial, pack.career.packVersion)]);

    expect(await repository.getCohortCounts(pack.career.id, pack.career.packVersion))
      .toContainEqual({ decisionId: "scanner_interruption", choiceId: "snooze", count: 1 });
    expect(await repository.getCohortCounts(pack.career.id, "2.0.0"))
      .toContainEqual({ decisionId: "scanner_interruption", choiceId: "snooze", count: 1 });
    expect(await repository.getCohortCounts("other-career", pack.career.packVersion)).toEqual([]);
    expect(await repository.getRecordedDecisionIds(current, pack.career.id, pack.career.packVersion))
      .toEqual(["scanner_interruption"]);
    expect(await repository.getRecordedDecisionIds(current, pack.career.id, "2.0.0"))
      .toEqual([]);

    const columns = await sql<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'decision_reviews'
    `;
    expect(columns.map(({ column_name }) => column_name).sort()).toEqual([
      "career_id", "career_version", "choice_id", "created_at", "decision_id", "session_id",
    ]);
    const security = await sql<{ relrowsecurity: boolean }[]>`
      SELECT relrowsecurity FROM pg_class WHERE relname = 'decision_reviews'
    `;
    expect(security[0]?.relrowsecurity).toBe(true);
    const policies = await sql`SELECT policyname FROM pg_policies WHERE tablename = 'decision_reviews'`;
    expect(policies).toHaveLength(0);
    const constraints = await sql<{ name: string; definition: string }[]>`
      SELECT conname AS name, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint WHERE conrelid = 'decision_reviews'::regclass
    `;
    expect(constraints).toContainEqual({ name: "decision_reviews_pkey",
      definition: "PRIMARY KEY (session_id, decision_id)" });
    expect(constraints.some(({ definition }) => definition.includes("FOREIGN KEY (session_id)") &&
      definition.includes("ON DELETE CASCADE"))).toBe(true);
    const indexes = await sql<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE tablename = 'decision_reviews'
    `;
    expect(indexes.map(({ indexname }) => indexname)).toContain("decision_reviews_cohort_idx");

    await repository.deleteSession(owner, current);
    expect(await repository.getRecordedDecisionIds(current, pack.career.id, pack.career.packVersion))
      .toEqual([]);
    expect(await repository.getCohortCounts(pack.career.id, pack.career.packVersion)).toEqual([]);

    const concurrentState = createInitialWorldState(concurrent, 24, {}, pack);
    concurrentState.events.forEach((event) => { event.status = "resolved"; });
    await repository.createSession(owner, concurrentState);
    await repository.saveSession({ ownerId: owner, state: concurrentState, evidence: [], reflections: [],
      actionLog: [{ sequence: 1, interaction: { type: "action", action: {
        id: "escalate_alert", eventId: "suspicious-login-1", actorId: "user",
      } } }],
    });
    const caller = createAppRouter(repository).createCaller({ userId: owner });
    await Promise.all(Array.from({ length: 3 }, () => caller.simulation.performAction({
      sessionId: concurrent, actionId: "complete_shift", eventId: "shift",
    })));
    const completedLog = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM action_log WHERE session_id = ${concurrent}::uuid
        AND action->'action'->>'id' = 'complete_shift'
    `;
    expect(completedLog[0]?.count).toBe("1");
    expect(await repository.getRecordedDecisionIds(concurrent, pack.career.id, pack.career.packVersion))
      .toEqual(["suspicious_login"]);
    expect(await repository.getCohortCounts(pack.career.id, pack.career.packVersion))
      .toContainEqual({ decisionId: "suspicious_login", choiceId: "escalate_alert", count: 1 });
  } finally {
    await sql`DELETE FROM auth.users WHERE id = ${owner}::uuid`;
    await sql.end();
  }
});

it.skipIf(!databaseUrlWithoutReview)("completes shift in Postgres when review table is missing", async () => {
  const sql = postgres(databaseUrlWithoutReview ?? "", { max: 2 });
  const repository = new PostgresRepository(sql);
  const owner = randomUUID();
  const state = createInitialWorldState(randomUUID(), 24, {}, loadDefaultCybersecurityPack());
  state.events.forEach((event) => { event.status = "resolved"; });
  try {
    await sql`INSERT INTO auth.users (id) VALUES (${owner}::uuid)`;
    await repository.createSession(owner, state);
    const caller = createAppRouter(repository).createCaller({ userId: owner });
    await caller.simulation.performAction({
      sessionId: state.sessionId, actionId: "complete_shift", eventId: "shift",
    });
    expect((await repository.getSession(owner, state.sessionId)).state.completedActionIds)
      .toContain("complete_shift");
    const debrief = await caller.debrief.get({ sessionId: state.sessionId });
    expect(debrief.decisionReview?.decisions).toHaveLength(5);
    expect(debrief.decisionReview?.decisions[0]?.cohort).toEqual({ status: "unavailable" });
  } finally {
    await sql`DELETE FROM auth.users WHERE id = ${owner}::uuid`;
    await sql.end();
  }
});
