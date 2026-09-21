#!/usr/bin/env bash
# BrainV2 T5a: prove the real oc-dispatch entrypoint owns a kernel flock.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DISPATCH="$ROOT/scripts/oc-dispatch"
TMP="$(mktemp -d)"
HOLDER_OUT="$TMP/holder.out"
DENIED_OUT="$TMP/denied.out"

cleanup() {
  if [ -n "${HOLDER:-}" ]; then
    kill "$HOLDER" 2>/dev/null || true
    wait "$HOLDER" 2>/dev/null || true
  fi
  rm -rf "$TMP"
}
trap cleanup EXIT

"$DISPATCH" _lock-probe 2 >"$HOLDER_OUT" 2>&1 &
HOLDER=$!
for _ in $(seq 1 40); do
  grep -q DISPATCH_LOCK_ACQUIRED "$HOLDER_OUT" 2>/dev/null && break
  sleep 0.05
done
grep -q DISPATCH_LOCK_ACQUIRED "$HOLDER_OUT"
echo "PASS: first dispatcher acquired fcntl.flock"

set +e
"$DISPATCH" _lock-probe 0 >"$DENIED_OUT" 2>&1
DENIED_RC=$?
set -e
[ "$DENIED_RC" = "75" ]
grep -q DISPATCH_LOCK_DENIED "$DENIED_OUT"
echo "PASS: second dispatcher denied while first holds lock (exit=$DENIED_RC)"

wait "$HOLDER"
unset HOLDER
grep -q DISPATCH_LOCK_RELEASED "$HOLDER_OUT"
echo "PASS: first dispatcher released lock"

"$DISPATCH" _lock-probe 0 >"$HOLDER_OUT" 2>&1
grep -q DISPATCH_LOCK_ACQUIRED "$HOLDER_OUT"
grep -q DISPATCH_LOCK_RELEASED "$HOLDER_OUT"
echo "PASS: next dispatcher reacquired after release"

"$DISPATCH" _lock-probe 60 >"$HOLDER_OUT" 2>&1 &
HOLDER=$!
for _ in $(seq 1 40); do
  grep -q DISPATCH_LOCK_ACQUIRED "$HOLDER_OUT" 2>/dev/null && break
  sleep 0.05
done
grep -q DISPATCH_LOCK_ACQUIRED "$HOLDER_OUT"
kill -9 "$HOLDER" 2>/dev/null || true
wait "$HOLDER" 2>/dev/null || true
unset HOLDER
"$DISPATCH" _lock-probe 0 >"$HOLDER_OUT" 2>&1
grep -q DISPATCH_LOCK_ACQUIRED "$HOLDER_OUT"
echo "PASS: SIGKILLed dispatcher released lock; replacement reacquired"

echo "RESULT: dispatcher flock denial and release proven"
