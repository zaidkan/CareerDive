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

setTimeout(() => process.exit(1), 300000).unref();

if ((await healthy(web)) || (await healthy(`${api}/health`))) {
  console.error("Dev ports already in use.");
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
      throw new Error("Dev stack did not become healthy");
    }
    await delay(1000);
  }

  const browser = await chromium.launch({
    args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"],
  });

  const VIEWPORTS = [
    { width: 320, height: 700 },
    { width: 390, height: 844 },
    { width: 834, height: 1112 },
    { width: 1280, height: 800 },
    { width: 1366, height: 900 },
  ];

  for (const { width, height } of VIEWPORTS) {
    for (const colorScheme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height }, colorScheme });
      const page = await context.newPage();
      const issues = watch(page);
      await page.goto(`${web}/`, { waitUntil: "load" });
      await page.waitForTimeout(900);
      const state = await page.evaluate(() => {
        const ul = document.querySelector(".site-nav-links");
        const nav = document.querySelector('nav[aria-label="Primary"]');
        const faq = [...document.querySelectorAll(".site-nav-links a")].find((a) => a.getAttribute("href") === "/faq");
        const fr = faq ? faq.getBoundingClientRect() : null;
        const nr = nav ? nav.getBoundingClientRect() : null;
        const links = [...document.querySelectorAll(".site-nav-links a")];
        return {
          docOverflow: document.documentElement.scrollWidth - window.innerWidth,
          ulScroll: ul ? ul.scrollWidth - ul.clientWidth : null,
          faqRight: fr ? Math.round(fr.right) : null,
          faqBeyondViewport: fr ? Math.round(fr.right) - window.innerWidth : null,
          faqBeyondNav: fr && nr ? Math.round(fr.right) - Math.round(nr.right) : null,
          navScroll: nav ? nav.scrollWidth - nav.clientWidth : null,
          minLinkHeight: Math.min(...links.map((a) => Math.round(a.getBoundingClientRect().height))),
          linkCount: links.length,
          brandVisible: Boolean(document.querySelector(".site-nav-brand")?.getBoundingClientRect().width),
        };
      });
      const tag = `${width}x${height}/${colorScheme}`;
      check(`${tag}: no page overflow`, state.docOverflow <= 0, `overflow=${state.docOverflow}`);
      check(`${tag}: link row fits (no inner scroll)`, state.ulScroll <= 0, `ulScroll=${state.ulScroll}`);
      check(`${tag}: FAQ right edge within viewport`, state.faqBeyondViewport <= 0, `right=${state.faqRight} beyond=${state.faqBeyondViewport}`);
      check(`${tag}: FAQ not clipped by nav`, state.faqBeyondNav <= 0, `beyond=${state.faqBeyondNav}`);
      check(`${tag}: nav strip has no scroll`, state.navScroll <= 0, `navScroll=${state.navScroll}`);
      check(`${tag}: 4 links, tap targets >= 44px`, state.linkCount === 4 && state.minLinkHeight >= 44, `links=${state.linkCount} minH=${state.minLinkHeight}`);
      check(`${tag}: brand visible`, state.brandVisible);
      check(`${tag}: no errors`, issues.length === 0, issues.join(" | "));
      if (width === 320) {
        await page.screenshot({ path: `${OUT}/nav-fix-320-${colorScheme}.png` });
      }
      await context.close();
    }
  }

  // Keyboard: focus order across nav links + visible ring (320 + 1366)
  for (const { width, height } of [{ width: 320, height: 700 }, { width: 1366, height: 900 }]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const issues = watch(page);
    await page.goto(`${web}/`, { waitUntil: "load" });
    await page.waitForTimeout(700);
    const order = [];
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        return {
          inNavLinks: Boolean(el.closest(".site-nav-links")),
          href: el instanceof HTMLAnchorElement ? el.getAttribute("href") : null,
          outline: getComputedStyle(el).outlineStyle,
          outlineWidth: getComputedStyle(el).outlineWidth,
          h: Math.round(el.getBoundingClientRect().height),
        };
      });
      if (info?.inNavLinks) order.push(info);
      if (order.length >= 4) break;
    }
    check(`keyboard ${width}px: nav links focusable in order`,
      order.map((o) => o.href).join(">") === "/>/careers>/trust>/faq",
      order.map((o) => o.href).join(">"));
    check(`keyboard ${width}px: focus ring visible`, order.every((o) => o.outline !== "none" && parseFloat(o.outlineWidth) >= 1), JSON.stringify(order[0]?.outline ?? null));
    check(`keyboard ${width}px: no errors`, issues.length === 0, issues.join(" | "));
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
console.log(`\nNAV QA SUMMARY: ${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  console.log("FAILURES:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}
console.log("ALL NAV QA PASSED");
process.exit(0);
