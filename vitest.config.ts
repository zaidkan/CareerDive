import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Keep DOM-heavy integration tests within their real-time assertions.
    maxWorkers: 2,
    include: [
      "packages/**/*.test.ts",
      "apps/**/*.test.ts",
      "apps/**/*.test.tsx",
      "test/**/*.test.ts",
      "test/**/*.test.tsx",
    ],
    // RED contracts (*.red.test.ts) are intentionally-failing specifications
    // for not-yet-implemented behavior. They must NOT gate CI (the test step
    // could never be green while they exist). Run them explicitly with
    // `pnpm test:red` (vitest.red.config.ts). See docs/coordination on RED files.
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/*.red.test.ts",
    ],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
    },
  },
});
