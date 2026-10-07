#!/usr/bin/env node
/**
 * dev-banner — print exactly which CareerDive checkout `pnpm dev` is running.
 *
 * Shown before turbo starts the web (5173) and API (3001) processes so a
 * stale or wrong worktree is obvious at a glance.
 */
import { execFileSync } from "node:child_process";

const WEB_URL = "http://localhost:5173";
const API_URL = "http://localhost:3001";

function git(...args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const worktree = process.cwd();
const branch = git("branch", "--show-current") || "(detached HEAD)";
const sha = git("rev-parse", "--short", "HEAD") || "unknown";
const subject = git("log", "-1", "--format=%s") || "";
const trackedChanges = git("status", "--porcelain", "-uno");
const untrackedOnly = !trackedChanges && git("status", "--porcelain");
const dirty = trackedChanges ? " (dirty)" : untrackedOnly ? " (untracked files)" : "";

const lines = [
  "",
  "CareerDive dev",
  `  worktree: ${worktree}`,
  `  branch:   ${branch}`,
  `  commit:   ${sha}${dirty} ${subject}`,
  `  web:      ${WEB_URL}`,
  `  api:      ${API_URL}  (health: ${API_URL}/health)`,
  "",
  "Ports are strict: 5173/3001 must be free or this stack exits with a",
  "clear error. Verify after startup with: pnpm check:dev",
  "",
];
process.stdout.write(lines.join("\n"));
