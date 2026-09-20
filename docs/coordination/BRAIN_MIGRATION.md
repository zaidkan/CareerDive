# BRAIN Migration — BrainV2 T2 classification backfill + T3 coordination full-text

**Status:** ACTIVE · **Scope:** synthetic disposable harness only · **Containers:** `brainv2-neo4j-test` (127.0.0.1:7688, credentials `neo4j`/`brainv2testpw`, Neo4j 5.26 Community)

This document is the exact, runnable description of the BrainV2 T2 (additive memory
classification + rollback) and T3 (coordination full-text retrieval) migration for the
shared-brain `:Fact` graph. It matches production structure on a **synthetic harness**
defined by `scripts/tests/brain/schema-snapshot.cypher` and
`scripts/tests/brain/seed-synthetic.cypher`. It never contacts the production Windows
Neo4j (`100.99.119.124`) and never writes production memory.

## 1. What the migrations do

| File | Purpose |
| --- | --- |
| `scripts/tests/brain/migrations/001_backfill.cypher` | T2 additive classification + defaults |
| `scripts/tests/brain/migrations/001_rollback.cypher` | T2 exact reverse (no Fact deleted) |
| `scripts/tests/brain/migrations/002_fulltext.cypher` | T3 coordination full-text index (Neo4j 5.26) |
| `scripts/tests/brain/migration.test.sh` | RED→GREEN proof of backfill / idempotence / rollback |
| `scripts/tests/brain/retrieval.test.sh` | RED→GREEN proof of T3 retrieval |

Run order: `001_backfill.cypher` → `002_fulltext.cypher`. Rollback order: if the fulltext
index exists, `DROP INDEX coordination_fulltext IF EXISTS` first, then
`001_rollback.cypher`. Both test scripts wipe and reseed the harness before every run
(`harness.sh down` → `up` → `apply`).

## 2. T2 — `001_backfill.cypher` (additive, idempotent, no data loss)

The backfill is **additive only**. Every statement targets nodes missing the value and
never rewrites or removes an existing property or label, so re-running it is a no-op and
existing data cannot be lost.

1. **SEMANTIC classification** — `MATCH (f:Fact) WHERE f.embedding IS NOT NULL AND f.ns IS NULL SET f.memory_class = 'SEMANTIC'`.
   Targets embedded legacy facts (the project-memory semantic graph shape).
2. **COORDINATION classification** — `MATCH (f:Fact) WHERE f.ns IS NOT NULL SET f:Coordination; SET f.memory_class = 'COORDINATION'`.
   Targets the oc-memory coordination shape (`ns`/`mtype`/`status`, **no embedding**) and
   adds the `:Coordination` label used by T3. The two rule sets are disjoint in the
   harness seed: every `:Fact` has either an embedding or `ns`, never both.
3. **Project scoping** — `MATCH (f:Fact) WHERE f.project_id IS NULL SET f.project_id = 'career-expo'`.
4. **Provenance/scope defaults** — `SET f.scope = 'career-expo'` and
   `SET f.provenance = 'brainv2-001-backfill'`, each only where the property is absent.

Post-migration invariants on the harness seed:

| Shape | Count |
| --- | --- |
| Total `:Fact` nodes | 51 (unchanged) |
| `memory_class='SEMANTIC'` | 49 |
| `memory_class='COORDINATION'` + `:Coordination` label | 2 |
| `project_id='career-expo'` / `scope='career-expo'` / `provenance='brainv2-001-backfill'` | 51 each |
| Unclassified (`memory_class IS NULL`) | 0 |
| Facts with `embedding` / with `ns` | 49 / 2 (unchanged) |

Facts that have neither `embedding` nor `ns` (not present in either legacy shape, not in
this harness seed) are intentionally left `memory_class`-less rather than guessed.

## 3. T2 rollback — `001_rollback.cypher`

```cypher
MATCH (f:Fact)
REMOVE f:Coordination, f.memory_class, f.project_id, f.scope, f.provenance
```

- Unsets **only** the fields/label added by the backfill.
- **Deletes no `:Fact`** and modifies no pre-existing property value.
- Restores the exact pre-migration shape (proven by a per-fact fingerprint of
  `id`, property-key count, and labels that is byte-identical before backfill and after
  rollback).
- `REMOVE` of an already-absent label/property is a silent no-op, so rollback is itself
  idempotent.

**Production caution:** on a live namespace this rollback may only be run when the
backfill is the sole source of these props, or when `project_id`/`scope`/`provenance`
were verifiably absent before. Never use it to strip real provenance that a newer writer
has since stamped. Prefer `status='superseded'` style invalidation (per
`docs/coordination/MEMORY_PROTOCOL.md`) over destructive removal when data outlives a
rollback window.

## 4. T3 — `002_fulltext.cypher` (Neo4j 5.26 syntax)

```cypher
CREATE FULLTEXT INDEX coordination_fulltext IF NOT EXISTS
FOR (n:Coordination) ON EACH [n.subject, n.object]
```

- Neo4j 5.26 `FULLTEXT` index, queried via `CALL db.index.fulltext.queryNodes('coordination_fulltext', <query>)`.
- **Not** the later 2026.x `SEARCH`/`SECONDARY`-clause syntax.
- Indexes only the `:Coordination` label (produced by `001_backfill`) over `subject` +
  `object`.
- Coordination facts deliberately carry **no embedding**. Vector search over
  `fact_embedding_idx` (384-dim COSINE, BGE) can therefore never return them — full-text
  is the only token-retrieval path for coordination facts. **No vector index and no BGE
  usage is altered.**
- Reverse of this migration is `DROP INDEX coordination_fulltext IF EXISTS` (documented
  here because `001_rollback.cypher` is scoped to the T2 backfill fields).

## 5. Retrieval semantics proven by `retrieval.test.sh`

1. **Exact retrieval** by coordination fields (no index needed):
   `MATCH (c:Coordination {ns:'career-expo', mtype:'DECISION', status:'active'}) RETURN c.subject` → `SYN-TASK-1`.
2. **Full-text retrieval by token** (indexed subject/object):
   `CALL db.index.fulltext.queryNodes('coordination_fulltext','zebra') YIELD node RETURN node.subject` → `SYN-TASK-1`.
3. **Scope separation** — full-text returns only `:Coordination` nodes: a token present
   only in semantic facts (`'lorem'`) returns 0; a token present in both coordination
   facts (`'synthetic'`) returns exactly 2.
4. **Vector-search miss** — the test runs a 51-neighbour vector similarity scan over
   `fact_embedding_idx` and gets 0 `:Coordination` results (49 embedded facts only),
   because coordination facts have no embedding. Token retrieval for coordination facts
   is impossible by vector search by construction.

## 6. Test evidence

Both suites run RED→GREEN against a freshly wiped/reseeded harness and currently pass:

- `bash scripts/tests/brain/migration.test.sh` → **33 passed, 0 failed**
  (RED pre-migration absence, GREEN classification + stamping, idempotent re-run,
  exact-pre-state rollback with identical fingerprint).
- `bash scripts/tests/brain/retrieval.test.sh` → **19 passed, 0 failed**
  (RED absent index, GREEN index shape, exact retrieval, token full-text retrieval,
  vector-search-miss proof).
- `bash scripts/tests/brain/harness.sh verify` confirms 35 indexes / 12 constraints /
  `embedding + no ns` split (49 after fresh seed, in RED phase).

## 7. Operational guardrails

- Harness gives hard isolation: host Bolt `127.0.0.1:7688`, unique compose project,
  dedicated `brainv2_test_data` volume, `down -v` wipe, and a refusal guard if the
  production Bolt host appears in the environment (`harness.sh`).
- These files are **synthetic-only**. Do not point them at production. The rolled-forward
  production migration must be a fresh, reviewed artifact derived from the same
  statement shapes, with `project_id`/`scope`/`provenance` defaults confirmed against the
  live coordination writer before any run.