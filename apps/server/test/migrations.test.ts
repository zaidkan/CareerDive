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

  it("stores only one structured choice per completed session and hides raw cohort rows", async () => {
    const sql = await readFile(new URL("../drizzle/0002_decision_reviews.sql", import.meta.url), "utf8");
    expect(sql).toContain("PRIMARY KEY (session_id, decision_id)");
    expect(sql).toContain("REFERENCES simulation_sessions(id) ON DELETE CASCADE");
    expect(sql).toContain("ALTER TABLE decision_reviews ENABLE ROW LEVEL SECURITY");
    expect(sql).not.toMatch(/note_text|free_text|owner_id|CREATE POLICY/i);
  });

  it("stores an exact option-set key for cohort isolation", async () => {
    const sql = await readFile(new URL("../drizzle/0003_decision_option_set.sql", import.meta.url), "utf8");
    expect(sql).toContain("option_set_key text NOT NULL DEFAULT ''");
    expect(sql).toContain("decision_id, option_set_key, choice_id");
  });
});
