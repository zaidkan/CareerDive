import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

for (const width of [1366, 834, 390]) {
  for (const theme of ["dark", "light"]) {
    for (const reducedMotion of ["no-preference", "reduce"] as const) {
      test(`${String(width)} ${theme} ${reducedMotion}: contextual flow and concise privacy`, async ({
        browser,
        baseURL,
      }) => {
        const output = `test-results/public-micro/${String(width)}-${theme}-${reducedMotion}`;
        mkdirSync(output, { recursive: true });
        const context = await browser.newContext({
          baseURL: baseURL ?? "http://127.0.0.1:5178",
          viewport: { width, height: width === 390 ? 780 : 900 },
          reducedMotion,
        });
        await context.addInitScript((selectedTheme) => {
          localStorage.setItem("career-expo-theme", selectedTheme);
          const shifts: { value: number; time: number }[] = [];
          Object.assign(window, { microShifts: shifts });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const shift = entry as PerformanceEntry & {
                value: number;
                hadRecentInput: boolean;
              };
              if (!shift.hadRecentInput)
                shifts.push({ value: shift.value, time: shift.startTime });
            }
          }).observe({ type: "layout-shift", buffered: true });
        }, theme);
        const page = await context.newPage();
        const errors: string[] = [];
        page.on("pageerror", (error) => {
          errors.push(error.message);
        });
        await page.goto("/", { waitUntil: "networkidle" });
        const section = page.locator(".home-shift");
        const bounds = await section.evaluate((node) => ({
          top: node.getBoundingClientRect().top + scrollY,
          travel: node.getBoundingClientRect().height - innerHeight,
        }));
        for (const index of [0, 1, 2]) {
          if (reducedMotion === "reduce") {
            const controls = page.getByRole("group", {
              name: "Shift work context",
            });
            await controls.locator("button").nth(index).focus();
            await controls.locator("button").nth(index).press("Enter");
          } else {
            await page.evaluate(
              ({ top, travel, index }) => {
                window.scrollTo(0, top + (travel * index) / 2);
              },
              { ...bounds, index },
            );
          }
          await page.waitForTimeout(200);
          await expect(
            page.locator(`[data-shift-step="${String(index)}"]`),
          ).toHaveAttribute("aria-hidden", "false");
          const visible = await page
            .locator(".home-shift-work-state")
            .evaluateAll(
              (nodes) =>
                nodes.filter(
                  (node) => Number(getComputedStyle(node).opacity) > 0.005,
                ).length,
            );
          expect(visible).toBe(1);
          const proof = await page.locator(".home-shift-proof").boundingBox();
          const list = await page.locator(".home-acts").boundingBox();
          const grid = await page.locator(".home-shift-grid").boundingBox();
          if (!proof || !list || !grid)
            throw new Error("Flow geometry missing");
          if (width === 1366) {
            expect(proof.x).toBeGreaterThan(list.x + list.width);
            expect(proof.width / grid.width).toBeGreaterThan(0.4);
            expect(proof.width / grid.width).toBeLessThan(0.5);
          } else expect(proof.y).toBeGreaterThanOrEqual(list.y + list.height);
          if (reducedMotion !== "reduce") {
            const sticky = await page
              .locator(".home-shift-sticky")
              .boundingBox();
            if (!sticky) throw new Error("Flow sticky missing");
            expect(sticky.y).toBeGreaterThanOrEqual(70);
            expect(sticky.y + sticky.height).toBeLessThanOrEqual(
              width === 390 ? 780 : 900,
            );
          }
          await page.screenshot({
            path: `${output}/shift-${String(index)}.png`,
          });
        }
        if (reducedMotion !== "reduce") {
          for (const progress of [0.24, 0.25, 0.26, 0.74, 0.75, 0.76]) {
            await page.evaluate(
              ({ top, travel, progress }) => {
                window.scrollTo(0, top + travel * progress);
              },
              { ...bounds, progress },
            );
            await page.waitForTimeout(100);
            expect(
              await page
                .locator(".home-shift-work-state")
                .evaluateAll(
                  (nodes) =>
                    nodes.filter(
                      (node) => Number(getComputedStyle(node).opacity) > 0.005,
                    ).length,
                ),
            ).toBeLessThanOrEqual(1);
          }
        }
        const home = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - innerWidth,
          shifts: (
            window as unknown as {
              microShifts: { value: number; time: number }[];
            }
          ).microShifts,
        }));
        let cls = 0,
          sum = 0,
          first = 0,
          last = 0;
        for (const shift of home.shifts) {
          if (shift.time - last > 1000 || shift.time - first > 5000) {
            sum = 0;
            first = shift.time;
          }
          sum += shift.value;
          last = shift.time;
          cls = Math.max(cls, sum);
        }
        expect(cls).toBeLessThan(0.05);
        expect(home.overflow).toBeLessThanOrEqual(0);
        await page.goto("/trust", { waitUntil: "networkidle" });
        await expect(
          page.getByRole("heading", { level: 1, name: "Privacy and safety" }),
        ).toBeVisible();
        await expect(page.locator(".trust-sections > section")).toHaveCount(8);
        await expect(
          page.getByText("Persistent report storage is not implemented.", {
            exact: false,
          }),
        ).toBeVisible();
        await page.getByText("Access and data-control details").focus();
        await page.keyboard.press("Enter");
        await expect(page.locator(".trust-page details")).toHaveAttribute(
          "open",
          "",
        );
        const privacyOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        );
        expect(privacyOverflow).toBeLessThanOrEqual(0);
        await page.screenshot({ path: `${output}/trust.png`, fullPage: true });
        expect(errors).toEqual([]);
        writeFileSync(
          `${output}/metrics.json`,
          JSON.stringify(
            { cls, homeOverflow: home.overflow, privacyOverflow, errors },
            null,
            2,
          ),
        );
        await context.close();
      });
    }
  }
}
