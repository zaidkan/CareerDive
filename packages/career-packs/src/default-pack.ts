import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { CareerPack } from "@sim/schemas";
import { loadCareerPack } from "./loader.js";

const packPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../content/packs/cybersecurity-analyst/pack.yaml",
);

export function loadDefaultCybersecurityPack(
  now = new Date(),
): CareerPack {
  return loadCareerPack(readFileSync(packPath, "utf8"), now);
}
