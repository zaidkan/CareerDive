import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { expect, it } from "vitest";
import { PostgresCareerRequestStore } from "../src/repository/career-requests.js";

const databaseUrl = process.env.TEST_DATABASE_URL;

it.skipIf(!databaseUrl)("keeps request state unique and private in migrated Postgres", async () => {
  const sql = postgres(databaseUrl ?? "", { max: 4 });
  const store = new PostgresCareerRequestStore(sql);
  const key = randomUUID();
  const other = randomUUID();
  try {
    await store.setRequested(key, "mechanical-engineer", false);
    expect(await sql`SELECT 1 FROM career_requests WHERE requester_key = ${key}::uuid`).toHaveLength(0);
    await Promise.all(Array.from({ length: 8 }, () => store.setRequested(key, "mechanical-engineer", true)));
    expect(await store.getState(key)).toEqual(["mechanical-engineer"]);
    expect(await store.getState(other)).toEqual([]);
    const rows = await sql<{ count: string; requested_at: Date; last_action_at: Date }[]>`
      SELECT count(*)::text AS count, min(requested_at) AS requested_at, max(last_action_at) AS last_action_at
      FROM career_requests WHERE requester_key = ${key}::uuid
    `;
    expect(rows[0]?.count).toBe("1");
    const firstRequest = rows[0]?.requested_at;
    const firstAction = rows[0]?.last_action_at;
    await store.setRequested(key, "mechanical-engineer", true);
    const duplicate = await sql<{ requested_at: Date; last_action_at: Date }[]>`
      SELECT requested_at, last_action_at FROM career_requests WHERE requester_key = ${key}::uuid
    `;
    expect(duplicate[0]?.requested_at).toEqual(firstRequest);
    expect(duplicate[0]?.last_action_at).toEqual(firstAction);
    await Promise.all(Array.from({ length: 4 }, () => store.setRequested(key, "mechanical-engineer", false)));
    expect(await store.getState(key)).toEqual([]);
    await store.setRequested(key, "mechanical-engineer", true);
    expect(await store.getState(key)).toEqual(["mechanical-engineer"]);
    const restored = await sql<{ requested_at: Date }[]>`
      SELECT requested_at FROM career_requests WHERE requester_key = ${key}::uuid
    `;
    expect(restored[0]?.requested_at).toEqual(firstRequest);

    const security = await sql<{ relrowsecurity: boolean }[]>`
      SELECT relrowsecurity FROM pg_class WHERE oid = 'career_requests'::regclass
    `;
    expect(security[0]?.relrowsecurity).toBe(true);
    expect(await sql`SELECT policyname FROM pg_policies WHERE tablename = 'career_requests'`).toHaveLength(0);
    await expect(sql`
      INSERT INTO career_requests (requester_key, career_id)
      VALUES (${key}::uuid, 'cybersecurity-analyst')
    `).rejects.toMatchObject({ code: "23514" });
  } finally {
    await sql`DELETE FROM career_requests WHERE requester_key = ${key}::uuid`;
    await sql.end();
  }
});
