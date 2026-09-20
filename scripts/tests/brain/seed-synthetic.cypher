// BrainV2 harness SYNTHETIC seed (no production data).
// Reproduces the 49 SEMANTIC (embedded) + 2 COORDINATION (ns, no embedding)
// Fact shape so migration/retrieval tests match production structure.
// Embeddings are synthetic zero-ish 384-dim vectors (values differ per node to
// avoid identical-vector index warnings). NONE of this is real project content.

// 49 synthetic SEMANTIC facts
// MERGE on the unique id keeps re-applies idempotent (harness `apply` must be
// repeatable); CREATE would trip the fact_id uniqueness constraint on the 2nd run.
UNWIND range(1, 49) AS i
MERGE (f:Fact {id: 'syn-sem-' + toString(i)})
SET f.subject = 'synthetic subject ' + toString(i),
    f.predicate = 'synthetic_predicate',
    f.object = 'synthetic object body number ' + toString(i) + ' lorem ipsum token' + toString(i),
    f.confidence = 1.0,
    f.created_at = datetime(),
    f.embedding = [x IN range(0,383) | toFloat((i + x) % 7) / 10.0];

// 2 synthetic COORDINATION facts (oc-memory shape: ns/mtype/status, NO embedding)
MERGE (c1:Fact {id: 'syn-coord-1'})
SET c1.ns = 'career-expo', c1.mtype = 'DECISION',
    c1.subject = 'SYN-TASK-1', c1.predicate = 'decided',
    c1.object = 'synthetic coordination decision alpha unique-token-zebra',
    c1.status = 'active', c1.created_at = datetime();
MERGE (c2:Fact {id: 'syn-coord-2'})
SET c2.ns = 'career-expo', c2.mtype = 'BLOCKER',
    c2.subject = 'SYN-TASK-2', c2.predicate = 'blocked_by',
    c2.object = 'synthetic coordination blocker beta unique-token-quokka',
    c2.status = 'open', c2.created_at = datetime();
