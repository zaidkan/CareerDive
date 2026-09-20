#!/usr/bin/env bash
# BrainV2 T4: operation-ID idempotency + payload-conflict detection.
#
# Runs against the DISPOSABLE harness only (preflight enforces this; exit 42
# propagates as INFRA_FAIL — an infrastructure outage is never reported as an
# assertion failure). Proves, over the real Bolt surface AND the MCP stdio
# wire:
#
#   * one fresh write per op_id commits exactly ONCE (created);
#   * a retry with SAME op_id + SAME payload replays the STORED result
#     byte-for-byte with zero duplicate side effects (replayed);
#   * SAME op_id + DIFFERENT payload is refused and writes nothing (conflict);
#   * M concurrent first-writers of the same op_id converge to exactly one
#     Operation row and one Fact row (losers replay/conflict, never double);
#   * the Operation.op_id uniqueness constraint is present (fail-closed).
#
# Entity prefixes used by this test: itest-. Everything test-owned is deleted
# on exit.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/tests/brain/_env.sh
source "$HERE/_env.sh"

# Mandatory setup order. A missing prerequisite is a SETUP failure (exit 42 =
# INFRA_FAIL), never an assertion failure: (1) preflight; (2) up the disposable
# harness only when preflight found the container not up; (3) apply the schema
# snapshot + synthetic seed; (4) ensure-concurrency-schema, which must report
# CONCURRENCY_SCHEMA_OK for all four T4/T5 constraints.
harness_setup() {
  local out rc
  if ! out="$("$HARNESS" preflight 2>&1)"; then
    rc=$?
    printf '%s\n' "$out" >&2
    if printf '%s' "$out" | grep -q "not running"; then
      if ! out="$("$HARNESS" up 2>&1)"; then
        printf '%s\n' "$out" >&2
        echo "INFRA_FAIL: could not start disposable harness" >&2
        exit "$INFRA_FAIL"
      fi
      if ! out="$("$HARNESS" preflight 2>&1)"; then
        printf '%s\n' "$out" >&2
        echo "INFRA_FAIL: harness not reachable after up" >&2
        exit "$INFRA_FAIL"
      fi
    else
      exit "$rc"
    fi
  fi
  printf '%s\n' "$out"
  if ! out="$("$HARNESS" apply 2>&1)"; then
    printf '%s\n' "$out" >&2
    echo "INFRA_FAIL: harness apply failed" >&2
    exit "$INFRA_FAIL"
  fi
  printf '%s\n' "$out"
  if ! out="$("$HARNESS" ensure-concurrency-schema 2>&1)"; then
    printf '%s\n' "$out" >&2
    echo "INFRA_FAIL: concurrency schema prerequisite unavailable" >&2
    exit "$INFRA_FAIL"
  fi
  printf '%s\n' "$out"
  if [[ "$out" != *CONCURRENCY_SCHEMA_OK* ]]; then
    echo "INFRA_FAIL: concurrency schema gate did not report OK" >&2
    exit "$INFRA_FAIL"
  fi
}

echo "[t4] root: $ROOT"
harness_setup

if ! resolve_python; then
  echo "FATAL: no python with neo4j+mcp+fastmcp (set BRAINV2_PYTHON)" >&2
  exit 1
fi
echo "[t4] python: $PYTHON"
cd "$BRAIN_DIR"

PASS=0
FAIL=0
STEP_SEQ=0

ok()   { PASS=$((PASS + 1)); printf 'PASS: %s\n' "$1"; }
bad()  { FAIL=$((FAIL + 1)); printf 'FAIL: %s\n' "$1"; }
step() { STEP_SEQ=$((STEP_SEQ + 1)); echo; echo "== $STEP_SEQ. $* =="; }

# parse a JSON field from stdin. Script must come from -c (not a heredoc):
# a heredoc on stdin would override the piped JSON payload and json.load would
# read nothing.
jget() { "$PYTHON" -c 'import json,sys; d=json.load(sys.stdin); k=sys.argv[1]; print(d[k] if k in d else "")' "$1"; }

cleanup() {
  "$HARNESS" cypher "MATCH (o:Operation) WHERE o.op_id STARTS WITH 'itest-' DETACH DELETE o" >/dev/null
  "$HARNESS" cypher "MATCH (f:Fact) WHERE f.op_id STARTS WITH 'itest-' DETACH DELETE f" >/dev/null
}
trap cleanup EXIT
cleanup

CONSTRAINT=$("$HARNESS" cypher "SHOW CONSTRAINTS YIELD name WHERE name = 'operation_op_id' RETURN count(*) AS c" | (read -r _; read -r n; echo "$n"))
step "schema gate"
if [ "$CONSTRAINT" = "1" ]; then ok "Operation.op_id unique constraint present"; else bad "constraint missing (got '$CONSTRAINT')"; fi

# ── A. sequential create / replay / conflict ─────────────────────────────
step "sequential create -> replay -> conflict (module-level)"

OP_A="itest-seq-$("$PYTHON" -c 'import uuid; print(uuid.uuid4().hex)')"
RESULT_A='{"harness":"itest","order":1}'
R1=$("$PYTHON" oc_brain_concurrency.py write-once --op "$OP_A" \
    --subject "bike-$OP_A" --predicate "material" --object "carbon" \
    --result "$RESULT_A")
S1=$(printf '%s' "$R1" | jget status)
N1=$(printf '%s' "$R1" | jget result)
if [ "$S1" = "created" ] && [ "$N1" = "$RESULT_A" ]; then
  ok "fresh op_id commits: status=$S1 result=$N1"
else
  bad "fresh write unexpected: $R1"
fi

R2=$("$PYTHON" oc_brain_concurrency.py write-once --op "$OP_A" \
    --subject "bike-$OP_A" --predicate "material" --object "carbon" \
    --result "$RESULT_A")
S2=$(printf '%s' "$R2" | jget status)
N2=$(printf '%s' "$R2" | jget result)
if [ "$S2" = "replayed" ] && [ "$N2" = "$RESULT_A" ]; then
  ok "same op_id + same payload replays stored result byte-for-byte (status=$S2)"
else
  bad "replay unexpected: $R2"
fi

R3=$("$PYTHON" oc_brain_concurrency.py write-once --op "$OP_A" \
    --subject "bike-$OP_A" --predicate "material" --object "titanium" \
    --result '{"harness":"itest","order":2}')
S3=$(printf '%s' "$R3" | jget status)
SHA3=$(printf '%s' "$R3" | jget committed_payload_sha256)
if [ "$S3" = "conflict" ] && [ -n "$SHA3" ]; then
  ok "same op_id + different payload refused (status=$S3, committed sha present)"
else
  bad "conflict unexpected: $R3"
fi

OPD=$("$HARNESS" cypher "MATCH (o:Operation {op_id: '$OP_A'}) RETURN count(o) AS c" | (read -r _; read -r n; echo "$n"))
FAC=$("$HARNESS" cypher "MATCH (f:Fact {op_id: '$OP_A'}) RETURN count(f) AS c" | (read -r _; read -r n; echo "$n"))
if [ "$OPD" = "1" ] && [ "$FAC" = "1" ]; then
  ok "exactly one Operation and one Fact survive (op=$OPD fact=$FAC)"
else
  bad "duplicate rows leaked (op=$OPD fact=$FAC)"
fi

# ── B. lost-response convergence (client never saw first ack, retries) ──
step "lost-response retry converges to the committed result (module-level)"

R_B=$("$PYTHON" oc_brain_concurrency.py write-once --op "$OP_A" \
    --subject "bike-$OP_A" --predicate "material" --object "carbon" \
    --result "$RESULT_A")
SB=$(printf '%s' "$R_B" | jget status)
NB=$(printf '%s' "$R_B" | jget result)
if [ "$SB" = "replayed" ] && [ "$NB" = "$RESULT_A" ]; then
  ok "extra retry after ack-loss replays the stored result (status=$SB)"
else
  bad "lost-response retry unexpected: $R_B"
fi

# ── C. concurrent first-writers of one op_id ────────────────────────────
step "M concurrent first-writers of the same op_id (module-level)"

OP_C="itest-conc-$("$PYTHON" -c 'import uuid; print(uuid.uuid4().hex)')"
M=8
for i in $(seq 1 "$M"); do
  "$PYTHON" oc_brain_concurrency.py write-once --op "$OP_C" \
      --subject "bike-$OP_C" --predicate "material" --object "carbon" \
      --result '{"harness":"itest","order":3}' >"/tmp/t4_conc_$i.out" 2>&1 &
done
wait

CREATED=0
REPLAYED=0
for i in $(seq 1 "$M"); do
  ST=$(jget status <"/tmp/t4_conc_$i.out")
  case "$ST" in
    created) CREATED=$((CREATED + 1)) ;;
    replayed) REPLAYED=$((REPLAYED + 1)) ;;
    *) bad "concurrent writer $i returned status '$ST'" ;;
  esac
done
rm -f /tmp/t4_conc_*.out
if [ "$CREATED" = "1" ] && [ "$REPLAYED" = "$((M - 1))" ]; then
  ok "one winner, M-1 replaying (created=$CREATED replayed=$REPLAYED/$M)"
else
  bad "concurrent split wrong (created=$CREATED replayed=$REPLAYED)"
fi

OPDC=$("$HARNESS" cypher "MATCH (o:Operation {op_id: '$OP_C'}) RETURN count(o) AS c" | (read -r _; read -r n; echo "$n"))
FACC=$("$HARNESS" cypher "MATCH (f:Fact {op_id: '$OP_C'}) RETURN count(f) AS c" | (read -r _; read -r n; echo "$n"))
if [ "$OPDC" = "1" ] && [ "$FACC" = "1" ]; then
  ok "concurrent race leafs exactly one row each (op=$OPDC fact=$FACC)"
else
  bad "concurrent race duplicated rows (op=$OPDC fact=$FACC)"
fi

# ── D. MCP stdio wire (oc_brain_server memory_add_fact with op_id) ───────
step "MCP stdio: idempotent memory_add_fact over the real wire"

OP_D="itest-mcp-$("$PYTHON" -c 'import uuid; print(uuid.uuid4().hex)')"
SECRET="$(mktemp)"
printf '%s' "$OC_BRAIN_NEO4J_PASSWORD" > "$SECRET"
chmod 600 "$SECRET"

env -u NEO4J_PASSWORD -u OC_BRAIN_NEO4J_PASSWORD "$PYTHON" "$TESTS_BRAIN/idempotency_probe.py" \
    --server "$BRAIN_DIR/oc_brain_server.py" \
    --python "$PYTHON" \
    --password-file "$SECRET" \
    --op-id "$OP_D"
PROBE_RC=$?
rm -f "$SECRET"
if [ "$PROBE_RC" = 0 ]; then ok "MCP probe assertions passed"; else bad "MCP probe failed (rc=$PROBE_RC)"; fi

OPDM=$("$HARNESS" cypher "MATCH (o:Operation {op_id: '$OP_D'}) RETURN count(o) AS c" | (read -r _; read -r n; echo "$n"))
FACM=$("$HARNESS" cypher "MATCH (f:Fact {op_id: '$OP_D'}) RETURN count(f) AS c" | (read -r _; read -r n; echo "$n"))
OBJ=$("$HARNESS" cypher "MATCH (f:Fact {op_id: '$OP_D'}) RETURN f.object AS o" | sed -n '2p' | tr -d '"')
if [ "$OPDM" = "1" ] && [ "$FACM" = "1" ] && [ "$OBJ" = "carbon-fiber bicycle frame" ]; then
  ok "conflict attempt wrote nothing over MCP (op=$OPDM fact=$FACM object=$OBJ)"
else
  bad "MCP conflict leaked a write (op=$OPDM fact=$FACM object=$OBJ)"
fi

# ── E. atomicity: Operation row + its Fact commit all-or-nothing ──────────
# A single write transaction creates (o)-[:WROTE]->(f) together; neither side
# may ever appear alone for any test op_id (covers module-level AND MCP rows).
step "atomicity: Operation record and Fact commit all-or-nothing"

ORPHAN_OP=$("$HARNESS" cypher "MATCH (o:Operation) WHERE o.op_id STARTS WITH 'itest-' AND NOT EXISTS { MATCH (o)-[:WROTE]->(:Fact) } RETURN count(o) AS c" | (read -r _; read -r n; echo "$n"))
ORPHAN_FA=$("$HARNESS" cypher "MATCH (f:Fact) WHERE f.op_id STARTS WITH 'itest-' AND NOT EXISTS { MATCH (:Operation)-[:WROTE]->(f) } RETURN count(f) AS c" | (read -r _; read -r n; echo "$n"))
if [ "$ORPHAN_OP" = "0" ] && [ "$ORPHAN_FA" = "0" ]; then
  ok "no orphan Operation/Fact rows across every test op_id (orphans op=$ORPHAN_OP fact=$ORPHAN_FA)"
else
  bad "atomicity broken: orphan rows leaked (op=$ORPHAN_OP fact=$ORPHAN_FA)"
fi

# ── summary ──────────────────────────────────────────────────────────────
echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]