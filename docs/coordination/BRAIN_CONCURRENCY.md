# BrainV2 T4 + T5 — Idempotency and Concurrency Authority

Status: ACTIVE (worker/brainv2-t4t5-idempotency-concurrency)

Scope: the deterministic BrainV2 backend owns canonical world state and every
dispatch authority decision. This document specifies the three DB-backed
primitives installed for T4 (operation-ID idempotency + payload-conflict
detection) and T5 (single-host dispatch lock, atomic task claims, safe CAS
version transitions). They live ONLY on the disposable Neo4j harness
(`bolt://127.0.0.1:7688`, container `brainv2-neo4j-test`). Production Bolt
(`100.99.119.124`) is never touched; the harness supervisor (`harness.sh`)
refuses any env that points at it.

## Non-negotiable invariants

1. **No MERGE/MATCH-WHERE-SET alone is a correctness gate.** All three
   primitives combine a uniqueness constraint AND a single-guarded write
   transaction. Two failure modes are proven in the harness and must never
   regress:
   - bare `MATCH (n) WHERE n.version = expected SET …` **loses updates** under
     concurrency (observed: 24 reported increments, final version 23);
   - bare `MERGE (n:Counter {name})` **mints duplicate nodes** when a
     uniqueness constraint is absent (observed: 8 Counter + 8 CounterLock
     nodes for one name and an unwound version).
2. **Fail-closed.** If the gate cannot be proven, nothing is written and the
   caller is told it lost/conflicted. There is no optimistic side channel and
   no legacy filesystem-only fallback lock inside the concurrency module.
3. **Identity ≠ content.** For T4 the `op_id` is the identity; the payload
   SHA-256 is a separate integrity binding, never the key.
4. **Ownership is re-verified inside the privileged write.** A stale or
   non-owner caller matches nothing and is denied with no side effect.

## T4 — Idempotent write (op_id)

### Write path (single write transaction)

```
MERGE (o:Operation {op_id: $op_id})
  ON CREATE SET o.payload_sha256, o.created_at, o.attempt_token, o.result
FOREACH (fresh IN CASE WHEN o.attempt_token = $attempt_token THEN [1] ELSE [] END |
  CREATE (o)-[:WROTE]->(f:Fact {…, op_id, payload_sha256}))
RETURN stored payload_sha256, stored result, attempt_token
```

- The `FOREACH + CASE` guard fires the payload write exactly once, **only for
  the attempt whose `attempt_token` created the Operation row**. A replay sees
  a different token and writes nothing.
- The `FOREACH + CASE` shape (never an empty `CALL` subquery) is critical: on
  Neo4j an inner `CALL {}` that yields no rows aborts the outer row, which
  would swallow the replay/conflict `RETURN`. The statement stays filter-free
  so every attempt returns exactly one row.
- `Operation.op_id` has a uniqueness constraint; concurrent first-writers
  serialize on it and losers retry with bounded jittered backoff
  (`MAX_WRITE_ONCE_ATTEMPTS = 8`, base 20 ms), then converge to
  replay/conflict.

### Outcomes

| Outcome | Condition | Side effects |
| --- | --- | --- |
| `created` | op_id absent; ON CREATE fired | exactly one Operation + one Fact |
| `replayed` | op_id present, payload SHA matches | none (stored result returned byte-for-byte) |
| `conflict` | op_id present, payload SHA differs | none (refused; returns committed SHA) |

MCP surface: `memory_add_fact(…, op_id=…)` — stock-compatible when `op_id` is
omitted. Conflict returns `{"error": "OP_CONFLICT", "op_id", "detail",
"committed_payload_sha256"}`.

## T5a — Single-host dispatch lock (flock)

`scripts/tests/brain/brain_lock.py` wraps `fcntl.flock` (macOS lacks
`flock(1)`). macOS: kernel-managed advisory lock released on process death —
no stale PID file. Lock path `.orca-opencode/dispatcher.lock` (gitignored).
Wrappers: `acquire <lockfile>` (holds until stdin EOF / signal),
`try <lockfile>` (0 when free-and-acquired-then-released, 1 while held).

## T5b — Atomic task claim

Single write transaction:

```
MERGE (c:TaskClaim {task_id: $task_id})
  ON CREATE SET c.claimed_by = $owner, c.status = 'active',
                c.claimed_at, c.attempt_token
```

- `TaskClaim.task_id` uniqueness constraint → only the ON-CREATE writer wins.
- Outcomes: `claimed` (this attempt wrote), `reaffirmed` (same owner), or
  `taken_by` (another dispatcher holds it, nothing written).
- Privileged write (`task_complete`) re-verifies ownership inline:

```
MATCH (c:TaskClaim {task_id}) WHERE c.claimed_by = $owner SET … → done
```

Non-owner / stale caller matches nothing → `denied`, no mutation.

## T5c — CAS version transitions (Counter)

Every increment is its own explicit write transaction:

```
MERGE (lk:CounterLock {name}) SET lk.touched_at = datetime()   -- EXCLUSIVE lock node
WITH lk, $expected AS expected_version, $writer AS writer
MATCH (n:Counter {name}) WHERE n.version = expected_version
SET n.version = n.version + 1, n.last_writer = writer, n.updated_at = datetime()
RETURN n.version AS version
```

- The `MERGE + SET` on the unique `CounterLock` node takes an exclusive write
  lock held until commit, serializing writers inside their CAS phase. The
  WHERE-compare then sees an unfettered version.
- A lost CAS (zero rows) retries against a freshly read version with bounded
  jittered backoff (`MAX_CAS_ATTEMPTS = 16`).
- M concurrent writers on one counter **always end at version == M**; losers
  converge. `Counter.name` and `CounterLock.name` both carry uniqueness
  constraints (without them concurrent MERGE duplicates break the gate).

## Constraints added (harness-only, separate from schema-snapshot.cypher)

`scripts/tests/brain/concurrency-schema.cypher`:

- `operation_op_id`  — Operation.op_id UNIQUE
- `task_claim_task_id` — TaskClaim.task_id UNIQUE
- `counter_name`      — Counter.name UNIQUE
- `counter_lock_name` — CounterLock.name UNIQUE
- `fact_id`           — Fact.id UNIQUE (F7, self-contained T4)
- `fact_op_id`        — Fact.op_id UNIQUE (F7, self-contained T4)

`schema-snapshot.cypher` (production parity: 12 constraints / 33 indexes) is
NOT modified.

## F7/F8 implemented in T5 (2026-09-20)

- **F7 (ACCEPT-HARDEN):** the T4 `Fact` write is now self-contained idempotent.
  `fact_id` and `fact_op_id` uniqueness live in `concurrency-schema.cypher`
  (and the module's own `SCHEMA_STATEMENTS`), so idempotency no longer leans on
  an external fact-identity constraint living only in `schema-snapshot.cypher`.
- **F8 (VALID):** `write_once` and `claim_task` self-verify their required
  constraints with an in-transaction-call `SHOW CONSTRAINTS` preflight and
  **REFUSE** (fail-closed) by raising `ConstraintGateError` if any is absent —
  a misconfigured DB is never allowed to silently duplicate. `ensure-schema`
  likewise refuses to report `SCHEMA_OK` unless all six constraints persisted.
  Primitives now require: `write_once` → `operation_op_id` + `fact_id` +
  `fact_op_id`; `claim_task` → `task_claim_task_id`.
- The F8 gate makes the rollback story complete: authority lives in DB
  constraints + the `CounterLock` CAS node; there is no optimistic side channel
  and no legacy filesystem-only fallback lock in the module.

## Verification

- `scripts/tests/brain/idempotency.test.sh` — T4 module-level + MCP stdio
  (`idempotency_probe.py` over `oc_brain_server.py`): created → replayed
  (byte-identical) → conflict (nothing written); M concurrent first-writers →
  1 created / M-1 replayed; exactly one Operation and one Fact per op_id.
- `scripts/tests/brain/concurrency.test.sh` — T5a flock deny-second-holder,
  deny-after-SIGKILL (crash-safe: kernel-released, no stale pid file) and
  free-after-release; T5b exactly one claim winner + atomic fully-formed claim
  row + non-owner complete denied; T5c W×K increments land exactly at version
  W×K with all 1..N distinct, retries within the bounded backoff budget, one
  Counter + one CounterLock; F7/F8 schema gate (6/6 constraints present,
  write_once/claim refuse when absent via `ConstraintGateError`); negative
  controls proving bare MERGE mints duplicates and bare MATCH-WHERE-SET loses
  updates on deliberately-unconstrained `NcCounter`/`NcCounterLock` labels;
  static rollback guard (no fcntl/flock/dispatcher.lock inside the module).
- Both tests call `harness.sh preflight` first; exit 42 (INFRA_FAIL) is an
  infrastructure outage, never reported as an assertion failure. Test rows use
  `itest-` / `ctest-` prefixes and are deleted on exit.

## Evidence format

Each test prints `PASS/FAIL` per assertion and a final
`RESULT: <passed> passed, <failed> failed` line plus the exact observed
counts (final version, distinct versions, node counts). A passing run reports
e.g. `final version exactly 48 … successes=48 unique=48 complete=True`.

## Runtime

- Run from the repo root: `bash scripts/tests/brain/idempotency.test.sh` and
  `bash scripts/tests/brain/concurrency.test.sh`
- Context package: `oc_brain_concurrency.py` (module) exports `write_once`,
  `claim_task`, `complete_task`, `claim_status`, `cas_increment`,
  `counter_read`, `ensure_constraints`, `payload_sha256` plus a supervisor
  CLI and both `DriverOps` (raw driver) and `SdkOps` (Agent Memory client)
  adapters. `oc_brain_server.py` exposes `task_claim`, `task_complete`,
  `counter_increment` and the `op_id` path of `memory_add_fact`.
## T4 independent review adjudication (KIRO-LEAD, 2026-09-20)

Reviewer: BRAINV2-T4-REVIEW (read-only). Verdict: T4 CORRECT vs all six requirements, safe to integrate at harness scope; no INVALID/blocking findings. Independently re-verified: idempotency.test.sh 11/11 (module + real MCP wire; conflict, replay, 8-way race one-winner, atomic no-orphans).

Adjudicated findings (pre-production hardening, NOT harness-integration blockers):
- F7 SPECULATIVE->ACCEPT-HARDEN: "exactly one durable result" leans on the external fact_id constraint + constraint-error string match. Before production: make the Fact write self-contained idempotent (fact_id/op_id uniqueness in concurrency-schema.cypher).
- F8 VALID/non-blocking: write_once should self-verify operation_op_id constraint exists (SHOW CONSTRAINTS preflight) so a misconfigured DB REFUSES (fail-closed) rather than silently duplicating. FOLD INTO T5 (same module/schema owner).
- F9 minor: broad except in _is_constraint_lost_race; driver open/close ordering; blocking write_once in async handler; _secret() zeroing doc drift. Non-blocking.
