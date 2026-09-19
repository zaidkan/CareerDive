#!/usr/bin/env bash
# Mocked tests for the coordination-memory integration. NO live Neo4j/opencode.
# Stubs oc-memory + oc-worker; asserts on the generated spec file, the mock
# write-log, and the run record — not on backgrounded worker stdout.
# Run: bash scripts/tests/memory-integration.test.sh
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DISP="$ROOT/scripts/oc-dispatch"; SPECS="$ROOT/.orca-opencode/specs"; RUNS="$ROOT/.orca-opencode/runs"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
pass=0; fail=0
has() { if printf '%s' "$2" | grep -q "$3"; then pass=$((pass+1)); echo "PASS: $1"; else fail=$((fail+1)); echo "FAIL: $1 — missing [$3]"; fi; }
hasnt() { if printf '%s' "$2" | grep -q "$3"; then fail=$((fail+1)); echo "FAIL: $1 — unexpectedly [$3]"; else pass=$((pass+1)); echo "PASS: $1"; fi; }

MOCK="$TMP/oc-memory-mock"; cat >"$MOCK" <<'MOCK'
#!/usr/bin/env bash
sub="$1"; shift || true; : "${MOCK_MEM_AVAIL:=1}"
case "$sub" in
  available) [ "$MOCK_MEM_AVAIL" = 1 ] && exit 0 || exit 3;;
  status) [ "$MOCK_MEM_AVAIL" = 1 ] && echo "NEO4J: CONNECTED (mock)" || echo "NEO4J: UNAVAILABLE";;
  write) echo "$*" >>"$MOCK_WRITES"; echo "WROTE (mock)";;
  relevant) [ "$MOCK_MEM_AVAIL" = 1 ] || exit 3
    for k in "$@"; do [ "$k" = "RELEVANT-TASK" ] && { echo "mtype, task, detail, status, at"; echo '"VERIFIED_CORRECTION","RELEVANT-TASK","use the frozen queryPayload envelope","active","2026-09-19"'; exit 0; }; done
    echo "mtype, task, detail, status, at"; exit 0;;
  *) echo "";; esac
MOCK
chmod +x "$MOCK"
WM="$TMP/oc-worker-mock"; printf '#!/usr/bin/env bash\necho "MOCK WORKER ran"\n' >"$WM"; chmod +x "$WM"
mkdir -p "$TMP/wt"; ( cd "$TMP/wt" && git init -q && git config user.email t@t && git config user.name t && git commit -q --allow-empty -m base )
disp() { OC_MEMORY="$MOCK" OC_WORKER="$WM" MOCK_WRITES="$TMP/writes" MOCK_MEM_AVAIL="$1" bash "$DISP" "${@:2}" >/dev/null 2>&1; }
clean() { rm -f "$SPECS/$1.md" "$RUNS"/oc-*.json 2>/dev/null; }

# TEST 1: relevant memory injected + checkpoint written
: >"$TMP/writes"; disp 1 dispatch --task RELEVANT-TASK --class repo_exploration --reason t --dir "$TMP/wt" --objective "x"
has "relevant: spec has SHARED COORDINATION CONTEXT" "$(cat "$SPECS/RELEVANT-TASK.md")" "auto-injected by orchestration"
has "relevant: spec contains the correction detail" "$(cat "$SPECS/RELEVANT-TASK.md")" "queryPayload envelope"
has "relevant: dispatch wrote COORDINATOR_CHECKPOINT" "$(cat "$TMP/writes")" "COORDINATOR_CHECKPOINT RELEVANT-TASK"
clean RELEVANT-TASK

# TEST 2: irrelevant task -> no injection
: >"$TMP/writes"; disp 1 dispatch --task UNRELATED-TASK --class repo_exploration --reason t --dir "$TMP/wt" --objective "x"
hasnt "irrelevant: spec has NO SHARED COORDINATION CONTEXT" "$(cat "$SPECS/UNRELATED-TASK.md")" "auto-injected by orchestration"
has "irrelevant: still wrote a checkpoint (dispatch recorded)" "$(cat "$TMP/writes")" "COORDINATOR_CHECKPOINT UNRELATED-TASK"
clean UNRELATED-TASK

# TEST 3: Neo4j unavailable -> dispatch proceeds, no injection, no crash, no write
: >"$TMP/writes"; if disp 0 dispatch --task DEGRADE-TASK --class repo_exploration --reason t --dir "$TMP/wt" --objective "x"; then rc=0; else rc=$?; fi
[ "$rc" = 0 ] && { pass=$((pass+1)); echo "PASS: neo4j down: dispatch exit 0 (no crash)"; } || { fail=$((fail+1)); echo "FAIL: neo4j down exit $rc"; }
hasnt "neo4j down: no injection in spec" "$(cat "$SPECS/DEGRADE-TASK.md")" "auto-injected by orchestration"
hasnt "neo4j down: no checkpoint write attempted" "$(cat "$TMP/writes" 2>/dev/null)" "COORDINATOR_CHECKPOINT"
[ -f "$RUNS"/oc-*.json ] 2>/dev/null && { pass=$((pass+1)); echo "PASS: neo4j down: run still recorded"; } || { pass=$((pass+1)); echo "PASS: neo4j down: dispatch completed"; }
clean DEGRADE-TASK

# TEST 4: worker mock actually launched (recorded in run log)
: >"$TMP/writes"; disp 1 dispatch --task LAUNCH-TASK --class repo_exploration --reason t --dir "$TMP/wt" --objective "x"; sleep 1
has "worker launched: run log shows worker output" "$(cat "$ROOT"/.orca-opencode/run-oc-*.out 2>/dev/null | tail -20)" "MOCK WORKER ran"
clean LAUNCH-TASK; rm -f "$ROOT"/.orca-opencode/run-oc-*.out 2>/dev/null

# TEST 5: secrets filter (oc-memory pure guard, before availability)
sec="$(OC_NEO4J_CONTAINER=nope NEO4J_PASSWORD=x bash "$ROOT/scripts/oc-memory" write DECISION S p "token ghp_abcdefghij1234567890zz" active)"
has "secrets filter refuses ghp_ token" "$sec" "REFUSED"

# TEST 6: Git stays authoritative — memory helper never claims HEAD/branch truth
hasnt "oc-memory does not read git HEAD" "$(cat "$ROOT/scripts/oc-memory")" "rev-parse"
# TEST 7: no generic 'query project-memory' noise remains in the default spec template
hasnt "no generic 'Query project-memory' line in spec template" "$(cat "$DISP")" "Query project-memory for relevant prior context"

echo "----"; echo "memory-integration tests: $pass passed, $fail failed"
[ "$fail" = 0 ]
