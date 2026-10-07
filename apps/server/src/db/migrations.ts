import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import postgres from "postgres";

export type Migration = { name: string; hash: string; sql: string };
export type AppliedMigration = { name: string; hash: string };
export async function discoverMigrations(
  directory = new URL("../../drizzle/", import.meta.url),
): Promise<Migration[]> {
  const names = (await readdir(directory))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  if (
    !names.length ||
    names.some(
      (name, index) =>
        !new RegExp(`^${String(index + 1).padStart(4, "0")}_.*\\.sql$`).test(
          name,
        ),
    )
  ) {
    throw new Error(
      "Migrations must be consecutive numbered SQL files starting at 0001",
    );
  }
  return Promise.all(
    names.map(async (name) => {
      const sql = await readFile(new URL(name, directory), "utf8");
      return {
        name,
        sql,
        hash: createHash("sha256").update(sql).digest("hex"),
      };
    }),
  );
}
export function pendingMigrations(
  migrations: Migration[],
  applied: AppliedMigration[],
): Migration[] {
  if (
    applied.length > migrations.length ||
    applied.some(
      (row, index) =>
        row.name !== migrations[index]?.name ||
        row.hash !== migrations[index].hash,
    )
  ) {
    throw new Error(
      "Migration history drift: unknown, reordered or modified applied SQL",
    );
  }
  return migrations.slice(applied.length);
}
export async function verifyMigrations(
  sql: ReturnType<typeof postgres>,
  migrations?: Migration[],
): Promise<void> {
  migrations ??= await discoverMigrations();
  const applied = await sql<
    AppliedMigration[]
  >`SELECT name, hash FROM public.app_migrations ORDER BY name`;
  if (pendingMigrations(migrations, applied).length)
    throw new Error("Database has pending migrations");
}
export async function migrate(
  sql: ReturnType<typeof postgres>,
  migrations?: Migration[],
): Promise<string[]> {
  const intended = migrations ?? (await discoverMigrations());
  return sql.begin(async (tx) => {
    // One transaction prevents partial activation, lock serializes concurrent runners.
    await tx`SELECT pg_advisory_xact_lock(741208319)`;
    const legacy = await tx<
      { existing: string | null }[]
    >`SELECT to_regclass('public.app_migrations')::text AS existing`;
    if (!legacy[0]?.existing) {
      const tables = await tx<
        { existing: string | null }[]
      >`SELECT to_regclass('public.simulation_sessions')::text AS existing`;
      if (tables[0]?.existing)
        throw new Error(
          "Existing schema without app_migrations ledger: audit and reconcile before migration",
        );
    }
    await tx`CREATE TABLE IF NOT EXISTS public.app_migrations (name text PRIMARY KEY, hash text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`;
    await tx`REVOKE ALL ON public.app_migrations FROM PUBLIC, anon, authenticated`;
    const applied = await tx<
      AppliedMigration[]
    >`SELECT name, hash FROM public.app_migrations ORDER BY name`;
    const pending = pendingMigrations(intended, applied);
    for (const migration of pending) {
      await tx.unsafe(migration.sql);
      await tx`INSERT INTO public.app_migrations (name, hash) VALUES (${migration.name}, ${migration.hash})`;
    }
    return pending.map(({ name }) => name);
  });
}
