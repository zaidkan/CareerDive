// UI-2 homepage QA: screenshots + horizontal-overflow probe + keyboard order.
// Uses an isolated dev server (port 5178) — never touches the shared 5173 instance.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = process.env.QA_BASE ?? "http://localhost:5178/";
const OUT = "qa-shots-ui2";
const WIDTHS = [1366, 1280, 834, 390, 320];

mkdirSync(OUT, { recursive: true });

async function settle(page) {
  await page.goto(BASE, { waitUntil: "networkidle" });
  // Trigger lazy media before full-page capture.
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
}

const browser = await chromium.launch();
const report = [];

for (const theme of ["dark", "light"]) {
  for (const width of WIDTHS) {
    const page = await browser.newPage({
      viewport: { width, height: width <= 480 ? 780 : 900 },
    });
    await settle(page);
    await page.evaluate((t) => {
      window.localStorage.setItem("career-expo-theme", t);
      document.documentElement.setAttribute("data-theme", t);
    }, theme);
    await page.waitForTimeout(250);
    const probe = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    const overflow =
      probe.scrollWidth > probe.innerWidth
        ? `OVERFLOW ${probe.scrollWidth}>${probe.innerWidth}`
        : "ok";
    report.push(`${theme} ${width}px: ${overflow}`);
    await page.screenshot({
      path: `${OUT}/home-${String(width)}-${theme}.png`,
      fullPage: true,
    });
    await page.close();
  }
}

// Reduced motion preserves composition.
const reduced = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  reducedMotion: "reduce",
});
await settle(reduced);
await reduced.screenshot({
  path: `${OUT}/home-1280-dark-reduced.png`,
  fullPage: true,
});
await reduced.close();

// Keyboard: first stops must include skip link, nav, hero primary CTA.
const kb = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await settle(kb);
const order = [];
for (let i = 0; i < 10; i += 1) {
  await kb.keyboard.press("Tab");
  order.push(
    await kb.evaluate(() => {
      const el = document.activeElement;
      if (!el) return "none";
      return `${el.tagName}: ${(el.textContent ?? "").trim().slice(0, 32)}`;
    }),
  );
}
report.push(`TAB ORDER:\n  ${order.join("\n  ")}`);
await kb.close();

await browser.close();
console.log(report.join("\n"));
