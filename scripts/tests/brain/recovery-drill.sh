#!/usr/bin/env bash
# BrainV2 T9 destructive recovery drill — disposable local harness ONLY.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS="$HERE/harness.sh"
CONTAINER="brainv2-neo4j-test"
VOLUME="brainv2_test_data"
IMAGE="neo4j:5.26-community"
WORKDIR="$(mktemp -d /tmp/brainv2-recovery.XXXXXX)"
BACKUP_DIR="$WORKDIR/backup"
mkdir "$BACKUP_DIR"
chmod 777 "$BACKUP_DIR" # container neo4j user writes synthetic dump here

cleanup() {
  "$HARNESS" down >/dev/null 2>&1 || true
  case "$WORKDIR" in /tmp/brainv2-recovery.*) rm -rf "$WORKDIR" ;; esac
}
trap cleanup EXIT INT TERM

refuse_nonlocal() {
  local context
  case "${OC_NEO4J_BOLT:-}${OC_BRAIN_NEO4J_URI:-}" in
    *100.99.119.124*) echo "REFUSED: production Bolt detected" >&2; exit 2 ;;
  esac
  context="$(docker context show 2>/dev/null || true)"
  case "$context" in
    default|desktop-linux) ;;
    *) echo "REFUSED: Docker context '$context' is not local" >&2; exit 2 ;;
  esac
  docker image inspect "$IMAGE" >/dev/null 2>&1 || {
    echo "INFRA_FAIL: local image $IMAGE missing; refusing network pull" >&2
    exit 42
  }
}

now() { python3 -c 'import time; print(time.monotonic())'; }
elapsed() { python3 - "$1" <<'PY'
import sys, time
print(f"{time.monotonic() - float(sys.argv[1]):.3f}")
PY
}
scalar() { "$HARNESS" cypher "$1" 2>/dev/null | tail -1 | tr -d '"'; }

snapshot() {
  local out="$1"
  mkdir "$out"
  "$HARNESS" cypher "MATCH (n) UNWIND keys(n) AS k WITH n,k ORDER BY coalesce(n.id,''), k RETURN coalesce(n.id,''), labels(n), k, n[k]" >"$out/nodes" || return 1
  "$HARNESS" cypher "MATCH (a)-[r]->(b) UNWIND CASE WHEN size(keys(r))=0 THEN [''] ELSE keys(r) END AS k WITH a,r,b,k ORDER BY coalesce(a.id,''), type(r), coalesce(b.id,''), k RETURN coalesce(a.id,''), type(r), coalesce(b.id,''), k, CASE WHEN k='' THEN '' ELSE r[k] END" >"$out/relationships" || return 1
  "$HARNESS" cypher "SHOW INDEXES YIELD name,type,entityType,labelsOrTypes,properties,owningConstraint RETURN name,type,entityType,labelsOrTypes,properties,owningConstraint ORDER BY name" >"$out/indexes" || return 1
  "$HARNESS" cypher "SHOW CONSTRAINTS YIELD name,type,entityType,labelsOrTypes,properties RETURN name,type,entityType,labelsOrTypes,properties ORDER BY name" >"$out/constraints" || return 1
  shasum -a 256 "$out/nodes" "$out/relationships" "$out/indexes" "$out/constraints" \
    | awk '{print $1}' | shasum -a 256 | awk '{print $1}' || return 1
}

counts() {
  local nodes relationships properties facts semantic coordination indexes constraints
  nodes="$(scalar 'MATCH (n) RETURN count(n)')" || return 1
  relationships="$(scalar 'MATCH ()-[r]->() RETURN count(r)')" || return 1
  properties="$(scalar 'MATCH (n) RETURN sum(size(keys(n)))')" || return 1
  facts="$(scalar 'MATCH (f:Fact) RETURN count(f)')" || return 1
  semantic="$(scalar 'MATCH (f:Fact) WHERE f.embedding IS NOT NULL RETURN count(f)')" || return 1
  coordination="$(scalar 'MATCH (f:Fact) WHERE f.ns IS NOT NULL RETURN count(f)')" || return 1
  indexes="$(scalar 'SHOW INDEXES YIELD name RETURN count(name)')" || return 1
  constraints="$(scalar 'SHOW CONSTRAINTS YIELD name RETURN count(name)')" || return 1
  printf 'nodes=%s relationships=%s properties=%s facts=%s semantic=%s coordination=%s indexes=%s constraints=%s' \
    "$nodes" "$relationships" "$properties" "$facts" "$semantic" \
    "$coordination" "$indexes" "$constraints"
}

refuse_nonlocal
echo "SCOPE: local disposable $CONTAINER ($IMAGE), volume $VOLUME"

"$HARNESS" down >/dev/null 2>&1 || true
"$HARNESS" up >/dev/null
"$HARNESS" apply >/dev/null
PRE_COUNTS="$(counts)"
PRE_HASH="$(snapshot "$WORKDIR/pre")"
echo "PRE: $PRE_COUNTS fingerprint=$PRE_HASH"
test "$(scalar 'MATCH (f:Fact) RETURN count(f)')" = "51"
test "$(scalar 'MATCH (f:Fact) WHERE f.embedding IS NOT NULL RETURN count(f)')" = "49"
test "$(scalar 'MATCH (f:Fact) WHERE f.ns IS NOT NULL RETURN count(f)')" = "2"

BACKUP_OUTAGE_START="$(now)"
docker stop "$CONTAINER" >/dev/null
DUMP_START="$(now)"
docker run --rm --volumes-from "$CONTAINER" -v "$BACKUP_DIR:/backup" \
  --entrypoint neo4j-admin "$IMAGE" database dump neo4j --to-path=/backup >/dev/null 2>&1
DUMP_SECONDS="$(elapsed "$DUMP_START")"
test -s "$BACKUP_DIR/neo4j.dump"
"$HARNESS" up >/dev/null
BACKUP_DOWNTIME_SECONDS="$(elapsed "$BACKUP_OUTAGE_START")"

# Simulate total data-volume loss. Dump survives in separate host temp storage.
RESTORE_START="$(now)"
"$HARNESS" down >/dev/null
test -z "$(docker volume ls --filter "name=^${VOLUME}$" --format '{{.Name}}')"
"$HARNESS" up >/dev/null
docker stop "$CONTAINER" >/dev/null
LOAD_START="$(now)"
docker run --rm --volumes-from "$CONTAINER" -v "$BACKUP_DIR:/backup:ro" \
  --entrypoint neo4j-admin "$IMAGE" database load neo4j --from-path=/backup \
  --overwrite-destination=true >/dev/null 2>&1
LOAD_SECONDS="$(elapsed "$LOAD_START")"
"$HARNESS" up >/dev/null
RESTORE_SECONDS="$(elapsed "$RESTORE_START")"

POST_COUNTS="$(counts)"
POST_HASH="$(snapshot "$WORKDIR/post")"
echo "POST: $POST_COUNTS fingerprint=$POST_HASH"

if [ "$POST_COUNTS" != "$PRE_COUNTS" ] || [ "$POST_HASH" != "$PRE_HASH" ]; then
  echo "PRE components:" >&2
  shasum -a 256 "$WORKDIR"/pre/* >&2
  echo "POST components:" >&2
  shasum -a 256 "$WORKDIR"/post/* >&2
  echo "FAIL: restored fingerprint differs" >&2
  exit 1
fi

echo "MEASURED: dump_seconds=$DUMP_SECONDS"
echo "MEASURED: backup_downtime_seconds=$BACKUP_DOWNTIME_SECONDS"
echo "MEASURED: load_seconds=$LOAD_SECONDS"
echo "MEASURED: restore_seconds=$RESTORE_SECONDS"
echo "MEASURED: restored_data_loss=0 fingerprint_match=true"
echo "PASS: disposable harness dump/load restored identical data and schema"
