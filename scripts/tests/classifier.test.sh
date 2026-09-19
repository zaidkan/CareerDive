#!/usr/bin/env bash
# Regression tests for oc-worker classify_result (the false-classifier bug).
# No live opencode/Neo4j needed. Run: bash scripts/tests/classifier.test.sh
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OCW="$ROOT/scripts/oc-worker"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
pass=0; fail=0
check() { # desc expected actual
  if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS: $1";
  else fail=$((fail+1)); echo "FAIL: $1 — expected '$2' got '$3'"; fi
}

# 1. CRITICAL REGRESSION: successful run (exit 0) whose ANSWER text mentions
#    error terminology must stay success.
cat >"$TMP/prose.out" <<'EOF'
ROUTE dispatch worker=nemotron1 model=nemotron-3-ultra-free ...
The historical MCP cold-start bug printed "-32000 Connection closed" and
"rate limit" style errors. This audit discusses connection closed at length.
NEO4J_AUDIT_DONE
EOF
check "success prose mentioning 'connection closed'/'-32000'/'rate limit' stays success" \
  "success 0" "$($OCW classify "$TMP/prose.out" 0 0)"

# 2. Real rate-limit in RUNNER framing (exit non-zero) -> throttled.
cat >"$TMP/rl.out" <<'EOF'
some worker output
API Error: 429 Too Many Requests (rate limit exceeded)
EOF
check "runner-framed 429 -> throttled" "throttled 1" "$($OCW classify "$TMP/rl.out" 1 0)"

# 3. Real MCP cold-start in RUNNER framing (exit non-zero) -> mcp_cold_start_error.
cat >"$TMP/mcp.out" <<'EOF'
opencode: MCP server project-memory error -32000 Connection closed
EOF
check "runner-framed -32000 -> mcp_cold_start_error" "mcp_cold_start_error 0" "$($OCW classify "$TMP/mcp.out" 1 0)"

# 4. Timeout wins regardless of content.
check "timed_out=1 -> timeout" "timeout 0" "$($OCW classify "$TMP/prose.out" '' 1)"

# 5. Non-zero exit, no recognizable runner error -> error.
cat >"$TMP/plain.out" <<'EOF'
worker produced some normal output with no runner error framing
EOF
check "non-zero exit, no runner error -> error" "error 0" "$($OCW classify "$TMP/plain.out" 1 0)"

# 6. Prose 'rate limit' in ANSWER body but exit 0 -> still success (not throttled).
cat >"$TMP/prose2.out" <<'EOF'
Recommendation: handle rate limit and 429 quota errors gracefully.
DONE
EOF
check "answer discussing 'rate limit/429' but exit 0 stays success" \
  "success 0" "$($OCW classify "$TMP/prose2.out" 0 0)"

echo "----"; echo "classifier tests: $pass passed, $fail failed"
[ "$fail" = 0 ]
