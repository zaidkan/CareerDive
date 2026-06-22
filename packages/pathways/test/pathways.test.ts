import { describe, expect, it } from "vitest";
import { evaluatePathwayRecord } from "../src/index.js";
import { readFile } from "node:fs/promises";
import { PathwayRecordSchema } from "@sim/schemas";

describe("pathway staleness", () => {
  const record = {
    id: "us-oh-cyber-1",
    careerId: "cybersecurity_analyst",
    region: "United States",
    jurisdiction: "Ohio",
    credentialType: "typical_entry",
    requirement: "A bachelor's degree is commonly requested, with varied routes.",
    authorityName: "U.S. Bureau of Labor Statistics",
    authorityUrl:
      "https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm",
    lastVerified: "2026-06-01",
    nextReview: "2027-06-01",
  } as const;

  it("marks current records usable", () => {
    expect(evaluatePathwayRecord(record, new Date("2026-06-22"))).toEqual({
      record,
      stale: false,
      strongClaimsAllowed: true,
    });
  });

  it("validates the checked-in Ohio pathway record", async () => {
    const content = await readFile(
      new URL(
        "../../../content/pathways/cybersecurity-analyst/us-oh.json",
        import.meta.url,
      ),
      "utf8",
    );
    expect(PathwayRecordSchema.parse(JSON.parse(content)).jurisdiction).toBe(
      "Ohio",
    );
  });

  it("warns and blocks strong claims for stale records", () => {
    const result = evaluatePathwayRecord(record, new Date("2028-01-01"));

    expect(result.stale).toBe(true);
    if (!result.stale) {
      throw new Error("Expected pathway record to be stale");
    }
    expect(result.strongClaimsAllowed).toBe(false);
    expect(result.warning).toContain("may be out of date");
  });
});
