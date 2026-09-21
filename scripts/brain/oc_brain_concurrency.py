#!/usr/bin/env python3
"""BrainV2 T4+T5 concurrency primitives (idempotency, claims, CAS).

Single-host dispatcher authority for BrainV2. Everything here operates on a
DISPOSABLE Neo4j harness (``bolt://127.0.0.1:7688`` by default) and must never
be pointed at production (``100.99.119.124``) — callers are responsible for
guarding that (see the ``oc_brain`` harness supervisor and the sibling
``harness.sh`` preflight).

Three DB-backed primitives, all fail-closed:

``IdempotentWrite`` (T4)
    Operation-ID idempotency + payload-conflict detection. A client-generated
    ``op_id`` (UUID, reused on retry) is the identity key; the canonical payload
    SHA-256 is tracked SEPARATELY (never used as the identifier). One write
    transaction::

        MERGE (o:Operation {op_id}) ON CREATE SET payload_sha256 …
        + guard: write the payload *once* iff the Operation row was created by
        this attempt (WROTE edge absent), store ``result`` in the same tx.

    Outcomes: ``created`` (fresh committed write), ``replayed`` (existing op,
    identical payload → the *stored* result is returned byte-for-byte, no
    duplicate side effect) or ``conflict`` (existing op, different payload →
    refused, nothing touched). A unique constraint on ``Operation.op_id`` makes
    concurrent first-writers serialize; losers retry with bounded jittered
    backoff and then converge to ``replayed``/``conflict``.

``TaskClaimer`` (T5b)
    Dispatcher task claims. Uniqueness constraint on ``TaskClaim.task_id``; the
    atomic claim is a single ``MERGE … ON CREATE`` statement in one write tx, so
    only the ON-CREATE writer wins. ``claim()`` reports who won; ownership is
    re-verified before any privileged write (the privileged write itself carries
    ``WHERE c.claimed_by = $owner``).

``CasCounter`` (T5c)
    Safe version transitions. Each attempt is an explicit write transaction:
    ``MATCH (n:Counter {name}) WHERE n.version = $expected SET …``. A lost CAS
    returns no row and the writer retries against a freshly-read version with
    bounded jittered backoff until it lands. Never relies on MERGE/MATCH-WHERE
    alone: the loop reads the current version, compares, and on mismatch retries.

Run either library-style (import) or as a CLI for supervisor tests::

    python3 oc_brain_concurrency.py ensure-schema
    python3 oc_brain_concurrency.py write-once --op <op_id> --subject s --predicate p --object o [--payload-sha sha] [--result json] [--max-char N]
    python3 oc_brain_concurrency.py claim <task_id> <owner>
    python3 oc_brain_concurrency.py reclaim <task_id> <expected_owner> <new_owner>
    python3 oc_brain_concurrency.py complete <task_id> <owner>
    python3 oc_brain_concurrency.py cas <counter_name> <writer> [--increments N]
    python3 oc_brain_concurrency.py counter <counter_name>

Environment (harness defaults):

  * ``OC_BRAIN_NEO4J_URI`` (``bolt://127.0.0.1:7688``)
  * ``OC_BRAIN_NEO4J_USER`` (``neo4j``)
  * ``OC_BRAIN_NEO4J_DATABASE`` (``neo4j``)
  * ``OC_BRAIN_NEO4J_PASSWORD`` (test credential; supervisor-held)
"""

from __future__ import annotations

import hashlib
import json
import os
import random
import sys
import time
import uuid
from typing import Any, Callable, Protocol

DEFAULT_URI = os.environ.get("OC_BRAIN_NEO4J_URI", "bolt://127.0.0.1:7688")
DEFAULT_USER = os.environ.get("OC_BRAIN_NEO4J_USER", "neo4j")
DEFAULT_DATABASE = os.environ.get("OC_BRAIN_NEO4J_DATABASE", "neo4j")

# T4 write-once retry policy: bounded + jittered (not naive fixed sleeps).
MAX_WRITE_ONCE_ATTEMPTS = 8
MAX_CAS_ATTEMPTS = 16
BASE_BACKOFF_MS = 20.0

# ── Allowlisted query constants (never interpolated client-side) ─────────
# T4: ONE write transaction = op ledger MERGE + guarded payload write + result.
# Correctness does NOT rely on MERGE alone: without the FOREACH guard (fires
# only for the ON-CREATE attempt, detected by a per-attempt token) a replay
# would mint a duplicate Fact; without the constraint concurrent first-writers
# would both commit. The proof assertions in idempotency.test.sh verify that the
# combined gate yields exactly one Operation and one Fact per op_id.
#
# NOTE: the guard must never be an empty CALL subquery — on Neo4j an inner
# subquery that yields no rows aborts the outer row (filter semantics), which
# would swallow the replayed/conflict RETURN. FOREACH + CASE keeps the statement
# filter-free so every attempt gets exactly one result row.
WRITE_ONCE_QUERY = """
MERGE (o:Operation {op_id: $op_id})
ON CREATE SET o.payload_sha256 = $payload_sha256,
              o.created_at = datetime(),
              o.attempt_token = $attempt_token,
              o.result = $result_json
WITH o,
     o.attempt_token AS attempt_token,
     o.payload_sha256 AS stored_sha,
     o.result AS stored_result
FOREACH (fresh IN CASE WHEN attempt_token = $attempt_token THEN [1] ELSE [] END |
  CREATE (o)-[:WROTE]->(f:Fact {
    id: $fact_id,
    subject: $subject,
    predicate: $predicate,
    object: $object_value,
    confidence: $confidence,
    metadata: $metadata_json,
    op_id: $op_id,
    payload_sha256: $payload_sha256,
    created_at: datetime()
  })
)
RETURN stored_sha AS payload_sha256,
       stored_result AS result,
       attempt_token AS attempt_token
"""

# T5: single-statement atomic claim. Only the ON-CREATE writer wins.
CLAIM_QUERY = """
MERGE (c:TaskClaim {task_id: $task_id})
ON CREATE SET c.claimed_by = $owner,
              c.status = 'active',
              c.claimed_at = datetime(),
              c.attempt_token = $attempt_token
RETURN c.claimed_by AS claimed_by,
       c.status AS status,
       c.attempt_token AS attempt_token,
       c.claimed_at AS claimed_at
"""

CLAIM_STATUS_QUERY = """
MATCH (c:TaskClaim {task_id: $task_id})
RETURN c.claimed_by AS claimed_by, c.status AS status
"""

# T5: ownership re-verify + privileged write in the SAME statement. A stale or
# non-owner caller matches nothing and is denied (fail-closed, no side effect).
COMPLETE_QUERY = """
MATCH (c:TaskClaim {task_id: $task_id})
WHERE c.claimed_by = $owner
SET c.status = 'done', c.completed_at = datetime()
RETURN c.status AS status
"""

# Crash recovery under the single-dispatcher authority boundary. Replacement
# is explicit compare-and-set on the prior owner and active status, inside the
# same privileged transaction; a stale recovery request matches nothing.
RECLAIM_QUERY = """
MATCH (c:TaskClaim {task_id: $task_id})
WHERE c.claimed_by = $expected_owner AND c.status = 'active'
SET c.claimed_by = $new_owner,
    c.claimed_at = datetime(),
    c.recovered_from = $expected_owner,
    c.attempt_token = $attempt_token
RETURN c.claimed_by AS claimed_by, c.status AS status
"""

COUNTER_READ_QUERY = """
MATCH (n:Counter {name: $name})
RETURN n.version AS version
"""

COUNTER_INIT_QUERY = """
MERGE (n:Counter {name: $name})
ON CREATE SET n.version = 0
"""

# T5c: the compare-and-set write. Every attempt is its own write transaction;
# a lost CAS returns zero rows so the caller must retry.
#
# WHY the lock node matters (do NOT rely on MATCH-WHERE-SET alone): on Neo4j
# 5.x a bare ``MATCH (n) WHERE n.version = $expected SET …`` is evaluated at
# read time and can LOSE an update under concurrent writers — two writers can
# both satisfy the predicate against the same stale version and both "succeed"
# (observed: 24 increments reporting success, final version 23). We therefore
# gate every CAS behind ``MERGE (lk:CounterLock {name}) SET …``: the MERGE+SET
# takes an EXCLUSIVE write lock on the single lock node held until commit, so
# at most one writer is inside its CAS phase at any time. The WHERE-compare then
# sees an unfettered version and every increment lands exactly once. Writers
# that lose the lock retry with bounded jittered backoff and converge.
COUNTER_LOCKED_CAS_QUERY = """
MERGE (lk:CounterLock {name: $name})
SET lk.touched_at = datetime()
WITH lk, $expected AS expected_version, $writer AS writer
MATCH (n:Counter {name: $name})
WHERE n.version = expected_version
SET n.version = n.version + 1,
    n.last_writer = writer,
    n.updated_at = datetime()
RETURN n.version AS version
"""

# ── Schema (fail-closed: uniqueness is part of the gate) ─────────────────
# Counter.name / CounterLock.name uniqueness is not cosmetic: without a
# constraint, concurrent MERGE can mint duplicate nodes (observed in the
# harness), which would silently break both the counter and the lock point.
# fact_id / fact_op_id (F7) make the T4 fact write SELF-CONTAINED idempotent:
# the write path no longer leans on an external fact identity constraint in
# another schema file — the concurrency schema owns it and the preflight gate
# below verifies it.
SCHEMA_STATEMENTS = [
    "CREATE CONSTRAINT operation_op_id IF NOT EXISTS "
    "FOR (n:Operation) REQUIRE n.op_id IS UNIQUE",
    "CREATE CONSTRAINT task_claim_task_id IF NOT EXISTS "
    "FOR (n:TaskClaim) REQUIRE n.task_id IS UNIQUE",
    "CREATE CONSTRAINT counter_name IF NOT EXISTS "
    "FOR (n:Counter) REQUIRE n.name IS UNIQUE",
    "CREATE CONSTRAINT counter_lock_name IF NOT EXISTS "
    "FOR (n:CounterLock) REQUIRE n.name IS UNIQUE",
    "CREATE CONSTRAINT fact_id IF NOT EXISTS "
    "FOR (n:Fact) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT fact_op_id IF NOT EXISTS "
    "FOR (n:Fact) REQUIRE n.op_id IS UNIQUE",
]

# ── Fail-closed schema gate (F8) ─────────────────────────────────────────
# A write primitive must SELF-VERIFY that the uniqueness constraints it
# depends on actually exist before writing. A misconfigured DB that lost or
# never received its constraints must be REFUSED, never allowed to silently
# duplicate rows. The gate is a cheap read (SHOW CONSTRAINTS) run once per
# call, before the write retry loop.
CONSTRAINT_NAMES_QUERY = """
SHOW CONSTRAINTS YIELD name, type, entityType, labelsOrTypes, properties
RETURN name AS name,
       type AS type,
       entityType AS entity_type,
       labelsOrTypes AS labels_or_types,
       properties AS properties
"""

# Constraints each primitive depends on (subset of SCHEMA_STATEMENTS / the
# harness concurrency-schema.cypher file).
REQUIRED_WRITE_ONCE_CONSTRAINTS = {"operation_op_id", "fact_id", "fact_op_id"}
REQUIRED_CLAIM_CONSTRAINTS = {"task_claim_task_id"}
REQUIRED_CAS_CONSTRAINTS = {"counter_name", "counter_lock_name"}
REQUIRED_CONSTRAINT_SIGNATURES = {
    "operation_op_id": ("UNIQUENESS", "NODE", ("Operation",), ("op_id",)),
    "task_claim_task_id": ("UNIQUENESS", "NODE", ("TaskClaim",), ("task_id",)),
    "counter_name": ("UNIQUENESS", "NODE", ("Counter",), ("name",)),
    "counter_lock_name": ("UNIQUENESS", "NODE", ("CounterLock",), ("name",)),
    "fact_id": ("UNIQUENESS", "NODE", ("Fact",), ("id",)),
    "fact_op_id": ("UNIQUENESS", "NODE", ("Fact",), ("op_id",)),
}


class ConstraintGateError(RuntimeError):
    """Fail-closed: a required uniqueness constraint is absent."""


def constraint_signatures(
    ops: Ops,
) -> dict[str, tuple[str, str, tuple[str, ...], tuple[str, ...]]]:
    signatures = {}
    for row in ops.execute_read(CONSTRAINT_NAMES_QUERY, {}):
        signatures[str(row.get("name"))] = (
            str(row.get("type")),
            str(row.get("entity_type")),
            tuple(row.get("labels_or_types") or ()),
            tuple(row.get("properties") or ()),
        )
    return signatures


def require_constraints(ops: Ops, required: set[str], *, purpose: str) -> None:
    actual = constraint_signatures(ops)
    missing = required - actual.keys()
    invalid = {
        name
        for name in required - missing
        if actual[name] != REQUIRED_CONSTRAINT_SIGNATURES[name]
    }
    if missing or invalid:
        raise ConstraintGateError(
            f"{purpose}: required uniqueness constraint(s) missing or invalid: "
            f"missing={sorted(missing)} invalid={sorted(invalid)}; refusing to "
            "write (fail-closed). Install the "
            "concurrency schema first (ensure-schema / harness "
            "ensure-concurrency-schema)."
        )


class Ops(Protocol):
    """Thin write/read surface the primitives run on.

    Both a raw ``neo4j`` driver and the Agent Memory SDK's internal Bolt client
    implement it, so the gates run identically inside the oc-brain gateway and
    under supervisor-concurrency tests.
    """

    def execute_write(self, query: str, parameters: dict[str, Any]) -> list[dict[str, Any]]: ...

    def execute_read(self, query: str, parameters: dict[str, Any]) -> list[dict[str, Any]]: ...

    def close(self) -> None: ...


class DriverOps:
    """Adapter over a raw ``neo4j.GraphDatabase.driver`` (supervisor/tests).

    Every ``execute_write`` is routed through the driver's managed write
    transaction unit (explicit WriteTransaction) rather than a bare session
    call, matching the "explicit write tx" T5 requirement.
    """

    def __init__(self, driver: Any) -> None:
        self._driver = driver

    @classmethod
    def connect(
        cls,
        uri: str = DEFAULT_URI,
        user: str = DEFAULT_USER,
        password: str | None = None,
        database: str = DEFAULT_DATABASE,
    ) -> "DriverOps":
        from neo4j import GraphDatabase

        if not password:
            raise RuntimeError("DriverOps.connect requires a password")
        driver = GraphDatabase.driver(uri, auth=(user, password))
        return cls(driver).for_database(database)

    def for_database(self, database: str) -> "DriverOps":
        self._database = database
        return self

    def execute_write(self, query: str, parameters: dict[str, Any]) -> list[dict[str, Any]]:
        with self._driver.session(database=self._database) as session:

            def _work(tx: Any) -> list[dict[str, Any]]:
                return [dict(r) for r in tx.run(query, parameters)]

            return session.execute_write(_work)

    def execute_read(self, query: str, parameters: dict[str, Any]) -> list[dict[str, Any]]:
        with self._driver.session(database=self._database) as session:
            return [dict(r) for r in session.run(query, parameters)]

    def close(self) -> None:
        self._driver.close()


class SdkOps:
    """Adapter over an Agent Memory SDK-style graph client.

    Keep for SDK editions whose graph client exposes SYNCHRONOUS
    ``execute_write``/``execute_read``. The current ``neo4j-agent-memory``
    client is ASYNC, so the oc-brain gateway opens its own synchronous
    ``DriverOps`` driver (same credentials) instead of reusing the SDK pool —
    the async methods cannot feed the sync gate functions directly.
    """

    def __init__(self, sdk_graph_client: Any) -> None:
        self._client = sdk_graph_client

    def execute_write(self, query: str, parameters: dict[str, Any]) -> list[dict[str, Any]]:
        return self._client.execute_write(query, parameters)

    def execute_read(self, query: str, parameters: dict[str, Any]) -> list[dict[str, Any]]:
        return self._client.execute_read(query, parameters)

    def close(self) -> None:
        self._client = None


# ── T4 helpers ──────────────────────────────────────────────────────────
def payload_sha256(payload: dict[str, Any]) -> str:
    """Canonical SHA-256 of an intended write payload.

    The hash is a SEPARATE integrity binding, never the identity: the op_id is.
    Canonicalization keeps retries hash-stable regardless of key order/space.
    """
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _is_constraint_lost_race(exc: BaseException) -> bool:
    message = str(exc)
    return "ConstraintValidationFailed" in message or (
        "op_id" in message and "already exists" in message
    ) or "already exists" in message.lower()


def write_once(
    ops: Ops,
    *,
    op_id: str,
    payload_sha256: str,
    fact_fields: dict[str, Any],
    result_json: str,
    max_attempts: int = MAX_WRITE_ONCE_ATTEMPTS,
    base_backoff_ms: float = BASE_BACKOFF_MS,
) -> dict[str, Any]:
    """Run one idempotent write attempt, converging to a committed outcome.

    Returns ``{"status": "created" | "replayed" | "conflict", "result": <str>,
    "attempts": int, "committed_payload_sha256": str}``. ``result`` is the
    STORED result string: on replay/conflict it is the previously committed
    result, byte-identical to what the first successful call returned.

    Fail-closed (F8): before any write, self-verifies that the
    ``operation_op_id`` / ``fact_id`` / ``fact_op_id`` uniqueness constraints
    exist; if any is missing it raises ``ConstraintGateError`` and writes
    nothing.
    """
    require_constraints(
        ops, REQUIRED_WRITE_ONCE_CONSTRAINTS, purpose="write_once"
    )
    for attempt in range(1, max_attempts + 1):
        params: dict[str, Any] = {
            "op_id": op_id,
            "payload_sha256": payload_sha256,
            "attempt_token": uuid.uuid4().hex,
            **fact_fields,
            "result_json": result_json,
        }
        try:
            rows = ops.execute_write(WRITE_ONCE_QUERY, params)
        except BaseException as exc:  # noqa: BLE001 - converge on constraint race
            if not (_is_constraint_lost_race(exc) or "opfailed" in str(exc).lower()):
                raise
            _backoff(attempt, base_backoff_ms)
            continue
        row = rows[0] if rows else {}
        committed_sha = row.get("payload_sha256") or ""
        result = row.get("result")
        if row.get("attempt_token") == params["attempt_token"]:
            # token matches our random attempt -> the ON CREATE fired and the
            # FOREACH guard wrote the payload once in this transaction.
            return {
                "status": "created",
                "result": result,
                "attempts": attempt,
                "committed_payload_sha256": committed_sha,
            }
        if committed_sha == payload_sha256:
            return {
                "status": "replayed",
                "result": result,
                "attempts": attempt,
                "committed_payload_sha256": committed_sha,
            }
        return {
            "status": "conflict",
            "result": result,
            "attempts": attempt,
            "committed_payload_sha256": committed_sha,
        }
    raise RuntimeError(
        f"write_once: gave up after {max_attempts} attempts on op_id={op_id}"
    )


def _backoff(attempt: int, base_backoff_ms: float) -> None:
    # bounded, jittered: (attempt * base) scaled by U[0.5, 1.5], capped 2s
    delay_ms = min((attempt * base_backoff_ms) * random.uniform(0.5, 1.5), 2000.0)
    time.sleep(delay_ms / 1000.0)


# ── T5 helpers ──────────────────────────────────────────────────────────
def claim_task(
    ops: Ops,
    *,
    task_id: str,
    owner: str,
    max_attempts: int = MAX_WRITE_ONCE_ATTEMPTS,
    base_backoff_ms: float = BASE_BACKOFF_MS,
) -> dict[str, Any]:
    """Atomically claim a task. Only the single ON-CREATE writer wins.

    Returns ``{"status": "claimed" | "reaffirmed" | "taken_by", "owner": <str>}``.
    ``claimed`` means this attempt's ON CREATE wrote the row; ``reaffirmed``
    means the row already belonged to this same owner (idempotent re-claim);
    ``taken_by`` means a different dispatcher holds it and no write happened.

    Fail-closed (F8): before any write, self-verifies that the
    ``task_claim_task_id`` uniqueness constraint exists; if missing it raises
    ``ConstraintGateError`` and writes nothing.
    """
    attempt_token = uuid.uuid4().hex
    require_constraints(ops, REQUIRED_CLAIM_CONSTRAINTS, purpose="claim_task")
    for attempt in range(1, max_attempts + 1):
        params = {
            "task_id": task_id,
            "owner": owner,
            "attempt_token": attempt_token,
        }
        try:
            rows = ops.execute_write(CLAIM_QUERY, params)
        except BaseException as exc:  # noqa: BLE001 - concurrent ON CREATE loser
            if not _is_constraint_lost_race(exc):
                raise
            _backoff(attempt, base_backoff_ms)
            continue
        row = rows[0] if rows else {}
        token = row.get("attempt_token")
        current_owner = row.get("claimed_by") or ""
        if token == attempt_token:
            return {"status": "claimed", "owner": current_owner}
        if current_owner == owner:
            return {"status": "reaffirmed", "owner": current_owner}
        return {"status": "taken_by", "owner": current_owner}
    raise RuntimeError(f"claim_task: gave up after {max_attempts} attempts on {task_id}")


def complete_task(ops: Ops, *, task_id: str, owner: str) -> dict[str, Any]:
    """Privileged write whose grant is re-verified inline (WHERE claimed_by).

    A non-owner or stale caller matches nothing -> ``denied`` with no effect.
    """
    require_constraints(ops, REQUIRED_CLAIM_CONSTRAINTS, purpose="complete_task")
    rows = ops.execute_write(
        COMPLETE_QUERY, {"task_id": task_id, "owner": owner}
    )
    if rows:
        return {"owner": owner, "status": rows[0].get("status") or "done"}
    return {"owner": owner, "status": "denied"}


def reclaim_task(
    ops: Ops, *, task_id: str, expected_owner: str, new_owner: str
) -> dict[str, Any]:
    """Reclaim an active crashed-worker claim with inline owner CAS.

    Single-host dispatcher flock is the authority to decide that recovery is
    warranted. This DB transaction then proves the claim still belongs to the
    expected crashed owner before replacing it; stale/wrong requests are denied.
    """
    require_constraints(ops, REQUIRED_CLAIM_CONSTRAINTS, purpose="reclaim_task")
    rows = ops.execute_write(
        RECLAIM_QUERY,
        {
            "task_id": task_id,
            "expected_owner": expected_owner,
            "new_owner": new_owner,
            "attempt_token": uuid.uuid4().hex,
        },
    )
    if rows:
        return {"owner": rows[0].get("claimed_by") or new_owner, "status": "reclaimed"}
    return {"owner": new_owner, "status": "denied"}


def claim_status(ops: Ops, *, task_id: str) -> dict[str, Any]:
    rows = ops.execute_read(CLAIM_STATUS_QUERY, {"task_id": task_id})
    if not rows:
        return {"task_id": task_id, "status": "unclaimed"}
    return {"task_id": task_id, "owner": rows[0].get("claimed_by"), "status": rows[0].get("status")}


def cas_increment(
    ops: Ops,
    *,
    name: str,
    writer: str,
    max_attempts: int = MAX_CAS_ATTEMPTS,
    base_backoff_ms: float = BASE_BACKOFF_MS,
) -> dict[str, Any]:
    """Compare-and-set increment of a versioned counter.

    Reads the current version, then CASes ``version = version + 1`` inside a
    write transaction that first takes the exclusive ``CounterLock`` node lock
    (serializing writers), and on a lost compare or lock loss retries against a
    fresh version with bounded jittered backoff. Every increment lands exactly
    once: M concurrent writers on one counter always end at version == M.

    Returns ``{"version", "writer", "attempts"}``.
    """
    require_constraints(ops, REQUIRED_CAS_CONSTRAINTS, purpose="cas_increment")
    for attempt in range(1, max_attempts + 1):
        read = ops.execute_read(COUNTER_READ_QUERY, {"name": name})
        if read:
            expected = read[0]["version"]
        else:
            ops.execute_write(COUNTER_INIT_QUERY, {"name": name})
            verify = ops.execute_read(COUNTER_READ_QUERY, {"name": name})
            expected = verify[0]["version"] if verify else 0
        rows = ops.execute_write(
            COUNTER_LOCKED_CAS_QUERY,
            {"name": name, "expected": expected, "writer": writer},
        )
        if rows:
            return {"version": rows[0]["version"], "writer": writer, "attempts": attempt}
        _backoff(attempt, base_backoff_ms)
    raise RuntimeError(f"cas_increment: gave up after {max_attempts} attempts on {name}")


def counter_read(ops: Ops, *, name: str) -> int:
    rows = ops.execute_read(COUNTER_READ_QUERY, {"name": name})
    return rows[0]["version"] if rows else 0


# ── Schema + CLI ────────────────────────────────────────────────────────
def ensure_constraints(ops: Ops) -> None:
    for statement in SCHEMA_STATEMENTS:
        ops.execute_write(statement, {})
    # F8: never report SCHEMA_OK unless every concurrency constraint actually
    # persisted. A constraint creation error or a DB that refuses to create
    # them is a SETUP failure, surfaced loudly here rather than as a confusing
    # later duplicate.
    require_constraints(
        ops,
        REQUIRED_WRITE_ONCE_CONSTRAINTS
        | REQUIRED_CLAIM_CONSTRAINTS
        | REQUIRED_CAS_CONSTRAINTS,
        purpose="ensure-schema",
    )


def _from_env() -> DriverOps:
    password = os.environ.get(
        "OC_BRAIN_NEO4J_PASSWORD",
        os.environ.get("NEO4J_PASSWORD", ""),
    )
    agent = sys.argv[0]
    ops = DriverOps.connect(
        uri=os.environ.get("OC_BRAIN_NEO4J_URI", DEFAULT_URI),
        user=os.environ.get("OC_BRAIN_NEO4J_USER", DEFAULT_USER),
        password=password,
        database=os.environ.get("OC_BRAIN_NEO4J_DATABASE", DEFAULT_DATABASE),
    )
    _ = agent
    return ops


def _main(argv: list[str]) -> int:
    # Fail-closed CLI: a missing constraint (F8) is reported as a structured
    # JSON error with exit 3, never as a silent data duplication or crash.
    try:
        return _run(argv)
    except ConstraintGateError as exc:
        print(json.dumps({"error": "CONSTRAINT_GATE", "detail": str(exc)}, default=str))
        return 3


def _run(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    cmd, rest = argv[0], argv[1:]
    ops = _from_env()
    if cmd == "ensure-schema":
        ensure_constraints(ops)
        print("SCHEMA_OK")
        return 0
    if cmd == "write-once":
        import argparse

        p = argparse.ArgumentParser(prog="write-once")
        p.add_argument("--op", required=True)
        p.add_argument("--subject", required=True)
        p.add_argument("--predicate", required=True)
        p.add_argument("--object", required=True)
        p.add_argument("--payload-json", default=None, help="canonical payload json (overrides subject/predicate/object for the sha)")
        p.add_argument("--result", default="{}")
        p.add_argument("--confidence", type=float, default=1.0)
        a = p.parse_args(rest)
        if a.payload_json:
            payload = json.loads(a.payload_json)
            sha = payload_sha256(payload)
        else:
            payload = {
                "subject": a.subject,
                "predicate": a.predicate,
                "object_value": a.object,
            }
            sha = payload_sha256(payload)
        fact_id = f"op-{a.op}"
        result_json = a.result or json.dumps(
            {"stored": True, "type": "fact", "id": fact_id, "op_id": a.op, "replayed": False},
            default=str,
        )
        out = write_once(
            ops,
            op_id=a.op,
            payload_sha256=sha,
            fact_fields={
                "fact_id": fact_id,
                "subject": payload.get("subject"),
                "predicate": payload.get("predicate"),
                "object_value": payload.get("object_value", payload.get("object")),
                "confidence": a.confidence,
                "metadata_json": json.dumps({"harness": "idempotency-test"}, default=str),
            },
            result_json=result_json,
        )
        print(json.dumps(out, default=str))
        return 0
    if cmd == "claim":
        task_id, owner = rest[0], rest[1]
        print(json.dumps(claim_task(ops, task_id=task_id, owner=owner)))
        return 0
    if cmd == "complete":
        task_id, owner = rest[0], rest[1]
        print(json.dumps(complete_task(ops, task_id=task_id, owner=owner)))
        return 0
    if cmd == "reclaim":
        task_id, expected_owner, new_owner = rest[0], rest[1], rest[2]
        print(
            json.dumps(
                reclaim_task(
                    ops,
                    task_id=task_id,
                    expected_owner=expected_owner,
                    new_owner=new_owner,
                )
            )
        )
        return 0
    if cmd == "cas":
        name, writer = rest[0], rest[1]
        increments = 1
        if "--increments" in rest:
            increments = int(rest[rest.index("--increments") + 1])
        results = []
        for _ in range(increments):
            results.append(cas_increment(ops, name=name, writer=writer))
        print(json.dumps({"writer": writer, "results": results, "total": increments}, default=str))
        return 0
    if cmd == "counter":
        print(json.dumps({"name": rest[0], "version": counter_read(ops, name=rest[0])}))
        return 0
    print(f"unknown command: {cmd}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(_main(sys.argv[1:]))
