#!/usr/bin/env bash
# Remote-mode tests for oc-memory. NO live Windows Neo4j needed: stubs
# cypher-shell and docker on PATH, records their args, and asserts:
#   - default mode is remote (bolt://100.99.119.124:7687)
#   - unreachable/failed-auth remote -> available non-zero, write -> MEMORY_DEGRADED
#   - remote mode NEVER invokes `docker exec orca-neo4j` (no silent local fallback)
#   - local mode still uses the docker-exec path (rollback preserved)
# Run: bash scripts/tests/memory-remote.test.sh
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OCM="$ROOT/scripts/oc-memory"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
pass=0; fail=0
check() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS: $1"; else fail=$((fail+1)); echo "FAIL: $1 — expected '$2' got '$3'"; fi; }
has() { if printf '%s' "$2" | grep -q -- "$3"; then pass=$((pass+1)); echo "PASS: $1"; else fail=$((fail+1)); echo "FAIL: $1 — missing [$3]"; fi; }
hasnt() { if printf '%s' "$2" | grep -q -- "$3"; then fail=$((fail+1)); echo "FAIL: $1 — unexpectedly [$3]"; else pass=$((pass+1)); echo "PASS: $1"; fi; }

mkdir -p "$TMP/bin"
cat >"$TMP/bin/cypher-shell" <<'EOF'
#!/usr/bin/env bash
echo "$*" >>"$STUB_CYPHER_ARGS"
[ "${STUB_REMOTE_OK:-0}" = 1 ] || { echo "transport unreachable" >&2; exit 1; }
printf '1\n1\n'
EOF
chmod +x "$TMP/bin/cypher-shell"
cat >"$TMP/bin/docker" <<'EOF'
#!/usr/bin/env bash
echo "$*" >>"$STUB_DOCKER_ARGS"
exit 0
EOF
chmod +x "$TMP/bin/docker"

docker_says() { [ ! -f "$1" ] && echo "(never called)" || { [ -s "$1" ] && cat "$1" || echo "(no args)"; }; }

# TEST 1: default mode = remote; unreachable bolt -> available exits 3, prints UNAVAILABLE
rm -f "$TMP/cy" "$TMP/dk"
STUB_REMOTE_OK=0 NEO4J_PASSWORD=x STUB_CYPHER_ARGS="$TMP/cy" STUB_DOCKER_ARGS="$TMP/dk" PATH="$TMP/bin:$PATH" \
  bash "$OCM" available >"$TMP/out" 2>&1; rc=$?
check "remote: unreachable bolt -> available exit 3" 3 "$rc"
has "remote: available prints UNAVAILABLE" "$(cat "$TMP/out")" "UNAVAILABLE"
hasnt "remote: no silent local fallback (docker never invoked)" "$(docker_says "$TMP/dk")" "orca-neo4j"
has "remote: probe hit default bolt://100.99.119.124:7687" "$(cat "$TMP/cy")" "bolt://100.99.119.124:7687"
has "remote: probe used default user neo4j" "$(cat "$TMP/cy")" "-u neo4j"

# TEST 2: remote mode write with unreachable bolt -> MEMORY_DEGRADED, no crash
rm -f "$TMP/cy" "$TMP/dk"
STUB_REMOTE_OK=0 NEO4J_PASSWORD=x STUB_CYPHER_ARGS="$TMP/cy" STUB_DOCKER_ARGS="$TMP/dk" PATH="$TMP/bin:$PATH" \
  bash "$OCM" write IMPLEMENTATION_CHECKPOINT NEO4J-REMOTE-BOLT test "degrade check" active >"$TMP/out" 2>&1; rc=$?
check "remote: unreachable bolt -> write exit 3" 3 "$rc"
has "remote: write prints MEMORY_DEGRADED" "$(cat "$TMP/out")" "MEMORY_DEGRADED"
hasnt "remote: write did not fall back to docker" "$(docker_says "$TMP/dk")" "orca-neo4j"

# TEST 3: remote auth probe succeeds -> available AVAILABLE exit 0
rm -f "$TMP/cy" "$TMP/dk"
STUB_REMOTE_OK=1 NEO4J_PASSWORD=x STUB_CYPHER_ARGS="$TMP/cy" STUB_DOCKER_ARGS="$TMP/dk" PATH="$TMP/bin:$PATH" \
  bash "$OCM" available >"$TMP/out" 2>&1; rc=$?
check "remote: ok bolt -> available exit 0" 0 "$rc"
has "remote: ok bolt -> AVAILABLE" "$(cat "$TMP/out")" "AVAILABLE"
has "remote: probe runs RETURN 1" "$(cat "$TMP/cy")" "RETURN 1"
hasnt "remote: success path still no docker fallback" "$(docker_says "$TMP/dk")" "orca-neo4j"

# TEST 4: local mode preserved (rollback) -> docker-exec path used
rm -f "$TMP/cy" "$TMP/dk"
OC_NEO4J_MODE=local STUB_REMOTE_OK=0 STUB_CYPHER_ARGS="$TMP/cy" STUB_DOCKER_ARGS="$TMP/dk" PATH="$TMP/bin:$PATH" \
  NEO4J_PASSWORD=x bash "$OCM" available >"$TMP/out" 2>&1; rc=$?
check "local: docker-stub ok -> available exit 0" 0 "$rc"
has "local: available prints AVAILABLE" "$(cat "$TMP/out")" "AVAILABLE"
has "local: docker exec orca-neo4j invoked" "$(docker_says "$TMP/dk")" "exec orca-neo4j"

# TEST 5: remote with no cypher-shell client at all -> manual-prerequisite degrade
rm -f "$TMP/cy" "$TMP/dk"
OUT="$(NEO4J_PASSWORD=x PATH="/usr/bin:/bin" bash "$OCM" available 2>&1)"; rc=$?
# /usr/bin:/bin almost certainly has no cypher-shell; assert degrade rather than exact rc wording
[ "$rc" != 0 ] && { pass=$((pass+1)); echo "PASS: remote: no client -> available non-zero ($rc)"; } || { fail=$((fail+1)); echo "FAIL: remote: no client expected non-zero"; }
has "remote: no client -> UNAVAILABLE" "$OUT" "UNAVAILABLE"

echo "----"; echo "memory-remote tests: $pass passed, $fail failed"
[ "$fail" = 0 ]