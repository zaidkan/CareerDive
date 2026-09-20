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
#   * F8   fail-closed schema gate: write_once/claim self-verify their
#          constraints (SHOW CONSTRAINTS) and refuse if one is missing, and
#          the module carries no legacy filesystem-only dispatcher lock;
#   * F7   negative controls: WITHOUT the gate the documented failure modes
#          still manifest — bare MERGE mints duplicate nodes and bare
#          MATCH-WHERE-SET loses acknowledged writes (24-reported/23-final and
#          8-duplicate evidence) — while the GATED primitives never do.
#
# Mandatory setup order (a missing prerequisite is a SETUP failure = exit 42
# INFRA_FAIL, never an assertion failure): preflight -> up if needed -> apply
# -> ensure-concurrency-schema which must report CONCURRENCY_SCHEMA_OK (6/6).
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
# $! on a bash pipeline is the PID of the LAST element = the python holder
# itself; killing any earlier subshell would leave the pipeline orphaned and
# holding the lock (stale-lock false negatives).
sleep 60 | "$PYTHON" "$TESTS_BRAIN/brain_lock.py" acquire "$LOCKF" >"$HOLD_OUT" 2>&1 &
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
sleep 60 | "$PYTHON" "$TESTS_BRAIN/brain_lock.py" acquire "$LOCKF" >"$HOLD2_OUT" 2>&1 &
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

CO="$("$PYTHON" oc_brain_concurrency.py complete "$TID" "$WINNER" | jget status)"
if [ "$CO" = "done" ]; then
  ok "owner complete succeeded (status=$CO)"
else
  bad "owner complete status='$CO'"
fi
CS="$("$PYTHON" oc_brain_concurrency.py claim "$TID" "$WINNER" | jget status)"
echo "info: re-claim after done by winner -> $CS"

# ── T5c. CAS version transitions ──────────────────────────────────────────
step "T5c: M parallel writers, exactly M increments (no lost update, bounded retry)"

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
rm -f /tmp/t5c_cas_*.out

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