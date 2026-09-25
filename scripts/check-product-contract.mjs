import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = process.argv[2] === "--root" && process.argv[3]
  ? path.resolve(process.argv[3])
  : defaultRoot;

if (process.argv.length > 2 && (process.argv[2] !== "--root" || !process.argv[3] || process.argv.length > 4)) {
  console.error("Usage: node scripts/check-product-contract.mjs [--root directory]");
  process.exit(2);
}

const patterns = [
  ["Practice shift", /\bPractice\s+shift\b/i],
  ["Skip practice", /\bSkip\s+practice\b/i],
  ["Start real shift", /\bStart\s+real\s+shift\b/i],
  ["tutorialComplete", /\btutorialComplete\b/],
  ["startAssessedShift", /\bstartAssessedShift\b/],
  ["experienceMode", /\bexperienceMode\b/],
  ["career-expo-mode", /career-expo-mode/i],
  ["onModeChange", /\bonModeChange\b/],
  ["Walk the office", /\bWalk\s+the\s+office\b/i],
  ["Desk only", /\bDesk\s+only\b/i],
  ["Simple list", /\bSimple\s+list\b/i],
  ["Direct workstation", /\bDirect\s+workstation\b/i],
];
const excluded = new Set(["test", "tests", "__tests__", "docs", "generated", "dist", "build", "node_modules"]);
const sourceFile = /\.(?:js|jsx|mjs|cjs|ts|tsx)$/;
const testFile = /(?:^|\.)\b(?:test|spec)\.[cm]?[jt]sx?$/;

async function scan(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const violations = [];
  for (const entry of entries) {
    if (excluded.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      violations.push(...await scan(absolute));
    } else if (entry.isFile() && sourceFile.test(entry.name) && !testFile.test(entry.name)) {
      const lines = (await readFile(absolute, "utf8")).split(/\r?\n/);
      for (const [index, line] of lines.entries()) {
        for (const [label, expression] of patterns) {
          if (expression.test(line)) violations.push(`${path.relative(root, absolute)}:${index + 1}: ${label}`);
        }
      }
    }
  }
  return violations;
}

const roots = [path.join(root, "apps/web/src"), path.join(root, "apps/server/src")];
try {
  for (const entry of await readdir(path.join(root, "packages"), { withFileTypes: true })) {
    if (entry.isDirectory()) roots.push(path.join(root, "packages", entry.name, "src"));
  }
  const violations = (await Promise.all(roots.map(scan))).flat();
  if (violations.length) {
    console.error(violations.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Product contract: pass");
  }
} catch (error) {
  console.error(error);
  process.exitCode = 2;
}
