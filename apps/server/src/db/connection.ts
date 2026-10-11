/** Supavisor transaction pooling supports neither named prepares nor pipelining. */
export const poolerCompatibleOptions = {
  prepare: false,
  max_pipeline: 1,
} as const;
