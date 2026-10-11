/**
 * SOC runtime dataset coverage / integrity tests (TEST-ONLY lane).
 *
 * Proves the real cybersecurity pack (content/packs/cybersecurity-analyst/
 * pack.yaml) carries enough structured, non-answer-
 * bearing data to support the intended SOC investigation — without encoding
 * any hidden answer key.
 *
 * Ground truth: the approved records in the default pack. All record IDs
 * asserted here are authored fixtures (AUTH-/V-/D-/AL-/SC-/KB- prefixes).
 *
 * Deliberately NOT asserted:
 * - whether records are "correct evidence" or resolve the central case;
 * - any required investigation order;
 * - pack content changes (this lane is read-only over the shipped pack).
 */
import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { createInitialWorldState } from "@sim/core";
import {
  type AlertRecord,
  type AuthRecord,
  type CareerPack,
  type DatasetId,
  type DatasetRecord,
  type DeviceRecord,
  type PackDataset,
  type ScannerRecord,
  type VpnRecord,
} from "@sim/schemas";
import { loadCareerPack } from "../src/index.js";

async function loadProductionPack(): Promise<CareerPack> {
  const source = await readFile(
    new URL(
      "../../../content/packs/cybersecurity-analyst/pack.yaml",
      import.meta.url,
    ),
    "utf8",
  );
  // Full production loader: YAML → CareerPackSchema (incl. dataset
  // cross-validation) → approval + review-date governance gates.
  return loadCareerPack(source, new Date("2026-06-22"));
}

/**
 * Fetch an authored dataset with a defined guarantee (schema lookup is
 * `| undefined` under noUncheckedIndexedAccess; a missing beta dataset is a
 * pack defect this lane must surface).
 */
function datasetOf(pack: CareerPack, datasetId: DatasetId): PackDataset {
  const dataset = pack.scenario.datasets[datasetId];
  if (dataset === undefined) {
    throw new Error(`pack is missing dataset "${datasetId}"`);
  }
  return dataset;
}

/**
 * Narrow a dataset's union-typed records to that dataset's concrete record
 * schema, verifying row datasetIds agree with the map key. The loader already
 * cross-checks this; keeping the check local makes the helper self-validating.
 */
function rowsOf<T extends DatasetRecord>(
  dataset: PackDataset,
  datasetId: DatasetId,
): T[] {
  const rows = dataset.records as T[];
  if (rows.some((row) => row.datasetId !== datasetId)) {
    throw new Error(
      `dataset "${datasetId}" contains rows with mismatched datasetId`,
    );
  }
  return rows;
}

describe("SOC pack runtime dataset presence", () => {
  it("ships exactly the five runtime-authorable beta datasets, never phishing", async () => {
    const pack = await loadProductionPack();
    expect(Object.keys(pack.scenario.datasets).sort()).toEqual([
      "alerts",
      "auth",
      "devices",
      "scanner",
      "vpn",
    ]);
    expect(pack.scenario.datasets).not.toHaveProperty("phishing");
  });

  it.each<[DatasetId, number]>([
    ["auth", 18],
    ["vpn", 7],
    ["devices", 11],
    ["alerts", 6],
    ["scanner", 3],
  ])(
    "ships the intended record count for %s (%i)",
    async (datasetId, expectedCount) => {
      const pack = await loadProductionPack();
      // Authored rows reach the runtime unchanged: the schema only validates
      // and cross-checks, it does not re-shape record counts.
      expect(datasetOf(pack, datasetId).records).toHaveLength(expectedCount);
    },
  );
});

describe("A-1042 investigation substrate (approved fixture IDs)", () => {
  it("ships the canonical alert, auth trail, device, and VPN catalogue", async () => {
    const pack = await loadProductionPack();
    const auth = rowsOf<AuthRecord>(datasetOf(pack, "auth"), "auth");
    const vpn = rowsOf<VpnRecord>(datasetOf(pack, "vpn"), "vpn");
    const devices = rowsOf<DeviceRecord>(datasetOf(pack, "devices"), "devices");
    const alerts = rowsOf<AlertRecord>(datasetOf(pack, "alerts"), "alerts");

    const authIds = auth.map((row) => row.id);
    const vpnIds = vpn.map((row) => row.id);
    const deviceLabels = devices.map((row) => row.deviceLabel);

    // Canonical auth trail (fixture §1a: A1..A4 → restate C2/C3/C4).
    expect(authIds).toEqual(
      expect.arrayContaining([
        "AUTH-0731-PATEL",
        "AUTH-0738-GROUP",
        "AUTH-0741-PATEL",
        "AUTH-0743-REFRESH",
      ]),
    );
    // VPN catalogue + device substrate (fixture §2 V-218 / §3 D1..D3).
    expect(vpnIds).toContain("V-218");
    expect(deviceLabels).toEqual(
      expect.arrayContaining([
        "corp-macbook-patel",
        "corp-phone-patel",
        "unknown-laptop-17",
      ]),
    );

    // Central alert (fixture AL-1 / canonical fact C1) links to its two
    // source auth rows and the existing ticket — the same linkage the pack
    // prose already carries. No verdict anywhere.
    const a1042 = alerts.find((row) => row.id === "A-1042");
    expect(a1042).toBeDefined();
    expect(a1042?.alertId).toBe("A-1042");
    expect(a1042?.account).toBe("j.patel@example.com");
    expect(a1042?.deviceLabel).toBe("unknown-laptop-17");
    expect([...(a1042?.sourceRefs ?? [])].sort()).toEqual([
      "AUTH-0738-GROUP",
      "AUTH-0741-PATEL",
    ]);
    expect(a1042?.linkedWorkItemId).toBe("suspicious-login-1");

    // Session baseline row (fixture A1 / C2): S-0731 via V-218, approved exit.
    const a0731 = auth.find((row) => row.id === "AUTH-0731-PATEL");
    expect(a0731?.sessionId).toBe("S-0731");
    expect(a0731?.sourceIp).toBe("198.51.100.20");
    expect(a0731?.deviceLabel).toBe("corp-macbook-patel");
    expect(a0731?.vpnConnectionId).toBe("V-218");

    // Grouped failure burst (fixture A2-group / C1): six failed extra checks.
    const a0738 = auth.find((row) => row.id === "AUTH-0738-GROUP");
    expect(a0738?.attemptCount).toBe(6);
    expect(a0738?.result).toBe("fail");
    expect(a0738?.sourceIp).toBe("203.0.113.44");

    // Flagged password success (fixture A3 / C3): S-0741, unknown device,
    // no VPN connection ID on the row.
    const a0741 = auth.find((row) => row.id === "AUTH-0741-PATEL");
    expect(a0741?.sessionId).toBe("S-0741");
    expect(a0741?.sourceIp).toBe("203.0.113.44");
    expect(a0741?.deviceLabel).toBe("unknown-laptop-17");
    expect(a0741?.result).toBe("success");
    expect(a0741?.vpnConnectionId).toBeUndefined();

    // Refresh continuation (fixture A4 / C3): continuation, verifies nothing.
    const a0743 = auth.find((row) => row.id === "AUTH-0743-REFRESH");
    expect(a0743?.sessionId).toBe("S-0741");
    expect(a0743?.relatedRecordIds).toContain("AUTH-0741-PATEL");
    expect(a0743?.result).toBe("n/a");

    // Device substrate (fixture D3 / C6): exact flagged label, never enrolled.
    const unknownLaptop = devices.find(
      (row) => row.deviceLabel === "unknown-laptop-17",
    );
    expect(unknownLaptop?.enrolled).toBe(false);
    expect(unknownLaptop?.assignmentState).toBe("unassigned");
    expect(unknownLaptop?.assignedUser).toBeUndefined();

    // VPN catalogue row (fixture V-218 / C8): only approved exit in snapshot.
    const v218 = vpn.find((row) => row.id === "V-218");
    expect(v218?.vpnId).toBe("V-218");
    expect(v218?.exitIp).toBe("198.51.100.20");
    expect(v218?.status).toBe("active");
  });
});

describe("employee login-help substrate", () => {
  it("ships the phone retry and successful laptop comparison rows", async () => {
    const pack = await loadProductionPack();
    const authIds = rowsOf<AuthRecord>(datasetOf(pack, "auth"), "auth").map(
      ({ id }) => id,
    );
    expect(authIds).toEqual(
      expect.arrayContaining([
        "AUTH-0836-RIVERA-PHONE-RETRIES",
        "AUTH-0842-RIVERA-LAPTOP",
      ]),
    );
  });
});

describe("routine-work support (the pack is not only A-1042)", () => {
  it("ships routine auth baseline and non-Patel noise rows", async () => {
    const pack = await loadProductionPack();
    const auth = rowsOf<AuthRecord>(datasetOf(pack, "auth"), "auth");

    const ids = auth.map((row) => row.id);
    // Baseline / supporting rows (fixture §1b) + realistic queue noise (§1c).
    expect(ids).toEqual(
      expect.arrayContaining([
        "AUTH-0715-PATEL-HQ",
        "AUTH-0658-PATEL-PHONE",
        "AUTH-LASTWK-VPN-1",
        "AUTH-LASTWK-VPN-2",
        "AUTH-0612-PATEL-TYPO",
        "AUTH-0745-PATEL-HQ",
        "AUTH-0733-OKONKWO",
        "AUTH-0740-GARCIA-FAIL-THEN-OK",
        "AUTH-0802-RIVERA-VPN",
        "AUTH-0755-SVC-BACKUP",
        "AUTH-0835-OKONKWO-VPN",
        "AUTH-0722-GARCIA-FAIL",
      ]),
    );

    // The flagged-session rows (S-0741 / unknown-laptop-17 / 203.0.113.44)
    // stay a small minority; people other than the account owner appear.
    const flaggedSource = auth.filter(
      (row) =>
        row.sessionId === "S-0741" ||
        row.deviceLabel === "unknown-laptop-17" ||
        row.sourceIp === "203.0.113.44",
    );
    expect(flaggedSource).toHaveLength(3);
    expect(auth.some((row) => row.user !== "j.patel@example.com")).toBe(true);
  });

  it("ships a routine alert queue outside the central case", async () => {
    const pack = await loadProductionPack();
    const alerts = rowsOf<AlertRecord>(datasetOf(pack, "alerts"), "alerts");
    const alertIds = alerts.map((row) => row.alertId);
    expect(alertIds).toEqual(
      expect.arrayContaining([
        "A-1180",
        "A-1159",
        "A-1210",
        "A-1206",
        "A-1214",
      ]),
    );
    // Alert-level noise must not all point at the investigation ticket.
    expect(
      alerts.every((row) => row.linkedWorkItemId === "suspicious-login-1"),
    ).toBe(false);
  });

  it("ships scanner run + window + prior-week recurrence for routine scanner work", async () => {
    const pack = await loadProductionPack();
    const scanner = rowsOf<ScannerRecord>(
      datasetOf(pack, "scanner"),
      "scanner",
    );
    const ids = scanner.map((row) => row.runId);
    expect(ids).toEqual(
      expect.arrayContaining(["RUN-FIN-031", "SCAN-FIN-MON", "RUN-FIN-030"]),
    );
    const run = scanner.find((row) => row.runId === "RUN-FIN-031");
    expect(run?.scannerId).toBe("vuln-scan-03");
    expect(run?.status).toBe("completed");
    const approved = scanner.find((row) => row.runId === "SCAN-FIN-MON");
    expect(approved?.status).toBe("approved");
  });
});

describe("deferred / quarantined content stays out of the runtime", () => {
  it("leases none of phishing, the A-1204 cluster, or AL-4/AL-5", async () => {
    const pack = await loadProductionPack();
    const auth = rowsOf<AuthRecord>(datasetOf(pack, "auth"), "auth");
    const vpn = rowsOf<VpnRecord>(datasetOf(pack, "vpn"), "vpn");
    const alerts = rowsOf<AlertRecord>(datasetOf(pack, "alerts"), "alerts");

    const authIds = auth.map((row) => row.id);
    const vpnIds = vpn.map((row) => row.id);
    const alertIds = alerts.map((row) => row.alertId);
    const allRecordIds = [
      ...authIds,
      ...vpnIds,
      ...rowsOf<DeviceRecord>(datasetOf(pack, "devices"), "devices").map(
        (row) => row.id,
      ),
      ...alerts.map((row) => row.id),
      ...rowsOf<ScannerRecord>(datasetOf(pack, "scanner"), "scanner").map(
        (row) => row.id,
      ),
    ];

    // Phishing dataset + any PH-* authored row (greenfield, deferred).
    expect(pack.scenario.datasets).not.toHaveProperty("phishing");
    expect(allRecordIds.some((id) => id.startsWith("PH-"))).toBe(false);

    // A-1204 false-positive cluster, gated at T+43 (fixture §4a): never in
    // the beta runtime.
    expect(alertIds).not.toContain("A-1204");
    expect(authIds).not.toContain("AUTH-0915-OKONKWO-CHI");
    expect(vpnIds).not.toContain("V-215");

    // AL-4 duplicate phishing report + AL-5 backup spike were excluded from
    // the translated set (content-pack doc queue selection).
    expect(alertIds).not.toContain("A-1191");
    expect(alertIds).not.toContain("A-1174");

    // Removed during fixture design (§13 of the fixture spec).
    expect(authIds).not.toContain("AUTH-0901-NGUYEN-RESET");
  });
});

describe("no hidden-answer authoring fields in dataset rows", () => {
  it("exposes only player-visible fields, never verdict/importance metadata", async () => {
    const pack = await loadProductionPack();
    const forbiddenTokens = [
      "relevant",
      "clue",
      "answer",
      "verdict",
      "malicious",
      "escalationNeeded",
      "needs_escalation",
      "is_suspicious",
      "importance",
      "templateId",
      "requiredOptionIds",
    ];
    const violations: string[] = [];
    for (const [datasetId, dataset] of Object.entries(pack.scenario.datasets)) {
      for (const record of dataset.records) {
        for (const key of Object.keys(record)) {
          const lowered = key.toLowerCase();
          if (forbiddenTokens.some((token) => lowered.includes(token))) {
            violations.push(`${datasetId}.${record.id}.${key}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("pack → world wiring", () => {
  it("builds world.rules.datasets from pack.scenario.datasets by construction", async () => {
    const pack = await loadProductionPack();
    const world = createInitialWorldState("wb-1", 7, {}, pack);

    const authoredIds = Object.keys(pack.scenario.datasets).sort();
    expect(Object.keys(world.rules.datasets).sort()).toEqual(authoredIds);

    for (const [key, authored] of Object.entries(pack.scenario.datasets)) {
      const datasetId = key as DatasetId;
      const runtime = world.rules.datasets[datasetId];
      expect(runtime).toBeDefined();
      if (runtime === undefined) continue;
      expect(runtime.datasetId).toBe(datasetId);
      expect(runtime.records).toHaveLength(authored.records.length);
      expect(runtime.records.map((row) => row.id).sort()).toEqual(
        authored.records.map((row) => row.id).sort(),
      );
      // Authoring-only filter-field config is NOT carried into runtime state.
      expect("allowedFilterFields" in runtime).toBe(false);
    }
  });
});
