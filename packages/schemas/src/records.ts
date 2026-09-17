import { z } from "zod";

/**
 * P1-T06 schema-only sketch: structured scenario datasets.
 *
 * Canonical spec §5.1 (Queryable Records) + §7 (Structured Datasets).
 * Types-only forward contract for Phase 2. NO query execution, NO filter
 * evaluation, NO query history here. Deliberately no free-form query
 * language: beta operations are search-by-id, structured-field filter,
 * and time window only.
 */
export const StructuredRecordSchema = z.object({
  id: z.string(),
  fields: z.record(z.union([z.string(), z.number(), z.boolean()])),
  relatedRecordIds: z.array(z.string()).default([]),
});
export type StructuredRecord = z.infer<typeof StructuredRecordSchema>;

export const StructuredDatasetSchema = z
  .object({
    datasetId: z.string(),
    allowedFilterFields: z.array(z.string()).min(1),
    records: z.array(StructuredRecordSchema),
  })
  .strict();
export type StructuredDataset = z.infer<typeof StructuredDatasetSchema>;
