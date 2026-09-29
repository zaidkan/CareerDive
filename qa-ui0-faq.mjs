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

const EXPECTED = [
  "What does the first day actually involve?",
  "Do I need to be good at games?",
  "What if something doesn’t load, or I get stuck?",
  "If I write about how I felt, who sees it?",
  "What does the AI actually do?",
  "What does “In the workshop” mean?",
  "How do career requests work?",
  "Is there more after this first day?",
];

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

  async function auditPage({ width, height, colorScheme = "light", reducedMotion = "no-preference", shot }) {
    const context = await browser.newContext({ viewport: { width, height }, colorScheme, reducedMotion });
    const page = await context.newPage();
    const issues = watch(page);
    await page.goto(`${web}/faq`, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    const state = await page.evaluate(() => {
      const details = [...document.querySelectorAll("details.faq-item")];
      const list = document.querySelector(".faq-list");
      const cs = list ? getComputedStyle(list) : null;
      const firstRow = details[0];
      const rowCs = firstRow ? getComputedStyle(firstRow) : null;
      return {
        pathname: window.location.pathname,
        h1: document.querySelector("h1")?.textContent ?? null,
        count: details.length,
        questions: details.map((d) => d.querySelector(".faq-q")?.textContent ?? ""),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        hasCardChrome: rowCs ? rowCs.boxShadow !== "none" || parseFloat(rowCs.borderRadius) > 0 : null,
        heroBottomRule: document.querySelector(".page-hero") ? getComputedStyle(document.querySelector(".page-hero")).borderBottomWidth === "1px" : null,
        listNoDoubleRule: cs ? cs.borderTopWidth === "0px" : null,
        rowsHaveBottomRule: details.every((d) => getComputedStyle(d).borderBottomWidth === "1px"),
        summariesHaveTarget: details.every((d) => d.querySelector("summary")?.getBoundingClientRect().height >= 44),
        noBadgeCircles: details.every((d) => !d.querySelector("summary > span:not(.faq-q)")),
        srSections: document.querySelectorAll('section[aria-label="Questions and answers"]').length,
        h1Count: document.querySelectorAll("h1").length,
        ldCount: (() => {
          const ld = document.querySelector('script[type="application/ld+json"]');
          return ld ? JSON.parse(ld.textContent).mainEntity.length : 0;
        })(),
        jobAppGone: !/real job application/i.test(document.body.innerText),
        framingGone: !/Tap any question/i.test(document.body.innerText),
      };
    });
    const prefix = `${width}x${height}/${colorScheme}`;
    check(`${prefix}: path /faq`, state.pathname === "/faq");
    check(`${prefix}: single h1`, state.h1Count === 1, `h1=${JSON.stringify(state.h1)}`);
    check(`${prefix}: 8 questions in audit order`,
      state.count === 8 && EXPECTED.every((q, i) => state.questions[i] === q),
      JSON.stringify(state.questions));
    check(`${prefix}: no horizontal overflow`, !state.horizontalOverflow);
    check(`${prefix}: thin rules (hero separator + row bottoms, no double rule)`, state.heroBottomRule && state.listNoDoubleRule && state.rowsHaveBottomRule);
    check(`${prefix}: no card chrome (no shadow/radius)`, state.hasCardChrome === false, String(state.hasCardChrome));
    check(`${prefix}: tap targets >= 44px`, state.summariesHaveTarget);
    check(`${prefix}: no badge circles in summary`, state.noBadgeCircles);
    check(`${prefix}: labelled section + JSON-LD 8`, state.srSections === 1 && state.ldCount === 8, `section=${state.srSections} ld=${state.ldCount}`);
    check(`${prefix}: removed framing + job-application question`, state.jobAppGone && state.framingGone);
    check(`${prefix}: no errors`, issues.length === 0, issues.join(" | "));
    if (shot) await page.screenshot({ path: `${OUT}/${shot}`, fullPage: true });
    return { context, page };
  }

  // 1366 light (screenshot)
  {
    const { context, page } = await auditPage({ width: 1366, height: 900, colorScheme: "light", shot: "ui0-faq-1366-light.png" });
    // Expand first + verify answer content
    await page.locator("details.faq-item summary").first().click();
    await page.waitForTimeout(300);
    const a1 = await page.locator("details.faq-item").first().locator("p").textContent();
    check("1366: first answer mentions practice/no-employer", /practice, not an application/.test(a1 ?? "") && /nothing goes to an employer/.test(a1 ?? ""), a1?.slice(0, 70) ?? "");
    // Request answer truthfulness
    const req = await page.evaluate(() => {
      const d = [...document.querySelectorAll("details.faq-item")].find((x) => /career requests/i.test(x.textContent ?? ""));
      d?.setAttribute("open", "");
      return d?.querySelector("p")?.textContent ?? "";
    });
    check("1366: request answer = not collected/stored", /Nothing is collected or stored yet/.test(req), req.slice(0, 80));
    const stuck = await page.evaluate(() => {
      const d = [...document.querySelectorAll("details.faq-item")].find((x) => /get stuck/i.test(x.textContent ?? ""));
      return { text: d?.querySelector("p")?.textContent ?? "", hasGithub: Boolean(d?.querySelector('a[href*="issues/new"]')) };
    });
    check("1366: stuck answer has report link", stuck.hasGithub && /Accessibility recovery/.test(stuck.text));
    await page.screenshot({ path: `${OUT}/ui0-faq-1366-light-open.png`, fullPage: true });
    await context.close();
  }

  // 1280 dark (screenshot)
  await (async () => {
    const { context } = await auditPage({ width: 1280, height: 800, colorScheme: "dark", shot: "ui0-faq-1280-dark.png" });
    await context.close();
  })();

  // 390 light (screenshot)
  await (async () => {
    const { context } = await auditPage({ width: 390, height: 844, colorScheme: "light", shot: "ui0-faq-390-light.png" });
    await context.close();
  })();

  // 320 dark reduced (screenshot)
  await (async () => {
    const { context } = await auditPage({ width: 320, height: 700, colorScheme: "dark", reducedMotion: "reduce", shot: "ui0-faq-320-dark-reduced.png" });
    await context.close();
  })();

  // Keyboard: focus order + ring + Enter toggle
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    const issues = watch(page);
    await page.goto(`${web}/faq`, { waitUntil: "load" });
    await page.waitForTimeout(900);
    const order = [];
    let reachedFirst = false;
    for (let i = 0; i < 45; i += 1) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const inFaq = el.closest("details.faq-item") !== null;
        return {
          tag: el.tagName,
          text: (el.textContent ?? "").trim().slice(0, 45),
          inFaq,
          summaryIndex: inFaq
            ? [...document.querySelectorAll("details.faq-item")].indexOf(el.closest("details"))
            : -1,
        };
      });
      if (info) order.push(info);
      if (!reachedFirst && info?.inFaq && info.summaryIndex === 0) reachedFirst = true;
      else if (reachedFirst && info?.inFaq) break;
      if (order.length > 44) break;
    }
    const faqStops = order.filter((o) => o.inFaq);
    check("focus order: reaches FAQ summaries in page order",
      faqStops.length >= 1 && faqStops[0].summaryIndex === 0 &&
      faqStops.every((s, i) => i === 0 || s.summaryIndex >= faqStops[i - 1].summaryIndex),
      JSON.stringify(faqStops.map((s) => s.summaryIndex)));
    const ring = await page.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return null;
      const cs = getComputedStyle(el);
      return { style: cs.outlineStyle, width: cs.outlineWidth };
    });
    check("keyboard: visible focus ring on summary", Boolean(ring && ring.style !== "none" && parseFloat(ring.width) >= 1), JSON.stringify(ring));
    const before = await page.evaluate(() => document.activeElement?.closest("details")?.hasAttribute("open") ?? false);
    const currentIdx = await page.evaluate(() =>
      [...document.querySelectorAll("details.faq-item")].indexOf(document.activeElement?.closest("details") ?? null),
    );
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => document.activeElement?.closest("details")?.hasAttribute("open") ?? false);
    check("keyboard: Enter toggles", before !== after, `${before} -> ${after}`);
    await page.keyboard.press("Tab");
    const nextIdx = await page.evaluate(() =>
      [...document.querySelectorAll("details.faq-item")].indexOf(document.activeElement?.closest("details") ?? null),
    );
    check("keyboard: Tab advances to the next question in order", nextIdx === currentIdx + 1, `from=${currentIdx} to=${nextIdx}`);
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
console.log(`\nUI-0 FAQ QA SUMMARY: ${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  console.log("FAILURES:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}
console.log("ALL UI-0 FAQ QA PASSED");
process.exit(0);
