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
  // StartPage is the eager arrival shell; the simulation runtime stays lazy.
  expect(
    scripts.some((url) =>
      /RoomCanvas|SpatialShell|\/src\/index\.tsx/.test(url),
    ),
  ).toBe(false);
  await page
    .getByRole("link", { name: /Start your first day/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Short preview film before your first shift",
    }),
  ).toBeVisible();
});

test("performance diagnostics do not crash the workplace", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.addInitScript(() => {
    sessionStorage.setItem("first-shift-start-gate", "sim");
  });
  await page.goto("/start?perf=1");
  await page
    .getByRole("button", { name: /Security Operations/ })
    .click({ force: true });
  await expect(page.getByTestId("perf-overlay")).toContainText("tier");
  await expect(
    page.getByRole("region", { name: "Workplace space" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await page.goto("/");
  await expect(page.getByTestId("perf-overlay")).toHaveCount(0);
});

test("unconfirmed session creation stays paused across reload", async ({
  page,
}) => {
  let creates = 0;
  await page.addInitScript(() => {
    sessionStorage.setItem("first-shift-start-gate", "sim");
  });
  await page.route("**/ready", async (route) => {
    await route.fulfill({ json: { status: "ok" } });
  });
  await page.route("**/trpc/session.create", async (route) => {
    creates++;
    await route.abort("failed");
  });
  await page.goto("/start");
  await expect(
    page.getByText(/couldn't confirm whether your shift started/),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText(/couldn't confirm whether your shift started/),
  ).toBeVisible();
  expect(creates).toBe(1);
});
