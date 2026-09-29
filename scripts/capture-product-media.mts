import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";
import { loadDefaultCybersecurityPack } from "../packages/career-packs/src/index.js";
import { applyAction, applyWorkplaceInteraction, createInitialWorldState, toClientView } from "../packages/core/src/index.js";
import type { WorldState } from "../packages/schemas/src/index.js";
import { buildCompletedCyberMediaShift } from "./product-media-shift.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "apps/web/public/careers/media");
const packFile = path.join(root, "content/packs/cybersecurity-analyst/pack.yaml");
const port = Number(process.env.MEDIA_CAPTURE_PORT ?? "5173");
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("MEDIA_CAPTURE_PORT must be an unprivileged TCP port");
const origin = `http://localhost:${port}`;
const seed = 7;
const now = new Date("2026-09-28T12:00:00.000Z");
const pack = loadDefaultCybersecurityPack(now);
const packSha256 = createHash("sha256").update(await readFile(packFile)).digest("hex");
const cwebpVersion = execFileSync("cwebp", ["-version"], { encoding: "utf8" }).trim();
// Keep historical 1.0.0 captures intact unless their scene ids are requested.
const wanted = new Set(process.argv.length > 2 ? process.argv.slice(2) : ["a-06", "a-10"]);
const scenes = ["a-01", "a-02", "a-03", "a-04", "a-05", "a-06", "a-07", "a-08", "a-09", "a-10", "a-11", "a-12"] as const;
type Scene = typeof scenes[number];
if ([...wanted].some((id) => !scenes.includes(id as Scene))) throw new Error(`Unknown scene: ${[...wanted].filter((id) => !scenes.includes(id as Scene)).join(", ")}`);

function initial() { return createInitialWorldState("public-media-seed-7", seed, {}, pack); }
function action(state: WorldState, id: Parameters<typeof applyAction>[1]["id"], eventId: string, queryPayload?: Parameters<typeof applyAction>[1]["queryPayload"]) {
  return applyAction(state, { id, eventId, actorId: "user", ...(queryPayload ? { queryPayload } : {}) }).state;
}
function open(state: WorldState, artifactId: string) {
  return applyWorkplaceInteraction(state, { type: "open_artifact", artifactId }).state;
}
function query(state: WorldState, datasetId: "auth" | "devices" | "vpn" | "scanner", filters: Record<string, string>) {
  return action(state, "query_records", "suspicious-login-1", { datasetId, filters });
}
let completedShift: ReturnType<typeof buildCompletedCyberMediaShift> | undefined;
function setup(scene: Scene) {
  if (scene === "a-06" || scene === "a-10") {
    const shift = completedShift ??= buildCompletedCyberMediaShift();
    return {
      view: scene === "a-06" ? shift.ticketView : shift.completedView,
      debrief: scene === "a-10" ? shift.debrief : undefined,
      steps: scene === "a-06" ? shift.ticketActions : shift.actions,
      stateSha256: scene === "a-06" ? shift.ticketStateSha256 : shift.completedStateSha256,
      actionLogSha256: scene === "a-06" ? shift.ticketActionLogSha256 : shift.actionLogSha256,
      completedShiftActionLogSha256: shift.actionLogSha256,
      decisionRoute: scene === "a-06"
        ? { b1: shift.decisionRoute.b1, b2: shift.decisionRoute.b2 }
        : shift.decisionRoute,
      stateMilestone: scene === "a-06" ? "submitted-ticket-in-completed-shift" : "complete_shift",
    };
  }
  let state = initial();
  const steps: string[] = [];
  const doAction = (id: Parameters<typeof applyAction>[1]["id"], eventId: string) => {
    state = action(state, id, eventId); steps.push(`performAction(${id}, ${eventId})`);
  };
  const doOpen = (id: string) => { state = open(state, id); steps.push(`open_artifact(${id})`); };
  if (scene === "a-01") {
    state = applyWorkplaceInteraction(state, { type: "open_alert_record", recordId: "A-1042" }).state;
    steps.push("open_alert_record(A-1042)");
  } else if (scene === "a-02") { state = query(state, "auth", { sessionId: "S-0741" }); steps.push("query_records(auth, sessionId=S-0741)"); }
  else if (scene === "a-03") { state = query(state, "devices", { deviceLabel: "unknown-laptop-17" }); steps.push("query_records(devices, deviceLabel=unknown-laptop-17)"); }
  else if (scene === "a-04") { doAction("review_alert", "suspicious-login-1"); doAction("inspect_login_context", "suspicious-login-1"); doOpen("account-history-1"); }
  else if (scene === "a-05") { state = query(state, "vpn", { vpnId: "V-218" }); steps.push("query_records(vpn, vpnId=V-218)"); }
  else if (scene === "a-07") {
    doAction("read_handoff", "handoff-1"); doAction("acknowledge_handoff", "handoff-1");
    doAction("review_alert", "suspicious-login-1"); doAction("inspect_login_context", "suspicious-login-1");
    doAction("inspect_account_history", "suspicious-login-1"); doAction("check_device_inventory", "suspicious-login-1");
    doAction("review_alert", "routine-alert-1");
    doOpen("chat-morgan"); doOpen("morgan-status-prompt");
  }
  else if (scene === "a-08") { doAction("read_handoff", "handoff-1"); }
  else if (scene === "a-09") { state = query(state, "scanner", { scannerId: "vuln-scan-03" }); steps.push("query_records(scanner, scannerId=vuln-scan-03)"); }
  else steps.push("canonical initial world");
  const view = toClientView(state);
  if (scene === "a-01" && !view.workplace.selectedAlertIdsByEvent?.["suspicious-login-1"]) throw new Error("A-1042 not selected");
  if (["a-02", "a-03", "a-05", "a-09"].includes(scene) && !view.queryResults.length) throw new Error(`${scene}: query produced no results`);
  return { view, debrief: undefined, steps, stateSha256: undefined, actionLogSha256: undefined, completedShiftActionLogSha256: undefined, decisionRoute: undefined, stateMilestone: undefined };
}

async function healthy() {
  try { return (await fetch(origin, { signal: AbortSignal.timeout(1000) })).ok; } catch { return false; }
}
if (await healthy()) throw new Error(`Port ${port} already in use; set MEDIA_CAPTURE_PORT to a free port`);
const server = spawn("pnpm", ["--filter", "@sim/web", "exec", "vite", "--host", "localhost", "--port", String(port), "--strictPort"], { cwd: root, detached: true, stdio: "ignore" });
const temp = await mkdtemp(path.join(tmpdir(), "career-media-"));
try {
  for (let attempt = 0; attempt < 60 && !(await healthy()); attempt++) await delay(500);
  if (!(await healthy())) throw new Error("Vite did not start");
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
  try {
    const provenance = [];
    for (const scene of scenes) {
      if (wanted.size && !wanted.has(scene)) continue;
      const { view, debrief, steps, stateSha256, actionLogSha256, completedShiftActionLogSha256, decisionRoute, stateMilestone } = setup(scene);
      const variants = (["a-01", "a-06", "a-08", "a-10", "a-12"].includes(scene)
        ? [{ device: "desktop", theme: "dark", width: 1366, height: 900 }, { device: "desktop", theme: "light", width: 1366, height: 900 }, { device: "mobile", theme: "dark", width: 390, height: 844 }, { device: "mobile", theme: "light", width: 390, height: 844 }]
        : [{ device: "desktop", theme: "dark", width: 1366, height: 900 }]) as Array<{ device: "desktop" | "mobile"; theme: "dark" | "light"; width: number; height: number }>;
      for (const variant of variants) {
        const page = await browser.newPage({ viewport: { width: variant.width, height: variant.height }, deviceScaleFactor: 1, reducedMotion: "reduce", locale: "en-US" });
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(`${origin}/fixtures/product-media.html`, { waitUntil: "networkidle" });
        await page.evaluate(({ scene, view, theme, debrief }) => window.renderProductMedia(scene, view, theme, debrief), { scene, view, theme: variant.theme, debrief });
        await page.locator(`main[data-scene="${scene}"]`).waitFor();
        await page.locator(".capture-content").waitFor();
        if (scene === "a-06" && !await page.getByText("Verified evidence: A-1042 and S-0741", { exact: false }).count()) throw new Error("A-06 rendered without submitted ticket evidence");
        if (scene === "a-10" && !await page.getByRole("heading", { name: "Your shift in review" }).count()) throw new Error("A-10 rendered without completed decision review");
        const fields: Partial<Record<Scene, { dataset: string; filter: string; value: string }>> = {
          "a-02": { dataset: "auth", filter: "sessionId", value: "S-0741" },
          "a-03": { dataset: "devices", filter: "deviceLabel", value: "unknown-laptop-17" },
          "a-05": { dataset: "vpn", filter: "vpnId", value: "V-218" },
          "a-09": { dataset: "scanner", filter: "scannerId", value: "vuln-scan-03" },
        };
        const field = fields[scene];
        if (field) {
          await page.locator("#record-query-dataset").selectOption(field.dataset);
          await page.locator(`#record-query-${field.dataset}-${field.filter}`).fill(field.value);
        }
        if (scene === "a-11") { await page.locator("canvas").waitFor(); await page.waitForTimeout(1500); }
        await page.evaluate(() => document.fonts.ready);
        if (errors.length) throw new Error(`${scene}: ${errors.join("; ")}`);
        const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        if (variant.device === "mobile" && horizontalOverflow) {
          console.warn(`${scene} mobile ${variant.theme}: real UI overflows; capture omitted`);
          await page.close();
          continue;
        }
        const png = path.join(temp, `${scene}-${variant.device}-${variant.theme}.png`);
        const filename = `${scene}-${variant.device}-${variant.theme}.webp`;
        if (scene === "a-06") await page.locator("main.capture").screenshot({ path: png, animations: "disabled" });
        else await page.screenshot({ path: png, fullPage: true, animations: "disabled" });
        const converted = spawn("cwebp", ["-quiet", "-q", "86", png, "-o", path.join(output, filename)], { stdio: "ignore" });
        const exit = await new Promise<number>((resolve, reject) => { converted.once("error", reject); converted.once("exit", (code) => resolve(code ?? 1)); });
        if (exit) throw new Error(`cwebp failed: ${filename}`);
        provenance.push({ id: scene, file: filename, pack: `${pack.career.id}@${pack.career.packVersion}`, packSha256, seed, route: "/fixtures/product-media.html", actions: steps, theme: variant.theme, viewport: { width: variant.width, height: variant.height, deviceScaleFactor: 1 }, crop: scene === "a-06" ? "main.capture element" : "fullPage", capturedAt: new Date().toISOString(), tool: `Playwright Chromium ${browser.version()}; cwebp ${cwebpVersion} -q 86`, source: scene === "a-06" ? "replayed Cyber 2.0.0 core state + current React CaseReview component" : scene === "a-10" ? "replayed Cyber 2.0.0 core state + server decision review + current React DebriefView component" : "current core state + current React product components", ...(stateSha256 ? { stateSha256, actionLogSha256, completedShiftActionLogSha256, decisionRoute, stateMilestone, completedShift: scene === "a-10" } : {}) });
        await page.close();
        console.log(filename);
      }
    }
    const existing = wanted.size ? JSON.parse(await readFile(path.join(output, "provenance.json"), "utf8").catch(() => "[]")) as typeof provenance : [];
    const complete = [...existing.filter(({ id }) => !wanted.has(id)), ...provenance]
      .sort((a, b) => a.file.localeCompare(b.file));
    await writeFile(path.join(output, "provenance.json"), `${JSON.stringify(complete, null, 2)}\n`);
  } finally { await browser.close(); }
} finally {
  if (server.pid) { try { process.kill(-server.pid, "SIGTERM"); } catch { /* exited */ } }
  await rm(temp, { recursive: true, force: true });
}
