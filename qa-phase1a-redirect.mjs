import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const web = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const api = process.env.API_ORIGIN ?? "http://localhost:3001";
const webUrl = new URL(web);
const apiUrl = new URL(api);
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

function watch(page, label) {
  const issues = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") issues.push(`console.error: ${msg.text()}`);
  });
  page.on("pageerror", (err) => issues.push(`pageerror: ${err.message}`));
  page.on("requestfailed", (req) =>
    issues.push(`requestfailed: ${req.url()} ${req.failure()?.errorText ?? ""}`),
  );
  page.on("response", (res) => {
    if (res.status() >= 400) issues.push(`http ${res.status()}: ${res.url()}`);
  });
  return issues;
}

async function homeState(page) {
  return page.evaluate(() => ({
    pathname: window.location.pathname,
    h1: document.querySelector("main h1, #main-content h1, h1")?.textContent?.trim() ?? null,
    mainChildren: document.getElementById("main-content")?.children.length ?? 0,
    navText: document.querySelector('nav[aria-label="Primary"]')?.textContent ?? "",
    allHrefs: [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
  }));
}

setTimeout(() => process.exit(1), 240000).unref();

const webReady = await healthy(web);
const apiReady = await healthy(`${api}/health`);
if (webReady || apiReady) {
  console.error(`Dev ports already in use: web=${webReady}, API=${apiReady}.`);
  process.exit(1);
}

const servers = [];
try {
  servers.push(
    spawn(
      "pnpm",
      ["--filter", "@sim/web", "exec", "vite", "--host", webUrl.hostname, "--port", webUrl.port || "5173", "--strictPort"],
      { detached: true, stdio: "inherit", env: { ...process.env, VITE_SERVER_URL: api } },
    ),
  );
  servers.push(
    spawn("pnpm", ["--filter", "@sim/server", "exec", "tsx", "src/main.ts"], {
      detached: true,
      stdio: "inherit",
      env: { ...process.env, PORT: apiUrl.port || "3001" },
    }),
  );
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if ((await healthy(web)) && (await healthy(`${api}/health`))) break;
    if (servers.some((server) => server.exitCode !== null) || attempt === 119) {
      throw new Error("Dev stack did not become healthy within 120 seconds");
    }
    await delay(1000);
  }

  const browser = await chromium.launch({
    args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"],
  });

  // 1. Direct load of /how-it-works (desktop 1366)
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    const issues = watch(page, "redirect");
    await page.goto(`${web}/how-it-works`, { waitUntil: "load" });
    await page.waitForTimeout(2000);
    const state = await homeState(page);
    check("redirect: URL becomes /", state.pathname === "/", `pathname=${state.pathname}`);
    check("redirect: homepage h1 rendered", Boolean(state.h1), `h1=${JSON.stringify(state.h1)}`);
    check("redirect: main content non-empty", state.mainChildren > 0, `children=${state.mainChildren}`);
    check("redirect: nav has no how-it-works", !/how it works|how the shift works/i.test(state.navText));
    await page.waitForTimeout(1500);
    const stable = await page.evaluate(() => window.location.pathname);
    check("redirect: URL stable (no loop)", stable === "/", `pathname=${stable}`);
    check("redirect: no console/network errors", issues.length === 0, issues.join(" | "));
    await page.screenshot({ path: `${OUT}/phase1a-redirect-1366.png` });
    await context.close();
  }

  // 2. Trailing-slash variant
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    const issues = watch(page, "trailing");
    await page.goto(`${web}/how-it-works/`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const state = await homeState(page);
    check("trailing slash: URL becomes /", state.pathname === "/", `pathname=${state.pathname}`);
    check("trailing slash: h1 rendered", Boolean(state.h1), `h1=${JSON.stringify(state.h1)}`);
    check("trailing slash: no errors", issues.length === 0, issues.join(" | "));
    await context.close();
  }

  // 3. Direct home load + refresh
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    const issues = watch(page, "home");
    await page.goto(web, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    let state = await homeState(page);
    check("home direct: pathname /", state.pathname === "/", `pathname=${state.pathname}`);
    check("home direct: h1 rendered", Boolean(state.h1), `h1=${JSON.stringify(state.h1)}`);
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(1500);
    state = await homeState(page);
    check("home refresh: h1 rendered", Boolean(state.h1), `h1=${JSON.stringify(state.h1)}`);
    check("home: no console/network errors", issues.length === 0, issues.join(" | "));
    await context.close();
  }

  // 4. Client navigation + back/forward
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    const issues = watch(page, "nav");
    await page.goto(web, { waitUntil: "load" });
    await page.waitForTimeout(1000);
    const careersLink = page.locator('nav[aria-label="Primary"] a[href="/careers"]').first();
    check("nav: primary nav link to /careers exists", (await careersLink.count()) > 0);
    if ((await careersLink.count()) > 0) {
      await careersLink.click();
      await page.waitForTimeout(1200);
      let state = await homeState(page);
      check("nav: /careers renders", state.pathname === "/careers" && Boolean(state.h1), `path=${state.pathname} h1=${JSON.stringify(state.h1)}`);
      await page.goBack();
      await page.waitForTimeout(1200);
      state = await homeState(page);
      check("back: returns to /", state.pathname === "/" && Boolean(state.h1), `path=${state.pathname} h1=${JSON.stringify(state.h1)}`);
      await page.goForward();
      await page.waitForTimeout(1200);
      state = await homeState(page);
      check("forward: returns to /careers", state.pathname === "/careers" && Boolean(state.h1), `path=${state.pathname}`);
      check("nav sequence: no errors", issues.length === 0, issues.join(" | "));
    }
    await context.close();
  }

  // 5. Back/forward across the redirect (realistic: user was on /, then hit the removed URL)
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    const issues = watch(page, "backfwd");
    await page.goto(web, { waitUntil: "load" });
    await page.waitForTimeout(1000);
    await page.goto(`${web}/how-it-works`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    let state = await homeState(page);
    check("redirect in session: lands on /", state.pathname === "/", `path=${state.pathname}`);
    await page.goBack();
    await page.waitForTimeout(1000);
    state = await homeState(page);
    check("back after redirect: returns to prior /", state.pathname === "/" && Boolean(state.h1), `path=${state.pathname} h1=${JSON.stringify(state.h1)}`);
    await page.goForward();
    await page.waitForTimeout(1000);
    state = await homeState(page);
    check("forward after redirect: stays on / (not how-it-works)", state.pathname === "/" && Boolean(state.h1), `path=${state.pathname} h1=${JSON.stringify(state.h1)}`);
    check("back/forward after redirect: no errors", issues.length === 0, issues.join(" | "));
    await context.close();
  }

  // 6. No anchor anywhere points at the removed route
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    const stale = [];
    for (const path of ["/", "/careers", "/trust", "/faq", "/start"]) {
      await page.goto(`${web}${path}`, { waitUntil: "load" });
      await page.waitForTimeout(800);
      const hrefs = await page.evaluate(() =>
        [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href") ?? ""),
      );
      for (const href of hrefs) {
        if (href.includes("how-it-works")) stale.push(`${path} -> ${href}`);
      }
    }
    check("no stale how-it-works links on any page", stale.length === 0, stale.join(", "));
    await context.close();
  }

  // 7. Mobile 390 + dark + reduced motion via redirect
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const issues = watch(page, "mobile");
    await page.goto(`${web}/how-it-works`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const state = await homeState(page);
    check("mobile dark reduced: redirect to /", state.pathname === "/", `path=${state.pathname}`);
    check("mobile dark reduced: h1 rendered", Boolean(state.h1), `h1=${JSON.stringify(state.h1)}`);
    check("mobile dark reduced: no errors", issues.length === 0, issues.join(" | "));
    await page.screenshot({ path: `${OUT}/phase1a-redirect-390-dark-reduced.png`, fullPage: true });
    await context.close();
  }

  // 8. Light scheme desktop screenshot + checks
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, colorScheme: "light" });
    const page = await context.newPage();
    const issues = watch(page, "light");
    await page.goto(web, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const state = await homeState(page);
    check("light desktop: home renders", state.pathname === "/" && Boolean(state.h1));
    check("light desktop: no errors", issues.length === 0, issues.join(" | "));
    await page.screenshot({ path: `${OUT}/phase1a-home-1366-light.png`, fullPage: true });
    await context.close();
  }

  // 9. Keyboard: Tab moves focus into the page; no autofocus ring on first load
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    const issues = watch(page, "keyboard");
    await page.goto(`${web}/how-it-works`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const initialFocus = await page.evaluate(() => document.activeElement?.tagName ?? "NONE");
    check("keyboard: no autofocus on first load", initialFocus === "BODY" || initialFocus === "NONE", `active=${initialFocus}`);
    await page.keyboard.press("Tab");
    const afterTab = await page.evaluate(() => {
      const el = document.activeElement;
      return el && el !== document.body ? `${el.tagName}:${(el.textContent ?? "").trim().slice(0, 40)}` : "BODY";
    });
    check("keyboard: Tab focuses an element", afterTab !== "BODY", `active=${afterTab}`);
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
console.log(`\nQA SUMMARY: ${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  console.log("FAILURES:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}
console.log("ALL BROWSER QA PASSED");
process.exit(0);
