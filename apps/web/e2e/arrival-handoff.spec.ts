import { expect, test, type Page } from "@playwright/test";

async function chooseSoc(page: Page) {
  await page.goto("/start");
  await page.getByRole("button", { name: "Start your first day", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Head to Security Operations" }),
  ).toBeVisible();
  await expect(page.locator('video[src="/arrival-film.mp4"]')).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Continue to floor" }),
  ).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Threshold" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: /Security Operations/ }).click();
}
async function expectLiveRoom(page: Page) {
  await expect(page.locator(".arrival-handoff")).toHaveCount(0, {
    timeout: 60_000,
  });
  await expect(page.locator(".room-stage")).toHaveAttribute(
    "data-scene-ready",
    "true",
  );
  await expect(page.locator(".room-canvas canvas")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^(Exit fullscreen|Fullscreen)$/ }),
  ).toBeVisible();
  await expect(page.locator(".room-stage")).toBeFocused();
}

test("blocked autoplay gives a keyboard entry button; a second refusal reaches live SOC", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // Preserve the original receiver via original.call(this) below.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      return this.matches(".arrival-handoff-video")
        ? Promise.reject(new DOMException("Autoplay denied", "NotAllowedError"))
        : original.call(this);
    };
  });
  await chooseSoc(page);
  const enter = page.getByRole("button", { name: "Enter Security Operations" });
  await expect(enter).toBeFocused();
  await expect(page.getByAltText("Verdaly arrival film poster")).toBeVisible();
  await page.keyboard.press("Enter");
  await expectLiveRoom(page);
});

test("failed film loads skip into the same live scene without a second gate", async ({
  page,
}) => {
  await page.route("**/arrival-film.mp4", (route) => route.abort());
  await chooseSoc(page);
  await expectLiveRoom(page);
  await expect(
    page.getByRole("button", { name: "Enter Security Operations" }),
  ).toHaveCount(0);
});

test("reduced motion requests no movie; reload and repeated room visits do not replay it", async ({
  page,
}) => {
  let filmRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/arrival-film.mp4")) filmRequests++;
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await chooseSoc(page);
  await expectLiveRoom(page);
  expect(filmRequests).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Floor map", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Floor map", exact: true }).click();
  await page.getByRole("button", { name: /Security Operations/ }).click();
  await expect(page.locator(".room-canvas canvas")).toBeVisible();
  await expect(page.locator(".arrival-handoff")).toHaveCount(0);
  expect(filmRequests).toBe(0);
});

test("film end holds a fullscreen entering veil until the delayed WebGL scene really renders", async ({
  page,
}) => {
  let releaseScene!: () => void;
  const heldScene = new Promise<void>((resolve) => {
    releaseScene = resolve;
  });
  await page.route("**/src/world/RoomCanvas.tsx*", async (route) => {
    await heldScene;
    await route.continue();
  });
  try {
    await chooseSoc(page);
    await expect(page.locator(".arrival-handoff-video")).toBeVisible();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Entering Security Operations…" }),
    ).toBeVisible({ timeout: 30_000 });
    expect(
      await page
        .locator(".room-stage")
        .evaluate((el) => document.fullscreenElement === el),
    ).toBe(true);
    await expect(page.locator(".room-stage")).toHaveAttribute(
      "data-scene-ready",
      "false",
    );
    releaseScene();
    await expectLiveRoom(page);
    expect(
      await page
        .locator(".room-stage")
        .evaluate((el) => document.fullscreenElement === el),
    ).toBe(true);
  } finally {
    releaseScene();
  }
});

test("denied native fullscreen keeps the film above the site header and still enters live SOC", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLElement.prototype.requestFullscreen = () =>
      Promise.reject(new DOMException("Fullscreen denied", "NotAllowedError"));
    HTMLMediaElement.prototype.play = () =>
      Promise.reject(new DOMException("Autoplay denied", "NotAllowedError"));
  });
  await chooseSoc(page);
  const enter = page.getByRole("button", { name: "Enter Security Operations" });
  await expect(enter).toBeFocused();
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
  expect(
    await page.evaluate(() =>
      Boolean(
        document.elementFromPoint(40, 30)?.closest(".room-stage-arriving"),
      ),
    ),
  ).toBe(true);
  await page.keyboard.press("Enter");
  await expectLiveRoom(page);
});


test("slow startup and refresh before or during arrival preserve the film and create one session", async ({ page }) => {
  let sessionPosts = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/trpc/session.create")) sessionPosts++;
  });
  await page.route("**/ready", async (route) => {
    // Longer than the former five-second readiness timeout.
    await new Promise((resolve) => setTimeout(resolve, 6500));
    await route.continue();
  });
  await page.goto("/start");
  await page.getByRole("button", { name: "Start your first day", exact: true }).click();
  await expect(page.getByText(
    "Connecting to your shift… The first connection can take up to 90 seconds.",
    { exact: true },
  )).toBeVisible();
  await expect(page.getByRole("heading", { name: "Head to Security Operations" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry starting shift" })).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: /Security Operations/ }).click();
  await expect(page.getByRole("dialog", { name: "Arrival at Verdaly" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("dialog", { name: "Arrival at Verdaly" })).toBeVisible();
  await page.getByRole("button", { name: "Skip film" }).click();
  await expectLiveRoom(page);
  await page.reload();
  await expect(page.locator(".room-stage")).toHaveAttribute("data-scene-ready", "true", { timeout: 60_000 });
  await expect(page.locator(".arrival-handoff")).toHaveCount(0);
  expect(sessionPosts).toBe(1);
});
