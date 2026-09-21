#!/usr/bin/env bash
# BrainV2 T3 coordination full-text retrieval tests (SYNTHETIC harness only,
# disposable container brainv2-neo4j-test). RED->GREEN; wipes + reseeds the
# harness per run. Depends on 001_backfill (labels :Coordination) and creates
# 002_fulltext (Neo4j 5.26 FULLTEXT index, db.index.fulltext.queryNodes).
# Proves exact retrieval by ns/mtype/status AND token full-text retrieval of
# coordination facts that vector search can never return (they have NO
# embedding). Vector indexes and BGE usage stay untouched.
# Run: bash scripts/tests/brain/retrieval.test.sh
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS="$HERE/harness.sh"
MIG="$HERE/migrations"
pass=0; fail=0
ok()  { pass=$((pass+1)); echo "PASS: $1"; }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }
cyv() { "$HARNESS" cypher "$1" 2>/dev/null | tail -1 | sed 's/^"//; s/"$//'; }
eq()  { local n="$1" exp="$2" q="$3" g; g="$(cyv "$q")"; if [ "$g" = "$exp" ]; then ok "$n ($g)"; else bad "$n expected [$exp] got [$g]"; fi; }

echo "[retrieval.test] wiping + reseeding harness"
"$HARNESS" down >/dev/null 2>&1
"$HARNESS" up  >/dev/null 2>&1
"$HARNESS" apply >/dev/null 2>&1

echo "== RED: no coordination fulltext before migration =="
eq "coordination_fulltext index absent=0" "0" "SHOW INDEXES YIELD name WHERE name='coordination_fulltext' RETURN count(name)"
eq "no :Coordination label yet=0"          "0" "MATCH (f:Coordination) RETURN count(*)"
eq "coordination facts embedded=0"         "0" "MATCH (f:Fact) WHERE f.ns IS NOT NULL AND f.embedding IS NOT NULL RETURN count(*)"

echo "== apply 001_backfill + 002_fulltext =="
"$HARNESS" cypher "$(cat "$MIG/001_backfill.cypher")" >/dev/null 2>&1
"$HARNESS" cypher "$(cat "$MIG/002_fulltext.cypher")" >/dev/null 2>&1

echo "== GREEN: fulltext index exists, scoped to :Coordination =="
eq "coordination_fulltext present=1" "1" "SHOW INDEXES YIELD name WHERE name='coordination_fulltext' RETURN count(name)"
eq "index type is FULLTEXT=1"        "1" "SHOW INDEXES YIELD type WHERE type='FULLTEXT' RETURN count(type)"
eq "index covers subject+object"   "TRUE" "SHOW INDEXES YIELD name, properties WHERE name='coordination_fulltext' RETURN 'subject' IN properties AND 'object' IN properties"

echo "== GREEN: exact retrieval (ns / mtype / status) =="
eq "exact DECISION active -> SYN-TASK-1" "SYN-TASK-1" "MATCH (c:Coordination {ns:'career-expo', mtype:'DECISION', status:'active'}) RETURN c.subject"
eq "exact BLOCKER open -> SYN-TASK-2"    "SYN-TASK-2" "MATCH (c:Coordination {ns:'career-expo', mtype:'BLOCKER', status:'open'}) RETURN c.subject"
eq "coordination facts have no embedding=0" "0" "MATCH (c:Coordination) WHERE c.embedding IS NOT NULL RETURN count(*)"
eq "coordination facts are unembedded=2"    "2"  "MATCH (c:Coordination) WHERE c.embedding IS NULL RETURN count(*)"

echo "== GREEN: full-text retrieval by token =="
eq "fulltext 'zebra' -> SYN-TASK-1" "SYN-TASK-1" "CALL db.index.fulltext.queryNodes('coordination_fulltext','zebra') YIELD node RETURN node.subject LIMIT 5"
eq "fulltext 'quokka' -> SYN-TASK-2" "SYN-TASK-2" "CALL db.index.fulltext.queryNodes('coordination_fulltext','quokka') YIELD node RETURN node.subject LIMIT 5"
eq "fulltext 'alpha' -> SYN-TASK-1"  "SYN-TASK-1" "CALL db.index.fulltext.queryNodes('coordination_fulltext','alpha') YIELD node RETURN node.subject LIMIT 5"
eq "fulltext 'beta' -> SYN-TASK-2"   "SYN-TASK-2" "CALL db.index.fulltext.queryNodes('coordination_fulltext','beta') YIELD node RETURN node.subject LIMIT 5"
eq "fulltext 'synthetic' -> both coordination only=2" "2" "CALL db.index.fulltext.queryNodes('coordination_fulltext','synthetic') YIELD node RETURN count(node)"
eq "fulltext 'lorem' (semantic-only token) -> 0" "0" "CALL db.index.fulltext.queryNodes('coordination_fulltext','lorem') YIELD node RETURN count(node)"

echo "== GREEN: vector search CANNOT retrieve coordination facts =="
eq "vector scan (k=51) returns embedded only=49" "49" "WITH [x IN range(0,383) | 0.35] AS qv CALL db.index.vector.queryNodes('fact_embedding_idx', 51, qv) YIELD node RETURN count(node)"
eq "vector scan returns 0 coordination=0"        "0"  "WITH [x IN range(0,383) | 0.35] AS qv CALL db.index.vector.queryNodes('fact_embedding_idx', 51, qv) YIELD node WHERE node:Coordination RETURN count(node)"
eq "vector indexes unchanged=6"                   "6"  "SHOW INDEXES YIELD type WHERE type='VECTOR' RETURN count(type)"

echo "----"
echo "retrieval tests: $pass passed, $fail failed"
[ "$fail" = 0 ]