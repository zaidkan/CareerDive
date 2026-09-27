import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const web = "http://localhost:5173";
const api = "http://localhost:3001";

async function healthy(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok;
  } catch {
    return false;
  }
}

if (await healthy(web) || await healthy(`${api}/health`)) {
  console.error("Ports 5173/3001 already in use. Free them and retry.");
  process.exit(1);
}

const servers = [];
try {
  servers.push(spawn("pnpm", ["--filter", "@sim/web", "exec", "vite", "--host", "localhost", "--port", "5173", "--strictPort"], {
    detached: true, stdio: "ignore", env: { ...process.env, VITE_SERVER_URL: api },
  }));
  servers.push(spawn("pnpm", ["--filter", "@sim/server", "exec", "tsx", "src/main.ts"], {
    detached: true, stdio: "ignore", env: { ...process.env, PORT: "3001" },
  }));
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (await healthy(web) && await healthy(`${api}/health`)) break;
    if (attempt === 89) throw new Error("Dev stack did not become healthy");
    await delay(1000);
  }

  const { chromium } = await import("@playwright/test");
  await mkdir(path.join(root, "test-results", "shots"), { recursive: true });
  const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });

  const shots = [
    { name: "home-desktop", width: 1366, height: 900 },
    { name: "home-1280", width: 1280, height: 800 },
    { name: "home-tablet", width: 834, height: 1112 },
    { name: "home-mobile", width: 390, height: 844 },
    { name: "home-mobile-320", width: 320, height: 720 },
  ];

  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
    await page.goto(web, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(root, "test-results", "shots", `${shot.name}-light.png`), fullPage: true });
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(root, "test-results", "shots", `${shot.name}-dark.png`), fullPage: true });
    await page.close();
  }

  const detail = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await detail.goto(`${web}/careers/cybersecurity-analyst`, { waitUntil: "networkidle" });
  await detail.waitForTimeout(900);
  await detail.screenshot({ path: path.join(root, "test-results", "shots", "cyber-detail-light.png"), fullPage: true });
  await detail.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await detail.waitForTimeout(300);
  await detail.screenshot({ path: path.join(root, "test-results", "shots", "cyber-detail-dark.png"), fullPage: true });
  await detail.close();

  const mobileHome = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await mobileHome.goto(web, { waitUntil: "networkidle" });
  await mobileHome.waitForTimeout(900);
  await mobileHome.screenshot({ path: path.join(root, "test-results", "shots", "home-mobile-reduced.png"), fullPage: true });
  await mobileHome.close();

  await browser.close();
  console.log("Screenshots written to test-results/shots/");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  for (const server of servers) {
    if (!server.pid) continue;
    try { process.kill(-server.pid, "SIGTERM"); } catch { /* already gone */ }
  }
}
