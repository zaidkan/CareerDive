import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { SupabasePublicKeySchema } from "@sim/schemas/public-key";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/** Local CareerDive web port. Must stay in sync with server dev CORS. */
export const DEV_WEB_PORT = 5173;

export const devServer = {
  port: DEV_WEB_PORT,
  // Fail immediately if 5173 is taken instead of silently using 5174/5175
  // (CORS only allows 5173, so a silent port jump breaks session creation).
  strictPort: true,
} as const;

function buildSha(): string {
  const configured = process.env.BUILD_SHA ?? process.env.RENDER_GIT_COMMIT;
  if (configured) return configured;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}
if (process.env.VITE_SUPABASE_ANON_KEY)
  SupabasePublicKeySchema.parse(process.env.VITE_SUPABASE_ANON_KEY);
const siteOrigin = process.env.SITE_ORIGIN ?? "https://careerdive.example.com";
if (new URL(siteOrigin).origin !== siteOrigin)
  throw new Error(
    "SITE_ORIGIN must be an origin without path or trailing slash",
  );
export default defineConfig({
  plugins: [
    react(),
    {
      name: "public-site-origin",
      apply: "build",
      transformIndexHtml: (html) =>
        html.replaceAll("https://careerdive.example.com", siteOrigin),
      async closeBundle() {
        for (const file of ["robots.txt", "sitemap.xml"]) {
          const target = new URL(`./dist/${file}`, import.meta.url);
          const content = await readFile(target, "utf8");
          await writeFile(
            target,
            content.replaceAll("https://careerdive.example.com", siteOrigin),
          );
        }
      },
    },
  ],
  define: {
    __BUILD_SHA__: JSON.stringify(buildSha()),
    "import.meta.env.VITE_SITE_ORIGIN": JSON.stringify(siteOrigin),
  },
  server: devServer,
  test: {
    // Playwright specs in e2e/ run under `npx playwright test`, not vitest.
    exclude: [
      "e2e/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
    ],
  },
});
