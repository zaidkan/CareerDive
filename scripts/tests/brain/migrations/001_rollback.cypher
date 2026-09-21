// BrainV2 T2 rollback (SYNTHETIC harness only).
// Undoes ONLY the additive fields/label added by 001_backfill.cypher:
// the :Coordination label and the memory_class / project_id / scope /
// provenance properties. DELETES NO Fact and never touches a pre-existing
// property value, so the DB returns to its exact pre-migration shape.
// Removing an absent label or property is a silent no-op, so this file is
// itself safely idempotent. The reverse of the T3 fulltext index
// (DROP INDEX coordination_fulltext IF EXISTS) is documented, not run here;
// see docs/coordination/BRAIN_MIGRATION.md.
MATCH (f:Fact)
REMOVE f:Coordination, f.memory_class, f.project_id, f.scope, f.provenance