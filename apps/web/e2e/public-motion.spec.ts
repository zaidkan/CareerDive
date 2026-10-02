import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const output = "test-results/public-motion";
const widths = [1366, 1280, 834, 390, 320];

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  for (const theme of ["dark", "light"]) {
    for (const width of widths) {
      test(`${String(width)} ${theme} ${reducedMotion}: shelf, proof, overflow and CLS`, async ({
        browser,
        baseURL,
      }) => {
        mkdirSync(output, { recursive: true });
        const context = await browser.newContext({
          baseURL: baseURL ?? "http://localhost:5178",
          viewport: { width, height: width < 500 ? 780 : 900 },
          reducedMotion,
          hasTouch: width < 500,
        });
        await context.addInitScript((selectedTheme) => {
          localStorage.setItem("career-expo-theme", selectedTheme);
          const values: { value: number; time: number }[] = [];
          Object.assign(window, { publicMotionShifts: values });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const shift = entry as PerformanceEntry & {
                hadRecentInput: boolean;
                value: number;
              };
              if (!shift.hadRecentInput)
                values.push({ value: shift.value, time: shift.startTime });
            }
          }).observe({ type: "layout-shift", buffered: true });
        }, theme);
        const page = await context.newPage();
        const errors: string[] = [];
        page.on("pageerror", (error) => {
          errors.push(error.message);
        });
        await page.goto("/", { waitUntil: "networkidle" });
        const shelf = page.getByRole("group", {
          name: "Careers at Career Expo",
        });
        const cards = shelf.locator("button");
        await expect(cards).toHaveCount(5);
        await cards.first().focus(); // Stops introduction before geometry assertions.
        await cards.first().press("Home");
        await page.waitForTimeout(600);
        await expect(cards.first()).toHaveAttribute("aria-pressed", "true");
        await page.evaluate(() => {
          window.scrollTo(0, 0);
        });
        const baseline = await cards
          .first()
          .evaluate((node) => ({
            x: node.getBoundingClientRect().x,
            y: node.getBoundingClientRect().y + scrollY,
          }));
        await page.screenshot({
          path: `${output}/hero-${String(width)}-${theme}-${reducedMotion}.png`,
          fullPage: false,
        });
        for (let index = 0; index < 5; index++) {
          await cards.first().press("Home");
          await shelf.locator("button[aria-pressed=true]").press("End");
          await shelf.locator("button[aria-pressed=true]").press("Home");
          const selector = page
            .getByRole("group", { name: "Select a career" })
            .locator("button")
            .nth(index);
          await selector.click();
          await page.waitForTimeout(550);
          await expect(cards.nth(index)).toHaveAttribute(
            "aria-pressed",
            "true",
          );
          const bounds = await cards.nth(index).boundingBox();
          expect(bounds).not.toBeNull();
          if (!bounds) throw new Error("Card bounds missing");
          expect(bounds.x).toBeGreaterThanOrEqual(0);
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
          const collision = await page.evaluate(() => {
            const card = document
              .querySelector('.home-hero-card[aria-pressed="true"]')
              ?.getBoundingClientRect();
            const action = document
              .querySelector(".home-hero-actions")
              ?.getBoundingClientRect();
            return card && action
              ? card.left < action.right &&
                  card.right > action.left &&
                  card.top < action.bottom &&
                  card.bottom > action.top
              : false;
          });
          expect(collision).toBe(false);
          if (index === 0)
            await expect(
              page.locator('.home-hero-actions a[href="/start"]'),
            ).toBeVisible();
          else
            await expect(
              page.locator(".home-hero-actions button"),
            ).toBeDisabled();
        }
        if (reducedMotion === "reduce") {
          await page
            .getByRole("group", { name: "Select a career" })
            .locator("button")
            .first()
            .click();
          const after = await cards
            .first()
            .evaluate((node) => ({
              x: node.getBoundingClientRect().x,
              y: node.getBoundingClientRect().y + scrollY,
            }));
          expect(after.x).toBeCloseTo(baseline.x, 0);
          expect(after.y).toBeCloseTo(baseline.y, 0);
        }
        // Real touch input, including vertical native scrolling, on both phone sizes.
        if (width < 500) {
          await page
            .getByRole("group", { name: "Select a career" })
            .locator("button")
            .first()
            .click();
          await cards.first().scrollIntoViewIfNeeded();
          await page.waitForTimeout(550);
          const rect = await cards.first().boundingBox();
          if (!rect) throw new Error("Touch card missing");
          const cdp = await context.newCDPSession(page);
          const x = rect.x + rect.width * 0.8;
          const y = rect.y + rect.height / 2;
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [{ x, y }],
          });
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: x - 90, y }],
          });
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          });
          await expect(cards.nth(1)).toHaveAttribute("aria-pressed", "true");
          await cdp.detach();
        }
        await page.evaluate(async () => {
          for (
            let y = 0;
            y < document.body.scrollHeight;
            y += innerHeight / 2
          ) {
            window.scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 90));
          }
        });
        await page.locator(".home-reflect").scrollIntoViewIfNeeded();
        await page.waitForTimeout(650);
        const debrief = await page.locator(".home-debrief-crop").boundingBox();
        expect(debrief?.height).toBeGreaterThanOrEqual(280);
        await page
          .locator(".home-reflect")
          .screenshot({
            path: `${output}/debrief-${String(width)}-${theme}-${reducedMotion}.png`,
          });
        await page.screenshot({
          path: `${output}/home-${String(width)}-${theme}-${reducedMotion}.png`,
          fullPage: true,
        });
        const metrics = await page.evaluate(() => {
          const shifts = (
            window as unknown as {
              publicMotionShifts: { value: number; time: number }[];
            }
          ).publicMotionShifts;
          let max = 0,
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
            max = Math.max(max, sum);
          }
          return {
            cls: max,
            width: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
          };
        });
        writeFileSync(
          `${output}/metrics-${String(width)}-${theme}-${reducedMotion}.json`,
          JSON.stringify({ ...metrics, errors }, null, 2),
        );
        expect(metrics.scrollWidth).toBeLessThanOrEqual(width);
        expect(metrics.cls).toBeLessThanOrEqual(0.05);
        expect(errors).toEqual([]);
        await context.close();
      });
    }
  }
}

test("finite introduction, scroll career order, and calm secondary pages", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  const cards = page.locator(".home-hero-card");
  for (const index of [1, 2, 3, 4, 0]) {
    await page.clock.runFor(2000);
    await expect(cards.nth(index)).toHaveAttribute("aria-pressed", "true");
  }
  await page.clock.runFor(16000);
  await expect(cards.first()).toHaveAttribute("aria-pressed", "true");
  const section = page.locator(".home-careers");
  const careerBounds = await section.evaluate((node) => ({
    top: node.getBoundingClientRect().top + scrollY,
    travel: node.getBoundingClientRect().height - innerHeight,
  }));
  for (let index = 0; index < 5; index++) {
    await page.evaluate(
      ({ top, travel, index }) => {
        window.scrollTo(0, top + (travel * index) / 4);
      },
      { ...careerBounds, index },
    );
    await page.clock.runFor(600);
    await expect(page.locator(".home-career-tab").nth(index)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }
  for (const route of [
    "/careers",
    "/careers/cybersecurity-analyst",
    "/faq",
    "/trust",
  ]) {
    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (route === "/faq") {
      const summary = page.locator("details summary").first();
      await summary.focus();
      await summary.press("Enter");
      await expect(page.locator("details").first()).toHaveAttribute("open", "");
      await summary.press("Enter");
      await expect(page.locator("details").first()).not.toHaveAttribute(
        "open",
        "",
      );
    }
  }
});
