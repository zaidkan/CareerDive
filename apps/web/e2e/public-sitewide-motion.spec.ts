import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

for (const width of [1366, 834, 390]) {
  for (const theme of ["dark", "light"]) {
    for (const reducedMotion of ["no-preference", "reduce"] as const) {
      test(`${String(width)} ${theme} ${reducedMotion}: sitewide motion`, async ({
        browser,
        baseURL,
      }) => {
        const output = `test-results/public-sitewide/${String(width)}-${theme}-${reducedMotion}`;
        mkdirSync(output, { recursive: true });
        const context = await browser.newContext({
          baseURL: baseURL ?? "http://127.0.0.1:5178",
          viewport: { width, height: width === 390 ? 780 : 900 },
          reducedMotion,
          recordVideo: { dir: output },
        });
        await context.addInitScript((selectedTheme) => {
          localStorage.setItem("career-expo-theme", selectedTheme);
          const shifts: { value: number; time: number; sources: string[] }[] =
            [];
          Object.assign(window, { sitewideShifts: shifts });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const shift = entry as PerformanceEntry & {
                value: number;
                hadRecentInput: boolean;
                sources: {
                  node: Element | null;
                  previousRect: DOMRectReadOnly;
                  currentRect: DOMRectReadOnly;
                }[];
              };
              if (!shift.hadRecentInput)
                shifts.push({
                  value: shift.value,
                  time: shift.startTime,
                  sources: [
                    `viewport=${String(innerHeight)} motion=${document.querySelector(".home-careers")?.getAttribute("data-scroll-motion") ?? "none"}`,
                    ...shift.sources.map(
                      (source) =>
                        `${source.node?.className ?? "unknown"} ${String(source.previousRect.y)}→${String(source.currentRect.y)} ${String(source.previousRect.height)}→${String(source.currentRect.height)}`,
                    ),
                  ],
                });
            }
          }).observe({ type: "layout-shift", buffered: true });
        }, theme);
        const page = await context.newPage();
        const errors: string[] = [];
        page.on("pageerror", (error) => {
          errors.push(error.message);
        });
        await page.goto("/careers", { waitUntil: "networkidle" });
        await expect(page.locator(".cp-hero-content")).toBeVisible();
        await expect(page.locator(".cp-workshop-career")).toHaveCount(4);
        const rows = page.locator(".cp-workshop-career");
        for (let index = 0; index < 4; index++) {
          const row = rows.nth(index);
          const bounds = await row.evaluate((node) => ({
            top: node.getBoundingClientRect().top + scrollY,
            height: node.getBoundingClientRect().height,
          }));
          // Barely visible content stays at its readable baseline. Careers wait for 40%.
          await page.evaluate(({ top, height }) => {
            window.scrollTo(0, top + height * 0.2 - innerHeight + 120);
          }, bounds);
          await page.waitForTimeout(100);
          expect(
            await row.evaluate((node) =>
              Number(getComputedStyle(node).opacity),
            ),
          ).toBe(1);
          await page.evaluate(({ top, height }) => {
            window.scrollTo(0, top + height * 0.45 - innerHeight + 120);
          }, bounds);
          await page.waitForTimeout(90 + index * 80);
          const arrival = await row.evaluate((node) => ({
            opacity: Number(getComputedStyle(node).opacity),
            transform: getComputedStyle(node).transform,
          }));
          if (reducedMotion === "reduce") {
            expect(arrival.opacity).toBe(1);
            expect(arrival.transform).toBe("none");
          } else {
            expect(arrival.opacity).toBeLessThan(1);
            expect(arrival.transform).not.toBe("none");
          }
          await page.waitForTimeout(850);
          const request = row.getByRole("button");
          await request.scrollIntoViewIfNeeded();
          const before = await row.evaluate((node) => ({
            top: node.getBoundingClientRect().top + scrollY,
            height: node.getBoundingClientRect().height,
          }));
          await request.click();
          await expect(request).toHaveAttribute("aria-pressed", "true");
          await page.waitForTimeout(300);
          await expect(row.locator('a[href="/start"]')).toHaveCount(0);
          const after = await row.evaluate((node) => ({
            top: node.getBoundingClientRect().top + scrollY,
            height: node.getBoundingClientRect().height,
          }));
          expect(after.height).toBeCloseTo(before.height, 0);
          expect(after.top).toBeCloseTo(before.top, 0);
          await request.click();
          await expect(request).toHaveAttribute("aria-pressed", "false");
        }
        // All rows have entered once. Revisit without pre-triggering fresh rows.
        for (let index = 0; index < 4; index++) {
          const row = rows.nth(index);
          const bounds = await row.evaluate((node) => ({
            top: node.getBoundingClientRect().top + scrollY,
            height: node.getBoundingClientRect().height,
          }));
          for (const position of [
            bounds.top - 1000,
            bounds.top + bounds.height + 1000,
            bounds.top +
              bounds.height * 0.45 -
              (width === 390 ? 780 : 900) +
              120,
          ]) {
            await page.evaluate((y) => {
              window.scrollTo(0, y);
            }, position);
            await page.waitForTimeout(100);
            expect(
              await row.evaluate((node) =>
                Number(getComputedStyle(node).opacity),
              ),
            ).toBe(1);
            expect(
              await row.evaluate((node) => getComputedStyle(node).transform),
            ).toBe("none");
          }
        }
        await page.screenshot({
          path: `${output}/careers.png`,
          fullPage: true,
        });
        await page.goto("/", { waitUntil: "networkidle" });
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        await page.evaluate(async () => {
          for (
            let y = 0;
            y < document.body.scrollHeight;
            y += innerHeight / 2
          ) {
            window.scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          window.scrollTo(0, 0);
        });
        const section = page.locator(".home-careers");
        const bounds = await section.evaluate((node) => ({
          top: node.getBoundingClientRect().top + scrollY,
          travel: node.getBoundingClientRect().height - innerHeight,
        }));
        for (const index of [0, 1, 2, 3, 4]) {
          await page.evaluate(
            ({ top, travel, index }) => {
              window.scrollTo(0, top + (travel * index) / 4);
            },
            { ...bounds, index },
          );
          await page.waitForTimeout(850);
          for (const selector of [
            ".home-careers",
            ".home-careers-chapter",
            ".home-careers-sticky",
            ".home-career-stage",
          ]) {
            expect(
              await page
                .locator(selector)
                .evaluate((node) => getComputedStyle(node).transform),
            ).toBe("none");
          }
          const active = page.locator(
            '.home-career-panel[data-career="active"]',
          );
          await expect
            .poll(async () =>
              active.evaluate(
                (node) =>
                  new DOMMatrixReadOnly(getComputedStyle(node).transform).a,
              ),
            )
            .toBeGreaterThan(0.985);
          if (reducedMotion !== "reduce")
            await expect(
              page.locator(".home-career-tab").nth(index),
            ).toHaveAttribute("aria-pressed", "true");
        }
        await page.screenshot({ path: `${output}/home-careers.png` });
        const metrics = await page.evaluate(() => {
          const shifts = (
            window as unknown as {
              sitewideShifts: { value: number; time: number }[];
            }
          ).sitewideShifts;
          let cls = 0,
            sum = 0,
            first = 0,
            last = 0;
          for (const shift of shifts) {
            if (shift.time - last > 1000 || shift.time - first > 5000) {
              sum = 0;
              first = shift.time;
            }
            sum += shift.value;
            last = shift.time;
            cls = Math.max(cls, sum);
          }
          return {
            cls,
            shifts,
            overflow: document.documentElement.scrollWidth - innerWidth,
          };
        });
        writeFileSync(
          `${output}/metrics.json`,
          JSON.stringify({ ...metrics, errors }, null, 2),
        );
        expect(metrics.cls).toBeLessThan(0.05);
        expect(metrics.overflow).toBeLessThanOrEqual(0);
        expect(errors).toEqual([]);
        writeFileSync(
          `${output}/metrics.json`,
          JSON.stringify({ ...metrics, errors }, null, 2),
        );
        await context.close();
      });
    }
  }
}
