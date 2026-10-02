import { test, expect } from "@playwright/test";

for (const width of [1366, 834, 390]) {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`${String(width)} ${reducedMotion}: no flash or reset across the reveal lifecycle`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({
        baseURL: baseURL ?? "http://127.0.0.1:5178",
        viewport: { width, height: 900 },
        reducedMotion,
      });
      await context.addInitScript(() => {
        const frames: number[][] = [];
        Object.assign(window, { revealFrames: frames });
        const sample = () => {
          const rows = document.querySelectorAll(".cp-workshop-career");
          if (rows.length)
            frames.push(
              Array.from(rows, (row) => Number(getComputedStyle(row).opacity)),
            );
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      const page = await context.newPage();
      await page.goto("/careers", { waitUntil: "networkidle" });
      const rows = page.locator(".cp-workshop-career");
      expect(
        await rows.evaluateAll((nodes) =>
          nodes.map((node) => Number(getComputedStyle(node).opacity)),
        ),
      ).toEqual(
        Array.from({ length: 4 }, () => (reducedMotion === "reduce" ? 1 : 0)),
      );
      const reach = async (index: number, slow = false) => {
        const destination = await rows
          .nth(index)
          .evaluate(
            (node) =>
              node.getBoundingClientRect().top +
              scrollY +
              node.getBoundingClientRect().height * 0.6 -
              innerHeight +
              120,
          );
        const start = await page.evaluate(() => scrollY);
        for (let step = 1; step <= (slow ? 20 : 1); step++) {
          await page.evaluate(
            (y) => { scrollTo(0, y); },
            start + ((destination - start) * step) / (slow ? 20 : 1),
          );
          if (slow) await page.waitForTimeout(40);
        }
        await page.waitForTimeout(1250);
        expect(
          await rows
            .nth(index)
            .evaluate((node) => Number(getComputedStyle(node).opacity)),
        ).toBe(1);
      };
      await reach(0, true);
      const first = rows.nth(0);
      await first.evaluate((node) =>
        Object.assign(window, { originalRevealNode: node }),
      );
      await first.getByRole("button").click();
      await first.getByRole("button").click();
      expect(
        await first.evaluate(
          (node) =>
            node ===
            (window as unknown as { originalRevealNode: Element })
              .originalRevealNode,
        ),
      ).toBe(true);
      expect(
        await first.evaluate((node) => Number(getComputedStyle(node).opacity)),
      ).toBe(1);
      await reach(3);
      await page.evaluate(() => { scrollTo(0, 0); });
      await reach(0);
      await reach(3);
      const frames = await page.evaluate(
        () => (window as unknown as { revealFrames: number[][] }).revealFrames,
      );
      expect(frames.length).toBeGreaterThan(20);
      for (let index = 0; index < 4; index++) {
        let previous = 0;
        for (const frame of frames) {
          const opacity = frame[index] ?? 0;
          expect(opacity + 0.002).toBeGreaterThanOrEqual(previous);
          previous = opacity;
        }
      }
      // A new document may reveal again, but must never show final content before hiding it.
      await page.reload({ waitUntil: "networkidle" });
      await reach(3);
      const reloadFrames = await page.evaluate(
        () => (window as unknown as { revealFrames: number[][] }).revealFrames,
      );
      let previous = 0;
      for (const frame of reloadFrames) {
        const opacity = frame[3] ?? 0;
        expect(opacity + 0.002).toBeGreaterThanOrEqual(previous);
        previous = opacity;
      }
      await context.close();
    });
  }
}
