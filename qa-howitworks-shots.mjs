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

async function healthy(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok;
  } catch {
    return false;
  }
}

setTimeout(() => process.exit(0), 170000).unref();

const webReady = await healthy(web);
const apiReady = await healthy(`${api}/health`);
if (webReady || apiReady) {
  console.error(`Dev ports already in use: web=${webReady}, API=${apiReady}.`);
  process.exit(1);
}

const servers = [];
try {
  servers.push(spawn("pnpm", ["--filter", "@sim/web", "exec", "vite", "--host", webUrl.hostname, "--port", webUrl.port || "5173", "--strictPort"], {
    detached: true, stdio: "inherit", env: { ...process.env, VITE_SERVER_URL: api },
  }));
  servers.push(spawn("pnpm", ["--filter", "@sim/server", "exec", "tsx", "src/main.ts"], {
    detached: true, stdio: "inherit", env: { ...process.env, PORT: apiUrl.port || "3001" },
  }));
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await healthy(web) && await healthy(`${api}/health`)) break;
    if (servers.some((server) => server.exitCode !== null) || attempt === 119) {
      throw new Error("Dev stack did not become healthy within 120 seconds");
    }
    await delay(1000);
  }

  const browser = await chromium.launch({
    args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"],
  });

  // 1. Redirect check: navigate to /how-it-works, confirm it lands on /
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(`${web}/how-it-works`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const finalPath = page.url();
    const h1 = await page.evaluate(() => document.querySelector("h1")?.textContent ?? null);
    const navText = await page.evaluate(() => document.querySelector('nav[aria-label="Primary"]')?.textContent ?? "");
    console.log(`REDIRECT: finalPath=${finalPath} h1=${JSON.stringify(h1)}`);
    console.log(`NAV contains "How it works": ${/how it works/i.test(navText)}`);
    console.log(`NAV contains "How the shift works": ${/how the shift works/i.test(navText)}`);
    await page.screenshot({ path: `${OUT}/howitworks-redirect-1366.png` });
    await context.close();
  }

  // 2. Homepage nav + full page (desktop, dark, mobile, reduced)
  async function shoot(name, { width, height, theme = "light", reduced = false, fullPage = false } = {}) {
    const context = await browser.newContext({
      viewport: { width, height },
      colorScheme: theme === "dark" ? "dark" : "light",
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    const page = await context.newPage();
    await page.goto(web, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const navText = await page.evaluate(() => document.querySelector('nav[aria-label="Primary"]')?.textContent ?? "");
    console.log(`${name}: navHasHowItWorks=${/how it works/i.test(navText)}`);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
    await context.close();
    console.log(`saved ${name}.png`);
  }

  await shoot("home-1366", { width: 1366, height: 900, fullPage: true });
  await shoot("home-1280", { width: 1280, height: 800, fullPage: true });
  await shoot("home-834", { width: 834, height: 1112, fullPage: true });
  await shoot("home-390", { width: 390, height: 844, fullPage: true });
  await shoot("home-320", { width: 320, height: 700, fullPage: true });
  await shoot("home-1366-dark", { width: 1366, height: 900, theme: "dark", fullPage: true });
  await shoot("home-1366-reduced", { width: 1366, height: 900, reduced: true, fullPage: true });

  await browser.close();
  console.log("DONE");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  for (const server of servers) {
    if (!server.pid) continue;
    try { process.kill(-server.pid, "SIGTERM"); }
    catch (error) { if (error.code !== "ESRCH") console.error(error); }
  }
}
