import { readFile } from "node:fs/promises";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run migrations");
}

const version = "0001_initial";
const tables = [
  "profiles", "guardian_relationships", "simulation_sessions", "action_log",
  "state_snapshots", "evidence_signals", "reflections", "interpretations",
  "sharing_grants", "pathway_records", "telemetry", "consent_records",
  "deletion_jobs",
];
const policies = [
  "profiles_owner_all", "guardian_relationships_participant_select",
  "simulation_sessions_owner_all", "action_log_owner_all",
  "state_snapshots_owner_all", "evidence_signals_owner_all",
  "reflections_owner_all", "reflections_explicit_grant_select",
  "interpretations_owner_all", "sharing_grants_owner_all",
  "pathway_records_authenticated_select", "telemetry_owner_select",
  "consent_records_owner_select", "deletion_jobs_owner_all",
];

const sql = postgres(databaseUrl, { max: 1, connect_timeout: 10, prepare: false });
try {
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(20260927, 1)`;
    await tx`
      CREATE TABLE IF NOT EXISTS public.career_expo_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await tx`ALTER TABLE public.career_expo_migrations ENABLE ROW LEVEL SECURITY`;
    const applied = await tx`
      SELECT version FROM public.career_expo_migrations WHERE version = ${version}
    `;
    if (applied.length) {
      console.log(`${version} already applied`);
      return;
    }

    const existingTables = new Set(
      (await tx`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)
        .map((row) => row.tablename),
    );
    const existingPolicies = new Set(
      (await tx`SELECT policyname FROM pg_policies WHERE schemaname = 'public'`)
        .map((row) => row.policyname),
    );
    const tableCount = tables.filter((name) => existingTables.has(name)).length;
    const policyCount = policies.filter((name) => existingPolicies.has(name)).length;
    if (tableCount === tables.length && policyCount === policies.length) {
      // Older deployments applied this exact SQL manually, before tracking existed.
      console.log(`${version} already present; recording existing schema`);
    } else if (tableCount || policyCount) {
      throw new Error("Partial existing schema; inspect database before migration");
    } else {
      const source = await readFile(new URL("../drizzle/0001_initial.sql", import.meta.url), "utf8");
      await tx.unsafe(source);
      console.log(`${version} applied`);
    }
    await tx`INSERT INTO public.career_expo_migrations (version) VALUES (${version})`;
  });
} finally {
  await sql.end();
}
