import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { createServer } from "vite";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const origin = process.env.STATIC_SITE_ORIGIN;
if (!origin) throw new Error("STATIC_SITE_ORIGIN is required for prerendered public URLs");
if (origin !== "__SITE_ORIGIN__") {
  const parsed = new URL(origin);
  if (!(["http:", "https:"].includes(parsed.protocol) && parsed.origin === origin)) {
    throw new Error("STATIC_SITE_ORIGIN must be an absolute HTTP(S) origin without a trailing slash");
  }
}

const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);
const json = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
const template = await readFile(resolve(dist, "index.html"), "utf8");
const vite = await createServer({ root, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });

try {
  const [{ SiteApp }, { INDEXABLE_PATHS, metaForRoute, structuredDataForRoute }, { parseRoute }] = await Promise.all([
    vite.ssrLoadModule("/src/site/SiteApp.tsx"),
    vite.ssrLoadModule("/src/site/seo.ts"),
    vite.ssrLoadModule("/src/site/routes.ts"),
  ]);

  const paths = [...INDEXABLE_PATHS, "/start", "/404.html"];
  for (const path of paths) {
    const route = parseRoute(path);
    const meta = metaForRoute(route);
    const url = `${origin}${meta.path}`;
    const tags = [
      `<title>${escape(meta.title)}</title>`,
      `<meta name="site-origin" content="${escape(origin)}" />`,
      `<meta name="description" content="${escape(meta.description)}" />`,
      ...(meta.index ? [`<link rel="canonical" href="${escape(url)}" />`] : []),
      `<meta name="robots" content="${meta.index ? "index,follow" : "noindex,follow"}" />`,
      '<meta property="og:type" content="website" />',
      '<meta property="og:site_name" content="Career Expo" />',
      `<meta property="og:title" content="${escape(meta.title)}" />`,
      `<meta property="og:description" content="${escape(meta.description)}" />`,
      ...(meta.index ? [`<meta property="og:url" content="${escape(url)}" />`] : []),
      `<meta property="og:image" content="${escape(origin)}/og.png" />`,
      '<meta property="og:image:width" content="1200" />',
      '<meta property="og:image:height" content="630" />',
      '<meta property="og:image:alt" content="Verdaly tower entrance with glowing doors beneath the VERDALY sign" />',
      '<meta name="twitter:card" content="summary_large_image" />',
      `<meta name="twitter:title" content="${escape(meta.title)}" />`,
      `<meta name="twitter:description" content="${escape(meta.description)}" />`,
      `<meta name="twitter:image" content="${escape(origin)}/og.png" />`,
      ...structuredDataForRoute(route, origin).map((data) => `<script type="application/ld+json" data-site-json-ld>${json(data)}</script>`),
    ].join("\n    ");
    const stream = await renderToReadableStream(createElement(SiteApp, { initialRoute: path }));
    await stream.allReady;
    const content = await new Response(stream).text();
    const html = template.replace("<!-- SEO_HEAD -->", tags).replace('<div id="root"></div>', `<div id="root">${content}</div>`);
    const target = path === "/404.html" ? resolve(dist, "404.html") : path === "/" ? resolve(dist, "index.html") : resolve(dist, path.slice(1), "index.html");
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, html);
  }

  await writeFile(resolve(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${INDEXABLE_PATHS.map((path) => `  <url><loc>${escape(`${origin}${path}`)}</loc></url>`).join("\n")}\n</urlset>\n`);
  await writeFile(resolve(dist, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /start\n\nSitemap: ${origin}/sitemap.xml\n`);
} finally {
  await vite.close();
}
