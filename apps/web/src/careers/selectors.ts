import { careers } from "./careers.js";
import type { PublicCareer } from "./types.js";

export function readyNowCareers(items: readonly PublicCareer[] = careers): PublicCareer[] {
  return items.filter((career) => career.availability === "ready_now");
}

export function workshopCareers(items: readonly PublicCareer[] = careers): PublicCareer[] {
  return items.filter((career) => career.availability === "in_workshop");
}
