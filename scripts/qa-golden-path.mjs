import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const web = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const api = process.env.API_ORIGIN ?? "http://localhost:3001";

async function healthy(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok;
  } catch {
    return false;
  }
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

const webReady = await healthy(web);
const apiReady = await healthy(`${api}/health`);
if (webReady || apiReady) {
  console.error(`Dev ports already in use: web=${webReady}, API=${apiReady}. Free ports 5173/3001, then retry.`);
  process.exit(1);
}

const servers = [];
try {
  servers.push(spawn("pnpm", ["--filter", "@sim/web", "dev"], { detached: true, stdio: "inherit" }));
  servers.push(spawn("pnpm", ["--filter", "@sim/server", "exec", "tsx", "src/main.ts"], { detached: true, stdio: "inherit" }));
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await healthy(web) && await healthy(`${api}/health`)) break;
    if (servers.some((server) => server.exitCode !== null) || attempt === 119) {
      throw new Error("Dev stack did not become healthy within 120 seconds");
    }
    await delay(1000);
  }
  const test = spawn("pnpm", ["exec", "playwright", "test"], { stdio: "inherit" });
  process.exitCode = await waitForExit(test);
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
