#!/usr/bin/env bash
# BrainV2 disposable synthetic harness control.
# Operates ONLY on the isolated local Docker Desktop container brainv2-neo4j-test.
# Never contacts the Windows production Bolt (100.99.119.124) and never mounts
# production volumes or the production dump.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$HERE/docker-compose.brain-test.yml"
PROJECT="brainv2-test"                 # unique compose project name
CONTAINER="brainv2-neo4j-test"
BOLT_LOCAL="bolt://127.0.0.1:7688"     # HOST-side localhost-only test port
BOLT_INCONTAINER="bolt://localhost:7687" # in-container Bolt (docker exec target)
TEST_PW="${BRAINV2_TEST_PW:-brainv2testpw}"
TEST_USER="neo4j"

# Hard safety: refuse if anyone points this at the production host.
if printf '%s' "${OC_NEO4J_BOLT:-}" | grep -q "100.99.119.124"; then
  echo "REFUSED: production Bolt in env; harness must stay isolated" >&2; exit 2
fi

require_local_context() {
  local ctx; ctx="$(docker context show 2>/dev/null || echo unknown)"
  case "$ctx" in
    desktop-linux|default) : ;;
    *) echo "REFUSED: docker context '$ctx' is not local Docker Desktop" >&2; exit 2;;
  esac
}
INFRA_FAIL=42   # distinct exit code: infrastructure unavailable, NOT an assertion failure

# infra preflight: fail LOUD and DISTINCT (exit 42) if Docker or the harness DB
# is unreachable, so callers never misread an empty result as a data assertion.
cmd_preflight() {
  if ! docker ps >/dev/null 2>&1; then
    echo "INFRA_FAIL: Docker daemon unreachable (harness cannot run)" >&2; exit $INFRA_FAIL
  fi
  if ! docker ps --filter "name=$CONTAINER" --format '{{.Names}}' | grep -q "$CONTAINER"; then
    echo "INFRA_FAIL: harness container $CONTAINER not running" >&2; exit $INFRA_FAIL
  fi
  if ! docker exec -e NEO4J_USERNAME="$TEST_USER" -e NEO4J_PASSWORD="$TEST_PW" \
      "$CONTAINER" cypher-shell -a "$BOLT_INCONTAINER" "RETURN 1" >/dev/null 2>&1; then
    echo "INFRA_FAIL: harness Neo4j not accepting Bolt" >&2; exit $INFRA_FAIL
  fi
  echo "PREFLIGHT_OK"
}

# run cypher INSIDE the isolated container (no host cypher-shell dependency,
# credentials never on host process args of a production client).
cy() {
  docker exec -i -e NEO4J_USERNAME="$TEST_USER" -e NEO4J_PASSWORD="$TEST_PW" \
    "$CONTAINER" cypher-shell -a "$BOLT_INCONTAINER" --format plain "$1"
}

cmd_up() {
  require_local_context
  docker compose -p "$PROJECT" -f "$COMPOSE_FILE" up -d
  echo -n "[harness] waiting for Neo4j to accept Bolt"
  for _ in $(seq 1 60); do
    if docker exec -e NEO4J_USERNAME="$TEST_USER" -e NEO4J_PASSWORD="$TEST_PW" \
        "$CONTAINER" cypher-shell -a "$BOLT_INCONTAINER" "RETURN 1" >/dev/null 2>&1; then
      echo " OK"; return 0
    fi
    echo -n "."; sleep 2
  done
  echo " TIMEOUT"; return 1
}

cmd_apply() {
  echo "[harness] applying schema snapshot"
  cy "$(cat "$HERE/schema-snapshot.cypher")" >/dev/null
  echo "[harness] seeding synthetic data"
  cy "$(cat "$HERE/seed-synthetic.cypher")" >/dev/null
  echo "[harness] applied"
}

cmd_verify() {
  echo "== indexes ==";     cy "SHOW INDEXES YIELD name RETURN count(*) AS idx"
  echo "== constraints =="; cy "SHOW CONSTRAINTS YIELD name RETURN count(*) AS con"
  echo "== fact split =="
  cy "MATCH (f:Fact) RETURN (f.embedding IS NOT NULL) AS emb, (f.ns IS NOT NULL) AS coord, count(*) AS cnt"
}

cmd_cypher() { cy "$1"; }

cmd_down() {
  require_local_context
  docker compose -p "$PROJECT" -f "$COMPOSE_FILE" down -v   # -v wipes the test volume
  echo "[harness] down + test volume removed"
}

cmd_status() {
  docker ps -a --filter "name=$CONTAINER" --format '{{.Names}} :: {{.State}} :: {{.Status}}'
  docker volume ls --filter "name=brainv2_test_data" --format '{{.Name}}'
}

case "${1:-}" in
  up) cmd_up;;
  preflight) cmd_preflight;;
  apply) cmd_apply;;
  verify) cmd_verify;;
  cypher) shift; cmd_cypher "$1";;
  down) cmd_down;;
  status) cmd_status;;
  *) echo "usage: harness.sh up|preflight|apply|verify|cypher <q>|status|down" >&2; exit 64;;
esac
