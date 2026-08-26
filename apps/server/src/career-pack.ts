import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import type { CareerPack } from "@sim/schemas";

let cached: CareerPack | undefined;

/**
 * Reads and parses the bundled YAML pack on first use only, so importing the
 * router does not touch the filesystem.
 */
export function getDefaultCareerPack(): CareerPack {
  cached ??= loadDefaultCybersecurityPack();
  return cached;
}
