import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

for (const width of [1366, 1280, 834, 390, 320]) {
  test(`${String(width)}: continuous arrivals and sticky career depth`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width < 500 ? 780 : 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    const output = `test-results/public-scroll/${String(width)}`;
    mkdirSync(output, { recursive: true });
    const samples: unknown[] = [];
    // Each coherent proof advances and then gives way to the next scene.
    for (const selector of [
      ".home-place .home-scene",
      ".home-realwork .home-scene",
      ".home-reflect .home-scene",
    ]) {
      const target = page.locator(selector);
      const bounds = await target.evaluate((node) => ({
        top: node.getBoundingClientRect().top + scrollY,
        height: node.getBoundingClientRect().height,
      }));
      const frames = [];
      for (const progress of [0.05, 0.2, 0.5, 0.9]) {
        await page.evaluate(
          ({ top, height, progress }) => {
            window.scrollTo(
              0,
              top - innerHeight + (height + innerHeight) * progress,
            );
          },
          { ...bounds, progress },
        );
        await page.waitForTimeout(100);
        frames.push(
          await target.locator(".home-scene-composition").evaluate((node) => {
            const style = getComputedStyle(node);
            const matrix = new DOMMatrixReadOnly(style.transform);
            return {
              opacity: Number(style.opacity),
              scale: matrix.a,
              y: matrix.m42,
            };
          }),
        );
        if (width === 1366 || width === 390)
          await page.screenshot({
            path: `${output}/${selector.replace(/[^a-z]/gi, "-")}-${String(progress)}.png`,
          });
      }
      const [start, middle, dominant, exit] = frames;
      if (!start || !middle || !dominant || !exit)
        throw new Error("Story frames missing");
      expect(start.scale).toBeLessThan(0.985);
      expect(start.y).toBeGreaterThan(20);
      expect(middle.y).toBeLessThan(start.y);
      expect(dominant.y).toBeCloseTo(0, 0);
      expect(dominant.scale).toBeCloseTo(1, 2);
      expect(exit.y).toBeLessThan(-15);
      expect(exit.scale).toBeLessThan(dominant.scale);
      samples.push({ selector, frames });
    }
    const steps = page.locator(".home-acts li");
    const sequence = await page.locator(".home-shift").evaluate((node) => ({
      top: node.getBoundingClientRect().top + scrollY,
      travel: node.getBoundingClientRect().height - innerHeight,
    }));
    for (const index of [0, 1, 2]) {
      await page.evaluate(
        ({ top, travel, index }) => {
          window.scrollTo(0, top + (travel * index) / 2);
        },
        { ...sequence, index },
      );
      await page.waitForTimeout(150);
      const opacity = await steps.evaluateAll((nodes) =>
        nodes.map((node) => Number(getComputedStyle(node).opacity)),
      );
      expect(opacity[index]).toBeGreaterThan(0.95);
      expect(opacity.filter((value) => value < 0.95).length).toBeGreaterThan(0);
      const boxes = await steps.evaluateAll((nodes) =>
        nodes.map((node) => {
          const r = node.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom };
        }),
      );
      for (let row = 1; row < boxes.length; row++)
        expect(boxes[row]?.top).toBeGreaterThanOrEqual(
          boxes[row - 1]?.bottom ?? 0,
        );
    }
    const bounds = await page.locator(".home-careers").evaluate((node) => ({
      top: node.getBoundingClientRect().top + scrollY,
      travel: node.getBoundingClientRect().height - innerHeight,
    }));
    const tabs = page.locator(".home-career-tab");
    for (const index of [0, 1, 2, 3, 4, 3, 2, 1, 0]) {
      await page.evaluate(
        ({ top, travel, index }) => {
          window.scrollTo(0, top + (travel * index) / 4);
        },
        { ...bounds, index },
      );
      await page.waitForTimeout(180);
      await expect(tabs.nth(index)).toHaveAttribute("aria-pressed", "true");
      const sticky = await page.locator(".home-careers-sticky").boundingBox();
      if (!sticky) throw new Error("Sticky bounds missing");
      expect(sticky.y).toBeGreaterThanOrEqual(55);
      expect(sticky.y + sticky.height).toBeLessThanOrEqual(
        width < 500 ? 780 : 900,
      );
      if (index > 0)
        await expect(
          page.locator(".home-career-actions button"),
        ).toBeDisabled();
      if (width === 1366 || width === 390)
        await page.screenshot({
          path: `${output}/career-${String(index)}.png`,
        });
    }
    // Never paint two readable career panels over one another during handover.
    for (const position of [
      0.25, 0.49, 0.5, 0.51, 0.75, 1.49, 1.51, 2.49, 2.51, 3.49, 3.51,
    ]) {
      await page.evaluate(
        ({ top, travel, position }) => {
          window.scrollTo(0, top + (travel * position) / 4);
        },
        { ...bounds, position },
      );
      await page.waitForTimeout(70);
      const visible = await page
        .locator(".home-career-panel")
        .evaluateAll(
          (nodes) =>
            nodes.filter(
              (node) => Number(getComputedStyle(node).opacity) > 0.005,
            ).length,
        );
      expect(visible).toBeLessThanOrEqual(1);
    }
    await tabs.first().focus();
    await tabs.first().press("End");
    await expect(tabs.last()).toHaveAttribute("aria-pressed", "true");
    await tabs.last().press("ArrowLeft");
    await expect(tabs.nth(3)).toHaveAttribute("aria-pressed", "true");
    await page.evaluate(({ top, travel }) => {
      window.scrollTo(0, top + (travel * 3.51) / 4);
    }, bounds);
    await tabs.nth(3).click();
    await page.waitForTimeout(500);
    await expect(tabs.nth(3)).toHaveAttribute("aria-pressed", "true");
    await page.mouse.wheel(0, 20);
    await page.waitForTimeout(150);
    await expect(tabs.nth(3)).toHaveAttribute("aria-pressed", "true");
    await page.evaluate(({ top, travel }) => {
      window.scrollTo(0, top + travel / 4);
    }, bounds);
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
  test(`${String(width)}: normal and slow wheel scroll recording`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL: baseURL ?? "http://127.0.0.1:5178",
      viewport: { width, height: width === 390 ? 780 : 900 },
      recordVideo: { dir: `test-results/public-scroll-video/${String(width)}` },
    });
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "networkidle" });
    for (const speed of ["normal", "slow"]) {
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      const end = await page
        .locator(".home-faq")
        .evaluate((node) => node.getBoundingClientRect().top + scrollY);
      const step = speed === "normal" ? 280 : 80;
      for (let position = 0; position < end; position += step) {
        await page.mouse.wheel(0, step);
        await page.waitForTimeout(speed === "normal" ? 100 : 65);
      }
      await expect(page.locator(".home-career-tab").last()).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
    await context.close();
  });
}

test("reduced motion removes runway and scroll transforms; manual browsing survives", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator(".home-careers")).toHaveAttribute(
    "data-scroll-motion",
    "off",
  );
  expect(
    await page
      .locator(".home-careers-sticky")
      .evaluate((node) => getComputedStyle(node).position),
  ).toBe("static");
  for (const selector of [".home-scene-composition", ".home-acts li"]) {
    expect(
      await page
        .locator(selector)
        .first()
        .evaluate((node) => getComputedStyle(node).transform),
    ).toBe("none");
  }
  const tabs = page.locator(".home-career-tab");
  await tabs.nth(4).focus();
  await tabs.nth(4).press("Enter");
  await page.mouse.wheel(0, 350);
  await expect(tabs.nth(4)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".home-career-actions button")).toBeDisabled();
});
