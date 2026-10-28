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

test("reload recovers a committed shift after both creation responses were lost", async ({ page }) => {
  const requests: (string | null)[] = [];
  const savedSessions: string[] = [];
  await page.route("**/ready", async (route) => {
    await route.fulfill({ json: { status: "ready" } });
  });
  await page.route("**/trpc/session.create", async (route) => {
    requests.push(route.request().postData());
    if (requests.length <= 2) {
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      const body = await response.json() as { result: { data: { sessionId: string } } };
      savedSessions.push(body.result.data.sessionId);
      await route.abort("failed");
    } else await route.continue();
  });
  await page.goto("/start");
  await page.getByRole("button", { name: "Start your first day", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry starting shift" })).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(new Set(savedSessions).size).toBe(1);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Head to Security Operations" })).toBeVisible();
  const resumedId = await page.evaluate(() => JSON.parse(
    sessionStorage.getItem("career-expo-active-session") ?? "null",
  ) as string | null);
  expect(resumedId).toBe(savedSessions[0]);
  expect(requests).toHaveLength(3);
  expect(new Set(requests).size).toBe(1);
});
