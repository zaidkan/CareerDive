# BrainV2 Replacement Gateway — 16-Tool Compatibility Inventory

Source of tool list: the live `project-memory` MCP surface (16 tools) exposed to Kiro + OpenCode.
Classification is the CONTRACT the replacement `oc-brain` MCP must meet. No tool may be
silently claimed compatible; each is PRESERVED, ADAPTED, RESTRICTED, or UNSUPPORTED with a reason.
Internally the gateway REUSES Agent Memory 0.6.0 SDK + Bolt (embeddings, schema, search) — it does
not reimplement embedding/search.

Class meanings:

- **PRESERVED** — same name, same inputs, same outputs; drop-in compatible.
- **ADAPTED** — same name/shape, but behavior is scoped/parameterized differently
  (e.g. trusted-server project scope injected, session evidence restricted).
- **RESTRICTED** — legitimately exists but is gated (availability bound, or
  bounded follow-up before exposure). Includes HARD restrictions that must
  never appear on the agent-visible surface (graph_query as raw Cypher).
- **UNSUPPORTED** — not offered on the replacement surface at all. Nothing in
  the 16-tool list is classed UNSUPPORTED today; the class reserves the
  outcome for future candidates that would violate product constraints
  (raw unrestricted Cypher, cross-project data exposure, feedback or
  advisory channels that poke through AI boundaries).

| # | Tool | Class | Notes |
|---|------|-------|-------|
| 1 | memory_add_fact | PRESERVED (target) | Core. Must keep name/inputs/outputs. Internally via SDK Bolt add_fact. |
| 2 | memory_search | ADAPTED | Keep name/shape; gateway injects trusted project scope; default memory_types must not error. |
| 3 | memory_get_context | PRESERVED (target) | Conversation/session context read. |
| 4 | memory_store_message | PRESERVED (target) | Short-term write (proven round-trippable via NAMS spike). |
| 5 | memory_add_preference | RESTRICTED | Supported by Bolt SDK; exposure gated until Fact core proven E2E on the harness. Not on the client surface before that gate. |
| 6 | memory_add_entity | ADAPTED | Bolt SDK supports it (NAMS path had a bug). Gateway uses Bolt add_entity directly. |
| 7 | memory_get_entity | PRESERVED (target) | Entity read + neighbors. |
| 8 | memory_create_relationship | RESTRICTED | Relationship write; expose only after the entity-write path is proven on the harness. |
| 9 | memory_export_graph | RESTRICTED | Read-only, project-scoped, with bounded export limits; must not export cross-project. |
| 10 | memory_get_conversation | PRESERVED (target) | Session-scoped read. |
| 11 | memory_list_sessions | ADAPTED | Must be project-scoped (no cross-project session leakage). |
| 12 | memory_get_observations | PRESERVED (target) | Session-scoped read. |
| 13 | memory_start_trace | PRESERVED (target) | Reasoning trace write. |
| 14 | memory_record_step | PRESERVED (target) | Reasoning step write. |
| 15 | memory_complete_trace | PRESERVED (target) | Reasoning trace completion. |
| 16 | graph_query | RESTRICTED (HARD) | MUST NOT expose raw unrestricted Cypher as a general agent tool. Either remove it from the agent surface or replace it with a whitelisted, read-only, project-scoped, parameterized query API. Raw Cypher on the agent surface is classed UNSUPPORTED (bypass surface). |

## T6 addendum — remote transport does not change the inventory

The T6 work (`remote-transport.test.sh`, `oc_remote_gateway.py`/`probe.py`/
`bridge.py`, `BRAIN_GATEWAY_WINDOWS.md`) proves the *transport* on a
disposable in-memory gateway: streamable-http + bearer auth, a stdio→remote
bridge, hostile `project_id` rejection, timeout/degraded/recovery behavior,
and OpenCode model-driven remote tool calls. The production gateway exposes
exactly the classes above over that transport; nothing classed RESTRICTED
becomes available on the wire because a transport is remote. Raw `graph_query`
stays RESTRICTED(HARD) — it is classed UNSUPPORTED on the agent surface.

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
