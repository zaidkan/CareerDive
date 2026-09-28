import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = process.env.FREEZE_OUT ?? "/tmp/career-expo-ui-freeze";
const manifestPath = path.join(out, "manifest.json");

const ROUTE_ORDER = ["home", "careers", "cyber", "faq", "trust", "404", "start"];
const VIEWPORT_ORDER = ["1366", "1280", "834", "390", "320"];
const REDUCED_VIEWPORTS = ["1366", "834", "390"];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function thumb(file, caption, className = "") {
  if (!file) {
    return `<figure class="thumb ${className}"><div class="missing">missing</div><figcaption>${escapeHtml(caption)}</figcaption></figure>`;
  }
  return `<figure class="thumb ${className}"><img src="${escapeHtml(file)}" alt="${escapeHtml(file)}" loading="eager" /><figcaption>${escapeHtml(caption)}</figcaption></figure>`;
}

function buildNormalSheet(records, meta) {
  const rows = ROUTE_ORDER.map((routeKey) => {
    const cells = VIEWPORT_ORDER.map((label) => {
      const light = records.find(
        (record) =>
          record.routeKey === routeKey &&
          record.viewport.label === label &&
          record.theme === "light" &&
          record.motion === "normal",
      );
      const dark = records.find(
        (record) =>
          record.routeKey === routeKey &&
          record.viewport.label === label &&
          record.theme === "dark" &&
          record.motion === "normal",
      );
      const marks = [light, dark]
        .filter(Boolean)
        .flatMap((record) => record.failed)
        .filter((value, index, all) => all.indexOf(value) === index);
      return `<td class="${marks.length ? "cell-fail" : ""}">${thumb(light?.screenshot, `${label} light`)}${thumb(dark?.screenshot, `${label} dark`)}</td>`;
    });
    return `<tr><th scope="row">${escapeHtml(routeKey)}</th>${cells}</tr>`;
  }).join("");

  return `<section class="sheet">
  <h2>Normal motion · light + dark</h2>
  <table>
    <thead><tr><th>Route</th>${VIEWPORT_ORDER.map((label) => `<th>${label}</th>`).join("")}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>`;
}

function buildReducedSheet(records) {
  const rows = ROUTE_ORDER.map((routeKey) => {
    const cells = REDUCED_VIEWPORTS.map((label) => {
      const record = records.find(
        (entry) =>
          entry.routeKey === routeKey &&
          entry.viewport.label === label &&
          entry.motion === "reduce",
      );
      return `<td class="${record?.failed?.length ? "cell-fail" : ""}">${thumb(record?.screenshot, `reduced ${label}`)}</td>`;
    });
    return `<tr><th scope="row">${escapeHtml(routeKey)}</th>${cells}</tr>`;
  }).join("");

  return `<section class="sheet sheet--reduced">
  <h2>Reduced motion · light</h2>
  <table>
    <thead><tr><th>Route</th>${REDUCED_VIEWPORTS.map((label) => `<th>${label}</th>`).join("")}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>`;
}

function buildSectionSheet(records) {
  const groups = ROUTE_ORDER.map((routeKey) => {
    const files = records
      .filter((record) => record.routeKey === routeKey)
      .flatMap((record) => record.sections ?? [])
      .filter((file) => !file.startsWith("FAILED"));
    if (files.length === 0) return "";
    return `<div class="section-group"><h3>${escapeHtml(routeKey)}</h3><div class="section-grid">${files
      .map((file) => thumb(file, path.basename(file).replace(/\.png$/, "")))
      .join("")}</div></div>`;
  }).join("");
  if (!groups) return "";
  return `<section class="sheet"><h2>Major sections · 1366 light</h2>${groups}</section>`;
}

function pageHtml({ records, meta }) {
  const failed = records.filter((record) => record.failed.length > 0);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Career Expo visual freeze contact sheet</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; padding: 24px; background: #f4f2ee; color: #171a1f; font: 14px/1.45 "Helvetica Neue", Arial, sans-serif; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #5a6069; margin: 0 0 20px; }
  .sheet { background: #fff; border: 1px solid #dcd8d1; border-radius: 8px; padding: 16px 16px 24px; margin-bottom: 24px; }
  .sheet h2 { font-size: 16px; margin: 0 0 12px; }
  table { border-collapse: collapse; }
  th[scope="row"] { text-align: left; vertical-align: top; padding: 8px 12px 8px 0; font-size: 13px; width: 92px; }
  thead th { text-align: left; font-size: 12px; color: #5a6069; padding: 0 8px 8px 0; }
  td { vertical-align: top; padding: 0 8px 8px 0; }
  td.cell-fail { background: #fdecec; }
  .thumb { margin: 0 0 6px; }
  .thumb img, .thumb .missing { display: block; width: 148px; height: 196px; object-fit: cover; object-position: top; border: 1px solid #c9c4bc; background: #eceae5; }
  .thumb .missing { display: flex; align-items: center; justify-content: center; color: #a33; font-size: 12px; }
  .thumb figcaption { font-size: 11px; color: #5a6069; }
  .sheet--reduced .thumb img, .sheet--reduced .thumb .missing { width: 236px; height: 312px; }
  .section-grid { display: flex; flex-wrap: wrap; gap: 10px; }
  .section-group { margin-bottom: 16px; }
  .section-group h3 { font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: .06em; color: #5a6069; }
  .section-grid .thumb img, .section-grid .thumb .missing { width: 240px; height: auto; max-height: 320px; object-fit: contain; object-position: top; background: #fff; }
  .section-grid figcaption { word-break: break-all; }
</style>
</head>
<body>
<h1>Career Expo · public UI visual freeze contact sheet</h1>
<p class="meta">Captured ${escapeHtml(meta.capturedAt)} · ${escapeHtml(meta.origin)} · base ${escapeHtml(meta.base)} · ${String(records.length)} captures · ${String(failed.length)} with failing checks</p>
${buildNormalSheet(records, meta)}
${buildReducedSheet(records)}
${buildSectionSheet(records)}
</body>
</html>
`;
}

async function render(page, htmlPath, pngPath, width) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
  await page
    .waitForFunction(
      () => Array.from(document.images).every((image) => image.complete),
      null,
      { timeout: 20000 },
    )
    .catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: pngPath, fullPage: true, animations: "disabled" });
}

async function main() {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    console.error(
      `qa-visual-freeze-sheet: no manifest at ${manifestPath}. Run scripts/qa-visual-freeze.mjs first.`,
    );
    process.exitCode = 1;
    return;
  }
  const { records = [], meta = {} } = manifest;
  await mkdir(out, { recursive: true });
  const htmlPath = path.join(out, "contact-sheet.html");
  await writeFile(htmlPath, pageHtml({ records, meta }));

  const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    await render(page, htmlPath, path.join(out, "contact-sheet.png"), 1720);
    const onlySections = `<!doctype html><html><head><meta charset="utf-8"><title>Sections</title><style>
      body { margin: 0; padding: 24px; background: #f4f2ee; color: #171a1f; font: 14px/1.45 "Helvetica Neue", Arial, sans-serif; }
      .sheet { background: #fff; border: 1px solid #dcd8d1; border-radius: 8px; padding: 16px; }
      .section-group { margin-bottom: 16px; }
      .section-group h3 { font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: .06em; color: #5a6069; }
      .section-grid { display: flex; flex-wrap: wrap; gap: 10px; }
      .thumb { margin: 0; }
      .thumb img { display: block; width: 250px; height: auto; border: 1px solid #c9c4bc; background: #fff; }
      .thumb figcaption { font-size: 11px; color: #5a6069; word-break: break-all; }
    </style></head><body><div class="sheet">${buildSectionSheet(records)}</div></body></html>`;
    const sectionsPath = path.join(out, "contact-sheet-sections.html");
    await writeFile(sectionsPath, onlySections);
    await render(
      page,
      sectionsPath,
      path.join(out, "contact-sheet-sections.png"),
      1400,
    );
  } finally {
    await browser.close();
  }
  console.log(`qa-visual-freeze-sheet: ${path.join(out, "contact-sheet.png")}`);
  console.log(
    `qa-visual-freeze-sheet: ${path.join(out, "contact-sheet-sections.png")}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
