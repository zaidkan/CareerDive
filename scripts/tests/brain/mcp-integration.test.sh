#!/usr/bin/env bash
# BRAINV2-T1 MCP spike: prove stock neo4j-agent-memory MCP server can
# round-trip a write + read through a NAMS-mode bridge gateway stub,
# persisting to the disposable harness Neo4j on 127.0.0.1:7688.
# Run: bash scripts/tests/brain/mcp-integration.test.sh
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PY="$ROOT/.venv/bin/python"
TMP="$(mktemp -d)"; trap 'kill "${STUB_PID:-}" 2>/dev/null; rm -rf "$TMP"' EXIT
pass=0; fail=0
has() { if printf '%s' "$2" | grep -q "$3"; then pass=$((pass+1)); echo "PASS: $1"; else fail=$((fail+1)); echo "FAIL: $1 — missing [$3]"; fi; }
hasnt() { if printf '%s' "$2" | grep -q "$3"; then fail=$((fail+1)); echo "FAIL: $1 — unexpectedly [$3]"; else pass=$((pass+1)); echo "PASS: $1"; fi; }

# Start the bridge stub (port 0 -> free port, printed on STUB READY).
"$PY" "$ROOT/scripts/brain/nams_bridge_stub.py" --port 0 --api-key test-key \
  --bolt-uri bolt://127.0.0.1:7688 --bolt-user neo4j --bolt-password brainv2testpw \
  >"$TMP/stub.log" 2>&1 &
STUB_PID=$!

ready=0
for i in $(seq 1 50); do
  if grep -q "STUB READY" "$TMP/stub.log" 2>/dev/null; then ready=1; break; fi
  if ! kill -0 "$STUB_PID" 2>/dev/null; then break; fi
  sleep 0.2
done
has "stub: started and connected to harness bolt" "$ready" "1"
if ! kill -0 "$STUB_PID" 2>/dev/null; then echo "stub log:"; cat "$TMP/stub.log"; exit 1; fi
PORT="$(sed -n 's/.*STUB READY http:\/\/127.0.0.1:\([0-9]*\).*/\1/p' "$TMP/stub.log" | tail -1)"

ok=0
for i in $(seq 1 20); do
  if curl -s "http://127.0.0.1:$PORT/health" | grep -q ok; then ok=1; break; fi
  sleep 0.2
done
has "stub: HTTP health check" "$ok" "1"

# Drive the stock MCP server through the gateway (it spawns uvx on its own).
if "$PY" "$ROOT/scripts/brain/mcp_probe.py" --port "$PORT" --api-key test-key \
  >"$TMP/probe.out" 2>"$TMP/probe.err"; then prc=0; else prc=$?; fi
[ "$prc" = 0 ] && { pass=$((pass+1)); echo "PASS: probe: exit 0"; } || { fail=$((fail+1)); echo "FAIL: probe: exit $prc"; }
cat "$TMP/probe.out"
has "probe: all assertions passed" "$(grep '^RESULT:' "$TMP/probe.out")" "0 failed"

# Wire evidence: the bridge gateway really received the core methods…
has "bridge: list_conversations hit" "$(cat "$TMP/stub.log")" "method=list_conversations"
has "bridge: add_message hit" "$(cat "$TMP/stub.log")" "method=add_message"
has "bridge: get_context hit" "$(cat "$TMP/stub.log")" "method=get_context"
has "bridge: search_messages hit" "$(cat "$TMP/stub.log")" "method=search_messages"
# …and add_fact never reached the wire (client-side NotSupportedError).
hasnt "bridge: add_fact never reached the wire" "$(cat "$TMP/stub.log")" "method=add_fact"

# Persistence evidence: the message landed in harness Neo4j, not the stub.
PERSIST="$("$PY" - <<'PY'
from neo4j import GraphDatabase
d = GraphDatabase.driver("bolt://127.0.0.1:7688", auth=("neo4j", "brainv2testpw"))
with d.session() as s:
    n = s.run("MATCH (m:Message) WHERE m.content CONTAINS 'bridge-spike-' RETURN count(m) AS c").single()["c"]
d.close()
print(n)
PY
)"
has "persist: message reached harness neo4j" "$PERSIST" "^[1-9]"

echo "----"; echo "mcp-integration tests: $pass passed, $fail failed"
[ "$fail" = 0 ]