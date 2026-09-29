import { execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";
import {
  ALLOW_CONSOLE,
  LEAK_PATTERNS,
  collectMetrics,
  evaluateChecks,
  readFocusedStyles,
  snapshotFocusStyles,
} from "./qa-freeze-checks.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = process.env.FREEZE_OUT ?? "/tmp/career-expo-ui-freeze";
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:4179";
const axePath = createRequire(import.meta.url).resolve("axe-core/axe.min.js");

const ROUTES = [
  { key: "home", path: "/", label: "Home" },
  { key: "careers", path: "/careers", label: "Careers" },
  {
    key: "cyber",
    path: "/careers/cybersecurity-analyst",
    label: "Cybersecurity Analyst",
  },
  { key: "faq", path: "/faq", label: "FAQ" },
  { key: "trust", path: "/trust", label: "Trust" },
  { key: "404", path: "/this-route-does-not-exist", label: "Public 404" },
  { key: "start", path: "/start", label: "Start threshold", reducedOnly: true, filmShot: true },
];

const VIEWPORTS = [
  { label: "1366", width: 1366, height: 900, cls: "desktop" },
  { label: "1280", width: 1280, height: 800, cls: "desktop" },
  { label: "834", width: 834, height: 1112, cls: "tablet" },
  { label: "390", width: 390, height: 844, cls: "mobile" },
  { label: "320", width: 320, height: 720, cls: "mobile" },
];

const REDUCED_LABELS = ["1366", "834", "390"];
const THEMES = ["light", "dark"];
const SECTION_VIEWPORT = "1366";
const FOCUS_VIEWPORT = "1366";
const MAX_SECTIONS = 12;
const REDUCED_PARITY_FLOOR = 0.95;

const watchdog = setTimeout(() => {
  console.error("qa-visual-freeze: watchdog timeout (25 minutes)");
  process.exit(2);
}, 25 * 60 * 1000);
watchdog.unref();

async function healthy(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok;
  } catch {
    return false;
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function watchPage(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const assetErrors = [];
  const notes = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (ALLOW_CONSOLE.some((entry) => text.includes(entry))) {
      notes.push(`console: ${text}`);
      return;
    }
    consoleErrors.push(text);
  });
  page.on("pageerror", (error) => pageErrors.push(String(error.message ?? error)));
  page.on("requestfailed", (request) => {
    const url = request.url();
    const failure = request.failure()?.errorText ?? "unknown";
    if (!url.startsWith(webOrigin)) {
      notes.push(`requestfailed: ${failure} ${url}`);
      return;
    }
    assetErrors.push(`requestfailed: ${failure} ${url}`);
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    if (!url.startsWith(webOrigin)) {
      notes.push(`http ${String(response.status())} ${url}`);
      return;
    }
    assetErrors.push(`http ${String(response.status())} ${url}`);
  });
  return { consoleErrors, pageErrors, assetErrors, notes };
}

async function settlePage(page) {
  await page.evaluate(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    for (const image of document.images) {
      if (!image.complete) image.loading = "eager";
    }
    const step = Math.max(320, Math.floor(window.innerHeight * 0.9));
    const limit = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
    );
    for (let y = 0; y < limit; y += step) {
      window.scrollTo(0, y);
      await wait(50);
    }
    window.scrollTo(0, 0);
    await wait(100);
    await document.fonts.ready;
    const running = (document.getAnimations?.() ?? []).filter(
      (animation) =>
        animation.effect?.getComputedTiming?.()?.iterations !== Infinity,
    );
    await Promise.race([
      Promise.allSettled(running.map((animation) => animation.finished)),
      wait(2500),
    ]);
    await wait(400);
  });
  await page
    .waitForFunction(
      () => Array.from(document.images).every((image) => image.complete),
      null,
      { timeout: 8000 },
    )
    .catch(() => {});
  await page.waitForTimeout(700);
}

async function newPage(context, { viewport, theme, motion }) {
  const page = await context.newPage();
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.emulateMedia({
    colorScheme: theme,
    reducedMotion: motion === "reduce" ? "reduce" : "no-preference",
  });
  await page.addInitScript(
    ({ themeName }) => {
      try {
        window.localStorage.setItem("career-expo-theme", themeName);
      } catch {}
      window.__qaCls = 0;
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) window.__qaCls += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
      } catch {}
    },
    { themeName: theme },
  );
  return page;
}

async function runFocusCheck(page) {
  const baselines = await page.evaluate(snapshotFocusStyles);
  const results = [];
  const seen = new Set();
  for (let index = 0; index < baselines.length; index += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(readFocusedStyles);
    if (focused.position < 0 || seen.has(focused.position)) continue;
    seen.add(focused.position);
    const baseline = baselines[focused.position];
    const changed = Object.keys(baseline.rest).filter(
      (key) => baseline.rest[key] !== focused[key],
    );
    results.push({
      tag: baseline.tag,
      label: baseline.label,
      visible: changed.length > 0,
      changed,
    });
    if (results.length >= 12) break;
  }
  return {
    tested: results.length,
    hidden: results.filter((entry) => !entry.visible),
  };
}

async function captureSectionShots(page, routeKey, motion) {
  const motionTag = motion === "reduce" ? "-reduced" : "";
  const dir = path.join(out, routeKey, "sections");
  await mkdir(dir, { recursive: true });
  const sections = page.locator("main section");
  const count = await sections.count();
  const captured = [];
  for (let index = 0; index < Math.min(count, MAX_SECTIONS); index += 1) {
    const section = sections.nth(index);
    const box = await section.boundingBox().catch(() => null);
    if (!box || box.height < 80 || box.width < 40) continue;
    const title = await section
      .evaluate((element) => {
        const heading = element.querySelector("h1, h2, h3");
        return heading ? heading.textContent || "" : "";
      })
      .catch(() => "");
    const slug = slugify(title) || "section";
    const name = `${SECTION_VIEWPORT}-light${motionTag}-${String(index + 1).padStart(2, "0")}-${slug}.png`;
    const target = path.join(dir, name);
    await section
      .screenshot({ path: target, animations: "disabled" })
      .then(() => captured.push(path.relative(out, target)))
      .catch((error) =>
        captured.push(`FAILED ${name}: ${String(error).slice(0, 80)}`),
      );
  }
  return captured;
}

async function primeImages(page) {
  await page.evaluate(() => {
    for (const image of document.images) {
      if (!image.complete) image.loading = "eager";
    }
  });
  await page
    .waitForFunction(
      () => Array.from(document.images).every((image) => image.complete),
      null,
      { timeout: 10000 },
    )
    .catch(() => {});
}

async function capture(context, spec) {
  const { route, viewport, theme, motion } = spec;
  const file = `${viewport.label}-${theme}${motion === "reduce" ? "-reduced" : ""}-full.png`;
  const target = path.join(out, route.key, file);
  await mkdir(path.dirname(target), { recursive: true });

  const page = await newPage(context, { viewport, theme, motion });
  const watch = watchPage(page);
  const startedAt = Date.now();
  let navigationError = "";
  try {
    await page.goto(`${webOrigin}${route.path}`, {
      waitUntil: "load",
      timeout: 45000,
    });
    await settlePage(page);
    await primeImages(page);
  } catch (error) {
    navigationError = String(error).slice(0, 200);
  }

  let metrics = null;
  let metricsError = "";
  if (!navigationError) {
    metrics = await page.evaluate(collectMetrics, { leakPatterns: LEAK_PATTERNS }).catch((error) => {
      metricsError = String(error?.message ?? error).slice(0, 300);
      return null;
    });
  }
  let contrast = [];
  if (!navigationError) {
    try {
      await page.addScriptTag({ path: axePath });
      contrast = await page.evaluate(async () => {
        const result = await window.axe.run(document, {
          runOnly: { type: "rule", values: ["color-contrast"] },
        });
        return result.violations.flatMap((violation) => violation.nodes.map((node) => ({
          target: node.target,
          summary: node.failureSummary?.slice(0, 180),
        })));
      });
    } catch (error) {
      contrast = [{ target: ["harness"], summary: String(error).slice(0, 180) }];
    }
  }
  const checks = metrics
    ? evaluateChecks({ route, theme, motion, metrics })
    : { navigation: { ok: false, detail: navigationError || metricsError || "metrics unavailable" } };
  checks["text-control-contrast"] = {
    ok: !navigationError && contrast.length === 0,
    detail: contrast.slice(0, 12),
  };
  let remeasured = false;
  if (
    metrics &&
    (metrics.documentWidth > metrics.viewportWidth + 1 ||
      metrics.outsideText.length > 0)
  ) {
    await page.waitForTimeout(1200);
    const settled = await page
      .evaluate(collectMetrics, { leakPatterns: LEAK_PATTERNS })
      .catch(() => null);
    if (settled) {
      remeasured = true;
      metrics = settled;
      Object.assign(
        checks,
        evaluateChecks({ route, theme, motion, metrics }),
      );
    }
  }

  if (metrics && watch.pageErrors.length) {
    checks["no-page-errors"] = { ok: false, detail: watch.pageErrors };
  } else {
    checks["no-page-errors"] = { ok: watch.pageErrors.length === 0 };
  }
  if (metrics && watch.consoleErrors.length) {
    checks["no-console-errors"] = { ok: false, detail: watch.consoleErrors };
  } else {
    checks["no-console-errors"] = { ok: watch.consoleErrors.length === 0 };
  }
  if (metrics && watch.assetErrors.length) {
    checks["no-asset-errors"] = { ok: false, detail: watch.assetErrors };
  } else {
    checks["no-asset-errors"] = { ok: watch.assetErrors.length === 0 };
  }

  let focus = null;
  const wantsFocus =
    viewport.label === FOCUS_VIEWPORT && theme === "light" && !navigationError;
  if (wantsFocus) {
    focus = await runFocusCheck(page).catch(() => null);
    if (focus) {
      checks["focus-visible"] = {
        ok: focus.tested > 0 && focus.hidden.length === 0,
        detail: focus.hidden,
      };
    }
  }

  let sections = [];
  const wantsSections =
    viewport.label === SECTION_VIEWPORT &&
    theme === "light" &&
    !navigationError &&
    (motion === "reduce" || !route.reducedOnly);
  if (wantsSections) {
    sections = await captureSectionShots(page, route.key, motion);
  }

  let screenshot = null;
  if (!navigationError) {
    await page
      .screenshot({ path: target, fullPage: true, animations: "disabled" })
      .then(() => {
        screenshot = path.relative(out, target);
      })
      .catch((error) => {
        navigationError = String(error).slice(0, 200);
      });
  }

  await page.close();

  const failed = Object.entries(checks)
    .filter(([, value]) => !value.ok)
    .map(([name]) => name);

  return {
    route: route.path,
    routeKey: route.key,
    routeLabel: route.label,
    viewport: { ...viewport },
    theme,
    motion,
    screenshot,
    captureError: navigationError || null,
    consoleErrors: watch.consoleErrors,
    pageErrors: watch.pageErrors,
    assetErrors: watch.assetErrors,
    networkNotes: watch.notes,
    horizontalOverflow: metrics
      ? metrics.documentWidth > metrics.viewportWidth + 1
      : null,
    documentWidth: metrics ? metrics.documentWidth : null,
    viewportWidth: metrics ? metrics.viewportWidth : viewport.width,
    textLength: metrics ? metrics.textLength : 0,
    cls: metrics ? Number(metrics.cls.toFixed(4)) : 0,
    contrastViolations: contrast,
    h1Text: metrics ? metrics.h1Text : [],
    sections,
    focus,
    remeasured,
    checks,
    failed,
    durationMs: Date.now() - startedAt,
  };
}

function buildJobs() {
  const jobs = [];
  for (const route of ROUTES) {
    if (route.reducedOnly) {
      if (route.filmShot) {
        jobs.push({
          route,
          viewport: VIEWPORTS[0],
          theme: "light",
          motion: "normal",
        });
      }
    } else {
      for (const viewport of VIEWPORTS) {
        for (const theme of THEMES) {
          jobs.push({ route, viewport, theme, motion: "normal" });
        }
      }
    }
    for (const label of REDUCED_LABELS) {
      const viewport = VIEWPORTS.find((entry) => entry.label === label);
      jobs.push({ route, viewport, theme: "light", motion: "reduce" });
    }
  }
  return jobs;
}

function summarise(records) {
  const byCheck = new Map();
  for (const record of records) {
    for (const [name, value] of Object.entries(record.checks)) {
      if (value.ok) continue;
      const list = byCheck.get(name) ?? [];
      list.push({
        route: record.routeKey,
        viewport: record.viewport.label,
        theme: record.theme,
        motion: record.motion,
        detail: value.detail ?? null,
      });
      byCheck.set(name, list);
    }
  }
  return byCheck;
}

function renderReport(records, meta) {
  const failures = summarise(records);
  const lines = [];
  lines.push("# Career Expo public UI visual freeze — run report");
  lines.push("");
  lines.push(`- Captured: ${meta.capturedAt}`);
  lines.push(`- Origin: ${meta.origin}`);
  lines.push(`- Base: ${meta.base}`);
  lines.push(`- Screenshots: ${meta.screenshots}`);
  lines.push(`- Section shots: ${meta.sectionShots}`);
  lines.push(`- Captures: ${String(records.length)}`);
  lines.push(
    `- Failed captures: ${String(records.filter((entry) => entry.failed.length > 0).length)}`,
  );
  lines.push("");
  lines.push("## Automated check results");
  lines.push("");
  lines.push("| Check | Failing captures |");
  lines.push("| --- | --- |");
  if (failures.size === 0) lines.push("| — | 0 |");
  for (const [name, entries] of [...failures.entries()].sort()) {
    lines.push(`| ${name} | ${String(entries.length)} |`);
  }
  lines.push("");
  for (const [name, entries] of [...failures.entries()].sort()) {
    lines.push(`### ${name}`);
    lines.push("");
    for (const entry of entries) {
      lines.push(
        `- \`${entry.route}\` ${entry.viewport} ${entry.theme} ${entry.motion}: ${JSON.stringify(entry.detail ?? "").slice(0, 300)}`,
      );
    }
    lines.push("");
  }
  lines.push("## Coverage");
  lines.push("");
  lines.push("| Route | Normal captures | Reduced captures | Section shots |");
  lines.push("| --- | --- | --- | --- |");
  for (const route of ROUTES) {
    const own = records.filter((entry) => entry.routeKey === route.key);
    lines.push(
      `| ${route.key} | ${String(own.filter((entry) => entry.motion === "normal").length)} | ${String(own.filter((entry) => entry.motion === "reduce").length)} | ${String(own.reduce((total, entry) => total + entry.sections.length, 0))} |`,
    );
  }
  lines.push("");
  lines.push("## Reduced-motion parity");
  lines.push("");
  lines.push("| Route | Normal text | Reduced text | Ratio | Verdict |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const route of ROUTES) {
    if (route.reducedOnly) {
      lines.push(`| ${route.key} | n/a | n/a | n/a | skipped (film gate) |`);
      continue;
    }
    const normal = records.find(
      (entry) =>
        entry.routeKey === route.key &&
        entry.motion === "normal" &&
        entry.viewport.label === "1366" &&
        entry.theme === "light",
    );
    const reduced = records.find(
      (entry) =>
        entry.routeKey === route.key &&
        entry.motion === "reduce" &&
        entry.viewport.label === "1366" &&
        entry.theme === "light",
    );
    if (!normal || !reduced) {
      lines.push(`| ${route.key} | n/a | n/a | n/a | skipped |`);
      continue;
    }
    const ratio = reduced.textLength / Math.max(normal.textLength, 1);
    const verdict = ratio >= REDUCED_PARITY_FLOOR ? "pass" : "INFORMATION LOSS";
    lines.push(
      `| ${route.key} | ${String(normal.textLength)} | ${String(reduced.textLength)} | ${ratio.toFixed(3)} | ${verdict} |`,
    );
  }
  lines.push("");
  lines.push("## Production CLS by route (1366 light)");
  lines.push("");
  for (const route of ROUTES) {
    const record = records.find((entry) => entry.routeKey === route.key && entry.viewport.label === "1366" && entry.theme === "light");
    if (record) lines.push(`- ${route.key}: ${record.cls.toFixed(4)}`);
  }
  lines.push("");
  return lines.join("\n");
}

function gitBase() {
  try {
    const head = execSync("git rev-parse --short HEAD", { cwd: root })
      .toString()
      .trim();
    let anchor = "";
    try {
      anchor = execSync("git rev-parse --short 7788841", {
        cwd: root,
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();
    } catch {
      anchor = "";
    }
    return anchor && anchor !== head ? `${anchor}..${head}` : head;
  } catch {
    return "unknown";
  }
}

let viteChild = null;

async function main() {
  if (!existsSync(path.join(root, "apps/web/dist/index.html"))) {
    throw new Error("Production build missing. Run pnpm build before qa-visual-freeze.");
  }
  if (await healthy(webOrigin)) {
    if (process.env.FREEZE_REUSE_PREVIEW !== "1") throw new Error(`${webOrigin} is occupied; choose another WEB_ORIGIN or set FREEZE_REUSE_PREVIEW=1 for a known production preview`);
    console.log(`qa-visual-freeze: reusing production preview at ${webOrigin}`);
  } else {
    console.log(`qa-visual-freeze: starting production preview at ${webOrigin}`);
    const vite = spawn(
      "pnpm",
      [
        "--filter",
        "@sim/web",
        "exec",
        "vite",
        "preview",
        "--host",
        "localhost",
        "--port",
        new URL(webOrigin).port || "5173",
        "--strictPort",
      ],
      { cwd: root, detached: true, stdio: "ignore", env: { ...process.env } },
    );
    viteChild = vite;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (await healthy(webOrigin)) break;
      if (vite.exitCode !== null || attempt === 119) {
        throw new Error("Dev app did not become healthy within 120 seconds");
      }
      await delay(1000);
    }
  }

  const browser = await chromium.launch({
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    await rm(out, { recursive: true, force: true });
    await mkdir(out, { recursive: true });
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      locale: "en-US",
      colorScheme: "light",
    });
    const jobs = buildJobs();
    console.log(`qa-visual-freeze: ${String(jobs.length)} captures planned`);
    const records = [];
    for (const [index, job] of jobs.entries()) {
      const label = `${job.route.key} ${job.viewport.label} ${job.theme} ${job.motion}`;
      process.stdout.write(`[${String(index + 1)}/${String(jobs.length)}] ${label} … `);
      try {
        const record = await capture(context, job);
        records.push(record);
        console.log(
          record.failed.length === 0
            ? `ok (${String(record.durationMs)}ms)`
            : `FAIL ${record.failed.join(", ")}`,
        );
      } catch (error) {
        console.log(`ERROR ${String(error).slice(0, 160)}`);
        records.push({
          route: job.route.path,
          routeKey: job.route.key,
          routeLabel: job.route.label,
          viewport: { ...job.viewport },
          theme: job.theme,
          motion: job.motion,
          screenshot: null,
          captureError: String(error).slice(0, 300),
          consoleErrors: [],
          pageErrors: [],
          assetErrors: [],
          networkNotes: [],
          horizontalOverflow: null,
          documentWidth: null,
          viewportWidth: job.viewport.width,
          textLength: 0,
          cls: 0,
          contrastViolations: [],
          h1Text: [],
          sections: [],
          focus: null,
          remeasured: false,
          checks: { harness: { ok: false, detail: String(error).slice(0, 300) } },
          failed: ["harness"],
          durationMs: 0,
        });
      }
    }
    await context.close();

    const parityIssues = [];
    for (const route of ROUTES) {
      if (route.reducedOnly) continue;
      const normal = records.find(
        (entry) =>
          entry.routeKey === route.key &&
          entry.motion === "normal" &&
          entry.viewport.label === "1366" &&
          entry.theme === "light",
      );
      const reduced = records.find(
        (entry) =>
          entry.routeKey === route.key &&
          entry.motion === "reduce" &&
          entry.viewport.label === "1366" &&
          entry.theme === "light",
      );
      if (!normal || !reduced || !normal.textLength || !reduced.textLength) continue;
      const ratio = reduced.textLength / normal.textLength;
      if (ratio < REDUCED_PARITY_FLOOR) {
        parityIssues.push({ route: route.key, ratio: Number(ratio.toFixed(3)) });
        reduced.checks["reduced-motion-keeps-information"] = {
          ok: false,
          detail: { normal: normal.textLength, reduced: reduced.textLength, ratio },
        };
        reduced.failed.push("reduced-motion-keeps-information");
      } else if (reduced) {
        reduced.checks["reduced-motion-keeps-information"] = {
          ok: true,
          detail: { normal: normal.textLength, reduced: reduced.textLength, ratio },
        };
      }
    }

    const meta = {
      capturedAt: new Date().toISOString(),
      origin: webOrigin,
      base: process.env.FREEZE_BASE ?? gitBase(),
      screenshots: records.filter((entry) => entry.screenshot).length,
      sectionShots: records.reduce((total, entry) => total + entry.sections.length, 0),
      viewports: VIEWPORTS.map((entry) => entry.label),
      themes: THEMES,
      reducedViewports: REDUCED_LABELS,
      routes: ROUTES.map((route) => ({ key: route.key, path: route.path })),
      parityIssues,
      jobCount: jobs.length,
    };

    await writeFile(path.join(out, "manifest.json"), `${JSON.stringify({ meta, records }, null, 2)}\n`);
    await writeFile(path.join(out, "report.md"), renderReport(records, meta));

    const failedChecks = summarise(records);
    console.log("");
    console.log(`qa-visual-freeze: ${String(meta.screenshots)} screenshots → ${out}`);
    console.log(`qa-visual-freeze: ${String(meta.sectionShots)} section shots`);
    if (failedChecks.size === 0) {
      console.log("qa-visual-freeze: all automated checks passed");
    } else {
      console.log("qa-visual-freeze: failing checks");
      for (const [name, entries] of [...failedChecks.entries()].sort()) {
        console.log(`  ${name}: ${String(entries.length)} capture(s)`);
      }
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
    if (viteChild?.pid) {
      try {
        process.kill(-viteChild.pid, "SIGTERM");
      } catch {
        /* already gone */
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
