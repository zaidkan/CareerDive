import { defineConfig } from "vitest/config";

// RED-contract suite: runs ONLY *.red.test.ts (intentionally-failing
// specifications for not-yet-implemented behavior). Kept OUT of the default
// CI-gating `pnpm test` so CI can be green while RED contracts still exist.
// Run explicitly with `pnpm test:red`; expected to fail until the contract's
// behavior is implemented and the file is renamed off `.red.test.ts`.
export default defineConfig({
  test: {
    include: [
      "packages/**/*.red.test.ts",
      "apps/**/*.red.test.ts",
      "test/**/*.red.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**"],
    environment: "node",
  },
});
