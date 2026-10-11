import { deferred } from "./helpers/deferred.js";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { expect, it } from "vitest";
import { purgeExpiredSessions } from "../src/db/retention.js";

const url = process.env.TEST_RETENTION_DATABASE_URL;
it.skipIf(!url)("purges only sessions strictly older than 90 days, cascades simulation children, and preserves non-simulation data", async () => {
  const sql = postgres(url ?? "", { max: 2 });
  const owner = randomUUID();
  const other = randomUUID();
  const expired = randomUUID();
  const otherExpired = randomUUID();
  const boundary = randomUUID();
  const newer = randomUUID();
  try {
    await sql.begin(async tx => {
      await tx`INSERT INTO auth.users (id) VALUES (${owner}::uuid), (${other}::uuid)`;
      await tx`INSERT INTO simulation_sessions (id, owner_id, career_id, session_kind, pacing_mode, seed, current_state, created_at)
        VALUES (${expired}::uuid, ${owner}::uuid, 'cybersecurity_analyst', 'assessed', 'standard', 7, '{}', CURRENT_TIMESTAMP - INTERVAL '90 days 1 microsecond'),
          (${otherExpired}::uuid, ${other}::uuid, 'cybersecurity_analyst', 'assessed', 'standard', 7, '{}', CURRENT_TIMESTAMP - INTERVAL '100 days'),
          (${boundary}::uuid, ${owner}::uuid, 'cybersecurity_analyst', 'assessed', 'standard', 7, '{}', CURRENT_TIMESTAMP - INTERVAL '90 days'),
          (${newer}::uuid, ${owner}::uuid, 'cybersecurity_analyst', 'assessed', 'standard', 7, '{}', CURRENT_TIMESTAMP - INTERVAL '89 days')`;
      for (const sessionId of [expired, boundary, newer]) {
        await tx`INSERT INTO action_log (session_id, owner_id, sequence, action, accepted_delta) VALUES (${sessionId}::uuid, ${owner}::uuid, 1, '{}', '{}')`;
        await tx`INSERT INTO state_snapshots (session_id, owner_id, sequence, state) VALUES (${sessionId}::uuid, ${owner}::uuid, 1, '{}')`;
        await tx`INSERT INTO evidence_signals (id, session_id, owner_id, category, dimension, observation, provenance) VALUES (${randomUUID()}::uuid, ${sessionId}::uuid, ${owner}::uuid, 'observation', 'reasoning', 'Recorded observation', '{}')`;
        await tx`INSERT INTO reflections (id, session_id, owner_id, event_id, enjoyment, confidence) VALUES (${randomUUID()}::uuid, ${sessionId}::uuid, ${owner}::uuid, 'handoff-1', 'neutral', 'uncertain')`;
        await tx`INSERT INTO telemetry (session_id, owner_id, turn_sequence, interaction_kind, latency_ms, safety_result) VALUES (${sessionId}::uuid, ${owner}::uuid, 1, 'action', 1, 'allowed')`;
        await tx`INSERT INTO decision_reviews (session_id, career_id, career_version, decision_id, choice_id) VALUES (${sessionId}::uuid, 'cybersecurity_analyst', '2.0.0', 'decision-1', 'choice-1')`;
      }
      await tx`INSERT INTO support_reports (owner_id, create_request_id, category, description, created_at) VALUES (${owner}::uuid, ${randomUUID()}::uuid, 'Other', 'Optional support report', CURRENT_TIMESTAMP - INTERVAL '100 days')`;
      expect(await purgeExpiredSessions(tx)).toBe(2);
      expect(await purgeExpiredSessions(tx)).toBe(0);
      const surviving = await tx<{ id: string }[]>`SELECT id FROM simulation_sessions WHERE owner_id = ${owner}::uuid ORDER BY id`;
      expect(surviving.map(r => r.id).sort()).toEqual([boundary, newer].sort());
      for (const table of ['action_log', 'state_snapshots', 'evidence_signals', 'reflections', 'telemetry', 'decision_reviews']) {
        const rows = await tx.unsafe<{ session_id: string }[]>(`SELECT session_id FROM ${table} WHERE session_id IN ($1::uuid, $2::uuid, $3::uuid)`, [expired, boundary, newer]);
        expect(rows.map(r => r.session_id).sort()).toEqual([boundary, newer].sort());
      }
      expect(await tx`SELECT id FROM support_reports WHERE owner_id = ${owner}::uuid`).toHaveLength(1);
      expect(await tx`SELECT id FROM auth.users WHERE id IN (${owner}::uuid, ${other}::uuid)`).toHaveLength(2);
    });
  } finally {
    await sql`DELETE FROM auth.users WHERE id IN (${owner}::uuid, ${other}::uuid)`;
    await sql.end();
  }
});
it.skipIf(!url)("skips a session locked by an active write and deletes it after the lock is released", async () => {
  const sql = postgres(url ?? "", { max: 2 });
  const owner = randomUUID();
  const sessionId = randomUUID();
  const locked = deferred();
  const release = deferred();
  let holding: Promise<unknown> | undefined;
  try {
    await sql`INSERT INTO auth.users(id) VALUES (${owner}::uuid)`;
    await sql`INSERT INTO simulation_sessions (id, owner_id, career_id, session_kind, pacing_mode, seed, current_state, created_at)
      VALUES (${sessionId}::uuid, ${owner}::uuid, 'cybersecurity_analyst', 'assessed', 'standard', 7, '{}', CURRENT_TIMESTAMP - INTERVAL '91 days')`;
    holding = sql.begin(async tx => {
      await tx`SELECT id FROM simulation_sessions WHERE id = ${sessionId}::uuid FOR UPDATE`;
      locked.resolve(undefined);
      await release.promise;
    });
    await locked.promise;
    expect(await purgeExpiredSessions(sql)).toBe(0);
    release.resolve(undefined);
    await holding;
    expect(await purgeExpiredSessions(sql)).toBe(1);
  } finally {
    release.resolve(undefined);
    await holding;
    await sql`DELETE FROM auth.users WHERE id = ${owner}::uuid`;
    await sql.end();
  }
});
