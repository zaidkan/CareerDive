import { createHash } from "node:crypto";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import {
  discoverMigrations,
  migrate,
  pendingMigrations,
  verifyMigrations,
  type Migration,
} from "../src/db/migrations.js";

describe("migration runner", () => {
  it("discovers every numbered SQL file in order and rejects changed, skipped and unknown history", async () => {
    const migrations = await discoverMigrations();
    expect(migrations.map(({ name }) => name)).toEqual([
      "0001_initial.sql",
      "0002_decision_reviews.sql",
      "0003_decision_option_set.sql",
      "0004_career_requests.sql",
      "0005_server_boundaries.sql",
      "0006_support_launch.sql",
      "0007_state_revision_launch_limits.sql",
      "0008_session_lookup_indexes.sql",
      "0009_session_write_budgets.sql",
    ]);
    expect(pendingMigrations(migrations, migrations.slice(0, 2))).toEqual(
      migrations.slice(2),
    );
    expect(() =>
      pendingMigrations(migrations, [
        { name: migrations[0]?.name ?? "missing", hash: "changed" },
      ]),
    ).toThrow(/drift/);
    expect(() =>
      pendingMigrations(migrations, [
        migrations[1] ?? { name: "missing", hash: "" },
      ]),
    ).toThrow(/drift/);
    expect(() =>
      pendingMigrations(migrations, [
        ...migrations,
        { name: "unknown", hash: "x" },
      ]),
    ).toThrow(/drift/);
  });
  it.skipIf(!process.env.TEST_MIGRATION_DATABASE_URL)(
    "serializes repeated migration, verifies checksums and rolls back failed SQL",
    async () => {
      // Requires a disposable DB with auth fixture only; run once against a fresh DB.
      const sql = postgres(process.env.TEST_MIGRATION_DATABASE_URL ?? "", {
        max: 3,
      });
      try {
        const migrations = await discoverMigrations();
        const results = await Promise.all([migrate(sql), migrate(sql)]);
        expect(results.map((rows) => rows.length).sort()).toEqual([
          0,
          migrations.length,
        ]);
        expect(await migrate(sql)).toEqual([]);
        await verifyMigrations(sql);
        const brokenSql =
          "CREATE TABLE public.failed_migration_probe(id int); SELECT missing_function_for_test();";
        const broken: Migration = {
          name: "0010_broken_test.sql",
          sql: brokenSql,
          hash: createHash("sha256").update(brokenSql).digest("hex"),
        };
        await expect(migrate(sql, [...migrations, broken])).rejects.toThrow();
        expect(
          (
            await sql<
              { value: string | null }[]
            >`SELECT to_regclass('public.failed_migration_probe')::text AS value`
          )[0]?.value,
        ).toBeNull();
        await verifyMigrations(sql);
        await expect(
          migrate(
            sql,
            migrations.map((row, index) =>
              index === 0 ? { ...row, hash: "drift" } : row,
            ),
          ),
        ).rejects.toThrow(/drift/);
      } finally {
        await sql.end();
      }
    },
  );
});
