import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { productMedia, selectProductMedia } from "../src/site/productMedia.js";
import { buildCompletedCyberMediaShift } from "../../../scripts/product-media-shift.js";

// Base in a variable: vite rewrites inline new URL(literal, import.meta.url) to a dev-server URL.
const moduleBase = import.meta.url;
const publicRoot = new URL("../public/", moduleBase);
const provenance = JSON.parse(readFileSync(new URL("../public/careers/media/provenance.json", moduleBase), "utf8")) as Array<{
  id: string; file: string; pack: string; packSha256: string; seed: number; route: string; actions: string[]; theme: string; viewport: { width: number; height: number }; crop: string;
  stateSha256?: string; actionLogSha256?: string; completedShiftActionLogSha256?: string;
  decisionRoute?: { b1: string; b2: string; b3?: string }; completedShift?: boolean;
}>;

describe("public product media", () => {
  it("has twelve typed scenes backed by real files and matching provenance", () => {
    expect(Object.keys(productMedia)).toEqual(Array.from({ length: 12 }, (_, index) => `a-${String(index + 1).padStart(2, "0")}`));
    // Captures remain frozen to aa8d79d; source edits must not falsify their provenance.
    const packSha256 = "f13ce947ded5ec2531b7b3a65ca64f133a2d8ef6c555698cba885fe0f3b59b9e";
    let count = 0;
    for (const media of Object.values(productMedia)) {
      expect(media.provenance).toBe("/careers/media/provenance.json");
      expect(media.authenticity).toBe("real");
      for (const [theme, devices] of Object.entries(media.variants)) {
        for (const variant of Object.values(devices)) {
          const source = readFileSync(new URL(`.${variant.src}`, publicRoot));
          expect(source.subarray(0, 4).toString()).toBe("RIFF");
          expect(source.subarray(8, 12).toString()).toBe("WEBP");
          expect(source.length).toBeGreaterThan(1000);
          expect(variant.aspectRatio).toMatch(/^\d+ \/ \d+$/);
          const refreshed = media.id === "a-06" || media.id === "a-10";
          expect(provenance).toContainEqual(expect.objectContaining({
            id: media.id, file: variant.src.split("/").at(-1),
            pack: "cybersecurity_analyst@2.0.0", packSha256,
            seed: 7, route: "/fixtures/product-media.html", theme,
            crop: media.id === "a-06" ? "main.capture element" : "fullPage",
          }));
          if (refreshed) expect(media.authenticity).toBe("real");
          count++;
        }
      }
    }
    expect(provenance).toHaveLength(count);
    expect(count).toBe(27);
    for (const entry of provenance.filter(({ id }) => id === "a-06" || id === "a-10")) {
      expect(entry.completedShift).toBe(entry.id === "a-10");
      expect(entry.stateSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.actionLogSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.completedShiftActionLogSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.decisionRoute).toEqual({
        b1: "escalate-with-comparisons", b2: "route-with-interim",
        ...(entry.id === "a-10" ? { b3: "corrected" } : {}),
      });
      expect(JSON.stringify(entry)).not.toMatch(/requiredOptionIds|coachOnFailure|successText|setFlags/);
    }
  });

  it("replays one real submitted ticket through a completed Cyber 2.0.0 shift", () => {
    const first = buildCompletedCyberMediaShift();
    const replay = buildCompletedCyberMediaShift();
    expect(first.actionLogSha256).toBe(replay.actionLogSha256);
    expect(first.completedStateSha256).toBe(replay.completedStateSha256);
    const ticket = first.ticketView.structuredTickets?.["ticket-suspicious-login-1"];
    expect(ticket?.status).toBe("pending_review");
    expect(ticket?.sourceArtifactIds).toContain("suspicious-login-alert");
    expect(ticket?.sourceArtifactIds).toContain("vpn-context-1");
    expect(ticket?.sourceArtifactIds).toContain("device-inventory-1");
    expect(first.completedView.events.every(({ status }) => ["resolved", "escalated", "expired"].includes(status))).toBe(true);
    expect(first.debrief.decisionReview.decisions.map(({ userChoiceId }) => userChoiceId)).toEqual([
      "escalate-with-comparisons", "snooze", "route-with-interim", "resolve_login_help", "corrected",
    ]);
    expect(first.debrief.decisionReview.decisions[4]?.reasoningAnalysis?.correctionHistory).toEqual([
      { stepId: "handoff-checked", initialOptionIds: ["checks-omitted"], correctedOptionIds: ["correct-omission"] },
    ]);
    expect(JSON.stringify(first.ticketView)).not.toMatch(/requiredOptionIds|coachOnFailure|successText|setFlags/);
  });

  it("falls back to available desktop and dark sources", () => {
    expect(selectProductMedia("a-02", "light", "mobile")).toEqual(productMedia["a-02"].variants.dark.desktop);
    expect(selectProductMedia("a-01", "light", "mobile")).toEqual(productMedia["a-01"].variants.light.mobile);
  });
});
