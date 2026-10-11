import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch();
const output = [];
try {
  for (let i = 0; i < 3; i++) {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 834 },
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.measure = { cls: 0, lcp: 0 };
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.measure.lcp = e.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries())
          if (!e.hadRecentInput) window.measure.cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(process.env.WEB_ORIGIN ?? "http://localhost:5173");
    await page.waitForTimeout(1500);
    output.push(
      await page.evaluate(() => ({
        ...window.measure,
        load: performance.getEntriesByType("navigation")[0].loadEventEnd,
        resources: performance.getEntriesByType("resource").map((e) => ({
          name: e.name.split("/").pop(),
          type: e.initiatorType,
          bytes: e.encodedBodySize,
        })),
      })),
    );
    const startAt = Date.now();
    await page
      .getByRole("link", { name: /Start your first day/ })
      .first()
      .click();
    await page
      .getByRole("heading", {
        name: "Head to Security Operations",
      })
      .waitFor();
    output[i].startToMapMs = Date.now() - startAt;
    await context.close();
  }
} finally {
  await browser.close();
}
writeFileSync(
  process.env.OUTPUT ?? "/tmp/career-expo-public-performance.json",
  JSON.stringify(output, null, 2),
);
console.log(
  output.map((x) => ({
    load: x.load,
    startToMapMs: x.startToMapMs,
    lcp: x.lcp,
    cls: x.cls,
    js: x.resources
      .filter((r) => r.type === "script")
      .reduce((n, r) => n + r.bytes, 0),
    css: x.resources
      .filter((r) => r.name.endsWith(".css"))
      .reduce((n, r) => n + r.bytes, 0),
  })),
);
