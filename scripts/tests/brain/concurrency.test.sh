#!/usr/bin/env bash
# BrainV2 T5: single-host authority — flock lock, atomic task claims, safe CAS
# version transitions, fail-closed schema gate, and negative controls.
#
# Runs against the DISPOSABLE harness only (preflight enforces this; exit 42
# propagates as INFRA_FAIL). Proves:
#
#   * T5a  single-host dispatch lock: a second holder is denied while a claim
#          is held, the lock is free again once the holder releases it, and a
#          SIGKILLed holder (process crash) releases the kernel flock with no
#          stale pid file (fcntl.flock, kernel-managed);
#   * T5b  atomic task claim: M concurrent dispatchers on one task_id produce
#          exactly one winner; ownership is re-verified INSIDE the privileged
#          write (non-owner denied, no side effect); the claim row is atomic
#          (never half-committed: every field present in the single write tx);
#   * T5c  CAS version transitions: M parallel writers on one counter produce
#          exactly M increments — no lost update, losers retry within the
#          bounded jittered backoff budget and converge, and exactly one
#          Counter + one CounterLock node exist;
#   * F8   fail-closed schema gate: write/claim/CAS paths self-verify exact
#          constraint signatures (SHOW CONSTRAINTS) and refuse missing or
#          same-named-but-wrong constraints before mutation;
#   * F7   negative controls: WITHOUT the gate the documented failure modes
#          still manifest — bare MERGE mints duplicate nodes and bare
#          MATCH-WHERE-SET loses acknowledged writes (24-reported/23-final and
#          8-duplicate evidence) — while the GATED primitives never do.
#
# Mandatory setup order (a missing prerequisite is a SETUP failure = exit 42
# INFRA_FAIL, never an assertion failure): preflight -> up if needed -> apply
# -> ensure-concurrency-schema which must report CONCURRENCY_SCHEMA_OK 4/4
# plus the two optional F7 hardening constraints.
#
# Entity prefixes used by this test: ctest-. Everything test-owned is deleted
# on exit.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/tests/brain/_env.sh
source "$HERE/_env.sh"

# Mandatory setup order. A missing prerequisite is a SETUP failure (exit 42 =
# INFRA_FAIL), never an assertion failure: (1) preflight; (2) up the disposable
# harness only when preflight found the container not up; (3) apply the schema
# snapshot + synthetic seed; (4) ensure-concurrency-schema, which must report
# CONCURRENCY_SCHEMA_OK with all six T4/T5/F7 constraints.
harness_setup() {
  local out rc
  set +e
  out="$("$HARNESS" preflight 2>&1)"
  rc=$?
  set -e
  if [ "$rc" -ne 0 ]; then
    printf '%s\n' "$out" >&2
    if printf '%s' "$out" | grep -q "not running"; then
      if ! out="$("$HARNESS" up 2>&1)"; then
        printf '%s\n' "$out" >&2
        echo "INFRA_FAIL: could not start disposable harness" >&2
        exit "$INFRA_FAIL"
      fi
      set +e
      out="$("$HARNESS" preflight 2>&1)"
      rc=$?
      set -e
      if [ "$rc" -ne 0 ]; then
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
  if [[ "$out" != *"CONCURRENCY_SCHEMA_OK 4/4"* ]]; then
    echo "INFRA_FAIL: concurrency schema gate did not report OK" >&2
    exit "$INFRA_FAIL"
  fi
}

echo "[t5] root: $ROOT"
harness_setup

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

# parse a JSON field from stdin. Script must come from -c (not a heredoc):
# a heredoc on stdin would override the piped JSON payload and json.load would
# read nothing (shared jget heredoc bug fixed the same way as idempotency.test.sh).
jget() { "$PYTHON" -c 'import json,sys; d=json.load(sys.stdin); k=sys.argv[1]; print(d[k] if k in d else "")' "$1"; }

cleanup() {
  "$HARNESS" cypher "MATCH (c:TaskClaim) WHERE c.task_id STARTS WITH 'ctest-' DETACH DELETE c" >/dev/null
  "$HARNESS" cypher "MATCH (n:Counter) WHERE n.name STARTS WITH 'ctest-' DETACH DELETE n" >/dev/null
  "$HARNESS" cypher "MATCH (l:CounterLock) WHERE l.name STARTS WITH 'ctest-' DELETE l" >/dev/null
  "$HARNESS" cypher "MATCH (n:NcCounter) WHERE n.name STARTS WITH 'ctest-' DETACH DELETE n" >/dev/null
  "$HARNESS" cypher "MATCH (l:NcCounterLock) WHERE l.name STARTS WITH 'ctest-' DELETE l" >/dev/null
}
trap cleanup EXIT
cleanup

# ── schema gate ───────────────────────────────────────────────────────────
step "schema gate (F7/F8): concurrency constraints present, module refuses when absent"
[ "$("$PYTHON" oc_brain_concurrency.py ensure-schema)" = "SCHEMA_OK" ] \
  && ok "schema OK" || bad "ensure-schema failed"
for NAME in operation_op_id task_claim_task_id counter_name counter_lock_name fact_id fact_op_id; do
  C=$("$HARNESS" cypher "SHOW CONSTRAINTS YIELD name WHERE name = '$NAME' RETURN count(*) AS c" | (read -r _; read -r n; echo "$n"))
  [ "$C" = "1" ] && ok "constraint $NAME present" || bad "constraint $NAME missing"
done

# F8 must be behavioral: remove each write-path authority constraint and prove
# the operation refuses before creating any row. Restore immediately so later
# concurrency proofs run against the required schema.
F8_OP="ctest-f8-op-$("$PYTHON" -c 'import uuid; print(uuid.uuid4().hex)')"
"$HARNESS" cypher "DROP CONSTRAINT operation_op_id IF EXISTS" >/dev/null
set +e
F8_WRITE=$("$PYTHON" oc_brain_concurrency.py write-once --op "$F8_OP" --subject s --predicate p --object o 2>&1)
F8_WRITE_RC=$?
set -e
F8_WRITE_ROWS=$("$HARNESS" cypher "MATCH (o:Operation {op_id: '$F8_OP'}) RETURN count(o) AS c" | (read -r _; read -r n; echo "$n"))
if [ "$F8_WRITE_RC" = "3" ] && [[ "$F8_WRITE" == *CONSTRAINT_GATE* ]] && [ "$F8_WRITE_ROWS" = "0" ]; then
  ok "write path refuses before mutation when operation_op_id is absent"
else
  bad "write fail-closed broken (rc=$F8_WRITE_RC rows=$F8_WRITE_ROWS out=$F8_WRITE)"
fi
"$HARNESS" ensure-concurrency-schema >/dev/null

# A same-named constraint on the wrong schema shape must not spoof the gate.
F8_SPOOF_OP="ctest-f8-spoof-$("$PYTHON" -c 'import uuid; print(uuid.uuid4().hex)')"
"$HARNESS" cypher "DROP CONSTRAINT operation_op_id IF EXISTS" >/dev/null
"$HARNESS" cypher "CREATE CONSTRAINT operation_op_id FOR (n:WrongOperation) REQUIRE n.wrong IS UNIQUE" >/dev/null
set +e
F8_SPOOF=$("$PYTHON" oc_brain_concurrency.py write-once --op "$F8_SPOOF_OP" --subject s --predicate p --object o 2>&1)
F8_SPOOF_RC=$?
set -e
F8_SPOOF_ROWS=$("$HARNESS" cypher "MATCH (o:Operation {op_id: '$F8_SPOOF_OP'}) RETURN count(o) AS c" | (read -r _; read -r n; echo "$n"))
if [ "$F8_SPOOF_RC" = "3" ] && [[ "$F8_SPOOF" == *CONSTRAINT_GATE* ]] && [ "$F8_SPOOF_ROWS" = "0" ]; then
  ok "write path rejects same-named constraint with wrong label/property signature"
else
  bad "constraint-name spoof bypassed gate (rc=$F8_SPOOF_RC rows=$F8_SPOOF_ROWS out=$F8_SPOOF)"
fi
"$HARNESS" cypher "DROP CONSTRAINT operation_op_id IF EXISTS" >/dev/null
"$HARNESS" ensure-concurrency-schema >/dev/null

F8_TASK="ctest-f8-task-$("$PYTHON" -c 'import uuid; print(uuid.uuid4().hex)')"
"$HARNESS" cypher "DROP CONSTRAINT task_claim_task_id IF EXISTS" >/dev/null
set +e
F8_CLAIM=$("$PYTHON" oc_brain_concurrency.py claim "$F8_TASK" dispatcher-f8 2>&1)
F8_CLAIM_RC=$?
set -e
F8_CLAIM_ROWS=$("$HARNESS" cypher "MATCH (c:TaskClaim {task_id: '$F8_TASK'}) RETURN count(c) AS c" | (read -r _; read -r n; echo "$n"))
if [ "$F8_CLAIM_RC" = "3" ] && [[ "$F8_CLAIM" == *CONSTRAINT_GATE* ]] && [ "$F8_CLAIM_ROWS" = "0" ]; then
  ok "claim path refuses before mutation when task_claim_task_id is absent"
else
  bad "claim fail-closed broken (rc=$F8_CLAIM_RC rows=$F8_CLAIM_ROWS out=$F8_CLAIM)"
fi
"$HARNESS" ensure-concurrency-schema >/dev/null

F8_COUNTER="ctest-f8-counter-$("$PYTHON" -c 'import uuid; print(uuid.uuid4().hex)')"
"$HARNESS" cypher "DROP CONSTRAINT counter_name IF EXISTS" >/dev/null
set +e
F8_CAS=$("$PYTHON" oc_brain_concurrency.py cas "$F8_COUNTER" writer-f8 2>&1)
F8_CAS_RC=$?
set -e
F8_CAS_ROWS=$("$HARNESS" cypher "MATCH (n:Counter {name: '$F8_COUNTER'}) RETURN count(n) AS c" | (read -r _; read -r n; echo "$n"))
if [ "$F8_CAS_RC" = "3" ] && [[ "$F8_CAS" == *CONSTRAINT_GATE* ]] && [ "$F8_CAS_ROWS" = "0" ]; then
  ok "CAS path refuses before mutation when counter_name is absent"
else
  bad "CAS fail-closed broken (rc=$F8_CAS_RC rows=$F8_CAS_ROWS out=$F8_CAS)"
fi
"$HARNESS" ensure-concurrency-schema >/dev/null

# ── T5a. single-host flock lock ───────────────────────────────────────────
step "T5a: single-host dispatch lock (flock, no stale pid files)"

if LOCK_RESULT=$("$TESTS_BRAIN/lock.test.sh" 2>&1); then
  printf '%s\n' "$LOCK_RESULT"
  ok "real oc-dispatch entrypoint denies a second dispatcher and reacquires after release"
else
  printf '%s\n' "$LOCK_RESULT"
  bad "real oc-dispatch lock authority failed"
fi

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
# $! on a bash pipeline is the PID of the LAST element = the python holder
# itself; killing any earlier subshell would leave the pipeline orphaned and
# holding the lock (stale-lock false negatives).
"$PYTHON" "$TESTS_BRAIN/brain_lock.py" hold "$LOCKF" >"$HOLD_OUT" 2>&1 &
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

# ── T5a-crash. worker crash safety ───────────────────────────────────────
step "T5a-crash: SIGKILLed dispatcher releases the kernel flock (no stale lock)"

HOLD2_OUT="$(mktemp)"
"$PYTHON" "$TESTS_BRAIN/brain_lock.py" hold "$LOCKF" >"$HOLD2_OUT" 2>&1 &
HOLDER2=$!
for _ in $(seq 1 40); do
  grep -q LOCK_ACQUIRED "$HOLD2_OUT" 2>/dev/null && break
  sleep 0.25
done
if grep -q LOCK_ACQUIRED "$HOLD2_OUT"; then
  ok "crash-test: holder re-acquired lock after prior release"
else
  bad "crash-test: holder never acquired lock ($(cat "$HOLD2_OUT"))"
fi
if "$PYTHON" "$TESTS_BRAIN/brain_lock.py" try "$LOCKF"; then
  bad "crash-test: second holder acquired while first alive"
else
  ok "crash-test: second holder denied while first alive"
fi

kill -9 "$HOLDER2" 2>/dev/null || true
wait "$HOLDER2" 2>/dev/null || true

if "$PYTHON" "$TESTS_BRAIN/brain_lock.py" try "$LOCKF"; then
  ok "SIGKILLed (crashed) holder released the lock; next dispatcher proceeds"
else
  bad "lock still held after SIGKILL — stale lock left by a crashed worker"
fi
rm -f "$HOLD2_OUT"

# ── T5b. atomic task claims ───────────────────────────────────────────────
step "T5b: M concurrent dispatchers claim one task_id, exactly one winner, atomic row"

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

CMPL=$("$HARNESS" cypher "MATCH (c:TaskClaim {task_id: '$TID'}) WHERE c.claimed_by IS NOT NULL AND c.status IS NOT NULL AND c.claimed_at IS NOT NULL AND c.attempt_token IS NOT NULL RETURN count(c) AS c" | (read -r _; read -r n; echo "$n"))
if [ "$CMPL" = "1" ]; then
  ok "claim row fully formed (single write tx, no half-committed claim)"
else
  bad "claim row incomplete (complete=$CMPL)"
fi

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

RECOVERY_OWNER="dispatcher-recovery"
RR_DENIED="$("$PYTHON" oc_brain_concurrency.py reclaim "$TID" intruder-0 "$RECOVERY_OWNER" | jget status)"
if [ "$RR_DENIED" = "denied" ]; then
  ok "reclaim with wrong expected owner denied inside transaction"
else
  bad "wrong-owner reclaim status='$RR_DENIED'"
fi
RR="$("$PYTHON" oc_brain_concurrency.py reclaim "$TID" "$WINNER" "$RECOVERY_OWNER" | jget status)"
if [ "$RR" = "reclaimed" ]; then
  ok "crashed worker claim reclaimed by replacement dispatcher"
else
  bad "claim reclaim status='$RR'"
fi
OLD_COMPLETE="$("$PYTHON" oc_brain_concurrency.py complete "$TID" "$WINNER" | jget status)"
if [ "$OLD_COMPLETE" = "denied" ]; then
  ok "reclaimed claim rejects stale prior owner"
else
  bad "stale prior owner completed reclaimed task (status='$OLD_COMPLETE')"
fi
CO="$("$PYTHON" oc_brain_concurrency.py complete "$TID" "$RECOVERY_OWNER" | jget status)"
if [ "$CO" = "done" ]; then
  ok "replacement owner completes reclaimed claim (status=$CO)"
else
  bad "replacement owner complete status='$CO'"
fi

# ── T5c. CAS version transitions ──────────────────────────────────────────
step "T5c: M parallel writers, exactly M increments (no lost update, bounded retry)"

CN="ctest-cas-$("$PYTHON" -c 'import uuid; print(uuid.uuid4().hex)')"
W=12
K=4
EXPECT=$((W * K))
for i in $(seq 1 "$W"); do
  "$PYTHON" oc_brain_concurrency.py cas "$CN" "w-$i" --increments "$K" >"/tmp/t5c_cas_$i.out" 2>"/tmp/t5c_cas_$i.err" &
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
vs, att = [], []
for f in glob.glob('/tmp/t5c_cas_*.out'):
    data = json.load(open(f))
    for r in data['results']:
        vs.append(r['version'])
        att.append(r['attempts'])
print(json.dumps({
    "successes": len(vs), "unique": len(set(vs)),
    "complete": sorted(vs) == list(range(1, expect + 1)),
    "max_attempts": max(att), "min_attempts": min(att),
}))
EOF
)
DSUC=$(printf '%s' "$PY_DIST" | jget successes)
DUNQ=$(printf '%s' "$PY_DIST" | jget unique)
DCPL=$(printf '%s' "$PY_DIST" | jget complete)
DMAX=$(printf '%s' "$PY_DIST" | jget max_attempts)
DMIN=$(printf '%s' "$PY_DIST" | jget min_attempts)
if [ "$DSUC" = "$EXPECT" ] && [ "$DUNQ" = "$EXPECT" ] && [ "$DCPL" = "True" ]; then
  ok "every increment landed exactly once (successes=$DSUC unique=$DUNQ complete=$DCPL)"
else
  bad "version distribution broken (successes=$DSUC unique=$DUNQ complete=$DCPL)"
fi
if [ "$DMIN" -ge 1 ] && [ "$DMAX" -le 16 ]; then
  ok "retries bounded + jittered backoff (attempts min=$DMIN max=$DMAX, cap 16)"
else
  bad "attempt budget exceeded (attempts min=$DMIN max=$DMAX)"
fi
rm -f /tmp/t5c_cas_*.out /tmp/t5c_cas_*.err

CNODE=$("$HARNESS" cypher "MATCH (n:Counter {name: '$CN'}) RETURN count(n) AS c" | (read -r _; read -r n; echo "$n"))
LNODE=$("$HARNESS" cypher "MATCH (l:CounterLock {name: '$CN'}) RETURN count(l) AS c" | (read -r _; read -r n; echo "$n"))
if [ "$CNODE" = "1" ] && [ "$LNODE" = "1" ]; then
  ok "exactly one Counter and one CounterLock node (gate stays fail-closed)"
else
  bad "duplicate nodes (Counter=$CNODE CounterLock=$LNODE)"
fi

# ── negative controls (unsafe patterns must FAIL) ────────────────────────
step "negative controls: bare MERGE mints duplicates; bare MATCH-WHERE-SET loses updates"

NC="ctest-nc-$("$PYTHON" -c 'import uuid; print(uuid.uuid4().hex)')"
MR=$("$PYTHON" "$TESTS_BRAIN/brain_negative_control.py" merge-race "$NC" 4 8)
MRD=$(printf '%s' "$MR" | jget duplicates_demonstrated)
MRC=$(printf '%s' "$MR" | jget max_counter_nodes)
MRL=$(printf '%s' "$MR" | jget max_lock_nodes)
if [ "$MRD" = "True" ]; then
  ok "bare MERGE without constraint mints duplicates (max Counter=$MRC, max CounterLock=$MRL) — gate is necessary"
else
  bad "negative control (bare MERGE) never demonstrated duplicates in 4 rounds"
fi

NCB="ctest-bare-$("$PYTHON" -c 'import uuid; print(uuid.uuid4().hex)')"
BC=$("$PYTHON" "$TESTS_BRAIN/brain_negative_control.py" bare-cas "$NCB" 12 4 3)
BCD=$(printf '%s' "$BC" | jget lost_updates_demonstrated)
echo "info: bare-cas evidence: $(printf '%s' "$BC" | "$PYTHON" -c 'import json,sys; d=json.load(sys.stdin); print(" | ".join("round{}: reported={} final={} lost={}".format(r["round"], r["reported"], r["final_version"], r["lost_updates"]) for r in d["results"]))')"
if [ "$BCD" = "True" ]; then
  ok "bare MATCH-WHERE-SET without lock node loses acknowledged writes (24-reported/23-final class) — gate is necessary"
else
  bad "negative control (bare MATCH-WHERE-SET) never demonstrated lost updates in 3 rounds"
fi

# ── rollback guard ────────────────────────────────────────────────────────
step "rollback guard: real dispatcher flock present; no unsafe unlocked fallback"

if "$PYTHON" - "$ROOT/scripts/oc-dispatch" <<'EOF'
import sys
src = open(sys.argv[1]).read()
required = ("brain_lock.py", "DISPATCH_LOCK_FILE", "run", "exit 75")
raise SystemExit(0 if all(token in src for token in required) else 1)
EOF
then
  ok "oc-dispatch requires kernel flock and fails closed if authority is unavailable"
else
  bad "oc-dispatch can bypass required single-host flock authority"
fi

# ── summary ───────────────────────────────────────────────────────────────
echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]
