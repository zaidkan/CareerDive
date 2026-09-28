import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { productMedia, selectProductMedia } from "../src/site/productMedia.js";

// Base in a variable: vite rewrites inline new URL(literal, import.meta.url) to a dev-server URL.
const moduleBase = import.meta.url;
const publicRoot = new URL("../public/", moduleBase);
const provenance = JSON.parse(readFileSync(new URL("../public/careers/media/provenance.json", moduleBase), "utf8")) as Array<{
  id: string; file: string; pack: string; packSha256: string; seed: number; route: string; actions: string[]; theme: string; viewport: { width: number; height: number }; crop: string;
}>;

describe("public product media", () => {
  it("has twelve typed scenes backed by real files and matching provenance", () => {
    expect(Object.keys(productMedia)).toEqual(Array.from({ length: 12 }, (_, index) => `a-${String(index + 1).padStart(2, "0")}`));
    const packSha256 = createHash("sha256").update(readFileSync(new URL("../../../content/packs/cybersecurity-analyst/pack.yaml", moduleBase))).digest("hex");
    let count = 0;
    for (const media of Object.values(productMedia)) {
      expect(media.provenance).toBe("/careers/media/provenance.json");
      for (const [theme, devices] of Object.entries(media.variants)) {
        for (const variant of Object.values(devices)) {
          const source = readFileSync(new URL(`.${variant.src}`, publicRoot));
          expect(source.subarray(0, 4).toString()).toBe("RIFF");
          expect(source.subarray(8, 12).toString()).toBe("WEBP");
          expect(source.length).toBeGreaterThan(1000);
          expect(variant.aspectRatio).toMatch(/^\d+ \/ \d+$/);
          expect(provenance).toContainEqual(expect.objectContaining({
            id: media.id, file: variant.src.split("/").at(-1), pack: "cybersecurity_analyst@1.0.0",
            packSha256, seed: 7, route: "/fixtures/product-media.html", theme, crop: "fullPage",
          }));
          count++;
        }
      }
    }
    expect(provenance).toHaveLength(count);
    expect(count).toBe(21);
  });

  it("falls back to available desktop and dark sources", () => {
    expect(selectProductMedia("a-02", "light", "mobile")).toEqual(productMedia["a-02"].variants.dark.desktop);
    expect(selectProductMedia("a-01", "light", "mobile")).toEqual(productMedia["a-01"].variants.light.mobile);
  });
});
