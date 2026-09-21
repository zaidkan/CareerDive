#!/usr/bin/env bash
# BrainV2 test-scope shared environment.
# Resolves the repo root, the harness path, and a Python interpreter that has
# EVERYTHING the BrainV2 harness needs (neo4j driver + mcp + fastmcp), then
# pins the isolated harness Bolt endpoint. Referenced env is always
# 127.0.0.1:7688 (disposable container); production (100.99.119.124) must
# never be reachable from here.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SCRIPTS="$ROOT/scripts"
BRAIN_DIR="$SCRIPTS/brain"
TESTS_BRAIN="$SCRIPTS/tests/brain"
HARNESS="$TESTS_BRAIN/harness.sh"
INFRA_FAIL=42

export OC_BRAIN_NEO4J_URI="${OC_BRAIN_NEO4J_URI:-bolt://127.0.0.1:7688}"
export OC_BRAIN_NEO4J_USER="${OC_BRAIN_NEO4J_USER:-neo4j}"
export OC_BRAIN_NEO4J_DATABASE="${OC_BRAIN_NEO4J_DATABASE:-neo4j}"
# PIN the test credential: the ambient shell may carry a stray NEO4J_PASSWORD /
# OC_BRAIN_NEO4J_PASSWORD from another branch or host. Only a test-only value
# may be used by these tests; override via BRAINV2_TEST_PW (harness default).
unset NEO4J_PASSWORD
export OC_BRAIN_NEO4J_PASSWORD="${BRAINV2_TEST_PW:-brainv2testpw}"

# Resolve a python capable of the full harness (module CLI, MCP stdio probe,
# SDK). Picks $BRAINV2_PYTHON if given, then repo venvs, then the T1 gateway
# venv (which carries neo4j + mcp + fastmcp), then bare python3.
resolve_python() {
  local candidates=(
    "${BRAINV2_PYTHON:-}"
    "$ROOT/.venv/bin/python"
    "$ROOT/venv/bin/python"
    /Users/zaid/orca/workspaces/Career-Expo/brainv2-t1-gateway-feasibility/.venv/bin/python
    python3
  )
  local p
  for p in "${candidates[@]}"; do
    [ -n "$p" ] || continue
    if [ -x "$p" ] && "$p" -c "import neo4j, mcp, fastmcp" >/dev/null 2>&1; then
      PYTHON="$p"
      return 0
    fi
  done
  return 1
}

# Run harness preflight; exit 42 (INFRA_FAIL) unchanged so callers never
# mistake an infrastructure outage for an assertion failure.
preflight() {
  local rc
  set +e
  OUT="$("$HARNESS" preflight)"
  rc=$?
  set -e
  if [ "$rc" -ne 0 ]; then
    printf '%s\n' "$OUT" >&2
    exit "$rc"
  fi
  printf '%s\n' "$OUT"
}
