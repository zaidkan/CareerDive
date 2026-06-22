import { CareerPackSchema, type CareerPack } from "@sim/schemas";
import { parse } from "yaml";

export function loadCareerPack(source: string, now = new Date()): CareerPack {
  const pack = CareerPackSchema.parse(parse(source));
  if (pack.career.reviewStatus !== "approved") {
    throw new Error("Career pack must be approved");
  }
  if (new Date(pack.career.nextReview).getTime() < now.getTime()) {
    throw new Error("Career pack review is stale");
  }
  return pack;
}
