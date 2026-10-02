import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

for (const width of [1366, 1280, 834, 390, 320]) {
  test(`${String(width)}: continuous arrivals and sticky career depth`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 500 ? 780 : 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    const output = `test-results/public-scroll/${String(width)}`;
    mkdirSync(output, { recursive: true });
    const samples: unknown[] = [];
    for (const selector of [".home-place-crop", ".home-realwork-stage", ".home-handoff [data-motion-role=artifact]", ".home-debrief-crop"]) {
      const target = page.locator(selector);
      const top = await target.evaluate((node) => node.getBoundingClientRect().top + scrollY);
      const frames = [];
      for (const fraction of [0.93, 0.7, 0.4, 0.3]) {
        await page.evaluate(({ top, fraction }) => { window.scrollTo(0, top - innerHeight * fraction); }, { top, fraction });
        await page.waitForTimeout(100);
        frames.push(await target.evaluate((node) => {
          const animated = node.matches(".home-realwork-stage, [data-motion-role=artifact]") ? node.parentElement : node;
          const style = getComputedStyle(animated ?? node);
          const matrix = new DOMMatrixReadOnly(style.transform);
          return { opacity: Number(style.opacity), scale: matrix.a, y: matrix.m42 };
        }));
        if (width === 1366 || width === 390) {
          await page.screenshot({ path: `${output}/${selector.replace(/[^a-z]/gi, "-")}-${String(fraction)}.png` });
        }
      }
      const [start, middle, near, end] = frames;
      if (!start || !middle || !near || !end) throw new Error("Arrival frames missing");
      expect(start.scale).toBeLessThan(0.985);
      expect(start.y).toBeGreaterThan(20);
      expect(middle.y).toBeGreaterThan(near.y);
      expect(end.y).toBeCloseTo(0, 0);
      samples.push({ selector, frames });
    }
    const steps = page.locator(".home-acts li");
    const sequence = await page.locator(".home-acts").evaluate((node) => ({ top: node.getBoundingClientRect().top + scrollY, height: node.getBoundingClientRect().height }));
    for (const index of [0, 1, 2]) {
      await page.evaluate(({ top, height, index }) => { window.scrollTo(0, top - innerHeight * 0.75 + (height + innerHeight * 0.4) * index / 2); }, { ...sequence, index });
      await page.waitForTimeout(150);
      const opacity = await steps.evaluateAll((nodes) => nodes.map((node) => Number(getComputedStyle(node).opacity)));
      expect(opacity[index]).toBeGreaterThan(0.95);
      expect(opacity.filter((value) => value < 0.6).length).toBeGreaterThan(0);
    }
    const bounds = await page.locator(".home-careers").evaluate((node) => ({ top: node.getBoundingClientRect().top + scrollY, travel: node.getBoundingClientRect().height - innerHeight }));
    const tabs = page.locator(".home-career-tab");
    for (const index of [0, 1, 2, 3, 4, 3, 2, 1, 0]) {
      await page.evaluate(({ top, travel, index }) => { window.scrollTo(0, top + travel * index / 4); }, { ...bounds, index });
      await page.waitForTimeout(180);
      await expect(tabs.nth(index)).toHaveAttribute("aria-pressed", "true");
      const sticky = await page.locator(".home-careers-sticky").boundingBox();
      if (!sticky) throw new Error("Sticky bounds missing");
      expect(sticky.y).toBeGreaterThanOrEqual(55);
      expect(sticky.y + sticky.height).toBeLessThanOrEqual(width < 500 ? 780 : 900);
      if (index > 0) await expect(page.locator(".home-career-actions button")).toBeDisabled();
      if (width === 1366 || width === 390) await page.screenshot({ path: `${output}/career-${String(index)}.png` });
    }
    await tabs.nth(3).click();
    await page.waitForTimeout(500);
    await expect(tabs.nth(3)).toHaveAttribute("aria-pressed", "true");
    await page.mouse.wheel(0, 20);
    await page.waitForTimeout(150);
    await expect(tabs.nth(3)).toHaveAttribute("aria-pressed", "true");
    await page.evaluate(({ top, travel }) => { window.scrollTo(0, top + travel / 4); }, bounds);
    await page.waitForTimeout(150);
    await expect(tabs.nth(1)).toHaveAttribute("aria-pressed", "true");
    await page.locator(".home-career-actions a[href='/careers']").click();
    await expect(page.locator("h1")).toBeVisible();
    await page.goBack();
    await expect(page.locator("#home-hero-title")).toBeVisible();
    await page.goForward();
    await expect(page.locator("h1")).toBeVisible();
    writeFileSync(`${output}/frames.json`, JSON.stringify(samples, null, 2));
  });
}

for (const width of [1366, 390]) {
  test(`${String(width)}: normal and slow wheel scroll recording`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL: baseURL ?? "http://127.0.0.1:5178",
      viewport: { width, height: width === 390 ? 780 : 900 },
      recordVideo: { dir: `test-results/public-scroll-video/${String(width)}` },
    });
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "networkidle" });
    for (const speed of ["normal", "slow"]) {
      await page.evaluate(() => { window.scrollTo(0, 0); });
      const end = await page.locator(".home-faq").evaluate((node) => node.getBoundingClientRect().top + scrollY);
      const step = speed === "normal" ? 280 : 80;
      for (let position = 0; position < end; position += step) {
        await page.mouse.wheel(0, step);
        await page.waitForTimeout(speed === "normal" ? 100 : 65);
      }
      await expect(page.locator(".home-career-tab").last()).toHaveAttribute("aria-pressed", "true");
    }
    await context.close();
  });
}

test("reduced motion removes runway and scroll transforms; manual browsing survives", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator(".home-careers")).toHaveAttribute("data-scroll-motion", "off");
  expect(await page.locator(".home-careers-sticky").evaluate((node) => getComputedStyle(node).position)).toBe("static");
  for (const selector of [".home-place-crop", ".home-debrief-crop", ".home-acts li"]) {
    expect(await page.locator(selector).first().evaluate((node) => getComputedStyle(node).transform)).toBe("none");
  }
  const tabs = page.locator(".home-career-tab");
  await tabs.nth(4).focus();
  await tabs.nth(4).press("Enter");
  await page.mouse.wheel(0, 350);
  await expect(tabs.nth(4)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".home-career-actions button")).toBeDisabled();
});
