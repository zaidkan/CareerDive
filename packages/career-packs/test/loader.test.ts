import { describe, expect, it } from "vitest";
import { loadCareerPack } from "../src/index.js";
import { readFile } from "node:fs/promises";

async function readCheckedInPack(): Promise<string> {
  return readFile(
    new URL(
      "../../../content/packs/cybersecurity-analyst/pack.yaml",
      import.meta.url,
    ),
    "utf8",
  );
}

describe("career pack governance", () => {
  it("loads the checked-in cybersecurity pack with authoritative scenario", async () => {
    const pack = loadCareerPack(await readCheckedInPack(), new Date("2026-06-22"));
    expect(pack.career.systems).toContain("ticket_queue");
    expect(pack.scenario.eventTemplates.suspicious_login?.instanceId).toBe(
      "suspicious-login-1",
    );
    expect(pack.scenario.actions.some(({ id }) => id === "review_alert")).toBe(
      true,
    );
    expect(pack.scenario.artifacts.length).toBeGreaterThan(5);
    expect(
      pack.scenario.eventTemplates.suspicious_login?.progression.kind,
    ).toBe("stages");
  });

  it("rejects packs missing scenario event templates for listed events", async () => {
    const source = await readCheckedInPack();
    const broken = source.replace(
      /\n {4}suspicious_login:[\s\S]*?\n {4}incomplete_handoff:/,
      "\n    incomplete_handoff:",
    );
    expect(() => loadCareerPack(broken, new Date("2026-06-22"))).toThrow(
      /suspicious_login/,
    );
  });

  it("rejects unapproved packs", async () => {
    const source = (await readCheckedInPack()).replace(
      "reviewStatus: approved",
      "reviewStatus: draft",
    );
    expect(() => loadCareerPack(source, new Date("2026-06-22"))).toThrow(
      "Career pack must be approved",
    );
  });

  it("rejects packs after their review date", async () => {
    const source = await readCheckedInPack();
    expect(() => loadCareerPack(source, new Date("2028-01-01"))).toThrow(
      "Career pack review is stale",
    );
  });

  it("rejects unknown action references in progression", async () => {
    const source = (await readCheckedInPack()).replace(
      "offer: [review_alert]",
      "offer: [review_alert, invent_credentials]",
    );
    expect(() => loadCareerPack(source, new Date("2026-06-22"))).toThrow();
  });
});
