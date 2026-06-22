import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("privacy migration", () => {
  it("creates every required durable data category", async () => {
    const sql = await readFile(
      new URL("../drizzle/0001_initial.sql", import.meta.url),
      "utf8",
    );

    for (const table of [
      "profiles",
      "guardian_relationships",
      "simulation_sessions",
      "action_log",
      "state_snapshots",
      "evidence_signals",
      "reflections",
      "interpretations",
      "sharing_grants",
      "pathway_records",
      "telemetry",
      "consent_records",
      "deletion_jobs",
    ]) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
      expect(sql).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    }
  });

  it("keeps reflections owner-only unless an explicit active grant exists", async () => {
    const sql = await readFile(
      new URL("../drizzle/0001_initial.sql", import.meta.url),
      "utf8",
    );

    expect(sql).toContain("reflections_owner_all");
    expect(sql).toContain("reflections_explicit_grant_select");
    expect(sql).toContain("sharing_grants.revoked_at IS NULL");
    expect(sql).not.toContain("school_admin");
  });
});
