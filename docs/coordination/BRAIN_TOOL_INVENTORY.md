# BrainV2 Replacement Gateway — 16-Tool Compatibility Inventory

Source of tool list: the live `project-memory` MCP surface (16 tools) exposed to Kiro + OpenCode.
Classification is the CONTRACT the replacement `oc-brain` MCP must meet. No tool may be
silently claimed compatible; each is PRESERVED, ADAPTED, RESTRICTED, or PENDING with a reason.
Internally the gateway REUSES Agent Memory 0.6.0 SDK + Bolt (embeddings, schema, search) — it does
not reimplement embedding/search.

| # | Tool | Class | Notes |
|---|------|-------|-------|
| 1 | memory_add_fact | PRESERVED (target) | Core. Must keep name/inputs/outputs. Internally via SDK Bolt add_fact. |
| 2 | memory_search | ADAPTED | Keep name/shape; gateway injects trusted project scope; default memory_types must not error. |
| 3 | memory_get_context | PRESERVED (target) | Conversation/session context read. |
| 4 | memory_store_message | PRESERVED (target) | Short-term write (proven round-trippable via NAMS spike). |
| 5 | memory_add_preference | PENDING | Supported by Bolt SDK; expose after Fact core proven, or document unsupported-until. |
| 6 | memory_add_entity | ADAPTED | Bolt SDK supports it (NAMS path had a bug). Gateway uses Bolt add_entity directly. |
| 7 | memory_get_entity | PRESERVED (target) | Entity read + neighbors. |
| 8 | memory_create_relationship | PENDING | Relationship write; expose after entities proven. |
| 9 | memory_export_graph | RESTRICTED | Read-only, project-scoped; must not export cross-project. |
| 10 | memory_get_conversation | PRESERVED (target) | Session-scoped read. |
| 11 | memory_list_sessions | ADAPTED | Must be project-scoped (no cross-project session leakage). |
| 12 | memory_get_observations | PRESERVED (target) | Session-scoped read. |
| 13 | memory_start_trace | PRESERVED (target) | Reasoning trace write. |
| 14 | memory_record_step | PRESERVED (target) | Reasoning step write. |
| 15 | memory_complete_trace | PRESERVED (target) | Reasoning trace completion. |
| 16 | graph_query | RESTRICTED (HARD) | MUST NOT expose raw unrestricted Cypher as a general agent tool. Either remove from the agent surface or replace with a whitelisted, read-only, project-scoped, parameterized query API. Raw Cypher = bypass surface. |

## Feasibility-proof minimum (this stage)
Prove END TO END on the disposable harness, without the client holding the Neo4j credential:
- Kiro + OpenCode discover and invoke the replacement tools.
- Fact tools (add_fact, search, supersede) retain compatible names/inputs/outputs and work E2E.
- Embedding + semantic search preserved (reuse SDK; do not reimplement).
- Preferences/Entities: supported compatibly OR explicitly documented unsupported-until.
- Existing data + Agent Memory schema intact.
- graph_query is NOT exposed as raw Cypher.

## Security-proof minimum (mandatory gate — separate from tool compatibility)
- Gateway enforces trusted project identity + authorization (project_id from repo identity, not agent arg).
- Document actual trusted process, credential storage, network boundary.
- Prove agents CANNOT bypass via direct MCP / graph_query / cypher-shell / raw Bolt / gateway-credential access.
- Moving the password into another process on the same Mac is NOT sufficient isolation by itself — must be proven.
- If the Mac/Windows topology cannot prevent bypass: STOP, present concrete alternatives, do NOT silently fall back to hybrid/option-2, do NOT claim T6 complete.
