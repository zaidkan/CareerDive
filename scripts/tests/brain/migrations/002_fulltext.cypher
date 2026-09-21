// BrainV2 T3 coordination full-text retrieval (SYNTHETIC harness only).
// Neo4j 5.26 FULLTEXT index (queried with db.index.fulltext.queryNodes;
// NOT the later 2026.x SEARCH/SECONDARY syntax). Indexes the :Coordination
// label produced by 001_backfill over subject + object so coordination facts
// are retrievable by token search even though they carry NO embedding and
// vector search can therefore never return them.
// Does NOT alter any 384-dim vector index or BGE embedding usage.
CREATE FULLTEXT INDEX coordination_fulltext IF NOT EXISTS
FOR (n:Coordination) ON EACH [n.subject, n.object]