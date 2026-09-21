#!/usr/bin/env bash
# T8 project-isolation gate. Disposable local harness only.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/_env.sh"
resolve_python || { echo "isolation: compatible Python unavailable" >&2; exit "$INFRA_FAIL"; }
preflight >/dev/null

grep -q "_annotate_staleness(payload)" "$BRAIN_DIR/oc_brain_server.py"
grep -q "SCOPED_FACT_QUERIES" "$BRAIN_DIR/oc_brain_server.py"

PYTHONPATH="$BRAIN_DIR" "$PYTHON" - <<'PY'
import oc_brain_server as s
s._reachable_from_current_branch = lambda sha: False
p = s._fact_record_to_dict({
    "id": "stale-scoped", "subject": "s", "predicate": "p", "object": "o",
    "project_id": "career-expo", "metadata": {"scope": "BRANCH_OBSERVATION", "commit_sha": "deadbeef"}
}, 1.0, "exact")
assert p["project_id"] == "career-expo"
assert "STALENESS_CANDIDATE" in p["flags"]
PY

"$HARNESS" cypher "$(cat "$HERE/migrations/002_fulltext.cypher")" >/dev/null
"$HARNESS" cypher "$(cat "$HERE/benchmark-seed.cypher")" >/dev/null
"$PYTHON" "$HERE/benchmark.py" --runs 2 --skip-embedding-latency
echo "PASS: exact/full-text/vector/graph project isolation and scoped recall"
