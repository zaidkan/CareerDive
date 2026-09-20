// BrainV2 harness SYNTHETIC seed (no production data).
// Reproduces the 49 SEMANTIC (embedded) + 2 COORDINATION (ns, no embedding)
// Fact shape so migration/retrieval tests match production structure.
// Embeddings are synthetic zero-ish 384-dim vectors (values differ per node to
// avoid identical-vector index warnings). NONE of this is real project content.

// 49 synthetic SEMANTIC facts
UNWIND range(1, 49) AS i
CREATE (f:Fact {
  id: 'syn-sem-' + toString(i),
  subject: 'synthetic subject ' + toString(i),
  predicate: 'synthetic_predicate',
  object: 'synthetic object body number ' + toString(i) + ' lorem ipsum token' + toString(i),
  confidence: 1.0,
  created_at: datetime(),
  embedding: [x IN range(0,383) | toFloat((i + x) % 7) / 10.0]
});

// 2 synthetic COORDINATION facts (oc-memory shape: ns/mtype/status, NO embedding)
CREATE (c1:Fact {
  id: 'syn-coord-1', ns: 'career-expo', mtype: 'DECISION',
  subject: 'SYN-TASK-1', predicate: 'decided',
  object: 'synthetic coordination decision alpha unique-token-zebra',
  status: 'active', created_at: datetime()
});
CREATE (c2:Fact {
  id: 'syn-coord-2', ns: 'career-expo', mtype: 'BLOCKER',
  subject: 'SYN-TASK-2', predicate: 'blocked_by',
  object: 'synthetic coordination blocker beta unique-token-quokka',
  status: 'open', created_at: datetime()
});
