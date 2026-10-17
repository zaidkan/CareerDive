import { expect, test } from "@playwright/test";

test("landing defers simulation runtime until Start", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Try a slice of the work. See how you'd make the call.",
    }),
  ).toBeVisible();
  const scripts = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter(
        (entry) =>
          (entry as PerformanceResourceTiming).initiatorType === "script",
      )
      .map((entry) => entry.name),
  );
  // StartPage is a lightweight entry shell; the simulation runtime stays lazy.
  expect(
    scripts.some((url) =>
      /RoomCanvas|SpatialShell|\/src\/index\.tsx/.test(url),
    ),
  ).toBe(false);
  await page
    .locator(".home-hero")
    .getByRole("link", { name: /Start your first day/ })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Head to Security Operations",
    }),
  ).toBeVisible();
  await expect(page.locator('video[src="/arrival-film.mp4"]')).toHaveCount(0);
});

test("performance diagnostics do not crash the workplace", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto("/start?perf=1");
  await page.getByRole("button", { name: "Start your first day", exact: true }).click();
  await page
    .getByRole("button", { name: /Security Operations/ })
    .click({ force: true });
  // Diagnostics live inside the deferred WebGL scene, not the HTML room shell.
  await expect(page.locator(".room-stage")).toHaveAttribute(
    "data-scene-ready",
    "true",
    { timeout: 60_000 },
  );
  await expect(page.getByTestId("perf-overlay")).toContainText("tier");
  await expect(page.locator(".room-stage")).toBeVisible();
  expect(errors).toEqual([]);
  await page.goto("/");
  await expect(page.getByTestId("perf-overlay")).toHaveCount(0);
});

test("unconfirmed session creation stays paused across reload", async ({
  page,
}) => {
  let creates = 0;
  await page.route("**/ready", async (route) => {
    await route.fulfill({ json: { status: "ok" } });
  });
  await page.route("**/trpc/session.create", async (route) => {
    creates++;
    await route.abort("failed");
  });
  await page.goto("/start");
  await page.getByRole("button", { name: "Start your first day", exact: true }).click();
  await expect(
    page.getByText(/couldn't confirm whether your shift started/),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText(/couldn't confirm whether your shift started/),
  ).toBeVisible();
  expect(creates).toBe(1);
});
