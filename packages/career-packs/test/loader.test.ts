import { describe, expect, it } from "vitest";
import { loadCareerPack } from "../src/index.js";
import { readFile } from "node:fs/promises";

const approvedPack = `
career:
  id: cybersecurity_analyst
  title: Junior Cybersecurity Analyst
  packVersion: 1.0.0
  reviewStatus: approved
  lastReviewed: 2026-06-01
  nextReview: 2027-06-01
  reviewingRoles: [practitioner, accessibility, bias]
  sources:
    - title: Occupational Outlook Handbook
      url: https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm
  rhythms: [routine_monitoring, quiet_investigation]
  systems: [alert_dashboard, ticket_queue, email, knowledge_base, team_chat]
  events: [suspicious_login, false_positive, phishing_report]
  rhythmBiasReview:
    ordinaryWorkRepresented: true
    calmWorkRepresented: true
    technicalAndRelationalWorkRepresented: true
`;

describe("career pack governance", () => {
  it("loads the checked-in cybersecurity pack", async () => {
    const source = await readFile(
      new URL(
        "../../../content/packs/cybersecurity-analyst/pack.yaml",
        import.meta.url,
      ),
      "utf8",
    );
    expect(loadCareerPack(source, new Date("2026-06-22")).career.systems).toContain(
      "ticket_queue",
    );
  });

  it("loads a reviewed, current pack", () => {
    const pack = loadCareerPack(approvedPack, new Date("2026-06-22"));
    expect(pack.career.id).toBe("cybersecurity_analyst");
    expect(pack.career.rhythms).toEqual([
      "routine_monitoring",
      "quiet_investigation",
    ]);
  });

  it("rejects unapproved packs", () => {
    expect(() =>
      loadCareerPack(
        approvedPack.replace("reviewStatus: approved", "reviewStatus: draft"),
        new Date("2026-06-22"),
      ),
    ).toThrow("Career pack must be approved");
  });

  it("rejects packs after their review date", () => {
    expect(() =>
      loadCareerPack(approvedPack, new Date("2028-01-01")),
    ).toThrow("Career pack review is stale");
  });
});
