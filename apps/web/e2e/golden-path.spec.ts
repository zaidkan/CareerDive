import { expect, test, type Page } from "@playwright/test";
import { DESK_LOGIN } from "../src/world/deskLogin.js";

/**
 * Career Expo golden-path smoke test — the permanent product experience.
 *
 * Landing → arrival film → Begin your first day → exactly ONE assessed session
 * → 3D workplace → real WASD walk → sit → login → Desk OS → stand/walk/return.
 *
 * Determinism rules:
 *  - Every wait is state/selector/network-based. No arbitrary sleeps except the
 *    arrival-film fast-forward (moves a real <video> to its final beat because
 *    playing a full 5MB film in a headless run is not the point of the smoke
 *    test) and the walk poll (bounded, not a blanket sleep).
 *  - Walking uses supported WASD controls with network/DOM waypoints so
 *    headless frame rate cannot change the pass condition.
 */

const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:3001";

type SessionCreateCall = { url: string; sessionKind: string | undefined; status: number };
type WorkplaceCall = { url: string; type: string | undefined; status: number };

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
        return `${label ?? ""} ${el.textContent ?? ""}`.trim().replace(/\s+/g, " ").toLowerCase();
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

test("canonical entry → walk → sit → login → Desk OS continuity", async ({
  page,
}) => {
  test.setTimeout(150_000);

  const sessionCreates: SessionCreateCall[] = [];
  const workplaceCalls: WorkplaceCall[] = [];
  const failedApiResponses: string[] = [];
  const failedAssets: string[] = [];
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on("request", (request) => {
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
    if (request.method() === "POST" && request.url().endsWith(TRPC_WORKPLACE_PATH)) {
      const body = request.postDataJSON() as
        | { interaction?: { type?: string } }
        | undefined;
      workplaceCalls.push({
        url: request.url(),
        type: body?.interaction?.type,
        status: 0,
      });
    }
  });
  page.on("response", (response) => {
    const create = sessionCreates.find(
      (entry) => entry.url === response.url() && entry.status === 0,
    );
    if (create) create.status = response.status();
    const workplace = workplaceCalls.find(
      (entry) => entry.url === response.url() && entry.status === 0,
    );
    if (workplace) workplace.status = response.status();
    if (response.status() >= 400 && response.url().startsWith(`${API_ORIGIN}/`)) {
      failedApiResponses.push(
        `${response.status()} ${response.request().method()} ${response.url()}`,
      );
    }
    if (response.status() >= 400 && response.url().startsWith(`${WEB_ORIGIN}/`)) {
      failedAssets.push(`${response.status()} ${response.url()}`);
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
      page.getByRole("heading", { name: "Try day one as a cybersecurity analyst" }),
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
    await expect(page.getByRole("heading", { name: "Day one · floor plan" })).toBeVisible({
      timeout: 60_000,
    });
  });

  await test.step("5 · exactly one ASSESSED session is created", async () => {
    expect(sessionCreates.length, "exactly one session.create call").toBe(1);
    const [create] = sessionCreates;
    expect(create.sessionKind, "sessionKind is assessed").toBe("assessed");
    expect(create.url).toContain("/trpc/session.create");
  });

  await test.step("6 · spatial workplace renders", async () => {
    await page.getByRole("button", { name: /Security Operations/ }).click({ force: true });
    await expect(page.getByRole("region", { name: "Workplace space" })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('section[aria-label="Workplace space"] .room-canvas canvas')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("body")).toContainText("press E to sit", { timeout: 30_000 });
  });

  await test.step("7 · walk to the workstation using supported WASD controls", async () => {
    const canvas = page.locator(
      'section[aria-label="Workplace space"] .room-canvas canvas',
    );
    await canvas.click({ position: { x: 200, y: 180 } });

    await page.keyboard.down("w");
    try {
      await expect
        .poll(
          () =>
            workplaceCalls.filter(
              ({ type, status }) =>
                type === "movement_exertion" && status >= 200 && status < 300,
            ).length,
          { timeout: 30_000, intervals: [100, 200, 400, 800] },
        )
        .toBeGreaterThanOrEqual(1);
    } finally {
      await page.keyboard.up("w");
    }

    await page.keyboard.down("w");
    await page.keyboard.down("d");
    try {
      await expect
        .poll(
          async () =>
            page
              .getByRole("button", { name: "Sit at computer" })
              .isVisible()
              .catch(() => false),
          { timeout: 30_000, intervals: [100, 200, 400] },
        )
        .toBe(true);
    } finally {
      await page.keyboard.up("d");
      await page.keyboard.up("w");
    }
  });

  await test.step("8 · sit and reach the intended workstation login", async () => {
    await page.getByRole("button", { name: "Sit at computer" }).click();
    await expect(page.getByTestId("desk-os-overlay")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Sign in to Verdaly" }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Click to look around");
  });

  await test.step("9 · login unlocks the current session into Desk OS", async () => {
    await page.getByLabel("Username").fill(DESK_LOGIN.username);
    await page.getByLabel("Password").fill(DESK_LOGIN.password);
    await page.getByRole("button", { name: /^Login$/ }).click();

    await expect(
      page.getByRole("heading", { name: "Your workstation" }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("toolbar", { name: "Taskbar" })).toBeVisible();
    await expect(page.locator('[data-desk-os="true"]')).toBeVisible();
    expect(sessionCreates.length, "login does not create another session").toBe(1);
  });

  await test.step("10 · Desk OS state survives stand, walk away, return, and sit", async () => {
    await page.getByRole("button", { name: "Company intranet" }).click();
    await expect(
      page.getByRole("heading", { name: "Company intranet" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Notes" }).click();
    const notes = page.getByLabel("Scratch notes");
    await notes.fill("CHAT12 continuity marker");
    await expect(notes).toHaveValue("CHAT12 continuity marker");

    await page.getByRole("button", { name: "Leave desk" }).click();
    await expect(page.locator("body")).toContainText("Click to look around");

    const canvas = page.locator(
      'section[aria-label="Workplace space"] .room-canvas canvas',
    );
    await canvas.click({ position: { x: 200, y: 180 } });

    await page.keyboard.down("s");
    try {
      await expect
        .poll(
          async () =>
            !(await page
              .getByRole("button", { name: "Sit at computer" })
              .isVisible()
              .catch(() => false)),
          { timeout: 15_000, intervals: [100, 200, 400] },
        )
        .toBe(true);
    } finally {
      await page.keyboard.up("s");
    }

    await page.keyboard.down("w");
    try {
      await expect
        .poll(
          async () =>
            page
              .getByRole("button", { name: "Sit at computer" })
              .isVisible()
              .catch(() => false),
          { timeout: 15_000, intervals: [100, 200, 400] },
        )
        .toBe(true);
    } finally {
      await page.keyboard.up("w");
    }

    await page.getByRole("button", { name: "Sit at computer" }).click();
    await expect(
      page.getByRole("heading", { name: "Sign in to Verdaly" }),
    ).toHaveCount(0);
    await expect(page.getByRole("toolbar", { name: "Taskbar" })).toBeVisible();

    const resumedNotes = page.getByLabel("Scratch notes");
    await expect(resumedNotes).toBeVisible();
    await expect(resumedNotes).toHaveValue("CHAT12 continuity marker");

    await page.getByRole("button", { name: "Browser" }).click();
    await expect(
      page.getByRole("heading", { name: "Company intranet" }),
    ).toBeVisible();

    expect(sessionCreates.length, "stand/return does not create a second session").toBe(1);
  });

  await test.step("7 · runtime product-contract and session integrity hold", async () => {
    await expect(page.locator("body")).toContainText("Career Expo");
    await expect(page.locator("body")).not.toContainText(
      "That workplace interaction could not be completed.",
    );
    expect(await scanStaleConcepts(page)).toEqual([]);
    // A selectable experience-mode screen would surface as radio/select controls.
    expect(await page.locator("select").count()).toBe(0);
    expect(await page.locator('[role="radio"]').count()).toBe(0);
    expect(sessionCreates.length).toBe(1);
    assertQuiet();
  });

  expect(failedApiResponses).toEqual([]);
  console.log(`Browser QA: session.create=${sessionCreates.length}, sessionKind=${sessionCreates[0]?.sessionKind}, API errors=${failedApiResponses.length}, asset errors=${failedAssets.length}, page errors=${pageErrors.length}, console errors=${consoleErrors.length}`);
});
