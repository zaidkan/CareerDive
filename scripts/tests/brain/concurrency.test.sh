#!/usr/bin/env bash
# BrainV2 T5: single-host authority — flock lock, atomic task claims, safe CAS
# version transitions.
#
# Runs against the DISPOSABLE harness only (preflight enforces this; exit 42
# propagates as INFRA_FAIL). Proves:
#
#   * T5a  single-host dispatch lock: a second holder is denied while a claim
#          is held, and the lock is free again once the holder releases it
#          (fcntl.flock, kernel-managed, no stale PID files);
#   * T5b  atomic task claim: M concurrent dispatchers on one task_id produce
#          exactly one winner; ownership is re-verified before the privileged
#          complete write (non-owner denied, no side effect);
#   * T5c  CAS version transitions: M concurrent writers on one counter produce
#          exactly M increments — no lost update, losers converge, and exactly
#          one Counter + one CounterLock node exist;
#   * schema gate + rollback guard: the T5 constraints exist and the module
#          carries no legacy filesystem-only dispatcher lock.
#
# Entity prefixes used by this test: ctest-. Everything test-owned is deleted
# on exit.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/tests/brain/_env.sh
source "$HERE/_env.sh"

echo "[t5] root: $ROOT"
preflight

if ! resolve_python; then
  echo "FATAL: no python with neo4j+mcp+fastmcp (set BRAINV2_PYTHON)" >&2
  exit 1
fi
echo "[t5] python: $PYTHON"
cd "$BRAIN_DIR"

PASS=0
FAIL=0
STEP_SEQ=0

ok()   { PASS=$((PASS + 1)); printf 'PASS: %s\n' "$1"; }
bad()  { FAIL=$((FAIL + 1)); printf 'FAIL: %s\n' "$1"; }
step() { STEP_SEQ=$((STEP_SEQ + 1)); echo; echo "== $STEP_SEQ. $* =="; }

jget() { "$PYTHON" - "$1" <<'EOF'
import json, sys
d = json.load(sys.stdin)
print(d[sys.argv[1]] if sys.argv[1] in d else "")
EOF
}

cleanup() {
  "$HARNESS" cypher "MATCH (c:TaskClaim) WHERE c.task_id STARTS WITH 'ctest-' DETACH DELETE c" >/dev/null
  "$HARNESS" cypher "MATCH (n:Counter) WHERE n.name STARTS WITH 'ctest-' DETACH DELETE n" >/dev/null
  "$HARNESS" cypher "MATCH (l:CounterLock) WHERE l.name STARTS WITH 'ctest-' DELETE l" >/dev/null
}
trap cleanup EXIT
cleanup

# ── schema gate ───────────────────────────────────────────────────────────
step "schema gate"
[ "$("$PYTHON" oc_brain_concurrency.py ensure-schema)" = "SCHEMA_OK" ] \
  && ok "schema OK" || bad "ensure-schema failed"
for NAME in task_claim_task_id counter_name counter_lock_name; do
  C=$("$HARNESS" cypher "SHOW CONSTRAINTS YIELD name WHERE name = '$NAME' RETURN count(*) AS c" | (read -r _; read -r n; echo "$n"))
  [ "$C" = "1" ] && ok "constraint $NAME present" || bad "constraint $NAME missing"
done

# ── T5a. single-host flock lock ───────────────────────────────────────────
step "T5a: single-host dispatch lock (flock, no stale pid files)"

LOCK_DIR="$ROOT/.orca-opencode"
mkdir -p "$LOCK_DIR"
LOCKF="$LOCK_DIR/dispatcher.lock"
rm -f "$LOCKF"

if "$PYTHON" "$TESTS_BRAIN/brain_lock.py" try "$LOCKF"; then
  ok "lock path acquire+release while free"
else
  bad "uncontended try failed"
fi

HOLD_OUT="$(mktemp)"
(sleep 60 | "$PYTHON" "$TESTS_BRAIN/brain_lock.py" acquire "$LOCKF") >"$HOLD_OUT" 2>&1 &
HOLDER=$!
for _ in $(seq 1 40); do
  grep -q LOCK_ACQUIRED "$HOLD_OUT" 2>/dev/null && break
  sleep 0.25
done
if grep -q LOCK_ACQUIRED "$HOLD_OUT"; then
  ok "first holder acquired"
else
  bad "first holder never acquired ($(cat "$HOLD_OUT"))"
fi

if "$PYTHON" "$TESTS_BRAIN/brain_lock.py" try "$LOCKF"; then
  bad "second holder acquired while first holder alive"
else
  ok "second holder denied while first holder alive"
fi

kill "$HOLDER" 2>/dev/null || true
wait "$HOLDER" 2>/dev/null || true

if "$PYTHON" "$TESTS_BRAIN/brain_lock.py" try "$LOCKF"; then
  ok "lock released after holder exit (frees for next dispatcher)"
else
  bad "lock still held after holder exit"
fi
rm -f "$HOLD_OUT"

# ── T5b. atomic task claims ───────────────────────────────────────────────
step "T5b: M concurrent dispatchers claim one task_id, exactly one winner"

TID="ctest-task-$("$PYTHON" -c 'import uuid; print(uuid.uuid4().hex)')"
M=8
for i in $(seq 1 "$M"); do
  "$PYTHON" oc_brain_concurrency.py claim "$TID" "dispatcher-$i" >"/tmp/t5b_claim_$i.out" 2>&1 &
done
wait

CLAIMED=0
WINNER=""
for i in $(seq 1 "$M"); do
  ST=$(jget status <"/tmp/t5b_claim_$i.out")
  OW=$(jget owner <"/tmp/t5b_claim_$i.out")
  case "$ST" in
    claimed) CLAIMED=$((CLAIMED + 1)); WINNER="$OW" ;;
    reaffirmed|taken_by) : ;;
    *) bad "claim $i returned unexpected status '$ST'" ;;
  esac
done
rm -f /tmp/t5b_claim_*.out
if [ "$CLAIMED" = "1" ] && [ -n "$WINNER" ]; then
  ok "exactly one claim winner (claimed=$CLAIMED winner=$WINNER others denied/reaffirmed)"
else
  bad "expected exactly 1 winner, got $CLAIMED"
fi

ROW=$("$HARNESS" cypher "MATCH (c:TaskClaim {task_id: '$TID'}) RETURN count(c) AS c" | (read -r _; read -r n; echo "$n"))
if [ "$ROW" = "1" ]; then ok "exactly one TaskClaim row in DB"; else bad "TaskClaim row count=$ROW"; fi

# privileged write re-verifies ownership (fail-closed)
DD="$("$PYTHON" oc_brain_concurrency.py complete "$TID" "intruder-0" | jget status)"
if [ "$DD" = "denied" ]; then
  ok "non-owner complete denied"
else
  bad "non-owner complete status='$DD'"
fi
STACTIVE=$("$HARNESS" cypher "MATCH (c:TaskClaim {task_id: '$TID'}) RETURN c.status AS s" | sed -n '2p')
if [ "$STACTIVE" = "\"active\"" ] || [ "$STACTIVE" = "active" ]; then
  ok "denied write left claim active"
else
  bad "denied write mutated status (got '$STACTIVE')"
fi

CO="$("$PYTHON" oc_brain_concurrency.py complete "$TID" "$WINNER" | jget status)"
if [ "$CO" = "done" ]; then
  ok "owner complete succeeded (status=$CO)"
else
  bad "owner complete status='$CO'"
fi
CS="$("$PYTHON" oc_brain_concurrency.py claim "$TID" "$WINNER" | jget status)"
echo "info: re-claim after done by winner -> $CS"

# ── T5c. CAS version transitions ──────────────────────────────────────────
step "T5c: M concurrent writers, exactly M increments (no lost update)"

CN="ctest-cas-$("$PYTHON" -c 'import uuid; print(uuid.uuid4().hex)')"
W=12
K=4
EXPECT=$((W * K))
for i in $(seq 1 "$W"); do
  "$PYTHON" oc_brain_concurrency.py cas "$CN" "w-$i" --increments "$K" >"/tmp/t5c_cas_$i.out" 2>&1 &
done
wait

for i in $(seq 1 "$W"); do
  TOT=$(jget total <"/tmp/t5c_cas_$i.out")
  if [ "$TOT" != "$K" ]; then bad "cas $i reported total=$TOT (expected $K)"; fi
done

FINAL=$("$PYTHON" oc_brain_concurrency.py counter "$CN" | jget version)
if [ "$FINAL" = "$EXPECT" ]; then
  ok "final version exactly $EXPECT (W=$W x K=$K increments)"
else
  bad "final version=$FINAL, expected $EXPECT (lost or duplicate update)"
fi

PY_DIST=$("$PYTHON" - "$CN" "$EXPECT" <<'EOF'
import glob, json, sys
name, expect = sys.argv[1], int(sys.argv[2])
vs = []
for f in glob.glob('/tmp/t5c_cas_*.out'):
    vs += [r['version'] for r in json.load(open(f))['results']]
print(json.dumps({"successes": len(vs), "unique": len(set(vs)), "complete": sorted(vs) == list(range(1, expect + 1))}))
EOF
)
DSUC=$(printf '%s' "$PY_DIST" | jget successes)
DUNQ=$(printf '%s' "$PY_DIST" | jget unique)
DCPL=$(printf '%s' "$PY_DIST" | jget complete)
if [ "$DSUC" = "$EXPECT" ] && [ "$DUNQ" = "$EXPECT" ] && [ "$DCPL" = "True" ]; then
  ok "every increment landed exactly once (successes=$DSUC unique=$DUNQ complete=$DCPL)"
else
  bad "version distribution broken (successes=$DSUC unique=$DUNQ complete=$DCPL)"
fi
rm -f /tmp/t5c_cas_*.out

CNODE=$("$HARNESS" cypher "MATCH (n:Counter {name: '$CN'}) RETURN count(n) AS c" | (read -r _; read -r n; echo "$n"))
LNODE=$("$HARNESS" cypher "MATCH (l:CounterLock {name: '$CN'}) RETURN count(l) AS c" | (read -r _; read -r n; echo "$n"))
if [ "$CNODE" = "1" ] && [ "$LNODE" = "1" ]; then
  ok "exactly one Counter and one CounterLock node (gate stays fail-closed)"
else
  bad "duplicate nodes (Counter=$CNODE CounterLock=$LNODE)"
fi

# ── rollback guard ────────────────────────────────────────────────────────
step "rollback guard: no legacy filesystem-only dispatcher lock in module"

if "$PYTHON" - "$BRAIN_DIR/oc_brain_concurrency.py" <<'EOF'
import sys
src = open(sys.argv[1]).read()
banned = ("fcntl", "flock", "LOCK_EX", "dispatcher.lock")
hits = [b for b in banned if b in src]
raise SystemExit(0 if not hits else 1)
EOF
then
  ok "module has no fcntl/flock/dispatcher.lock (authority lives in DB constraints + lock node)"
else
  bad "module references a filesystem-only lock; rollback must fail-closed to DB"
fi

# ── summary ───────────────────────────────────────────────────────────────
echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]