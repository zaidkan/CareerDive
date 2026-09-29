import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

const web = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const api = process.env.API_ORIGIN ?? "http://localhost:3001";
const webUrl = new URL(web);
const apiUrl = new URL(api);

async function healthy(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok;
  } catch {
    return false;
  }
}

setTimeout(() => process.exit(0), 120000).unref();

const webReady = await healthy(web);
const apiReady = await healthy(`${api}/health`);
if (webReady || apiReady) {
  console.error(`Dev ports already in use.`);
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
      throw new Error("Dev stack did not become healthy");
    }
    await delay(1000);
  }

  const browser = await chromium.launch({
    args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"],
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();
  page.on("console", (msg) => console.log(`CONSOLE[${msg.type()}]: ${msg.text()}`));
  page.on("pageerror", (err) => console.log(`PAGEERROR: ${err.message}`));

  await page.goto(`${web}/how-it-works`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const info = await page.evaluate(() => ({
    pathname: window.location.pathname,
    h1: document.querySelector("h1")?.textContent ?? null,
    mainChildren: document.getElementById("main-content")?.children.length ?? -1,
    bodyText: document.body.innerText.slice(0, 120),
  }));
  console.log("INFO:", JSON.stringify(info, null, 2));

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
