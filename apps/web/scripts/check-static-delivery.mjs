import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const origin = process.env.STATIC_SITE_ORIGIN;
assert.ok(origin, "STATIC_SITE_ORIGIN is required to check static output");

const pages = [
  ["/", "Know the work before you choose the career.", "WebSite"],
  ["/careers", "Explore careers through the work"],
  ["/careers/cybersecurity-analyst", "Cybersecurity Analyst", "BreadcrumbList"],
  ["/how-it-works", "How your Verdaly day actually goes"],
  ["/trust", "We keep your stuff private."],
  ["/faq", "Quick answers, honestly", "FAQPage"],
];
const readPage = (path) => readFile(`dist/${path === "/" ? "" : `${path.slice(1)}/`}index.html`, "utf8");
const sitemap = await readFile("dist/sitemap.xml", "utf8");
const robots = await readFile("dist/robots.txt", "utf8");

for (const [path, heading, schema] of pages) {
  const html = await readPage(path);
  assert.match(html, /<title>[^<]+<\/title>/, `${path}: title`);
  assert.match(html, /<meta name="description" content="[^"]+"/, `${path}: description`);
  assert.ok(html.includes(`<link rel="canonical" href="${origin}${path}"`), `${path}: canonical`);
  assert.ok(html.includes(`<meta property="og:url" content="${origin}${path}"`), `${path}: og:url`);
  assert.ok(html.includes(heading), `${path}: visible heading`);
  assert.ok(!html.includes("Loading…"), `${path}: suspense fallback`);
  if (schema) assert.ok(html.includes(`"@type":"${schema}"`), `${path}: JSON-LD`);
  if (path === "/careers/cybersecurity-analyst") assert.ok(html.includes('"@type":"Occupation"'), "career: Occupation JSON-LD");
  assert.ok(sitemap.includes(`<loc>${origin}${path}</loc>`), `${path}: sitemap`);
}

const start = await readPage("/start");
assert.match(start, /<meta name="robots" content="noindex,follow"/, "/start: noindex");
assert.ok(!sitemap.includes(`<loc>${origin}/start</loc>`), "/start: sitemap exclusion");
assert.ok(!sitemap.includes("registered-nurse"), "Workshop: sitemap exclusion");
assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`), "robots: sitemap");
assert.ok(robots.includes("Disallow: /start"), "robots: /start");
assert.ok((await readFile("dist/404.html", "utf8")).includes("couldn&#x27;t find that page"), "404: visible UI");

console.log("Static delivery contract passed");
