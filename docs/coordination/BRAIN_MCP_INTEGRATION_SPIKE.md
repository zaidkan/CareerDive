# BRAINv2-T1 Spike: stock MCP server over a NAMS-mode gateway bridge

Status: COMPLETED (spike) — branch `worker/brainv2-t1-mcp-spike`

## Goal

Prove that the stock `neo4j-agent-memory` 0.6.0 MCP server can round-trip a
real write + read *through* a NAMS-mode gateway, persisting to Neo4j, without
the client talking directly to Bolt. This validates the single-gateway
architecture behind BRAINv2/T1 before any code changes to the package.

## Verdict

**GREEN.** `scripts/tests/brain/mcp-integration.test.sh` passes 10/10. Stock
MCP runs `--backend nams`, sends `POST {endpoint}/{snake_case_method}` bridge
requests to a stub gateway, the gateway persists to harness Neo4j, and the MCP
tools read the stored message back through the gateway.

## How to run

Requires harness Neo4j on `bolt://127.0.0.1:7688` (`neo4j/brainv2testpw`). The
package and tooling run from `.venv` (mcp SDK) and `uvx` (stock server).

```
docker compose -f docker-compose.memory.yml up -d brainv2-neo4j-test
bash scripts/tests/brain/mcp-integration.test.sh
```

## Architecture

```
mcp client (probe, mcp SDK stdio)          scripts/brain/mcp_probe.py
        │  MCP JSON-RPC over stdio
        ▼
stock neo4j-agent-memory MCP server        uvx --from 'neo4j-agent-memory[mcp,sentence-transformers]'
(mcp serve --backend nams --endpoint …/namsbridge --api-key … --profile extended)
        │  HTTPS POST {endpoint}/{snake_case_method}   Bearer auth
        ▼
bridge stub (stdlib ThreadingHTTPServer)   scripts/brain/nams_bridge_stub.py
        │  neo4j driver
        ▼
harness Neo4j bolt://127.0.0.1:7688        docker-compose.memory.yml
```

The stub implements only the parts of the NAMS bridge contract the 0.6.0 client
actually uses: conversation-scoped short-term memory plus entity endpoints. It
mirrors the wire protocol exactly (camelCase JSON, `{endpoint}/{method}` bridge
routing, HTTP status → typed exceptions, 501 → NotSupportedError), but owns a
simplified schema (single default conversation; `Conversation`,
`Message`, `Entity` nodes; `-[:HAS_MESSAGE]->`).

## Captured contract (from 0.6.0 source + wire observation)

- **Bridge routing**: if the endpoint does not contain `/v\d+`, every method is
  `POST {endpoint}/{snake_case_method}` with path params dropped. `connect()`
  probes `list_conversations(limit=1)` on startup.
- **Auth**: `Authorization: Bearer {api_key}`; empty key raises locally.
- **Status mapping**: 429/5xx retryable; 401→AuthError; 404→NotFoundError;
  501→NotSupportedError.
- **Short-term**: camelCase end-to-end; no session concept (a `session_id` maps
  to a conversation id); `add_message` payload `{content, role}`; `get_context`
  envelope `{reflections, observations, recentMessages}`; `search_messages`
  envelope `{"messages": [...], "searchType": "text"}`; message objects carry
  `conversationId` only when the id is a parseable UUID.
- **Entities**: `add_entity` body `{name, type, description?}`; `type` is
  uppercased on response parse; `search_entities` envelope
  `{"entities": [...], "searchType": "text"}`.
- **LLM/embedding features** are disabled on NAMS: `store_message` logs a
  warning and proceeds without extraction/embedding (`--llm local-ollama`
  optional; not used here).

## Findings / gaps exposed (no package changes made)

1. **Facts and preferences never reach the wire.** `add_fact`, `search_facts`,
   `add_preference`, `search_preferences`, relationships, and entity-relationship
   helpers raise `NotSupportedError` client-side ("NAMS does not expose a facts
   endpoint."). MCP tools return `{"error": ...}`. Verified on the stub log that
   `add_fact` is never dispatched.
2. **`memory_add_entity` is broken on NAMS in the integration layer.**
   `NamsLongTermMemory.add_entity` returns a single `Entity`, but
   `integration.add_entity` unpacks `entity, dedup_result = await …` after
   actually calling the gateway. Pydantic v2 `BaseModel.__iter__` yields field
   tuples, so unpacking a multi-field model raises
   `ValueError: too many values to unpack (expected 2)`. The wire `add_entity`
   succeeds; result parsing is what fails. MCP returns the error dict.
3. **`memory_search` default memory_types include preferences** →
   whole search errors on NAMS. Search works when scoped to
   `["messages", "entities"]`.
4. **`memory_search` requires a `session_id`** on NAMS (conversation-scoped);
   omitting it errors with a clear message.
5. **Background auto-preference detection** runs after each
   `memory_store_message` (unless `--no-auto-preferences`) and swallows the
   NotSupportedError — harmless, but means per-message background tasks exist
   on NAMS.
6. **Bridge drops path params.** NLP conversation/entity mutations such as
   entity merging are not reachable through the bridge; the stub substitutes
   single-default-conversation semantics.

## Gaps not exercised

Multi-conversation flows, `--session-strategy per_day/persistent`, search
paging, and any `memory_*` tool that requires facts/preferences (all of which
error on NAMS per finding 1).

## Artifacts

- `scripts/brain/nams_bridge_stub.py` — gateway stub (stdlib HTTP + neo4j driver).
- `scripts/brain/mcp_probe.py` — MCP SDK stdio client; 8 focused assertions.
- `scripts/tests/brain/mcp-integration.test.sh` — end-to-end gate (10 assertions):
  probes, wire-method log evidence, persistence in harness Neo4j.
- `.gitignore` — `.venv/` and `__pycache__/` added.

## Conclusion for T1 decision

The stock server's NAMS mode is a credible single-gateway integration path for
short-term/message memory and read-back. Facts, preferences, and entity *add*
require either package-side fixes (integration unpack, facts/preferences
transport) or a gateway that emulates more of the Bolt API surface under the
bridge. No changes to the production `opencode.json` (read-only Bolt MCP) or to
the production memory database were made.