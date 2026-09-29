import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const web = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const webUrl = new URL(web);
const FIXTURE = `${web}/fixtures/workshop-artifacts.html`;
const OUT = process.env.SHOT_DIR ?? "/tmp/career-expo-shots";
mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function healthy(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok;
  } catch {
    return false;
  }
}

function watch(page) {
  const issues = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") issues.push(`console.error: ${msg.text()}`);
  });
  page.on("pageerror", (err) => issues.push(`pageerror: ${err.message}`));
  page.on("requestfailed", (req) => issues.push(`requestfailed: ${req.url()}`));
  page.on("response", (res) => {
    if (res.status() >= 400) issues.push(`http ${res.status()}: ${res.url()}`);
  });
  return issues;
}

const EXPECTED_IDS = [
  "nurse-handoff", "nurse-vitals", "nurse-meds", "nurse-priority",
  "mech-drawing", "mech-tolerance", "mech-test", "mech-revision",
  "elec-schematic", "elec-schedule", "elec-troubleshoot", "elec-verify",
  "law-facts", "law-redline", "law-research", "law-matrix",
];

setTimeout(() => process.exit(1), 300000).unref();

if (await healthy(web)) {
  console.error("Dev port already in use.");
  process.exit(1);
}

const servers = [];
try {
  servers.push(
    spawn(
      "pnpm",
      ["--filter", "@sim/web", "exec", "vite", "--host", webUrl.hostname, "--port", webUrl.port || "5173", "--strictPort"],
      { detached: true, stdio: "inherit" },
    ),
  );
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await healthy(web)) break;
    if (servers[0].exitCode !== null || attempt === 119) {
      throw new Error("Vite dev server did not become healthy");
    }
    await delay(1000);
  }

  const browser = await chromium.launch();

  async function auditPage({ width, height, theme, reducedMotion = "no-preference", shot }) {
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme, reducedMotion });
    const page = await context.newPage();
    const issues = watch(page);
    await page.goto(FIXTURE, { waitUntil: "load" });
    await page.waitForTimeout(900);
    const state = await page.evaluate((ids) => {
      const arts = [...document.querySelectorAll("[data-workshop-artifact]")];
      const inner = window.innerWidth;
      const provenance = [...document.querySelectorAll(".ui-provenance")];
      const tables = [...document.querySelectorAll("table.wa-table")];
      const svgs = [...document.querySelectorAll("[data-workshop-artifact] svg[role='img']")];
      const interactiveInArtifacts = arts.flatMap((a) => [...a.querySelectorAll("button, a, input, select, textarea, [tabindex]")]);
      const table = tables[0];
      const name = document.querySelector(".wa-name");
      return {
        pathname: window.location.pathname,
        themeAttr: document.documentElement.dataset.theme,
        rootBg: getComputedStyle(document.documentElement).backgroundColor,
        ids: arts.map((a) => a.getAttribute("data-workshop-artifact")),
        count: arts.length,
        provenanceCount: provenance.filter((p) => p.textContent?.includes("Workshop concept")).length,
        syntheticCount: [...document.querySelectorAll(".wa-foot .wa-meta")].filter((m) => m.textContent?.includes("Synthetic sample")).length,
        pageOverflow: document.documentElement.scrollWidth > inner + 1,
        outOfViewport: arts
          .map((a) => a.getBoundingClientRect())
          .filter((r) => r.left < -1 || r.right > inner + 1 || r.width <= 0)
          .map((r) => `${Math.round(r.left)}..${Math.round(r.right)}`),
        tablesWithCaption: tables.filter((t) => t.querySelector("caption")).length,
        tableCount: tables.length,
        thScoped: tables.every((t) => [...t.querySelectorAll("thead th")].every((th) => th.getAttribute("scope") === "col")),
        svgCount: svgs.length,
        svgLabeled: svgs.every((s) => (s.getAttribute("aria-label") ?? "").length > 10),
        noImages: document.images.length === 0,
        interactiveCount: interactiveInArtifacts.length,
        hasDelIns: document.querySelectorAll("[data-workshop-artifact] del").length >= 5 && document.querySelectorAll("[data-workshop-artifact] ins").length >= 5,
        monoTable: getComputedStyle(table).fontFamily.includes("IBM Plex Mono"),
        displayName: getComputedStyle(name).fontFamily.includes("Plus Jakarta Sans"),
        sheetRadius: getComputedStyle(document.querySelector(".wa-sheet")).borderRadius,
        sheetShadow: getComputedStyle(document.querySelector(".wa-sheet")).boxShadow,
        h1Count: document.querySelectorAll("h1").length,
        h2Count: document.querySelectorAll("h2").length,
        animations: document.getAnimations().length,
        focusableCount: document.querySelectorAll("button, a[href]").length,
        expectedIds: ids.every((id) => arts.some((a) => a.getAttribute("data-workshop-artifact") === id)),
      };
    }, EXPECTED_IDS);

    const prefix = `${width}x${height}/${theme}${reducedMotion === "reduce" ? "/reduced" : ""}`;
    check(`${prefix}: fixture path`, state.pathname === "/fixtures/workshop-artifacts.html");
    check(`${prefix}: 16 artifacts, all ids present`, state.count === 16 && state.expectedIds, `count=${state.count}`);
    check(`${prefix}: 16 Workshop-concept provenance labels`, state.provenanceCount === 16, String(state.provenanceCount));
    check(`${prefix}: 16 synthetic-sample marks`, state.syntheticCount === 16, String(state.syntheticCount));
    check(`${prefix}: theme applied`, state.themeAttr === theme, `attr=${state.themeAttr}`);
    check(`${prefix}: no page-level horizontal overflow`, !state.pageOverflow);
    check(`${prefix}: every artifact inside viewport`, state.outOfViewport.length === 0, state.outOfViewport.join(","));
    check(`${prefix}: 8 tables all captioned + scoped th`, state.tableCount === 8 && state.tablesWithCaption === 8 && state.thScoped, `tables=${state.tableCount} captions=${state.tablesWithCaption}`);
    check(`${prefix}: 3 labelled SVGs`, state.svgCount === 3 && state.svgLabeled, `svg=${state.svgCount}`);
    check(`${prefix}: no images / illustration cards`, state.noImages);
    check(`${prefix}: no interactive controls inside artifacts`, state.interactiveCount === 0, String(state.interactiveCount));
    check(`${prefix}: redline markup present`, state.hasDelIns);
    check(`${prefix}: authentic type tokens`, state.monoTable && state.displayName);
    check(`${prefix}: flat sheet chrome (radius<=2, no shadow)`, parseFloat(state.sheetRadius) <= 2 && state.sheetShadow === "none", `${state.sheetRadius}/${state.sheetShadow}`);
    check(`${prefix}: 1 h1 + 4 career h2`, state.h1Count === 1 && state.h2Count === 4, `h1=${state.h1Count} h2=${state.h2Count}`);
    check(`${prefix}: no animations under reduced motion`, reducedMotion !== "reduce" || state.animations === 0, String(state.animations));
    check(`${prefix}: no console/network errors`, issues.length === 0, issues.join(" | "));
    if (shot) await page.screenshot({ path: `${OUT}/${shot}`, fullPage: true });
    return { context, page };
  }

  const { context: c1 } = await auditPage({ width: 1366, height: 900, theme: "light", shot: "ui4-artifacts-1366-light.png" });
  await c1.close();
  const { context: c2 } = await auditPage({ width: 1280, height: 800, theme: "dark", shot: "ui4-artifacts-1280-dark.png" });
  await c2.close();
  const { context: c3 } = await auditPage({ width: 834, height: 1112, theme: "light", shot: "ui4-artifacts-834-light.png" });
  await c3.close();
  const { context: c4 } = await auditPage({ width: 390, height: 844, theme: "light", shot: "ui4-artifacts-390-light.png" });
  await c4.close();
  const { context: c5 } = await auditPage({ width: 320, height: 700, theme: "dark", reducedMotion: "reduce", shot: "ui4-artifacts-320-dark-reduced.png" });
  await c5.close();

  // Theme toggle changes the rendered surface
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, colorScheme: "dark" });
    const page = await context.newPage();
    const issues = watch(page);
    await page.goto(FIXTURE, { waitUntil: "load" });
    await page.waitForTimeout(700);
    const before = await page.evaluate(() => ({
      attr: document.documentElement.dataset.theme,
      bg: getComputedStyle(document.documentElement).backgroundColor,
    }));
    await page.getByRole("button", { name: /use light surface/i }).click();
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({
      attr: document.documentElement.dataset.theme,
      bg: getComputedStyle(document.documentElement).backgroundColor,
      sheetBg: getComputedStyle(document.querySelector(".wa-sheet")).backgroundColor,
    }));
    check("toggle: dark -> light switches theme + surface", before.attr === "dark" && after.attr === "light" && before.bg !== after.bg && after.sheetBg !== "rgb(18, 23, 30)", `${before.bg} -> ${after.bg} / sheet ${after.sheetBg}`);
    check("toggle: no errors", issues.length === 0, issues.join(" | "));
    await context.close();
  }

  // Keyboard: the only focusable control is the theme button, with a visible ring
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    const issues = watch(page);
    await page.goto(FIXTURE, { waitUntil: "load" });
    await page.waitForTimeout(700);
    const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return null;
      const cs = getComputedStyle(el);
      return { tag: el.tagName, text: (el.textContent ?? "").trim(), outline: cs.outlineStyle, width: cs.outlineWidth, height: el.getBoundingClientRect().height };
    });
    check("keyboard: Tab reaches theme button", focus?.tag === "BUTTON" && /use (light|dark) surface/i.test(focus?.text ?? ""), JSON.stringify(focus));
    check("keyboard: visible focus ring + 44px target", Boolean(focus && focus.outline !== "none" && parseFloat(focus.width) >= 1 && focus.height >= 44), JSON.stringify(focus));
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    const toggled = await page.evaluate(() => document.documentElement.dataset.theme);
    check("keyboard: Enter toggles theme", Boolean(initialTheme) && toggled !== initialTheme, `${initialTheme} -> ${toggled}`);
    check("keyboard: no errors", issues.length === 0, issues.join(" | "));
    await context.close();
  }

  await browser.close();
} catch (error) {
  console.error(error);
  check("qa script ran to completion", false, String(error));
} finally {
  for (const server of servers) {
    if (!server.pid) continue;
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") console.error(error);
    }
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\nUI-4 ARTIFACT QA SUMMARY: ${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  console.log("FAILURES:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}
console.log("ALL UI-4 ARTIFACT QA PASSED");
process.exit(0);
