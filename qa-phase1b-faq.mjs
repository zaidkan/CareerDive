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

setTimeout(() => process.exit(1), 240000).unref();

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

  // 1. Desktop light: structure, copy, framing removal
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, colorScheme: "light" });
    const page = await context.newPage();
    const issues = watch(page);
    await page.goto(`${web}/faq`, { waitUntil: "load" });
    await page.waitForTimeout(1200);

    const state = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const details = [...document.querySelectorAll("details.faq-item")];
      const ld = document.querySelector('script[type="application/ld+json"]');
      return {
        pathname: window.location.pathname,
        h1: document.querySelector("h1")?.textContent ?? null,
        count: details.length,
        questions: details.map((d) => d.querySelector("summary span:nth-child(2)")?.textContent?.trim() ?? ""),
        chipsGone: !/Plain language/i.test(bodyText) && !/Tap any question/i.test(bodyText),
        jobAppGone: !/real job application/i.test(bodyText),
        githubLink: [...document.querySelectorAll('a[href*="github.com/zaidkan/Career-Expo/issues"]')].length,
        ldCount: ld ? JSON.parse(ld.textContent).mainEntity.length : 0,
        lede: document.querySelector(".page-hero .lede")?.textContent ?? "",
      };
    });

    check("faq: pathname /faq", state.pathname === "/faq", `path=${state.pathname}`);
    check("faq: h1 present", Boolean(state.h1), `h1=${JSON.stringify(state.h1)}`);
    check("faq: 9 questions", state.count === 9, `count=${state.count}`);
    check("faq: framing chips removed", state.chipsGone);
    check("faq: 'real job application' removed", state.jobAppGone);
    check("faq: GitHub report link present", state.githubLink >= 1, `links=${state.githubLink}`);
    check("faq: JSON-LD has 9 entries", state.ldCount === 9, `ld=${state.ldCount}`);
    const expected = [
      "How long does it take?",
      "Do I need to be good at games?",
      "What if the office doesn't load?",
      "How accessible is it, and how do I report a problem?",
      "If I write about how I felt, who sees it?",
      "What does the AI actually do?",
      "What do Workshop careers mean?",
      "Do career requests influence what gets built?",
      "Is there more after this first day?",
    ];
    const normalized = state.questions.map((q) => q.replace(/\s+/g, " ").trim());
    check(
      "faq: question set matches audit",
      expected.every((q) => normalized.includes(q)) && normalized.length === expected.length,
      JSON.stringify(normalized),
    );

    // Expand/collapse + answer content
    const first = page.locator("details.faq-item").first();
    await first.locator("summary").click();
    await page.waitForTimeout(300);
    const answer = await first.locator("p").textContent();
    check("faq: answer visible after click", Boolean(answer && answer.length > 20), `len=${answer?.length ?? 0}`);
    check("faq: first answer mentions 10–15 minutes", /10–15 minutes/.test(answer ?? ""), answer?.slice(0, 60) ?? "");

    // Career-request answer truthfulness (no server-side collection claim)
    const reqAnswer = await page.evaluate(() => {
      const d = [...document.querySelectorAll("details.faq-item")].find((x) =>
        /career requests/i.test(x.querySelector("summary")?.textContent ?? ""),
      );
      d?.setAttribute("open", "");
      return d?.querySelector("p")?.textContent ?? "";
    });
    check(
      "faq: request answer says nothing is collected",
      /nothing is collected or stored/i.test(reqAnswer),
      reqAnswer.slice(0, 90),
    );

    check("faq desktop light: no errors", issues.length === 0, issues.join(" | "));
    await page.screenshot({ path: `${OUT}/phase1b-faq-1366-light.png`, fullPage: true });
    await context.close();
  }

  // 2. Keyboard: Tab reaches summary, focus ring visible, Enter toggles
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    const issues = watch(page);
    await page.goto(`${web}/faq`, { waitUntil: "load" });
    await page.waitForTimeout(1000);
    // Tab until a faq summary has focus (skip link + nav come first)
    let reached = false;
    for (let i = 0; i < 40 && !reached; i += 1) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => document.activeElement?.closest("details.faq-item") !== null);
    }
    check("keyboard: Tab reaches a FAQ summary", reached);
    const outline = await page.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return null;
      const cs = getComputedStyle(el);
      return { style: cs.outlineStyle, width: cs.outlineWidth, color: cs.outlineColor };
    });
    check(
      "keyboard: focus ring visible on summary",
      Boolean(outline && outline.style !== "none" && parseFloat(outline.width) >= 1),
      JSON.stringify(outline),
    );
    const wasOpen = await page.evaluate(() => document.activeElement?.closest("details")?.hasAttribute("open") ?? false);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    const isOpen = await page.evaluate(() => document.activeElement?.closest("details")?.hasAttribute("open") ?? false);
    check("keyboard: Enter toggles the question", wasOpen !== isOpen, `before=${wasOpen} after=${isOpen}`);
    check("keyboard: no errors", issues.length === 0, issues.join(" | "));
    await context.close();
  }

  // 3. Mobile 390 dark + reduced motion
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const issues = watch(page);
    await page.goto(`${web}/faq`, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    const state = await page.evaluate(() => {
      const summaries = [...document.querySelectorAll("details.faq-item summary")];
      const overflow = summaries.some((s) => s.scrollWidth > s.clientWidth + 1);
      return {
        count: summaries.length,
        h1: document.querySelector("h1")?.textContent ?? null,
        horizontalOverflow: document.documentElement.scrollWidth > 390 + 1,
        summaryOverflow: overflow,
      };
    });
    check("mobile: 9 questions", state.count === 9, `count=${state.count}`);
    check("mobile: h1 rendered", Boolean(state.h1));
    check("mobile: no horizontal page overflow", !state.horizontalOverflow);
    check("mobile: no summary text clipping", !state.summaryOverflow);
    // Expand first item on mobile
    await page.locator("details.faq-item summary").first().click();
    await page.waitForTimeout(300);
    const answerVisible = await page.locator("details.faq-item").first().locator("p").isVisible();
    check("mobile: answer visible on expand", answerVisible);
    check("mobile dark reduced: no errors", issues.length === 0, issues.join(" | "));
    await page.screenshot({ path: `${OUT}/phase1b-faq-390-dark-reduced.png`, fullPage: true });
    await context.close();
  }

  // 4. Footer trust link still works (route intact)
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    const issues = watch(page);
    await page.goto(`${web}/faq`, { waitUntil: "load" });
    await page.waitForTimeout(800);
    await page.locator('main a[href="/trust"]').first().click();
    await page.waitForTimeout(1000);
    const path = await page.evaluate(() => window.location.pathname);
    check("footer: Privacy and safety link works", path === "/trust", `path=${path}`);
    check("footer: no errors", issues.length === 0, issues.join(" | "));
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
console.log(`\nFAQ QA SUMMARY: ${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  console.log("FAILURES:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}
console.log("ALL FAQ BROWSER QA PASSED");
process.exit(0);
