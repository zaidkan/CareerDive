import { createRequire } from "node:module";
import { dirname } from "node:path";
import { expect, test } from "@playwright/test";
import { DESK_LOGIN } from "../src/world/deskLogin.js";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core", { paths: [dirname(require.resolve("vitest-axe"))] });

// Run with apps/server/test/debrief-browser-server.ts and Vite. The server
// seeds prior shift work; the browser performs the actual final completion.
test("completion opens five-decision debrief across themes and viewports", async ({ page }) => {
  test.skip(process.env.DEBRIEF_BROWSER_FIXTURE !== "1", "Requires seeded browser fixture server");
  test.setTimeout(150_000);
  const errors: string[] = [];
  const failures: string[] = [];
  let movementCalls = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/trpc/simulation.performWorkplaceInteraction") &&
      request.postData()?.includes('"movement_exertion"')) movementCalls += 1;
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error" && !/WebGL|SwiftShader/.test(message.text()))
      errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && !/\.(mp4|webm)(?:\?|$)/.test(response.url()))
      failures.push(`${String(response.status())} ${response.url()}`);
  });
  page.on("requestfailed", (request) => {
    if (!/\.(mp4|webm)(?:\?|$)/.test(request.url()))
      failures.push(`${request.failure()?.errorText ?? "network"} ${request.url()}`);
  });

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.addInitScript(() => {
    sessionStorage.setItem("first-shift-start-gate", "sim");
    localStorage.setItem("career-expo-theme", "dark");
  });
  await page.goto("/start", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Head to Security Operations" })).toBeVisible();
  await page.getByRole("button", { name: /Security Operations/ }).click({ force: true });
  await expect(page.getByRole("region", { name: "Workplace space" })).toBeVisible();
  await expect(page.locator("body")).toContainText("press E to sit");
  await page.locator('section[aria-label="Workplace space"] .room-canvas canvas')
    .click({ position: { x: 100, y: 100 } });
  await page.keyboard.down("w");
  try {
    await expect.poll(async () => {
      await page.keyboard.down("w");
      return movementCalls;
    }, { timeout: 45_000, intervals: [100] }).toBeGreaterThan(0);
    await page.waitForTimeout(450);
  } finally { await page.keyboard.up("w"); }
  await page.keyboard.down("d");
  try {
    await expect(page.getByRole("button", { name: "Sit at computer" })).toBeVisible({ timeout: 30_000 });
  } finally { await page.keyboard.up("d"); }
  await page.getByRole("button", { name: "Sit at computer" }).click();
  await page.getByTestId("login-surface").click();
  await expect(page.getByRole("heading", { name: "Sign in to Verdaly" })).toBeVisible();
  await page.getByRole("textbox", { name: "Username" }).fill(DESK_LOGIN.username);
  await page.getByRole("textbox", { name: "Password" }).fill(DESK_LOGIN.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("toolbar", { name: "Taskbar" })).toBeVisible();
  await page.getByRole("tab", { name: /^Team/ }).click();
  let releaseDebrief: () => void = () => {};
  const debriefGate = new Promise<void>((resolve) => { releaseDebrief = resolve; });
  await page.route(/\/trpc\/debrief\.get(?:\?|$)/, async (route) => {
    await debriefGate;
    await route.continue();
  });
  await page.locator('button[data-action-id="complete_shift"]').click();

  try {
    await expect(page.getByRole("heading", { name: "Shift complete" })).toBeVisible();
    await expect(page.getByText("Gathering your decisions and evidence into a review…")).toBeVisible();
  } finally { releaseDebrief(); }

  await expect(page.getByRole("heading", { name: "Your shift in review" })).toBeVisible();
  await expect(page.locator(".decision-review-item")).toHaveCount(5);
  await expect(page.locator(".decision-review-profile dt")).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "How other completed shifts handled this" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "The urgent access request" })).toBeVisible();
  expect(await page.locator(".decision-review-item").nth(2).getByText("100%").count()).toBe(0);

  await page.addScriptTag({ path: axePath });
  const contrastViolations = () => page.evaluate(async () => {
    const axe = (window as Window & { axe?: {
      run: (element: Element, options: object) => Promise<{
        violations: Array<{ id: string; nodes: Array<{ target: string[] }> }>;
      }>;
    } }).axe;
    if (!axe) throw new Error("axe-core did not load");
    const result = await axe.run(document.querySelector(".decision-review") ?? document.body,
      { runOnly: { type: "rule", values: ["color-contrast"] } });
    return result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) }));
  });

  const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(await fits()).toBe(true);
  expect(await contrastViolations()).toEqual([]);
  await page.screenshot({ path: "test-results/debrief-desktop-dark.png", fullPage: true });
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await fits()).toBe(true);
  expect(await contrastViolations()).toEqual([]);
  await page.screenshot({ path: "test-results/debrief-desktop-light.png", fullPage: true });
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await fits()).toBe(true);
  expect(await contrastViolations()).toEqual([]);
  await page.screenshot({ path: "test-results/debrief-mobile-dark.png", fullPage: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("heading", { name: "How you worked" })).toBeVisible();
  await page.locator(".decision-review-intro a").first().focus();
  await page.keyboard.press("Tab");
  await expect(page.locator(".decision-review-intro a").nth(1)).toBeFocused();
  await page.locator(".decision-review-intro a").first().focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#decision-suspicious_login$/);
  await page.locator(".decision-review-other-path summary").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".decision-review-other-path").first()).toHaveAttribute("open", "");
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
});
