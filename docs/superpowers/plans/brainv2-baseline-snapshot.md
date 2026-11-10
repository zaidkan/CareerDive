# BrainV2 Production Baseline Snapshot (READ-ONLY capture)

Captured: 2026-09-19 (America/New_York) by KIRO-LEAD via project-memory MCP `graph_query` (read-only).
Target: production Windows Neo4j, `bolt://100.99.119.124:7687`, db `neo4j`.
Purpose: immutable reference for no-loss migration validation. NO production writes were made to capture this (read-only queries only).

## Engine
- Neo4j Kernel 5.26.30, edition: community (from `dbms.components()`).

## Schema totals
- Indexes: 35
- Uniqueness constraints: 12

### Vector indexes (6) — DO NOT CHANGE (invariant)
All: 384 dimensions, COSINE, HNSW m=16, ef_construction=100, quantization enabled, provider `vector-2.0`, embedding model BAAI/bge-small-en-v1.5.
Exact production index-type composition (verified): 2 LOOKUP + 1 POINT + 26 RANGE + 6 VECTOR = 35.
- entity_embedding_idx (Entity.embedding)
- fact_embedding_idx (Fact.embedding)
- message_embedding_idx (Message.embedding)
- preference_embedding_idx (Preference.embedding)
- step_embedding_idx (ReasoningStep.embedding)
- task_embedding_idx (ReasoningTrace.task_embedding)

### Full-text indexes
- NONE (0). This is the retrieval gap BrainV2 T3 addresses (additive).

## Node counts by label (at capture time)
| Label | Count |
|---|---|
| Fact | 53 |
| Message | 16 |
| ReasoningTrace | 4 |
| Conversation | 3 |
| ReasoningStep | 3 |
| Preference | 1 |
| Tool | 1 |
| ToolCall | 1 |

## Fact class split (at capture time)
- 51 SEMANTIC-shaped Facts (embedding present, no `ns`).
- 2 COORDINATION-shaped Facts (`ns='career-expo'`, `mtype`, no embedding).
- Total 53.

## Honest delta accounting (RECONCILED 2026-09-19 via read-only timestamps)

Current total: **54 Facts** = 52 MCP-shaped (`ns` null) + 2 COORDINATION-shaped (`ns='career-expo'`).

An earlier report claimed the increase was "four checkpoint writes." Read-only timestamp evidence (no records altered/deleted) shows **six** Fact writes during this session window (created_at >= 2026-09-19T23:00Z):
1. `NEO4J-SECURE-AUTH / dispatched` — 23:09Z — **oc-memory coordination write** (ns set), from an oc-dispatch run that had coordination memory ENABLED before the freeze.
2. `NEO4J-SECURE-AUTH / completed` — 23:15Z — **oc-memory coordination write** (ns set), same source.
3. `Neo4j project-memory migration / verification_status` — 23:41Z — Kiro MCP `memory_add_fact`.
4. `BrainV2 / has_implementation_plan` — 00:15Z — Kiro MCP.
5. `BrainV2 / plan_correction` — 00:32Z — Kiro MCP.
6. `BrainV2 / t0_checkpoint` — 00:45Z — Kiro MCP.

So the true accounting is: 4 Kiro MCP writes + 2 oc-memory coordination writes (task NEO4J-SECURE-AUTH) = 6 session writes. The earlier "four" figure omitted the two oc-memory coordination writes. Facts created before 23:00Z = 48 (pre-session baseline of MCP-shaped facts).

**Correction to my prior statement:** the increase was NOT solely my four MCP writes; two coordination facts were also written by an oc-dispatch run before I began passing `OC_MEM_ENABLED=0`. From this correction onward: production memory writes are frozen (no MCP writes; all dispatches use `OC_MEM_ENABLED=0`). No record was deleted or modified to reconcile.

For migration no-loss validation, the invariant is: **no existing Fact/Message/Entity/etc. record is deleted or has properties removed**; additive fields/labels only.

## Relationship model (at capture time)
- Conversation-[HAS_MESSAGE]->Message (16), Conversation-[FIRST_MESSAGE]->Message (3)
- Message-[NEXT_MESSAGE]->Message (13)
- ReasoningTrace-[HAS_STEP]->ReasoningStep (3)
- ReasoningStep-[USES_TOOL]->ToolCall (1)
- ToolCall-[INSTANCE_OF]->Tool (1)
- Fact nodes are ORPHANS (no relationships) — migration is pure additive property/label backfill.

## Production-unchanged confirmation
- Only read-only `graph_query` used for this capture.
- No index/constraint created or dropped on production.
- No live schema migration run.
- Old `orca-neo4j` rollback container remains STOPPED.
- Windows Neo4j not restarted or modified.
- MCP config and BGE Small embedding unchanged.
