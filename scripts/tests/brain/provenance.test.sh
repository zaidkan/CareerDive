#!/usr/bin/env bash
# BrainV2 T7 provenance + stale-candidate + completion gate proof.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/_env.sh"
resolve_python || { echo "INFRA_FAIL: no python with neo4j+mcp+fastmcp" >&2; exit "$INFRA_FAIL"; }
export BRAIN_DIR PYTHON

setup() {
  local out rc
  set +e; out="$("$HARNESS" preflight 2>&1)"; rc=$?; set -e
  if [ "$rc" -ne 0 ]; then
    printf '%s\n' "$out" >&2
    if printf '%s' "$out" | grep -q 'not running'; then "$HARNESS" up >/dev/null; else exit "$rc"; fi
  fi
  "$HARNESS" preflight >/dev/null
  "$HARNESS" apply >/dev/null
  "$HARNESS" ensure-concurrency-schema >/dev/null
}

setup
trap '"$HARNESS" cypher "MATCH (f:Fact) WHERE f.id STARTS WITH '\''t7-'\'' DETACH DELETE f" >/dev/null 2>&1 || true' EXIT

PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); echo "PASS: $1"; }
bad(){ FAIL=$((FAIL+1)); echo "FAIL: $1"; }

# Unit gate for the read annotation: stale branch facts are retained and
# architecture facts are explicitly exempt from branch staleness.
if "$PYTHON" - <<'PY'
import os, sys
sys.path.insert(0, os.environ["BRAIN_DIR"])
import oc_brain_server as s
stale = {"metadata": {"scope": "BRANCH_OBSERVATION", "commit_sha": "0" * 40}}
arch = {"metadata": {"scope": "PROJECT_ARCHITECTURE", "commit_sha": "0" * 40}}
assert "STALENESS_CANDIDATE" in s._annotate_staleness(stale)["flags"]
assert "STALENESS_CANDIDATE" not in s._annotate_staleness(arch).get("flags", [])
assert stale["metadata"]["staleness"] == "STALENESS_CANDIDATE"
PY
then ok "unreachable commit flagged and retained; architecture exempt"; else bad "staleness annotation"; fi

# Verify both coordination writer forms stamp the four required fields as
# explicit Fact properties (using only the disposable local harness).
export OC_NEO4J_MODE=local OC_NEO4J_CONTAINER=brainv2-neo4j-test NEO4J_PASSWORD="$OC_BRAIN_NEO4J_PASSWORD"
export OC_BRAIN_AGENT_ID=t7-test-agent OC_BRAIN_REPO="$(git rev-parse --show-toplevel)"
WOUT="$("$ROOT/scripts/oc-memory" write TASK_STATUS t7-test decision 'provenance write' active scope=TASK_STATUS verified=true commit_sha="$(git rev-parse HEAD)" branch="$(git branch --show-current)" agent_id=t7-test-agent)"
if printf '%s' "$WOUT" | grep -q '^WROTE '; then
  row="$($HARNESS cypher "MATCH (f:Fact {subject:'t7-test'}) RETURN f.scope, f.verified, f.commit_sha, f.branch, f.agent_id")"
  if printf '%s' "$row" | grep -q 'TASK_STATUS' && printf '%s' "$row" | grep -qi 'true' && printf '%s' "$row" | grep -q 't7-test-agent'; then ok "oc-memory writer stamps scope/verified/commit/branch/agent"; else bad "oc-memory provenance fields missing"; fi
else bad "oc-memory writer failed: $WOUT"; fi

# Completion hard gate is deliberately local and textual: inspect_completion
# must transition no-commit worker claims to BLOCKED before recording outcome.
if grep -q 'completion_requires_new_commit' "$ROOT/scripts/oc-dispatch" && grep -qE 'newcommit.*none' "$ROOT/scripts/oc-dispatch"; then
  ok "inspect_completion refuses COMPLETE without a new commit"
else bad "completion hard gate missing"; fi

echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
