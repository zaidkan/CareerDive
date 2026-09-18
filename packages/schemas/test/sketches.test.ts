/**
 * P1-T06 — Schema-only sketch types: RED tests.
 *
 * These contracts freeze Phase 2–6 terminology (canonical spec §5/§6).
 * They are types-only: no runtime behavior may import them.
 */
import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";

import {
  EvidenceFactDefinitionSchema,
  EvidenceFactDiscoveryStateSchema,
} from "../src/evidence-facts.js";
import { NpcIntentSchema } from "../src/npc-intent.js";
import { StructuredDatasetSchema } from "../src/records.js";
import {
  StructuredTicketSchema,
  TicketStatusSchema,
} from "../src/ticket.js";

describe("P1-T06 sketch types compile and accept minimum examples", () => {
  it("accepts a minimum evidence fact definition (spec §5.2)", () => {
    const parsed = EvidenceFactDefinitionSchema.parse({
      id: "fact-device-unenrolled",
      statement: "unknown-laptop-17 is not enrolled.",
      relatedWorkItemIds: ["suspicious-login-1"],
      provenance: {
        kind: "single_record_open",
        recordIds: ["device-inventory-1"],
      },
      attachable: true,
    });
    expect(parsed.id).toBe("fact-device-unenrolled");
  });

  it("accepts an absence-coverage provenance without an exact query string (spec §5.2)", () => {
    const parsed = EvidenceFactDefinitionSchema.parse({
      id: "fact-no-vpn-match",
      statement: "No matching VPN session in the queried interval.",
      relatedWorkItemIds: ["suspicious-login-1"],
      provenance: {
        kind: "query_absence_coverage",
        datasetId: "vpn-records",
        requiredDimensions: ["user", "time_window"],
        coveredWindowMinutes: 20,
      },
      attachable: true,
    });
    expect(parsed.provenance.kind).toBe("query_absence_coverage");
  });

  it("keeps discovery state separate from the authored definition", () => {
    const parsed = EvidenceFactDiscoveryStateSchema.parse({
      factId: "fact-device-unenrolled",
      discoveredAtSimMinutes: 12,
      satisfiedProvenance: ["device-inventory-1 opened"],
      attachedToTicketIds: [],
    });
    expect(parsed.factId).toBe("fact-device-unenrolled");
    // Definition shape and runtime shape share no required overlap beyond the id ref.
    expect("statement" in parsed).toBe(false);
  });

  it("accepts a minimum structured dataset (spec §5.1/§7)", () => {
    const parsed = StructuredDatasetSchema.parse({
      datasetId: "device-inventory",
      allowedFilterFields: ["assigned_user", "enrolled_state"],
      records: [
        {
          id: "corp-macbook-patel",
          fields: { assigned_user: "j.patel", enrolled_state: "enrolled" },
          relatedRecordIds: [],
        },
      ],
    });
    expect(parsed.records).toHaveLength(1);
  });

  it("accepts a minimum structured ticket (spec §5.3)", () => {
    const parsed = StructuredTicketSchema.parse({
      ticketId: "ticket-suspicious-login",
      linkedWorkItemIds: ["suspicious-login-1"],
      status: "open",
      entityRefs: ["unknown-laptop-17"],
      evidenceFactIds: [],
      noteText: "Working notes; annotation only, never world truth.",
    });
    expect(TicketStatusSchema.parse(parsed.status)).toBe("open");
  });

  it("accepts a minimum NPC intent with fallback (spec §5.5)", () => {
    const parsed = NpcIntentSchema.parse({
      intentId: "ask-handoff-context",
      npcId: "manager",
      availability: { requiresWorkItemActive: ["handoff-1"] },
      payload: {
        allowedTone: "neutral",
        linkedFactIds: ["alert-visible"],
        forbiddenClaims: ["who signed in"],
      },
      fallbackText: "Check the handoff record and tell me what is still open.",
    });
    expect(parsed.npcId).toBe("manager");
  });
});

describe("P1-T06 disallowed structures fail", () => {
  it("rejects free-form query language on datasets (no generalized scripting)", () => {
    expect(() =>
      StructuredDatasetSchema.parse({
        datasetId: "device-inventory",
        allowedFilterFields: ["assigned_user"],
        records: [],
        queryLanguage: "SELECT * WHERE enrolled",
      }),
    ).toThrow();
  });

  it("rejects an evidence definition shaped like assessment EvidenceSignal", () => {
    // Scenario Evidence Facts are NOT assessment EvidenceSignal: no sessionId,
    // actionId, rhythm, category/dimension signal fields.
    expect(() =>
      EvidenceFactDefinitionSchema.parse({
        id: "fact-x",
        statement: "x",
        relatedWorkItemIds: [],
        provenance: { kind: "single_record_open", recordIds: ["r1"] },
        attachable: false,
        sessionId: "s1",
        actionId: "review_alert",
        category: "behavioral",
        dimension: "analytical_reasoning",
      }),
    ).toThrow();
  });

  it("rejects NPC intents that let AI determine facts or scores", () => {
    expect(() =>
      NpcIntentSchema.parse({
        intentId: "bad-intent",
        npcId: "manager",
        availability: {},
        payload: {
          allowedTone: "neutral",
          linkedFactIds: [],
          forbiddenClaims: [],
        },
        fallbackText: "Fallback.",
        aiDeterminedFacts: ["who signed in"],
      }),
    ).toThrow();
  });

  it("rejects tickets without a legal status", () => {
    expect(() =>
      StructuredTicketSchema.parse({
        ticketId: "t",
        linkedWorkItemIds: [],
        status: "auto_resolved_by_ai",
        entityRefs: [],
        evidenceFactIds: [],
      }),
    ).toThrow();
  });
});

describe("P1-T06 sketches are not wired into runtime", () => {
  it("no production runtime module imports the still-sketch modules", () => {
    // P2-T01 promoted records.ts to runtime (datasets/query engine consume it),
    // so it is intentionally excluded here. evidence-facts / npc-intent / ticket
    // remain types-only forward contracts owned by Phases 3/4/6.
    const output = execSync(
      "grep -rln --include='*.ts' --include='*.tsx' -e 'evidence-facts' -e 'npc-intent' -e 'src/ticket.js' packages/core/src apps/server/src apps/web/src || true",
      { encoding: "utf-8" },
    );
    const sketchImports = output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    expect(sketchImports).toEqual([]);
  });
});
