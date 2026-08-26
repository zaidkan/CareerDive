import { z } from "zod";

export const PathwayRecordSchema = z.object({
  id: z.string(),
  careerId: z.string(),
  region: z.string(),
  jurisdiction: z.string(),
  credentialType: z.string(),
  requirement: z.string(),
  authorityName: z.string(),
  authorityUrl: z.string().url(),
  lastVerified: z.string().date(),
  nextReview: z.string().date(),
});
export type PathwayRecord = z.infer<typeof PathwayRecordSchema>;
