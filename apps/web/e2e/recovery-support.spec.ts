import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    { sessionStorage.setItem("first-shift-start-gate", "sim"); },
  );
});

test("temporary connection failure retries once, manual retry starts one shift", async ({
  page,
}) => {
  let readinessCalls = 0;
  let sessions = 0;
  await page.route("**/ready", async (route) => {
    readinessCalls++;
    if (readinessCalls <= 2) await route.abort("failed");
    else await route.continue();
  });
  page.on("request", (request) => {
    if (request.url().includes("/trpc/session.create")) sessions++;
  });
  await page.goto("/start");
  const retry = page.getByRole("button", { name: "Retry starting shift" });
  await expect(retry).toBeVisible();
  await expect(retry).toBeFocused();
  expect(readinessCalls).toBe(2);
  expect(sessions).toBe(0);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: /Security Operations/ }),
  ).toBeVisible();
  expect(sessions).toBe(1);
  await page.getByText("Accessibility recovery", { exact: true }).click();
  await page
    .getByRole("button", { name: "Recover workstation access" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Recovery workstation", exact: true }),
  ).toBeFocused();
  expect(sessions).toBe(1);
});

test("no WebGL offers compatible workstation and useful report without backend", async ({
  page,
  context,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "getContext")?.value as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      kind: string,
      ...args: unknown[]
    ) {
      if (
        kind === "webgl" ||
        kind === "webgl2" ||
        kind === "experimental-webgl"
      )
        return null;
      return Reflect.apply(original, this, [kind, ...args]) as RenderingContext | null;
    } as typeof original;
  });
  let sessions = 0;
  page.on("request", (request) => {
    if (request.url().includes("/trpc/session.create")) sessions++;
  });
  await page.route("**/api/support-reports", (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.goto("/start");
  await page.getByRole("button", { name: /Security Operations/ }).click();
  await expect(
    page.getByRole("heading", { name: "Continue in the recovery workstation" }),
  ).toBeFocused();
  await expect(page.getByRole("status")).toContainText(
    "couldn't provide the graphics",
  );
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Open recovery workstation" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Recovery workstation", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Your workstation" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Report a problem" }).click();
  await expect(page.getByRole("combobox", { name: "Category", exact: true })).toBeFocused();
  await page
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("Office did not open; my work stayed available.");
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText(/couldn't confirm delivery/)).toBeVisible();
  await page.getByLabel("Include technical details").check();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy report details" }).click();
  const report = JSON.parse(
    await page.evaluate(() => navigator.clipboard.readText()),
  ) as {
    description: string;
    technicalDetails: { reducedMotion: boolean; webgl: boolean; phase: string };
  };
  expect(report.description).toContain("my work stayed available");
  expect(report.technicalDetails).toMatchObject({
    webgl: false,
    reducedMotion: true,
    phase: "workstation",
  });
  await page.getByRole("button", { name: "Close report" }).click();
  await expect(
    page.getByRole("button", { name: "Report a problem" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Report a problem" }).click();
  await expect(page.getByRole("textbox", { name: "Description", exact: true })).toHaveValue(
    report.description,
  );
  expect(sessions).toBe(1);
  await page.screenshot({ path: "/tmp/recovery-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/recovery-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("unconfirmed creation never repeats POST", async ({ page }) => {
  let sessions = 0;
  await page.route("**/trpc/session.create", async (route) => {
    sessions++;
    await route.abort("failed");
  });
  await page.goto("/start");
  await expect(
    page.getByText(/couldn't confirm whether your shift started/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry starting shift" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Report a problem" }),
  ).toBeVisible();
  expect(sessions).toBe(1);
});
