import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

test("product contract scanner reports runtime violations with file and line", () => {
  const root = mkdtempSync(path.join(tmpdir(), "career-contract-"));
  const script = fileURLToPath(new URL("../../../scripts/check-product-contract.mjs", import.meta.url));
  try {
    const src = path.join(root, "apps/web/src");
    mkdirSync(src, { recursive: true });
    mkdirSync(path.join(root, "packages"));
    writeFileSync(path.join(src, "entry.ts"), 'const experienceMode = "Practice shift";\n');
    const result = spawnSync(process.execPath, [script, "--root", root], { encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("apps/web/src/entry.ts:1: experienceMode");
    expect(result.stderr).toContain("apps/web/src/entry.ts:1: Practice shift");
    writeFileSync(path.join(src, "entry.ts"), "export const shift = 'assessed';\n");
    execFileSync(process.execPath, [script, "--root", root]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
