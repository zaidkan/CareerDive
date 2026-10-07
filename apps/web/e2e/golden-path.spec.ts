import { expect, test, type Page, type Request } from "@playwright/test";
import { DESK_LOGIN } from "../src/world/deskLogin.js";

/**
 * Career Expo golden-path smoke test — the permanent product experience.
 *
 * Landing → arrival film → Begin your first day → exactly ONE assessed session
 * → 3D workplace → walk → sit → login → Desk OS → leave/return.
 *
 * Determinism rules:
 *  - Arrival film is fast-forwarded to its real door HUD.
 *  - Walking uses physical keyboard input. Its first waypoint is the successful
 *    five-meter movement mutation; the chair prompt is the second waypoint.
 */

const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:3001";

type SessionCreateCall = { url: string; sessionKind: string | undefined; status: number };
type MovementCall = { request: Request; status: number };

const TRPC_SESSION_CREATE_PATH = "/trpc/session.create";
const TRPC_WORKPLACE_PATH = "/trpc/simulation.performWorkplaceInteraction";

/**
 * User-facing concepts that must NOT come back. Multi-word phrases and
 * `keyboard-first` are searched across all rendered text; standalone
 * `Structured` is only checked against controls/headings/labels so ordinary
 * prose like "the structured summary" in verified canonical content does not
 * cause a false alarm.
 */
const STALE_CONCEPTS: ReadonlyArray<{ phrase: string; scope: "all-text" | "controls" }> = [
  { phrase: "Practice shift", scope: "all-text" },
  { phrase: "Skip practice", scope: "all-text" },
  { phrase: "Start real shift", scope: "all-text" },
  { phrase: "Walk the office", scope: "all-text" },
  { phrase: "Desk only", scope: "all-text" },
  { phrase: "Simple list", scope: "all-text" },
  { phrase: "Direct workstation", scope: "all-text" },
  { phrase: "Structured", scope: "controls" },
  { phrase: "keyboard-first", scope: "all-text" },
];

/** Headings/controls are where an experience-mode screen would surface. */
const CONTROLS_SELECTOR = [
  "button",
  "a",
  "h1",
  "h2",
  "h3",
  "summary",
  "label",
  "select",
  "option",
  '[role="tab"]',
  '[role="radio"]',
  '[role="option"]',
  '[role="checkbox"]',
  '[role="button"]',
].join(",");

/** Chromium/headless media noise that is not app behavior. */
const CONSOLE_ERROR_ALLOWLIST: ReadonlyArray<string> = [
  "Failed to load resource",
  "MEDIA_ERR",
  "NotSupportedError",
  "The play() request was interrupted",
  "Uncaught (in promise) DOMException: The play()",
  "WebGL",
];

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

/** @returns Human-readable list of stale-concept violations found in the DOM. */
async function scanStaleConcepts(page: Page): Promise<string[]> {
  const allText = normalize(await page.locator("body").innerText());
  const controlTexts = await page
    .locator(CONTROLS_SELECTOR)
    .evaluateAll((els) =>
      els.map((el) => {
        const label = el.getAttribute("aria-label");
        return `${label ?? ""} ${el.textContent}`.trim().replace(/\s+/g, " ").toLowerCase();
      }),
    );

  const violations: string[] = [];
  for (const { phrase, scope } of STALE_CONCEPTS) {
    const needle = phrase.toLowerCase();
    if (scope === "all-text") {
      if (allText.includes(needle)) violations.push(phrase);
    } else if (controlTexts.some((text) => text.includes(needle))) {
      violations.push(phrase);
    }
  }
  return violations;
}

/** Fast-forward a playing arrival film to its door-hold beat (0.5s from end). */
async function advanceArrivalFilmToDoors(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const videos = document.querySelectorAll<HTMLVideoElement>(
      'video[aria-label*="Arrival at Verdaly"]',
    );
    for (const video of videos) {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = Math.max(0, video.duration - 0.3);
        void video.play().catch(() => {
          // Unsupported/unplayable media in headless resolves to the film
          // error path, which still reveals the door HUD.
        });
      }
    }
    return videos.length > 0;
  });
}

async function workstationFitsViewport(page: Page): Promise<boolean> {
  return page.locator(".desk-os-laptop").evaluate((laptop) => {
    const frame = laptop.getBoundingClientRect();
    const navBottom = document.querySelector(".site-nav")?.getBoundingClientRect().bottom ?? 0;
    return frame.top >= navBottom - 1 && frame.left >= 0 &&
      frame.right <= window.innerWidth && frame.bottom <= window.innerHeight;
  });
}

test("entry → walk → sit → login → Desk OS continuity", async ({
  page,
}) => {
  // Includes HUD help clicks before walking; allow slow software-rendered 3D input.
  test.setTimeout(360_000);

  const sessionCreates: SessionCreateCall[] = [];
  const movementCalls: MovementCall[] = [];
  const failedApiResponses: string[] = [];
  const failedAssets: string[] = [];
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith(TRPC_WORKPLACE_PATH)) {
      const body = request.postDataJSON() as { interaction?: { type?: string } } | undefined;
      if (body?.interaction?.type === "movement_exertion") movementCalls.push({ request, status: 0 });
    }
    if (
      request.method() === "POST" &&
      request.url().endsWith(TRPC_SESSION_CREATE_PATH)
    ) {
      const body = request.postDataJSON() as { sessionKind?: string } | undefined;
      sessionCreates.push({
        url: request.url(),
        sessionKind: body?.sessionKind,
        status: 0,
      });
    }
  });
  page.on("response", (response) => {
    for (const create of sessionCreates) {
      if (create.url === response.url()) create.status = response.status();
    }
    const movement = movementCalls.find(({ request }) => request === response.request());
    if (movement) movement.status = response.status();
    if (response.status() >= 400 && response.url().startsWith(`${API_ORIGIN}/`)) {
      failedApiResponses.push(
        `${String(response.status())} ${response.request().method()} ${response.url()}`,
      );
    }
    if (response.status() >= 400 && response.url().startsWith(`${WEB_ORIGIN}/`)) {
      failedAssets.push(`${String(response.status())} ${response.url()}`);
    }
  });
  page.on("requestfailed", (request) => {
    if (request.url().startsWith(`${API_ORIGIN}/`)) {
      failedApiResponses.push(`NETWORK ${request.method()} ${request.url()}: ${request.failure()?.errorText ?? "unknown"}`);
    }
    const expectedMediaSeekAbort =
      /\.(mp4|webm)(?:\?|$)/.test(request.url()) &&
      request.failure()?.errorText === "net::ERR_ABORTED";
    if (request.url().startsWith(`${WEB_ORIGIN}/`) && !expectedMediaSeekAbort) {
      failedAssets.push(`NETWORK ${request.url()}: ${request.failure()?.errorText ?? "unknown"}`);
    }
  });
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const assertQuiet = () => {
    const unexpected = consoleErrors.filter(
      (text) => !CONSOLE_ERROR_ALLOWLIST.some((allowed) => text.includes(allowed)),
    );
    expect(failedApiResponses, "no failed tRPC/API calls").toEqual([]);
    expect(failedAssets, "no missing web assets").toEqual([]);
    expect(pageErrors, "no uncaught browser errors").toEqual([]);
    expect(unexpected, "no unexpected app console errors").toEqual([]);
  };

  await test.step("1 · landing loads and the start action works", async () => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Know the work before you choose the career." }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Start your first day/ }).first()).toBeVisible();
    expect(await scanStaleConcepts(page)).toEqual([]);
  });

  await test.step("2 · start navigates into the arrival film", async () => {
    await page.getByRole("link", { name: /Start your first day/ }).first().click();
    await expect(
      page.getByRole("heading", { name: "Short preview film before your first day" }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Play arrival film" })).toBeVisible();
  });

  await test.step("3 · arrival film plays and reaches the door HUD", async () => {
    await page.getByRole("button", { name: "Play arrival film" }).click();
    // Fast-forward the film to its door-hold beat rather than playing minutes
    // of video in a smoke run; the door HUD button is the real gate. Unplayable
    // media resolves through the film error path, which opens the same door.
    const doorHudRegion = page.getByRole("region", { name: /Verdaly doors/ });
    await expect
      .poll(async () => {
        await advanceArrivalFilmToDoors(page);
        try {
          return await doorHudRegion.isVisible();
        } catch {
          return false;
        }
      }, { timeout: 30_000, intervals: [200, 400, 800, 1200] })
      .toBe(true);
    await expect(
      page.getByRole("button", { name: "Start your first day" }),
    ).toBeVisible();
    await expect(page.locator("body")).toContainText("Begin your");
    expect(await scanStaleConcepts(page)).toEqual([]);
  });

  await test.step("4 · Begin your first day enters the simulation", async () => {
    await page.getByRole("button", { name: "Start your first day" }).click();
    // Threshold: the doors open onto the day-one brief, not straight to the
    // floor. The brief is ephemeral presentation with no session of its own.
    await expect(
      page.getByRole("heading", { name: /^Day one as a .+ at Verdaly$/ }),
    ).toBeVisible({ timeout: 30_000 });
    expect(sessionCreates.length, "brief creates no session").toBe(0);
    await page.getByRole("button", { name: "Continue to floor" }).click();
    // The floor screen leads with the canonical Step 1 task, not a generic
    // "floor plan" label, so the heading names the work itself.
    await expect(
      page.getByRole("heading", { name: "Head to Security Operations" }),
    ).toBeVisible({
      timeout: 60_000,
    });
  });

  await test.step("5 · exactly one ASSESSED session is created", async () => {
    expect(sessionCreates.length, "exactly one session.create call").toBe(1);
    expect(sessionCreates[0]?.sessionKind, "sessionKind is assessed").toBe("assessed");
    expect(sessionCreates[0]?.url).toContain("/trpc/session.create");
  });

  await test.step("6 · spatial workplace renders", async () => {
    await page.getByRole("button", { name: /Security Operations/ }).click({ force: true });
    await expect(page.getByRole("region", { name: "Workplace space" })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('section[aria-label="Workplace space"] .room-canvas canvas')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("body")).toContainText("press E to sit", { timeout: 30_000 });
  });

  await test.step("7 · walk with WASD to the workstation", async () => {
    await page.locator('section[aria-label="Workplace space"] .room-canvas canvas').click({ position: { x: 100, y: 100 } });
    await page.getByRole("button", { name: "Show controls" }).click();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    // Closing help leaves a HUD button focused. Movement must work immediately.
    expect(await page.evaluate(() => document.hasFocus()), "browser receives keyboard input").toBe(true);
    await page.keyboard.down("w");
    try {
      await expect.poll(
        async () => {
          // Canvas can appear before PlayerController's keyboard effect mounts.
          // Real held keyboards repeat keydown; Playwright's down() does not.
          await page.keyboard.down("w");
          return movementCalls.length;
        },
        { timeout: 45_000, intervals: [100] },
      ).toBeGreaterThan(0);
      // First 5m bucket fires before the chair's south approach. Continue
      // roughly one meter, then turn east; waiting for API response here can
      // overshoot the chair under variable headless frame rates.
      await page.waitForTimeout(450);
    } finally { await page.keyboard.up("w"); }
    await expect.poll(() => movementCalls[0]?.status, { timeout: 10_000 }).toBe(200);
    await page.keyboard.down("d");
    try {
      await expect(page.getByRole("button", { name: "Sit at computer" })).toBeVisible({ timeout: 20_000 });
    } finally { await page.keyboard.up("d"); }
  });

  await test.step("8 · sit and sign in", async () => {
    // E must perform the same action promised by the ready prompt, even with
    // HUD focus retained from the controls click.
    await page.keyboard.press("e");
    await expect(page.getByTestId("login-curtain")).toBeVisible();
    await expect(page.locator(".site-nav")).toBeHidden();
    await expect(page.locator(".site-footer")).toBeHidden();
    await expect.poll(() => workstationFitsViewport(page)).toBe(true);
    await page.getByTestId("login-surface").click();
    await expect(page.getByRole("heading", { name: "Sign in to Verdaly" })).toBeVisible();
    await page.getByRole("textbox", { name: "Username" }).fill(DESK_LOGIN.username);
    await page.getByRole("textbox", { name: "Password" }).fill(DESK_LOGIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("toolbar", { name: "Taskbar" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Verdaly workstation ready" })).toBeFocused();
    await expect(page.locator('[data-desk-os="true"]')).toBeVisible();
    await expect.poll(() => workstationFitsViewport(page)).toBe(true);
    expect(sessionCreates.length, "login creates no extra session").toBe(1);
  });

  await test.step("9 · leave, walk away, return, and resume Desk OS state", async () => {
    await page.getByRole("button", { name: "Company intranet" }).click();
    await expect(page.getByRole("heading", { name: "Company intranet" })).toBeVisible();
    await page.getByRole("group", { name: "Pinned apps" }).getByRole("button", { name: "Notes", exact: true }).click();
    await page.getByRole("textbox", { name: "Scratch notes" }).fill("continuity probe");
    await page.getByRole("button", { name: "Leave desk" }).click();
    await expect(page.locator(".site-nav")).toBeVisible();
    await expect(page.locator(".site-footer")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sit at computer" })).toBeVisible();
    await page.locator('section[aria-label="Workplace space"] .room-canvas canvas').click({ position: { x: 100, y: 100 } });
    await page.keyboard.down("s");
    try {
      await expect(page.getByRole("button", { name: "Sit at computer" })).toBeHidden({ timeout: 20_000 });
    } finally { await page.keyboard.up("s"); }
    await page.keyboard.down("w");
    try {
      await expect(page.getByRole("button", { name: "Sit at computer" })).toBeVisible({ timeout: 20_000 });
    } finally { await page.keyboard.up("w"); }
    await page.getByRole("button", { name: "Sit at computer" }).click();
    await expect(page.getByRole("heading", { name: "Sign in to Verdaly" })).toHaveCount(0);
    await expect(page.getByRole("toolbar", { name: "Taskbar" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Scratch notes" })).toHaveValue("continuity probe");
    await page.getByRole("group", { name: "Pinned apps" }).getByRole("button", { name: "Browser", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Company intranet" })).toBeVisible();
    expect(sessionCreates.length, "return creates no extra session").toBe(1);
  });

  await test.step("10 · browser Back, Forward and reload retain the same shift and OS", async () => {
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Know the work before you choose the career." })).toBeVisible();
    await page.goForward();
    await expect(page.getByRole("toolbar", { name: "Taskbar" })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole("heading", { name: "Sign in to Verdaly" })).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Scratch notes" })).toHaveValue("continuity probe");
    expect(sessionCreates.length, "Forward resumes instead of creating").toBe(1);
    await page.reload();
    await expect(page.getByRole("toolbar", { name: "Taskbar" })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole("textbox", { name: "Scratch notes" })).toHaveValue("continuity probe");
    expect(sessionCreates.length, "reload resumes instead of creating").toBe(1);
  });

  await test.step("11 · runtime product-contract and session integrity hold", async () => {
    await expect(page.locator("body")).toContainText("Career Expo");
    await expect(page.locator("body")).not.toContainText(
      "That workplace interaction could not be completed.",
    );
    expect(await scanStaleConcepts(page)).toEqual([]);
    // A selectable experience-mode screen would surface as radio/select controls.
    expect(await page.locator("select").count()).toBe(0);
    expect(await page.locator('[role="radio"]').count()).toBe(0);
    expect(sessionCreates.length).toBe(1);
    expect(sessionCreates[0]?.status).toBe(200);
    expect(movementCalls.some(({ status }) => status === 200), "walk submitted successfully").toBe(true);
    assertQuiet();
  });

  console.log(`Browser QA: session.create=${String(sessionCreates.length)}, sessionKind=${sessionCreates[0]?.sessionKind ?? "missing"}, successful movement calls=${String(movementCalls.filter(({ status }) => status === 200).length)}, API errors=${String(failedApiResponses.length)}, asset errors=${String(failedAssets.length)}, page errors=${String(pageErrors.length)}, console errors=${String(consoleErrors.length)}`);
});
