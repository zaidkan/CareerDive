import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type {
  DatasetId,
  QueryFilter,
  WorldState,
} from "@sim/schemas";
import {
  applyAction,
  createInitialWorldState,
} from "../src/index.js";

// ---------------------------------------------------------------------------
// P2-T06 — SOC query scenario / real-pack integration tests (TEST ONLY).
//
// Bridge: real cybersecurity pack -> runtime datasets -> canonical query
// engine -> deterministic results. Proves the real scenario is investigable
// through the query system using the authored structured datasets.
//
// Rules: no "correct evidence" assertions (query behavior only); targeted
// IDs/counts/order/history, no giant snapshots, no UI text. The A-1204
// cluster stays skipped until its proposed content exists.
// ---------------------------------------------------------------------------

const pack = loadDefaultCybersecurityPack();

function socWorld(): WorldState {
  return createInitialWorldState("p2-t06-soc", 7, {}, pack);
}

function recordsOf(datasetId: DatasetId) {
  return socWorld().rules.datasets[datasetId]?.records ?? [];
}

/** Run one canonical query against the real pack world; return new state + history entry. */
function runSocQuery(datasetId: DatasetId, filters: QueryFilter) {
  const state = applyAction(socWorld(), {
    id: "query_records",
    actorId: "player",
    queryPayload: { datasetId, filters },
  }).state;
  const entry = state.queryHistory[state.queryHistory.length - 1];
  if (!entry) throw new Error("query history entry missing");
  return { state, entry };
}

/** Assert stable ordering: simMinutes asc (untimed last), id tie-break. */
function expectStableOrder(ids: string[], datasetId: DatasetId) {
  const byId = new Map(recordsOf(datasetId).map((r) => [r.id, r]));
  const key = (id: string) => {
    const sim = (byId.get(id) as { simMinutes?: number } | undefined)
      ?.simMinutes;
    return `${typeof sim === "number" ? sim.toString().padStart(8, "0") : "~~~~~~~~"}:${id}`;
  };
  expect([...ids].sort((a, b) => (key(a) < key(b) ? -1 : 1))).toEqual(ids);
}

// ---------------------------------------------------------------------------
// Scenario 1 — authentication investigation (A-1042 rows retrievable)
// ---------------------------------------------------------------------------

describe("P2-T06 scenario 1 — authentication investigation", () => {
  it("session lookup retrieves the S-0741 central row", () => {
    const { entry } = runSocQuery("auth", { sessionId: "S-0741" });
    expect(entry.resultIds).toContain("AUTH-0741-PATEL");
    expectStableOrder(entry.resultIds, "auth");
  });

  it("account filter returns central + baseline rows deterministically", () => {
    const first = runSocQuery("auth", { user: "j.patel@example.com" });
    const second = runSocQuery("auth", { user: "j.patel@example.com" });
    expect(first.entry.resultIds).toEqual(second.entry.resultIds);
    for (const id of [
      "AUTH-0731-PATEL",
      "AUTH-0738-GROUP",
      "AUTH-0741-PATEL",
    ]) {
      expect(first.entry.resultIds).toContain(id);
    }
    expectStableOrder(first.entry.resultIds, "auth");
  });

  it("IP pivot isolates the flagged-session source", () => {
    const { entry } = runSocQuery("auth", { sourceIp: "203.0.113.44" });
    expect(entry.resultIds).toContain("AUTH-0738-GROUP");
    expect(entry.resultIds).toContain("AUTH-0741-PATEL");
    expect(entry.resultIds).not.toContain("AUTH-0731-PATEL");
  });
});

// ---------------------------------------------------------------------------
// Scenario 2 — device lookup (exact label, no magic joins)
// ---------------------------------------------------------------------------

describe("P2-T06 scenario 2 — device lookup", () => {
  it("exact hostname retrieves the flagged device only", () => {
    const { entry } = runSocQuery("devices", {
      deviceLabel: "unknown-laptop-17",
    });
    expect(entry.resultIds).toEqual(["unknown-laptop-17"]);
  });

  it("similar names do not join an exact-label query", () => {
    const { entry } = runSocQuery("devices", {
      deviceLabel: "corp-macbook-patel",
    });
    expect(entry.resultIds).toContain("corp-macbook-patel");
    expect(entry.resultIds).not.toContain("corp-macbook-patel-old");
    expect(entry.resultIds).not.toContain("unknown-laptop-17");
    expectStableOrder(entry.resultIds, "devices");
  });
});

// ---------------------------------------------------------------------------
// Scenario 3 — VPN positive match (S-0731 route retrievable)
// ---------------------------------------------------------------------------

describe("P2-T06 scenario 3 — VPN positive match", () => {
  it("session reference retrieves the carrying connection", () => {
    const { entry } = runSocQuery("vpn", { sessionId: "S-0731" });
    expect(entry.resultIds).toContain("V-218");
    expectStableOrder(entry.resultIds, "vpn");
  });

  it("account filter retrieves the known connection", () => {
    const { entry } = runSocQuery("vpn", { user: "j.patel@example.com" });
    expect(entry.resultIds).toContain("V-218");
  });
});

// ---------------------------------------------------------------------------
// Scenario 4 — VPN absence substrate (Phase 3 reads this, never asserts it)
// ---------------------------------------------------------------------------

describe("P2-T06 scenario 4 — VPN absence substrate", () => {
  it("covered interval succeeds with zero rows and retained provenance", () => {
    const { state, entry } = runSocQuery("vpn", {
      user: "j.patel@example.com",
      sourceIp: "203.0.113.44",
      windowStartSimMinutes: 445,
      windowEndSimMinutes: 465,
    });
    expect(entry.resultIds).toEqual([]);
    expect(entry.totalCount).toBe(0);
    expect(entry.truncated).toBe(false);
    expect(entry.normalizedFilters).toEqual({
      user: "j.patel@example.com",
      sourceIp: "203.0.113.44",
      windowStartSimMinutes: 445,
      windowEndSimMinutes: 465,
    });
    // Coverage information Phase 3 will need is in history.
    const stored = state.queryHistory[state.queryHistory.length - 1];
    expect(stored?.datasetId).toBe("vpn");
    expect(stored?.resultIds).toEqual([]);
    expect(typeof stored?.simMinutes).toBe("number");
  });

  it("narrower interval is distinguishable in normalized provenance", () => {
    const wide = runSocQuery("vpn", {
      user: "j.patel@example.com",
      sourceIp: "203.0.113.44",
      windowStartSimMinutes: 445,
      windowEndSimMinutes: 465,
    });
    const narrow = runSocQuery("vpn", {
      user: "j.patel@example.com",
      sourceIp: "203.0.113.44",
      windowStartSimMinutes: 455,
      windowEndSimMinutes: 460,
    });
    expect(narrow.entry.normalizedFilters).not.toEqual(
      wide.entry.normalizedFilters,
    );
    expect(narrow.entry.normalizedFilters.windowStartSimMinutes).toBe(455);
    expect(narrow.entry.normalizedFilters.windowEndSimMinutes).toBe(460);
  });
});

// ---------------------------------------------------------------------------
// Scenario 5 — routine scanner work (normal work, not the incident)
// ---------------------------------------------------------------------------

describe("P2-T06 scenario 5 — routine scanner work", () => {
  it("run lookup returns the authored finance run", () => {
    const { entry } = runSocQuery("scanner", { runId: "RUN-FIN-031" });
    expect(entry.resultIds).toContain("RUN-FIN-031");
    expectStableOrder(entry.resultIds, "scanner");
  });

  it("scanner filter returns the scheduled scanner rows", () => {
    const { entry } = runSocQuery("scanner", { scannerId: "vuln-scan-03" });
    expect(entry.resultIds).toContain("RUN-FIN-031");
  });
});

// ---------------------------------------------------------------------------
// Scenario 6 — noise / distractor integrity (record system, not answer key)
// ---------------------------------------------------------------------------

describe("P2-T06 scenario 6 — noise integrity", () => {
  it("broad queries legitimately include multi-user rows", () => {
    const { entry } = runSocQuery("auth", {});
    const users = new Set(
      entry.resultIds.map((id) => {
        const row = recordsOf("auth").find((r) => r.id === id) as
          | { user?: string }
          | undefined;
        return row?.user;
      }),
    );
    expect(users.size).toBeGreaterThan(1);
  });

  it("narrow filters exclude non-matching noise by field match", () => {
    const { entry } = runSocQuery("auth", {
      user: "j.patel@example.com",
      sourceIp: "203.0.113.44",
    });
    for (const id of entry.resultIds) {
      const row = recordsOf("auth").find((r) => r.id === id) as
        | { user?: string }
        | undefined;
      expect(row?.user).toBe("j.patel@example.com");
    }
    expect(entry.resultIds.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Scenario 7 — false-positive cluster (proposed content; skip until present)
// ---------------------------------------------------------------------------

const FP_ALERTS = recordsOf("alerts").filter(
  (r) => (r as { alertId?: string }).alertId === "A-1204",
);

describe.skipIf(FP_ALERTS.length === 0)(
  "P2-T06 scenario 7 — A-1204 cluster (PENDING SUPPORTING CONTENT: A-1204 proposed fixture cluster not present in runtime pack)",
  () => {
    it("alert lookup retrieves the contrast case", () => {
      const { entry } = runSocQuery("alerts", { alertId: "A-1204" });
      expect(entry.resultIds).toContain("A-1204");
    });

    it("correlation substrate spans auth + device rows", () => {
      const auth = runSocQuery("auth", { sessionId: "S-0915" });
      expect(auth.entry.resultIds).toContain("AUTH-0915-OKONKWO-CHI");
      const device = runSocQuery("devices", {
        deviceLabel: "corp-macbook-okonkwo",
      });
      expect(device.entry.resultIds).toContain("corp-macbook-okonkwo");
    });
  },
);

// ---------------------------------------------------------------------------
// Scenario 8 — query does not equal discovery (Phase 2/3 boundary)
// ---------------------------------------------------------------------------

describe("P2-T06 scenario 8 — query is not discovery", () => {
  it("returned records update history without observation state", () => {
    const before = socWorld();
    const { state, entry } = runSocQuery("auth", { sessionId: "S-0741" });
    expect(entry.resultIds.length).toBeGreaterThan(0);
    expect(state.queryHistory).toHaveLength(
      before.queryHistory.length + 1,
    );
    expect(state.observedArtifactIds).toEqual(before.observedArtifactIds);
    expect(state.observedArtifactIds).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Scenario 9 — pack -> runtime dataset wiring guard
// ---------------------------------------------------------------------------

describe("P2-T06 scenario 9 — dataset wiring", () => {
  it("authored datasets become runtime datasets with expected IDs", () => {
    const world = socWorld();
    for (const id of ["auth", "vpn", "devices", "alerts", "scanner"] as const) {
      expect(Object.keys(world.rules.datasets)).toContain(id);
      expect(world.rules.datasets[id]?.datasetId).toBe(id);
    }
  });

  it("runtime datasets carry minimum viable rows and stable spot IDs", () => {
    const world = socWorld();
    const ids = (datasetId: DatasetId) =>
      world.rules.datasets[datasetId]?.records.map((r) => r.id) ?? [];
    expect(ids("auth").length).toBeGreaterThanOrEqual(4);
    expect(ids("vpn").length).toBeGreaterThanOrEqual(1);
    expect(ids("devices").length).toBeGreaterThanOrEqual(3);
    expect(ids("alerts").length).toBeGreaterThanOrEqual(2);
    expect(ids("scanner").length).toBeGreaterThanOrEqual(2);
    for (const [datasetId, id] of [
      ["auth", "AUTH-0741-PATEL"],
      ["vpn", "V-218"],
      ["devices", "unknown-laptop-17"],
      ["alerts", "A-1042"],
      ["scanner", "RUN-FIN-031"],
    ] as const) {
      expect(ids(datasetId)).toContain(id);
    }
  });
});
