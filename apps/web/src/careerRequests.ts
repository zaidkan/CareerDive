import { z } from "zod";
import { apiPost } from "./transport.js";
const stateSchema = z.object({ requestedCareerIds: z.array(z.string()) });
export async function careerRequestState(): Promise<string[]> {
  return stateSchema.parse(await apiPost("/api/career-requests/state", {}))
    .requestedCareerIds;
}
export async function setCareerRequested(desired: {
  careerId: string;
  requested: boolean;
}): Promise<void> {
  const response = z
    .object({
      careerId: z.string(),
      requested: z.boolean(),
      saved: z.literal(true),
    })
    .parse(await apiPost("/api/career-requests", desired));
  if (
    response.careerId !== desired.careerId ||
    response.requested !== desired.requested
  )
    throw new Error("Request not confirmed");
}
