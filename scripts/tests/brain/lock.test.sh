#!/usr/bin/env bash
# T5 lock test: a second dispatcher CANNOT acquire the single-host lock while
# the first holds it. Uses the portable fcntl.flock helper (macOS has no flock(1)).
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCK="$(mktemp -d)/dispatcher.lock"
PY="$HERE/brain_lock.py"
pass=0; fail=0
ok()   { pass=$((pass+1)); echo "PASS: $1"; }
bad()  { fail=$((fail+1)); echo "FAIL: $1"; }

# Holder acquires and keeps the lock (blocks reading stdin from a FIFO we control).
FIFO="$(mktemp -u)"; mkfifo "$FIFO"
python3 "$PY" acquire "$LOCK" <"$FIFO" >/tmp/brain_lock_holder.out 2>&1 &
HOLDER=$!
exec 9>"$FIFO"   # keep write end open so holder's stdin stays open (holds lock)

# wait for LOCK_ACQUIRED
for _ in $(seq 1 50); do grep -q LOCK_ACQUIRED /tmp/brain_lock_holder.out 2>/dev/null && break; sleep 0.1; done
grep -q LOCK_ACQUIRED /tmp/brain_lock_holder.out && ok "holder acquired lock" || bad "holder failed to acquire"

# Second dispatcher tries: must FAIL (exit 1).
if python3 "$PY" try "$LOCK"; then bad "second acquirer unexpectedly got the lock"; else ok "second acquirer correctly denied while held"; fi

# Release holder (close FIFO write end -> holder stdin EOF -> releases + exits).
exec 9>&-
wait "$HOLDER" 2>/dev/null

# Now the lock is free: a new acquirer must succeed.
if python3 "$PY" try "$LOCK"; then ok "lock reacquirable after release"; else bad "lock not reacquirable after release"; fi

rm -f "$FIFO" "$LOCK" /tmp/brain_lock_holder.out 2>/dev/null
echo "----"; echo "lock test: $pass passed, $fail failed"
[ "$fail" = 0 ]
