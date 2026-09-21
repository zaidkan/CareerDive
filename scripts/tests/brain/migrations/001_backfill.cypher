// BrainV2 T2 additive, idempotent, NO-DATA-LOSS backfill (SYNTHETIC harness only).
// Classifies legacy shared-brain Fact nodes as SEMANTIC or COORDINATION,
// stamps project_id, and fills provenance/scope defaults. Each statement only
// ever ADDS a value on nodes missing it; it never rewrites or removes an
// existing property or label, so re-running the whole file is a no-op.
// Exact behavior is documented in docs/coordination/BRAIN_MIGRATION.md.

// (a) SEMANTIC: embedded legacy facts (embedding present, no coordination ns).
MATCH (f:Fact)
WHERE f.embedding IS NOT NULL AND f.ns IS NULL
SET f.memory_class = 'SEMANTIC';

// (b) COORDINATION: facts carrying the coordination namespace (oc-memory shape:
// ns/mtype/status, NO embedding). Adds the :Coordination label + memory_class.
MATCH (f:Fact)
WHERE f.ns IS NOT NULL
SET f:Coordination
SET f.memory_class = 'COORDINATION';

// (c) project scoping: single-project beta namespace.
MATCH (f:Fact)
WHERE f.project_id IS NULL
SET f.project_id = 'career-expo';

// (d) provenance/scope defaults where absent.
MATCH (f:Fact)
WHERE f.scope IS NULL
SET f.scope = 'career-expo';

MATCH (f:Fact)
WHERE f.provenance IS NULL
SET f.provenance = 'brainv2-001-backfill';