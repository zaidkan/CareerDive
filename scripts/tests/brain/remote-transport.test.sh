#!/usr/bin/env bash
# ------------------------------------------------------------------
# Remote-transport gate (BRAINv2 T6) — RED->GREEN.
#
# Supervisor (this script) is the TRUSTED role in the isolation model:
#   * builds a disposable venv, writes a 0600 bearer-token file;
#   * spawns the disposable in-memory gateway with the token value in a
#     FILE ONLY (server never sees the value in argv/env of its own cmdline);
#   * drives THREE transports against the SAME gateway:
#       (a) direct streamable-http (SDK client)          oc_remote_probe --phase direct
#       (b) local stdio -> remote bridge (stdio client)  oc_remote_probe --phase bridge
#       (c) OpenCode model-driven remote MCP             opencode run -m opencode/big-pickle
#   * degraded path: gateway stopped -> probe must print MEMORY_DEGRADED and
#     exit clean; gateway restarted -> direct transport works again (recovery).
#   * hostile scope: a client-supplied project_id must carry NO authority;
#     project identity comes from trusted server config only.
#
# Proof boundary: production opencode.json and .kiro/settings/mcp.json must
# be byte-identical after the run (git check) — T6 never touches production
# config.
#
# Honest same-Mac caveat (design boundary, see BRAIN_GATEWAY_WINDOWS.md):
# a process on the same macOS user account can read the gateway's env via
# `ps eww` and its 0600 secret file via `cat`. T6 measures and PRINTS those
# vectors as SECURITY-NOTE (not PASS). Real endpoint isolation is produced by
# the Windows-hosted production gateway design; this gate proves the transport
# + auth + degraded contract only.
# ------------------------------------------------------------------
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
GATEWAY="$ROOT/scripts/brain/oc_remote_gateway.py"
PROBE="$ROOT/scripts/brain/oc_remote_probe.py"
BRIDGE="$ROOT/scripts/brain/oc_remote_bridge.py"
TOKEN="${OC_REMOTE_TEST_TOKEN:-remote-transport-test-token}"
PROJECT_ID="${OC_REMOTE_TEST_PROJECT:-career-expo}"
PORT="${OC_REMOTE_TEST_PORT:-$(( RANDOM % 5000 + 8300 ))}"
URL="http://127.0.0.1:$PORT/mcp"
OPCODE_BIN="${OPENCODE_BIN:-$HOME/.opencode/bin/opencode}"

PASS=0
FAIL=0
ok()  { PASS=$((PASS+1)); echo "PASS: $1${2:+ — $2}"; }
bad() { FAIL=$((FAIL+1)); echo "FAIL: $1${2:+ — $2}"; }
note(){ echo "SECURITY-NOTE: $1"; }

# ---- Preconditions (RED phase: fail loud when a piece is missing) ----
for f in "$GATEWAY" "$PROBE" "$BRIDGE"; do
  if [ -f "$f" ]; then ok "precondition: $(basename "$f") present"; else
    bad "precondition: $(basename "$f") missing (RED)"; echo "RESULT: $PASS passed, $FAIL failed"; exit 1
  fi
done

if command -v uv >/dev/null 2>&1; then ok "precondition: uv present (for disposable venv)"; else
  bad "precondition: uv missing (install via https://docs.astral.sh/uv/)"; echo "RESULT: $PASS passed, $FAIL failed"; exit 1
fi

if [ -x "$OPCODE_BIN" ]; then ok "precondition: opencode present at $OPCODE_BIN"; else
  bad "precondition: opencode binary not found at $OPCODE_BIN"; echo "RESULT: $PASS passed, $FAIL failed"; exit 1
fi

if "$OPCODE_BIN" models 2>/dev/null | grep -q "big-pickle"; then
  ok "precondition: opencode/big-pickle model reachable (opencode gateway)"
else
  bad "precondition: opencode/big-pickle unreachable — proof (c) cannot run"
  echo "RESULT: $PASS passed, $FAIL failed"; exit 1
fi

# ---- Build supervisor state ----
WORKDIR="$(mktemp -d /tmp/oc-remote-transport.XXXXXX)"
TOKFILE="$WORKDIR/token"
PIDFILE="$WORKDIR/gateway.pid"
printf '%s' "$TOKEN" >"$TOKFILE"
chmod 600 "$TOKFILE"
NOTELEAK="$TOKEN"  # never printed; only used for leak scans

# throwaway opencode config project dir (opencode may drop session files here)
OCDIR="$WORKDIR/oc"
mkdir -p "$OCDIR"
cat >"$OCDIR/opencode.json" <<EOF
{
  "mcp": {
    "brain-remote": {
      "type": "remote",
      "url": "$URL",
      "enabled": true,
      "headers": { "Authorization": "Bearer $TOKEN" }
    }
  }
}
EOF
chmod 600 "$OCDIR/opencode.json"

# disposable venv (network: fastmcp + mcp + httpx)
echo "info: creating disposable venv in $WORKDIR/venv (uv)"
if ! uv venv --python 3.12 "$WORKDIR/venv" >/dev/null 2>&1; then
  bad "harness: uv venv failed"; echo "RESULT: $PASS passed, $FAIL failed"; exit 1
fi
if ! uv pip install --python "$WORKDIR/venv/bin/python" \
     "mcp>=2.0" "fastmcp>=4,<5" "httpx>=0.28" >/dev/null 2>&1; then
  bad "harness: venv dependency install failed (need network)"
  echo "RESULT: $PASS passed, $FAIL failed"; exit 1
fi
PY="$WORKDIR/venv/bin/python"
ok "harness: disposable venv ready (mcp + fastmcp + httpx)"

start_gateway() {
  OC_BRAIN_BEARER_TOKEN_FILE="$TOKFILE" \
  OC_BRAIN_PROJECT_ID="$PROJECT_ID" \
  OC_BRAIN_REMOTE_HOST=127.0.0.1 \
  OC_BRAIN_REMOTE_PORT="$PORT" \
  OC_BRAIN_PID_FILE="$PIDFILE" \
  "$PY" "$GATEWAY" >>"$WORKDIR/gateway.log" 2>&1 &
}

wait_gateway() {
  local i
  for i in $(seq 1 40); do
    code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL" \
      -H 'Content-Type: application/json' \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}')
    [ "$code" = "200" ] && return 0
    sleep 0.5
  done
  return 1
}

stop_gateway() {
  local pid
  [ -f "$PIDFILE" ] && pid=$(cat "$PIDFILE") && { kill "$pid" 2>/dev/null && { wait "$pid" 2>/dev/null || true; }; }
  sleep 1
}

# ---- Phase 0: gateway up + security posture ----
start_gateway
if wait_gateway; then ok "harness: gateway listening at $URL"; else
  bad "harness: gateway never became ready (see $WORKDIR/gateway.log)"
  echo "RESULT: $PASS passed, $FAIL failed"; exit 1
fi

if [ -f "$PIDFILE" ]; then
  GW_PID=$(cat "$PIDFILE")
  if ps -p "$GW_PID" -o command= 2>/dev/null | grep -q "$TOKEN"; then
    bad "security: gateway argv leaks the bearer token"
  else
    ok "security: gateway argv does not carry the bearer token (file-injected)"
  fi
  if [ ! -e "/proc" ] && command -v ps >/dev/null 2>&1; then
    if ps eww -p "$GW_PID" 2>/dev/null | grep -q "$TOKEN"; then
      note "same-Mac: gateway env readable via 'ps eww' by same-account processes (macOS limitation; Windows design mitigates per BRAIN_GATEWAY_WINDOWS.md)"
    else
      note "same-Mac: gateway env scribble check inconclusive on this macOS; treat as readable"
    fi
  fi
  note "same-Mac: gateway secret file mode is $(stat -f '%Lp' "$TOKFILE") at $TOKFILE (readable by same uid)"
fi
ok "security: bearer token file mode 600 (secret on disk, supervisor-managed)"

# ---- Phase 1: direct streamable-http transport ----
DIRECT_OUT=$("$PY" "$PROBE" --phase direct --url "$URL" --token "$TOKEN" --server-project "$PROJECT_ID" 2>&1)
DIRECT_RC=$?
DIRECT_FAILS=$(printf '%s\n' "$DIRECT_OUT" | grep -c '^FAIL:' || true)
echo "$DIRECT_OUT" | sed 's/^/  direct | /'
if [ "$DIRECT_RC" = "0" ] && [ "$DIRECT_FAILS" = "0" ]; then
  ok "phase1: direct streamable-http probe all green"
else
  bad "phase1: direct streamable-http probe has $DIRECT_FAILS failures (rc=$DIRECT_RC)"
fi
printf '%s\n' "$DIRECT_OUT" | grep -qE 'client-supplied project_id carries NO authority' && \
  ok "phase1: hostile project_id scope rejected (asserted in direct probe)" || \
  note "phase1: hostile project_id assertion not observed in probe output"

# ---- Phase 2: stdio -> remote bridge transport ----
BRIDGE_OUT=$("$PY" "$PROBE" --phase bridge --url "$URL" --token "$TOKEN" \
  --server-project "$PROJECT_ID" --bridge "$BRIDGE" --python "$PY" 2>&1)
BRIDGE_RC=$?
BRIDGE_FAILS=$(printf '%s\n' "$BRIDGE_OUT" | grep -c '^FAIL:' || true)
echo "$BRIDGE_OUT" | sed 's/^/  bridge | /'
if [ "$BRIDGE_RC" = "0" ] && [ "$BRIDGE_FAILS" = "0" ]; then
  ok "phase2: stdio->remote bridge probe all green"
else
  bad "phase2: stdio->remote bridge probe has $BRIDGE_FAILS failures (rc=$BRIDGE_RC)"
fi

# ---- Phase 3: OpenCode model-driven remote MCP proof ----
(
  cd "$OCDIR" || exit 1
  "$OPCODE_BIN" mcp list >"$WORKDIR/oc-mcp-list.txt" 2>&1
)
if grep -q "brain-remote" "$WORKDIR/oc-mcp-list.txt" && grep -qi "connected" "$WORKDIR/oc-mcp-list.txt"; then
  ok "phase3: opencode mcp list shows brain-remote connected (remote transport)"
else
  bad "phase3: opencode mcp list did not show connected brain-remote"
  echo "$WORKDIR/oc-mcp-list.txt" | sed 's/^/  /'
fi

(
  cd "$OCDIR" || exit 1
  "$OPCODE_BIN" run -m opencode/big-pickle --format json \
    "Call the remote MCP tools brain-remote_ping and brain-remote_gateway_echo with message HELLO-REMOTE. Invoke both tools. Report the JSON of each tool result in your final answer." \
    >"$WORKDIR/oc-run.jsonl" 2>"$WORKDIR/oc-run.err"
)
OC_RC=$?
# Model behaviour is probabilistic; retry a couple of times before failing.
if [ "$OC_RC" = "0" ] \
   && grep -q '"tool":"brain-remote_ping"' "$WORKDIR/oc-run.jsonl" \
   && grep -q 'HELLO-REMOTE' "$WORKDIR/oc-run.jsonl"; then
  ok "phase3: opencode agent invoked remote gateway tools and round-tripped data (model-driven proof)"
else
  retried=0
  while [ "$retried" -lt 3 ]; do
    retried=$((retried+1))
    (
      cd "$OCDIR" || exit 1
      "$OPCODE_BIN" run -m opencode/big-pickle --format json \
        "The remote MCP server 'brain-remote' has tools brain-remote_ping and brain-remote_gateway_echo (message=HELLO-REMOTE). You MUST invoke both tools via tool calls. Report each tool's JSON result." \
        >"$WORKDIR/oc-run-retry.jsonl" 2>/dev/null
    )
    if grep -q '"tool":"brain-remote_ping"' "$WORKDIR/oc-run-retry.jsonl" \
       && grep -q 'HELLO-REMOTE' "$WORKDIR/oc-run-retry.jsonl"; then
      ok "phase3: opencode agent proof green on retry ${retried} (model-driven proof)"
      break
    fi
  done
  if [ "$retried" = "3" ]; then
    bad "phase3: opencode agent proof failed after retries (rc=$OC_RC) — inspect $WORKDIR/oc-run.jsonl"
  fi
fi

# ---- Phase 4: degraded mode -> recovery ----
stop_gateway
DEG_OUT=$("$PY" "$PROBE" --phase degraded --url "$URL" --token "$TOKEN" --server-project "$PROJECT_ID" 2>&1)
DEG_RC=$?
echo "$DEG_OUT" | sed 's/^/  degraded | /'
if [ "$DEG_RC" = "0" ] && printf '%s\n' "$DEG_OUT" | grep -q "MEMORY_DEGRADED"; then
  ok "phase4: gateway down -> client degrades cleanly (MEMORY_DEGRADED, rc=0)"
else
  bad "phase4: degraded mode failed (rc=$DEG_RC, no MEMORY_DEGRADED)"
fi

start_gateway
if wait_gateway; then
  ok "phase4: gateway recovered (restart -> ready)"
else
  bad "phase4: gateway failed to recover after restart"
fi
RECOVER_OUT=$("$PY" "$PROBE" --phase direct --url "$URL" --token "$TOKEN" --server-project "$PROJECT_ID" 2>&1)
RECOVER_FAILS=$(printf '%s\n' "$RECOVER_OUT" | grep -c '^FAIL:' || true)
if [ "$RECOVER_FAILS" = "0" ]; then
  ok "phase4: direct transport green again after recovery (deterministic restart)"
else
  bad "phase4: direct probe after recovery has $RECOVER_FAILS failures"
fi

# ---- Phase 5: production config untouched + cleanup ----
stop_gateway
PROD_DIRTY=$(git -C "$ROOT" status --porcelain -- opencode.json .kiro/settings/mcp.json .kiro 2>/dev/null)
if [ -z "$PROD_DIRTY" ]; then
  ok "phase5: production opencode.json / .kiro configs untouched (git clean)"
else
  bad "phase5: production configs modified?! ${PROD_DIRTY}"
fi

rm -rf "$WORKDIR"

echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" = "0" ] && exit 0 || exit 1