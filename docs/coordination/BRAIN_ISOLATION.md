# BrainV2 T8 — project-isolated retrieval

Status: implemented and measured on the disposable `neo4j:5.26-community`
harness. This is not a production deployment claim.

## Boundary and strategy

`oc_brain_server.py` derives the retrieval scope from the trusted gateway
environment (`OC_BRAIN_PROJECT_ID`, default `career-expo`). No retrieval tool
accepts `project_id` from the caller.

The fact search used by `memory_search_facts` and the `facts` branch of
`memory_search` fuses four independently scoped modes:

| Mode | Candidate strategy |
|---|---|
| exact | `MATCH (f:Fact)` with `project_id` predicate before `LIMIT` |
| full-text | Neo4j 5.26 `db.index.fulltext.queryNodes`, then project verification before `LIMIT` |
| vector | `MATCH` project candidates first, then 5.26 `vector.similarity.cosine`; no global index top-k |
| graph | match the seed and one-hop result with project predicates on both endpoints before `LIMIT` |

Vector deliberately uses pre-scoped scalar cosine instead of
`db.index.vector.queryNodes` because Neo4j 5.26 cannot pre-filter that procedure.
This avoids global-top-k-then-filter and therefore cannot lose an in-project hit
because another project crowded the global top-k. The cost is a project-local
embedding scan; benchmark before changing this trade-off.

The full-text procedure has no 5.26 pre-filter option. It therefore emits
matching candidates, but the Cypher verifies `project_id` before ordering and
limiting. Graph expansion checks both endpoints, including hostile
cross-project edges.

For rollout compatibility only, unclassified legacy facts are visible when the
database contains *no* project-classified facts. As soon as any scoped fact is
present, null-project facts fail closed. T2 backfill is therefore a deployment
prerequisite.

## T7 composition

Scoped query records are serialized by `_fact_record_to_dict`, which adds the
trusted `project_id` and calls the existing T7 `_annotate_staleness` exactly
once. Isolation tests prove one result can carry both `project_id` and
`STALENESS_CANDIDATE`. Architecture-scope behavior remains owned by the T7
helper and is unchanged.

## Repeatable gate and corpus

- `scripts/tests/brain/isolation.test.sh` is the RED-to-GREEN acceptance gate.
- `scripts/tests/brain/benchmark-seed.cypher` owns a synthetic two-project
  corpus; it does not change the shared 49+2 seed.
- `scripts/tests/brain/benchmark-set.json` is the labeled
  `{mode, query, project_id, expected_ids}` set.
- `scripts/tests/brain/benchmark.sh --runs 20` applies the corpus and emits JSON.

Both projects intentionally have identical exact text, full-text tokens, and
vectors. The graph corpus also includes a hostile cross-project edge. The
benchmark evaluates each mode independently at k=1, compares scoped recall to
an actually executed unfiltered baseline, and counts any result whose
`project_id` differs from the label as leakage.

## Measured harness result

Measured 2026-09-21 on the local disposable harness, 20 timed repetitions per
labeled query (160 per-mode timed reads):

| Mode | recall@1 | precision@1 | unfiltered recall | scoped delta | leakage |
|---|---:|---:|---:|---:|---:|
| exact | 1.000 | 1.000 | 1.000 | 0.000 | 0 |
| full-text | 1.000 | 1.000 | 1.000 | 0.000 | 0 |
| vector | 1.000 | 1.000 | 1.000 | 0.000 | 0 |
| graph | 1.000 | 1.000 | 1.000 | 0.000 | 0 |

Latency measurements are observations, not targets:

| Layer | p50 | p95 | Measurement boundary |
|---|---:|---:|---|
| DB | 0.000 ms | 1.000 ms | Neo4j driver's server summary; millisecond resolution |
| network | 1.427 ms | 2.436 ms | client wall time minus reported DB time, local Bolt |
| embedding | 7.718 ms | 8.718 ms | warm BGE Small `encode` calls on CPU |
| agent-visible | 7.705 ms | 10.632 ms | in-process fused gateway read path with deterministic benchmark embedder |

The agent-visible figure is a gateway-path proxy: it includes four queries,
fusion, and serialization preparation, but excludes MCP subprocess startup and
uses a deterministic embedder so embedding remains a separately measured
layer. It must not be presented as remote production latency.

## Limits

- The corpus is small and synthetic. Results establish isolation mechanics,
  not production relevance quality or capacity.
- Retrieval fusion here covers `Fact` memory. Stock SDK searches for messages,
  entities, preferences, and traces retain their existing behavior; their data
  model has not yet received T2 `project_id` classification.
- Full-text fallback skips that mode only when the additive T3 index is absent;
  other query errors fail the call.
- No production Bolt endpoint, configuration, schema, or data was touched.
