#!/usr/bin/env bash
# BrainV2 RED tests (intentionally failing until implementation lands).
# These assert on the NOT-YET-BUILT gateway (scripts/oc-brain) so they fail for
# the right reason: the target does not exist yet. RED->GREEN discipline.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BRAIN="$ROOT/scripts/oc-brain"
red=0; unexpected=0
red_expected() { red=$((red+1)); echo "RED (expected fail): $1"; }
green_unexpected() { unexpected=$((unexpected+1)); echo "UNEXPECTED PASS (should be RED): $1"; }

# RED-1: gateway binary must exist (it does not yet).
if [ -x "$BRAIN" ]; then green_unexpected "oc-brain exists (T1 done?)"; else red_expected "oc-brain gateway not implemented"; fi

# RED-2: idempotency API (same op_id + same payload => single result).
if [ -x "$BRAIN" ] && "$BRAIN" write --op-id RED-OP-1 --payload '{"x":1}' >/dev/null 2>&1; then
  green_unexpected "idempotent write available"; else red_expected "idempotent write API absent"; fi

# RED-3: trusted project_id (agent-supplied project_id must be ignored).
if [ -x "$BRAIN" ] && "$BRAIN" read --project attacker-project >/dev/null 2>&1; then
  green_unexpected "gateway read available"; else red_expected "gateway project-scoped read absent"; fi

# RED-4: bypass prevention doc must exist and be tested (T6 pre-req).
if [ -f "$ROOT/docs/coordination/BRAIN_GATEWAY.md" ]; then
  green_unexpected "BRAIN_GATEWAY.md exists"; else red_expected "gateway bypass doc/route-table absent"; fi

# RED-5: migration cypher must exist (T2).
if [ -f "$ROOT/scripts/tests/brain/migrations/001_backfill.cypher" ]; then
  green_unexpected "migration 001 exists"; else red_expected "migration 001_backfill absent"; fi

echo "----"; echo "RED tests: $red expected-fails, $unexpected unexpected-passes"
# Test PASSES (exit 0) when all are still RED (nothing implemented yet).
[ "$unexpected" = 0 ]
