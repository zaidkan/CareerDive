#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/_env.sh"
resolve_python || { echo "benchmark: compatible Python unavailable" >&2; exit "$INFRA_FAIL"; }
preflight >/dev/null
"$HARNESS" cypher "$(cat "$HERE/migrations/002_fulltext.cypher")" >/dev/null
"$HARNESS" cypher "$(cat "$HERE/benchmark-seed.cypher")" >/dev/null
"$PYTHON" "$HERE/benchmark.py" "$@"
