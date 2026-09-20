#!/usr/bin/env bash
# BrainV2 T2 migration tests (SYNTHETIC harness only, disposable container
# brainv2-neo4j-test). RED->GREEN; wipes + reseeds the harness per run.
# Proves additive no-loss classification (49 SEMANTIC + 2 COORDINATION with
# unchanged totals), 001_backfill idempotence (no-op on re-run), and exact
# pre-state restoration by 001_rollback.cypher (which deletes no Fact).
# Run: bash scripts/tests/brain/migration.test.sh
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS="$HERE/harness.sh"
MIG="$HERE/migrations"
pass=0; fail=0
ok()  { pass=$((pass+1)); echo "PASS: $1"; }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }
# scalar cypher -> last output line only (header dropped)
cyv() { "$HARNESS" cypher "$1" 2>/dev/null | tail -1; }
# assert <name> <expected> <cypher returning a scalar>
eq()  { local n="$1" exp="$2" q="$3" g; g="$(cyv "$q")"; if [ "$g" = "$exp" ]; then ok "$n ($g)"; else bad "$n expected [$exp] got [$g]"; fi; }
# structural fingerprint of every Fact: id + property-key count + label set
finger() {
  "$HARNESS" cypher "MATCH (f:Fact) WITH f ORDER BY f.id RETURN f.id AS id, size(keys(f)) AS kc, labels(f) AS lab" 2>/dev/null \
    | shasum | cut -d' ' -f1
}

echo "[migration.test] wiping + reseeding harness"
"$HARNESS" down >/dev/null 2>&1
"$HARNESS" up  >/dev/null 2>&1
"$HARNESS" apply >/dev/null 2>&1

echo "== RED: fresh seed has NO migration markers =="
eq "seed total Facts=51"               "51" "MATCH (f:Fact) RETURN count(*)"
eq "seed total nodes=51"               "51" "MATCH (n) RETURN count(*)"
eq "seed SEMANTIC (embed, ns null)=49" "49" "MATCH (f:Fact) WHERE f.embedding IS NOT NULL AND f.ns IS NULL RETURN count(*)"
eq "seed COORDINATION (ns set)=2"       "2" "MATCH (f:Fact) WHERE f.ns IS NOT NULL RETURN count(*)"
eq "seed memory_class count=0"          "0" "MATCH (f:Fact) WHERE f.memory_class IS NOT NULL RETURN count(*)"
eq "seed :Coordination label count=0"   "0" "MATCH (f:Coordination) RETURN count(*)"
eq "seed project_id count=0"            "0" "MATCH (f:Fact) WHERE f.project_id IS NOT NULL RETURN count(*)"
eq "seed scope count=0"                 "0" "MATCH (f:Fact) WHERE f.scope IS NOT NULL RETURN count(*)"
eq "seed provenance count=0"            "0" "MATCH (f:Fact) WHERE f.provenance IS NOT NULL RETURN count(*)"
PRE="$(finger)"
echo "   pre-migration fingerprint: $PRE"

echo "== GREEN: apply 001_backfill =="
"$HARNESS" cypher "$(cat "$MIG/001_backfill.cypher")" >/dev/null 2>&1
eq "total Facts unchanged=51"   "51" "MATCH (f:Fact) RETURN count(*)"
eq "total nodes unchanged=51"   "51" "MATCH (n) RETURN count(*)"
eq "SEMANTIC classified=49"     "49" "MATCH (f:Fact) WHERE f.memory_class='SEMANTIC' RETURN count(*)"
eq "COORDINATION classified=2"  "2"  "MATCH (f:Fact) WHERE f.memory_class='COORDINATION' RETURN count(*)"
eq ":Coordination label=2"      "2"  "MATCH (f:Coordination) RETURN count(*)"
eq "project_id stamped (all)=51"   "51" "MATCH (f:Fact) WHERE f.project_id='career-expo' RETURN count(*)"
eq "scope defaulted (all)=51"      "51" "MATCH (f:Fact) WHERE f.scope='career-expo' RETURN count(*)"
eq "provenance defaulted (all)=51" "51" "MATCH (f:Fact) WHERE f.provenance='brainv2-001-backfill' RETURN count(*)"
eq "no unclassified orphans=0"     "0"  "MATCH (f:Fact) WHERE f.memory_class IS NULL RETURN count(*)"
eq "embeddings intact=49"      "49" "MATCH (f:Fact) WHERE f.embedding IS NOT NULL RETURN count(*)"
eq "ns intact=2"               "2"  "MATCH (f:Fact) WHERE f.ns IS NOT NULL RETURN count(*)"

echo "== GREEN: idempotence (re-run 001_backfill is a no-op) =="
"$HARNESS" cypher "$(cat "$MIG/001_backfill.cypher")" >/dev/null 2>&1
eq "re-run total still=51"        "51" "MATCH (f:Fact) RETURN count(*)"
eq "re-run SEMANTIC still=49"     "49" "MATCH (f:Fact) WHERE f.memory_class='SEMANTIC' RETURN count(*)"
eq "re-run COORDINATION still=2"  "2"  "MATCH (f:Fact) WHERE f.memory_class='COORDINATION' RETURN count(*)"
eq "re-run :Coordination label still=2" "2" "MATCH (f:Coordination) RETURN count(*)"

echo "== GREEN: rollback restores exact pre-state =="
"$HARNESS" cypher "$(cat "$MIG/001_rollback.cypher")" >/dev/null 2>&1
eq "rollback total still=51"    "51" "MATCH (f:Fact) RETURN count(*)"
eq "rollback memory_class=0"    "0"  "MATCH (f:Fact) WHERE f.memory_class IS NOT NULL RETURN count(*)"
eq "rollback :Coordination=0"   "0"  "MATCH (f:Coordination) RETURN count(*)"
eq "rollback project_id=0"      "0"  "MATCH (f:Fact) WHERE f.project_id IS NOT NULL RETURN count(*)"
eq "rollback scope=0"           "0"  "MATCH (f:Fact) WHERE f.scope IS NOT NULL RETURN count(*)"
eq "rollback provenance=0"      "0"  "MATCH (f:Fact) WHERE f.provenance IS NOT NULL RETURN count(*)"
eq "rollback embeddings intact=49" "49" "MATCH (f:Fact) WHERE f.embedding IS NOT NULL RETURN count(*)"
eq "rollback ns intact=2"          "2"  "MATCH (f:Fact) WHERE f.ns IS NOT NULL RETURN count(*)"
POST="$(finger)"
if [ "$POST" = "$PRE" ]; then ok "rollback fingerprint identical ($POST)"; else bad "fingerprint mismatch pre=$PRE post=$POST"; fi

echo "----"
echo "migration tests: $pass passed, $fail failed"
[ "$fail" = 0 ]