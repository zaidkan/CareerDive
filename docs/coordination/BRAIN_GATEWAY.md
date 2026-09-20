# BRAINv2 T1 Gateway — oc-brain replacement MCP surface (feasibility)

Status: **FEASIBILITY PROOF (harness only)** — branch
`worker/brainv2-t1-gateway-feasibility`, run `oc-20260919-004`.

Scope guard: this work touches ONLY the isolated harness. Nothing in this
worktree talks to production Windows Neo4j (`100.99.119.124:7687`) and no
production memory was written. This document is the honest route + isolation
analysis behind Option 1 (replacement/proxy MCP tool surface `oc-brain`).

`docs/coordination/BRAIN_TOOL_INVENTORY.md` is **not present** in this
worktree, so the 16-tool contract below is reconstructed directly from the
`neo4j-agent-memory==0.6.0` package source (its `mcp/_tools.py` "extended
profile" registers exactly 16 tools). Reconcile with the authoritative
inventory if it is later found.

---

## 1. What was proven (two goals)

### GOAL A — tool compatibility (13/13 probe assertions)

A minimal gateway (`scripts/brain/oc_brain_server.py`) reuses the
`neo4j-agent-memory` 0.6.0 SDK **internally** — its own embeddings
(`sentence-transformers`, `BAAI/bge-small-en-v1.5` like production), its own
schema/vector-index setup, its own semantic search, and its own Bolt graph
client. The gateway exposes a curated MCP surface; an unprivileged client
(`scripts/brain/oc_brain_probe.py`, MCP SDK stdio) discovered and invoked it
end-to-end:

```
fact create (memory_add_fact)
  -> retrieve (memory_get_facts)
  -> semantic search (memory_search_facts: paraphrase hit, embeddings live)
  -> supersede (memory_supersede_fact: old invalidated, replacement current)
  -> semantic search now ranks the replacement
```

`memory_add_fact` and `memory_search` keep stock names/inputs/outputs:

- `memory_add_fact` — identical signature and identical `{"stored": true,
  "type": "fact", "id": …, "triple": …}` envelope (wired to the SDK's
  `MemoryIntegration.add_fact`).
- `memory_search` — identical signature and `{"results": {...}, "query": …}`
  envelope; stock `memory_types` values all behave as stock. Superset: the
  value `"facts"` is also accepted and routed to the SDK's fact vector index.

Extensions (no stock counterpart, clearly named):
`memory_get_facts`, `memory_search_facts`, `memory_supersede_fact`.

### GOAL B — security proof (client works with zero credential)

The MCP client process works without holding the Neo4j credential. The
gateway takes the secret from a 0600 secret file (preferred) or env
(fallback), never from argv, never via the client. Measured bypass results
are in §5.

---

## 2. Architecture

```
agent / MCP client (oc_brain_probe.py — NO Neo4j credential, no raw Cypher)
        |  MCP JSON-RPC over stdio
        v
oc_brain_server.py  (the only TRUSTED process touching the database)
        |  fastmcp, lifespan builds MemoryClient(MemorySettings, backend=bolt)
        v
neo4j-agent-memory 0.6.0 SDK internals (untouched, reused):
        |  sentence-transformers embedder  +  queries module  +  Neo4jClient
        |  LongTermMemory.add_fact / get_facts_about / search_facts
        v
harness Neo4j 5.26  bolt://127.0.0.1:7688   neo4j/brainv2testpw
        (container brainv2-neo4j-test, DISPOSABLE)
```

Production analogue: same shape, with the gateway placed so the agent cannot
reach either the credential or the Bolt listener (see §6).

---

## 3. Route table — all 16 stock tools

Classified PRESERVED / ADAPTED / RESTRICTED / PENDING. "PENDING" = not
carried by oc-brain in this feasibility cut; each needs a bounded follow-up
(see §7).

| # | Stock tool (extended profile) | oc-brain status | Notes |
|---|-------------------------------|-----------------|-------|
| 1 | `memory_add_fact` | **PRESERVED** | identical sig + envelope, SDK-backed |
| 2 | `memory_search` | **ADAPTED** | stock sig/envelope; `memory_types` gains `"facts"` routed to fact vector index |
| 3 | `memory_get_context` | PENDING | needs session strategy + messages path |
| 4 | `memory_store_message` | PENDING | message ingestion (spike proved NAMS path; bolt-local now) |
| 5 | `memory_add_entity` | PENDING | spike showed NAMS integration unpack bug; bolt path unaffected |
| 6 | `memory_add_preference` | PENDING | preference path + auto-detection off |
| 7 | `memory_get_conversation` | PENDING | session-scoped reads |
| 8 | `memory_list_sessions` | PENDING | session enumeration |
| 9 | `memory_get_entity` | PENDING | entity graph reads |
| 10 | `memory_export_graph` | PENDING | needs restricted, bounded export (no raw traversal) |
| 11 | `memory_create_relationship` | PENDING | validated entity-linking write |
| 12 | `memory_start_trace` | PENDING | reasoning traces |
| 13 | `memory_record_step` | PENDING | reasoning traces |
| 14 | `memory_complete_trace` | PENDING | reasoning traces |
| 15 | `memory_get_observations` | PENDING | observations/reflections |
| 16 | `graph_query` | **RESTRICTED** | **never** exposed as tool. Gateway runs only hardcoded, parameterized, allowlisted Cypher (its own `SUPERSEDE_FACT_QUERY` + the SDK `queries` module) |

oc-brain extras (not in the 16): `memory_get_facts`, `memory_search_facts`,
`memory_supersede_fact`.

---

## 4. Credential / network / process isolation model

Three independent layers; no single layer is responsible for isolation:

1. **Trusted process.** The gateway owns the only live Bolt session. Its
   whole attack surface toward the agent is the MCP tool allowlist. No tool
   accepts or executes client-supplied Cypher. `graph_query` is absent.
2. **Credential storage.**
   - Preferred intake: `OC_BRAIN_NEO4J_PASSWORD_FILE` → 0600 secret file;
     read once, buffer zeroed. The password never sits in the gateway's env
     or argv, and never on the MCP wire.
   - Fallback: `OC_BRAIN_NEO4J_PASSWORD` env value (supervised environments
     where the supervisor owns the env).
3. **Network boundary.**
   - Harness: Bolt published on `127.0.0.1:7688` (auth-gated).
   - Production: the Windows host Bolt listener must be bound to the
     gateway's network only (host firewall / private routing), so an agent
     Mac cannot reach `100.99.119.124:7687` at all — even if it recovered a
     password, there is no route.

---

## 5. Bypass tests actually run (evidence)

All executed by `scripts/tests/brain/gateway-feasibility.test.sh` on the
harness; fresh run block quoted in the WORKER RESULT.

| # | Attempt | Result |
|---|---------|--------|
| 1 | Direct Bolt, no password (`auth=("neo4j","")`) | **REJECTED** (driver auth failure) |
| 2 | Direct Bolt, wrong password | **REJECTED** (driver auth failure) |
| 3 | Read credential from gateway argv (`ps -o command`) | **not present** |
| 4 | Read credential from client process env (`ps eww` on live client) | **not present** |
| 5 | Read sibling-process env via `ps eww` (same macOS user) | **NOT AVAILABLE on macOS** — `ps eww` does not print a sibling's environment (measured), so the Linux-style env-dump bypass does not exist here |
| 6 | Read the gateway's secret file (0600, same OS user) | **READABLE** — real residual same-Mac vector, documented, NOT claimed as isolation |
| 7 | Client-supplied Cypher / `graph_query` tool | **not exposed** (discovery assert) |

Conclusion of the honest analysis: on a single Mac under one OS user,
an equally-privileged agent **can** still read a 0600 secret file it can name
(the harness client is handed the file path to forward). Moving the password
from the agent's env into a sibling process on the same Mac is therefore
**not** isolation by itself. The harness proves the *protocol-level*
guarantees (client disconnected from the credential and from raw Bolt; only
the gateway and the allowlist sit on the write path) and surfaces the
same-Mac file-read surface as a measured fact.

---

## 6. If the Mac/Windows topology cannot prevent bypass — concrete alternatives

The remaining bypass (same-user file read) disappears only when the
credential and/or database move outside the agent's reach. Options, best
first:

- **A — Remote gateway on the Neo4j host or a dedicated host/VM.**
  Credential never leaves that host; the agent Mac consumes only an MCP
  transport to the gateway (stdio-over-SSH or streamable HTTP with its own
  bearer). This matches the production direction given Neo4j is already on a
  separate Windows host.
- **B — Gateway under a dedicated OS user + `launchd`.** Secret file owned by
  the gateway user (mode 600); agent user cannot read it. Bolt listener bound
  to that user's loopback/VM.
- **C — macOS Keychain with binary ACL.** `security add-generic-password`
  scoped via `-T` to the gateway binary; unrelated tools (and headless agents
  that cannot answer a TCC prompt) fail on `find-generic-password`.
- **D — Network ACL on the production Neo4j host.** Bind Bolt to the
  gateway's subnet; firewall everything else, including the agent Mac.

Mitigations are only worth layering once A (or B) moves the secret off the
agent's account. If none of A–D is deployed, direct-Bolt hybrid fallback is
**explicitly rejected** (it recreates the current single-credential surface).

> This feasibility task does **not** claim T6 is complete. T6 (production
> switchover) is BLOCKED on a topology decision (choose one of A–D) and a
> fresh T6-dedicated review.

---

## 7. How to run (harness)

```bash
# prerequisites (once)
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python \
  "neo4j-agent-memory[sentence-transformers,mcp]==0.6.0" mcp
# harness container up (disposable, brainv2-neo4j-test, bolt 127.0.0.1:7688)

# gate: RED -> GREEN
bash scripts/tests/brain/gateway-feasibility.test.sh
```

The gate wipes the disposable DB each run (`GATEWAY_TEST_CLEAN=1`, set `0` to
inspect accumulation). Expected GREEN: probe 13/13, shell 11/11, exit 0.

---

## 8. Decisions, limitations, follow-ups

- The supersede path uses the SDK's own `add_fact` for the replacement
  (embedding + dedup semantics preserved) and one hardcoded allowlisted write
  to invalidate the prior fact (`valid_until`, `superseded_by`, metadata
  markers). No client Cypher.
- Same-subject dedup: if the new object is semantically near-identical to the
  old triple, `add_fact` may update the existing node instead of creating a
  fresh one (SDK semantics, unchanged). Distinct new values create a fresh
  Fact, as exercised.
- Known noise: the SDK emits "LLM extractor not available" on connect because
  entity extraction has no LLM provider installed in the harness venv. It is a
  warn-and-skip; unrelated to fact paths. Silence it later by wiring an LLM
  adapter or by disabling extraction at the extractor layer.
- Follow-ups: carry the 14 PENDING tools as bounded batches; decide session
  strategy; implement restricted `memory_export_graph` bounds; then T6 with a
  topology decision from §6.