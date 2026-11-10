# BrainV2 — Shared Multi-Agent Memory & Coordination Implementation Plan

Status: PROPOSED (awaiting user approval). No implementation until approved.
Scope: shared multi-agent memory + coordination system. NOT Career Expo product reasoning.
Author: KIRO-LEAD. Baseline accepted from the read-only gap analysis (2026-09-19).

> Planning-only guardrails: do not modify the live database, run schema
> migrations, or install infrastructure while this document is being produced or
> reviewed. Every task below performs its DB work against a **throwaway** Neo4j
> instance until an explicit, approved, backed-up rollout step.

---

## 0. Verified baseline (evidence)

- Neo4j **5.26.30 Community**, single Windows node over Tailscale `bolt://100.99.119.124:7687` (`dbms.components()`). Community = **no fine-grained graph privileges**.
- **neo4j-agent-memory 0.6.0** (uvx). MCP profile `extended`, `--session-strategy persistent`, `--user-id career-expo`, `--no-auto-preferences`, embedding `BAAI/bge-small-en-v1.5` (384-dim).
- **35 indexes / 12 uniqueness constraints** (migration snapshot). 7 VECTOR (384-dim COSINE HNSW m=16 efc=100 quantization=on `vector-2.0`). **No FULLTEXT index.**
- Node counts: Fact 51, Message 16, ReasoningTrace 4, Conversation 3, ReasoningStep 3, Preference 1, Tool 1, ToolCall 1. No Entity/User nodes yet.
- **Dual-writer split:** 49 Facts MCP-written (embedding; `subject/predicate/object/confidence/created_at/metadata`); 2 Facts `oc-memory`-written (`ns`, `mtype`, `status`, `supersedes`; **no embedding**). Same `:Fact` label + `fact_id` uniqueness.
- **MCP Facts are orphan nodes** (no relationships) — confirmed. Migration = additive property backfill, no relationship rewiring.
- Code: `scripts/oc-memory` (coordination writer, remote cypher-shell client, `MEMORY_DEGRADED` exit 3, secrets filter, non-destructive supersede/resolve), `scripts/oc-dispatch` (worktree/branch per task, filesystem run-record concurrency guard `task_active()`, `MAX_CONCURRENT=4`, records `base_sha`/`resulting_head`), `scripts/oc-worker` (free-model allow-list, cooldowns). Real task classes: `repo_implementation, backend_runtime, integration, repo_exploration, debugging, architecture`; `--class-tag implementation|tests|refactor|debug|investigation`.
- `docs/coordination/MEMORY_PROTOCOL.md` = authority model + lifecycle conventions (not schema-enforced).

---

## 1. Corrected architecture decisions

### 1.1 One logical memory interface (Correction 1)
Introduce a single **Memory Gateway** (`scripts/oc-brain` + a small Python module the MCP-side can share) that is the ONLY sanctioned read/write route. Both the MCP tools and `oc-memory` become **backends behind the gateway**, not independent front doors.

Chosen model to fix the dual-writer incompatibility (minimizes schema duplication, preserves 0.6.0 compatibility):
- **Keep the single `:Fact` label** (agent-memory 0.6.0 owns it; do not fork it).
- Add an **additive `memory_class` property** on Fact: `SEMANTIC` (embedded, agent-memory managed) vs `COORDINATION` (operational, oc-memory managed). Existing 49 stay `SEMANTIC`, existing 2 become `COORDINATION` via backfill.
- Add a secondary label **`:Coordination`** to coordination facts ONLY, so `oc-memory` scans (`MATCH (f:Fact {ns})`) can be tightened to `(:Coordination)` and a **FULLTEXT index targets `:Coordination`** without touching agent-memory's vector path.
- **Do not auto-embed every operational event.** Coordination facts become discoverable via **exact (`ns`,`mtype`,`status` RANGE) + full-text (`subject`,`object`)**. Only *promoted* durable knowledge (DECISION, VERIFIED_CORRECTION, TASK_OUTCOME summaries) is optionally embedded on demand through the gateway.
- **Compatibility adapter over normalization:** the gateway maps a common record shape to whichever backend owns it, rather than rewriting agent-memory's property names. No agent-memory schema is renamed.

Rejected: normalizing agent-memory's property names (breaks 0.6.0), or embedding all coordination events (cost + noise, violates Correction 1).

### 1.2 Trusted Gateway is mandatory (Correction 3)
- **Trusted project identity:** `project_id` is derived by the gateway from the **repo remote/worktree**, never accepted from an agent argument.
- **Three separated concerns:** (a) retrieval scoping, (b) write authorization, (c) tool discovery — distinct code paths, distinct config.
- **Every route documented** (see §4). Direct MCP, direct `oc-memory`, and raw DB credentials must not bypass project/authorization checks: enforced by (1) gateway as the only path used by orchestration, (2) a dedicated **least-privilege gateway DB user** whose credentials are the only ones distributed to orchestration; raw `neo4j` superuser stays out of agent environments.
- **Untrusted content:** retrieved memory carries provenance and is wrapped in explicit instruction boundaries before injection; sanitization is defense-in-depth, **not** the only control (Correction 3). No secrets, no unnecessary candidate PII stored.
- **Fail closed:** security/integrity checks never disabled as rollback (Correction 8).

### 1.3 Idempotency model (Correction 4)
- Each intended action gets a **client-generated `operation_id` (UUID)** created once and **reused on retry**.
- **Payload hash tracked separately** as `payload_sha256`.
- Gateway rule: `same op_id + same payload → return existing result (idempotent)`; `same op_id + different payload → CONFLICT (refuse)`.
- Handles the **lost-response** case: after a commit the client may not see the ack; retry with the same `op_id` observes the committed `:Operation` node and returns success rather than double-writing.

### 1.4 Concurrency in the MVP (Correction 2)
MVP MUST prevent duplicate task claims and unsafe authoritative transitions. Two supported modes:
- **Single-dispatcher mode (default):** documented, enforced limitation — one dispatcher host at a time; a `:DispatcherLock` singleton with lease.
- **Multi-dispatcher mode (opt-in):** requires the full lease + renewal + fencing token set.
Primitives (do NOT assume MERGE or MATCH-WHERE-SET alone are sufficient — Correction 2):
- Uniqueness constraint on `TaskClaim.task_id`.
- Atomic acquisition: single-statement `MERGE ... ON CREATE SET owner,fence,lease_until` returning whether THIS caller created it; ownership re-verified before any privileged write.
- Version updates guarded by **compare-and-set inside an explicit transaction**, with `constraint`-backed `version` monotonicity; conflicting concurrent writers get a retriable error, not a silent overwrite.
- Fencing token (`fence` epoch) included in every privileged write; a write with a stale fence is rejected.

### 1.5 Provenance & stale-state (Correction 5)
- Git stays authoritative. A commit not reachable from the current branch is a **STALENESS_CANDIDATE**, never proof the memory is false.
- Four provenance scopes on memory: `PROJECT_ARCHITECTURE` (branch-independent), `BRANCH_OBSERVATION` (branch-specific), `HISTORICAL_DECISION` (time-anchored), `TASK_STATUS` (current, Git-verifiable).
- Provenance + `verified` explicit on **both** writer paths.
- Worker "COMPLETE" claims never auto-promote to authoritative completion — Git diff/commit is the promoter (already true in `oc-dispatch inspect_completion`; make it a hard gate).

### 1.6 Isolation compatible with retrieval (Correction 6)
- Test isolation independently for **exact, full-text, vector, graph-expanded**.
- **Avoid global top-k then filter** (silently drops project results). Instead: pre-scope candidate set by `project_id` where the 5.26 vector procedure allows, and **over-fetch k then verify**, or maintain per-project retrieval and fuse. Choose after benchmarking (§6). 5.26.30-compatible features only.

### 1.7 Recovery (Correction 7) & rollout (Correction 8)
- Community offline dump scheduling + downtime window; DB + system/auth recovery; separate backup storage; integrity verification; isolated restore drills; recovery monitoring/alerts; **measured** RPO/RTO (not asserted until tested).
- Rollout order: baseline → verified backup → isolated implementation → failing tests → passing tests → compatibility verification → shadow retrieval → approval → gradual rollout. Keep existing read/write available during migration; feature-flag retrieval changes; security/integrity **fail closed**.

---

## 2. MVP vs Future-scale split

**Minimum Viable BrainV2 (T1–T9):**
- Unified gateway + compatibility adapter (no data loss).
- Coordination discoverability via exact + full-text.
- Minimum concurrency: task-claim uniqueness, atomic acquisition, safe version transitions, operation-ID idempotency, conflict detection, unknown-commit handling, single-dispatcher lock (leases/fencing only if multi-dispatcher enabled).
- Trusted project isolation + least-privilege gateway user + untrusted-content boundary.
- Provenance/scope + stale-candidate flag; Git-gated completion.
- Backup + isolated restore drill + monitoring; measured RPO/RTO.
- Throwaway-DB harness, retrieval benchmark, deployment checklist.

**Future-scale (F1–F5, optional, only if justified by measured growth):**
- Multi-dispatcher leases/renewal/fencing hardening at scale.
- Versioned embeddings + safe re-embedding pipeline; consolidation nodes (no LLM-triggered destructive merges).
- Multi-project namespaces + per-project retention/quarantine.
- Semantic retrieval for selected coordination facts.
- HA/managed or Enterprise Neo4j (fine-grained privileges) — only after benchmark justifies.

---

## 3. Sequenced, independently testable tasks

Each task: Priority · Prerequisites · Existing locations · Files to change · Design/migration · Acceptance tests · Perf/ops cost · Compatibility risk · Rollback · Complexity. All DB work targets the throwaway harness (T0) until T9.

### T0 — Throwaway-DB test harness  [Priority: Immediate · Prereq: none]
- Locations: new `scripts/tests/brain/` ; reuse transport pattern from `scripts/oc-memory` `cy()`.
- Files: `scripts/tests/brain/harness.sh`, `docker-compose.brain-test.yml` (Neo4j **5.26.x Community** container, ephemeral volume), `scripts/tests/brain/seed.cypher`.
- Design: spin an isolated 5.26 Community container with **localhost-only ports (e.g. 7688/7475), a separate named volume, and test-only credentials**; apply the exact 35-index/12-constraint snapshot; seed **synthetic data only** (both Fact classes) — no production data, no mounting of any production volume, no use of `neo4j-backup/`. Never touches production; teardown wipes the volume. Only this isolated DB may be reset/destroyed.
- Acceptance (DEMONSTRATED 2026-09-19): harness `SHOW INDEXES/CONSTRAINTS` = **35 indexes / 12 constraints**, with **exact type composition parity** vs production: 2 LOOKUP (auto), 1 POINT, 26 RANGE, 6 VECTOR. Vector indexes 384-dim COSINE. `harness down` removes the isolated volume. (Correction: production has 6 VECTOR indexes, not 7 as an earlier gap-analysis note stated; the corrected figure is what both production and harness show.)
- Cost: local Docker only. Compatibility risk: none (matches prod minor). Rollback: delete harness dir. Complexity: **M**.

### T1 — Memory record contract + compatibility adapter (no writes)  [Immediate · Prereq: T0]
- Locations: new `scripts/oc-brain` + `tools/brain/adapter.py`; mirrors record shape of `oc-memory cmd_write` and MCP `memory_add_fact`.
- Files: `scripts/oc-brain`, `tools/brain/adapter.py`, `docs/coordination/BRAIN_GATEWAY.md` (route table).
- Design: define common record `{op_id, project_id, memory_class, kind, subject, predicate, object, status, scope, provenance{branch,commit_sha,agent_id,verified}, payload_sha256}`; adapter maps SEMANTIC→agent-memory props, COORDINATION→oc-memory props (+`:Coordination`, `memory_class`). No embedding unless `embed=true`.

- **VERIFIED MCP integration (2026-09-19, inspected 0.6.0 source — NOT an assumption).** The stock MCP server (`neo4j_agent_memory/mcp/server.py`) supports two backends selected at launch:
  - `backend="neo4j"` — direct Bolt (CURRENT production mode; reads `NEO4J_URI/USER/PASSWORD/DATABASE`).
  - `backend="nams"` — a **remote HTTP service** (`NamsBackend`→`HttpTransport`→`endpoint`+API key via `StaticApiKeyAuth`). Selected via `MEMORY_ENDPOINT` + `MEMORY_API_KEY`. The NAMS wire protocol supports a lightweight **"bridge"** mode (method-named routes) in addition to REST `/vN`.
  - **Consequence:** the gateway does NOT work by "sharing a Python module" (that would NOT redirect MCP calls — confirmed). It works by running the stock MCP in **`nams` mode pointed at `oc-brain`'s HTTP endpoint**. The agent's MCP client then holds only a gateway API key, never Bolt creds; `oc-brain` enforces scoping/authorization and talks to Neo4j.
- **Two integration options (decide in T1 spike):**
  1. **NAMS-bridge gateway (preferred):** implement the minimal bridge-protocol HTTP surface `HttpTransport` calls; stock MCP unchanged, just reconfigured to `nams`. Pro: no MCP fork, real credential isolation. Con: must track the 0.6.0 NAMS bridge contract (`nams/endpoints.py`, `transport.py`, `_serialization.py`); version-coupled.
  2. **Replacement tool surface:** ship our own MCP server exposing the same tool names, backed by `oc-brain`. Pro: full control. Con: we own the whole MCP tool surface + must preserve Kiro/OpenCode compatibility.
- **T1 SPIKE RESULT (VERIFIED 2026-09-19, worker BRAINV2-T1-MCP-SPIKE, commit c437327 on branch worker/brainv2-t1-mcp-spike; test `scripts/tests/brain/mcp-integration.test.sh` 10/10, independently re-run by Kiro = 10/10).**
  - Stock MCP in `nams` mode DOES round-trip **messages / short-term memory** through a gateway (store_message → get_context → search_messages), persisting to harness Neo4j. Credential isolation is real: client holds only the gateway API key.
  - **BLOCKER for Facts/Preferences:** in stock 0.6.0, `add_fact`/`search_facts`/`add_preference`/`search_preferences` raise `NotSupportedError` **client-side** and NEVER reach the gateway wire ("NAMS does not expose a facts endpoint"). `memory_add_entity` also fails on NAMS via an integration tuple-unpack bug. `memory_search` default types include preferences → errors on NAMS.
  - **Impact:** BrainV2 coordination + semantic memory is Fact-based. Therefore **Option 1 (NAMS-bridge) CANNOT be the gateway for the memory that matters without patching the package.** It only covers conversation messages.
- **REVISED integration decision (supersedes the earlier "preferred Option 1"):** the NAMS-bridge path is INSUFFICIENT alone. Viable alternatives, in preference order:
  1. **Replacement/proxy MCP tool surface (now preferred):** ship an `oc-brain` MCP server that exposes the same `memory_*` tool NAMES (Fact/Preference/Entity included), enforces project scoping + auth + untrusted-content handling, and talks to Neo4j itself. Kiro + OpenCode point at `oc-brain` instead of the stock server. Preserves Fact support; we own the tool surface. Must verify Kiro+OpenCode discovery of the replacement tools.
  2. **Hybrid:** keep stock MCP in `neo4j` (Bolt) mode for the rich Fact/embedding features, and put enforcement at a **network/credential boundary + `oc-brain` for all orchestration writes**, documenting the residual bypass risk (a Bolt-password holder can bypass — Community limitation). Lower build cost, weaker in-band enforcement.
  3. **Patch/fork 0.6.0** to add NAMS facts/preferences transport — highest maintenance cost, version-coupled; only if a pure-service boundary is mandatory.
- **T6 (security gate) depends on this choice.** Recommendation to user at the T1–T3 checkpoint: pursue Option 1 (replacement tool surface) as the enforceable gateway; confirm before building T6 on it.
- Acceptance (harness): messages round-trip proven (DONE). Fact/Preference round-trip through the chosen gateway is the remaining T1 acceptance criterion (pending decision).
- Cost: none in prod. Compatibility risk: **medium/high** (Fact support requires replacement surface or fork). Rollback: revert MCP to `neo4j` backend (existing behavior); direct writers still work. Complexity: **L**.

### T2 — No-data-loss migration + rollback for existing 51 Facts  [Immediate · Prereq: T1]
- Locations: live schema (read-only until rollout); `oc-memory` fact props.
- Files: `scripts/tests/brain/migrations/001_backfill.cypher`, `.../001_rollback.cypher`, `docs/.../BRAIN_MIGRATION.md`.
- Design (idempotent, additive): (a) `SET f.memory_class='SEMANTIC'` for `f.embedding IS NOT NULL AND f.ns IS NULL`; (b) for `f.ns IS NOT NULL`: `SET f:Coordination, f.memory_class='COORDINATION'`; (c) backfill `project_id` from trusted identity for existing career-expo facts; (d) add `provenance`/`scope` defaults where absent. **Preserve all existing properties and relationships.**
- **Validation data source: SYNTHETIC ONLY in T2.** The migration + rollback are proven against the synthetic seed (which reproduces the 49-SEMANTIC / 2-COORDINATION shape). Testing against a real production dump is a SEPARATE, explicitly-approved stage — see **T2b**. Do NOT use `neo4j-backup/neo4j.dump` or any production data in T2.
- Acceptance (synthetic harness): before/after node+property+relationship counts identical except added fields; synthetic 49 SEMANTIC + 2 COORDINATION classified correctly; rollback removes only added fields/labels and restores exact pre-state; migration is idempotent (re-run is a no-op).
- Cost: seconds. Compatibility risk: **low**. Rollback: `001_rollback.cypher` (only unsets added fields/labels; never deletes Facts). Complexity: **M**.

### T2b — Restored-dump migration rehearsal (GATED, separate approval)  [Next phase · Prereq: T2 green + explicit user approval]
- Purpose: rehearse the migration against a COPY of real production data before any live rollout, to catch data-shape surprises synthetic data cannot.
- **Preconditions (all required):** explicit user approval for this stage; a fresh verified backup; use of a **copy** of the dump imported into the disposable harness's separate volume. **Never mount the production volume. Never modify the live DB. Do not use `neo4j-backup/neo4j.dump` without explicit approval naming that file.**
- Design: `neo4j-admin database load` the approved dump copy into the isolated harness (localhost-only, test creds), run `001_backfill.cypher`, verify counts and no-loss, run `001_rollback.cypher`, verify exact restoration. Teardown wipes the test volume.
- Acceptance: real-shaped data migrates with zero loss; rollback restores; dry-run report captured for the pre-deployment package.
- Cost: minutes + disk for the copy. Compatibility risk: **low** (isolated). Rollback: destroy harness volume. Complexity: **M**.

### T3 — Coordination retrieval: exact + full-text index  [Immediate · Prereq: T2]
- Locations: no fulltext today (`SHOW INDEXES`).
- Files: `scripts/tests/brain/migrations/002_fulltext.cypher`, gateway read path in `oc-brain`.
- Design: `CREATE FULLTEXT INDEX coordination_fulltext FOR (c:Coordination) ON EACH [c.subject, c.object]` (5.26 syntax; **no 2026.x `SEARCH`**). Gateway exposes exact (`ns/mtype/status`) + `db.index.fulltext.queryNodes`. Do not embed coordination by default.
- Acceptance: coordination fact retrievable by exact filter AND fulltext token that vector search would miss; agent-memory vector path unaffected.
- Cost: tiny index. Compatibility risk: **low**. Rollback: `DROP INDEX coordination_fulltext`; gateway falls back to exact-only. Complexity: **S**.

### T4 — Operation-ID idempotency + conflict detection  [Immediate · Prereq: T1]
- Locations: gateway write path; new `:Operation` node.
- Files: `oc-brain` write path, `tools/brain/adapter.py`, `scripts/tests/brain/idempotency.test.sh`.
- Design: uniqueness constraint on `Operation.op_id`. Write = single tx: `MERGE (o:Operation {op_id}) ON CREATE SET o.payload_sha256, o.result, o.created_at`; if existed and `payload_sha256` matches → return `o.result`; if differs → `CONFLICT`. Retry reuses `op_id`.
- Acceptance (harness): same op_id+payload twice → one Fact, one result; same op_id+different payload → CONFLICT; **simulated lost-response** (commit then drop ack) → retry returns committed result, no duplicate.
- Cost: 1 extra node/write. Compatibility risk: **low**. Rollback: disable op-node write (idempotency off) — but keep uniqueness constraint. Complexity: **M**.

### T5 — Minimum concurrency: real single-host lock + atomic claims + safe transitions  [Immediate · Prereq: T4]
- Locations: `scripts/oc-dispatch` `task_active()`/`cmd_dispatch`; `oc-memory cmd_supersede`.
- Files: `oc-dispatch` (single-host lock + claim before worktree), `oc-brain` claim API, `scripts/tests/brain/concurrency.test.sh`.
- Design (D1 = single authoritative dispatcher, multiple concurrent workers):
  - **Single-host dispatcher lock is a REAL OS process lock**, not a DB row. NOTE: `flock(1)` is NOT available on macOS (util-linux only; verified absent 2026-09-19). Use a portable advisory lock via **`python3 fcntl.flock(LOCK_EX|LOCK_NB)`** on `.orca-opencode/dispatcher.lock` held for the dispatcher's lifetime (kernel-backed, released on process death). A second dispatcher process on the same host fails to acquire and exits. (`/usr/bin/shlock` exists but is PID-file based and weaker; not used.) This is the MVP authority boundary.
  - **Atomic task claim (guards concurrent WORKERS, not hosts):** uniqueness constraint `TaskClaim.task_id`; acquire via single-statement `MERGE (t:TaskClaim {task_id}) ON CREATE SET t.owner,t.claimed=true,t.claimed_at` and check whether THIS caller was the `ON CREATE` writer (return the created flag); ownership re-verified before any privileged write. Uniqueness constraint makes a duplicate claim fail deterministically even if two workers race.
  - **Safe version transitions under concurrent load:** supersede/status updates run inside an **explicit write transaction** doing compare-and-set: `MATCH (n {id}) WHERE n.version=$expected SET n.version=n.version+1, n.status=$new`; zero rows updated ⇒ retriable conflict with bounded jittered backoff. Correctness does NOT rely on MERGE or MATCH-WHERE-SET alone — the tx boundary + CAS + retry provide the semantics, proven by the concurrent-load test.
  - **DB-backed lease/fencing is OUT of MVP.** It is only introduced in F1 (multi-dispatcher), and only as a COMPLETE implementation: `lease_until` + active renewal heartbeat + monotonic `fence` token included in and validated on every privileged write. No half-implemented lease ships. Until F1, multiple independent dispatcher HOSTS remain disabled and documented as unsupported.
  - Unknown commit outcome reconciled from Git (`resulting_head`), never from worker claim.
- Acceptance (disposable harness, deterministic simultaneous writers): two dispatcher processes on one host → exactly one acquires `flock`, other exits; N concurrent workers claim same task → exactly one `ON CREATE` wins, others get claim-held; **concurrent-load version test**: M parallel writers CAS the same node → `version` increments exactly M times with no lost update, each loser retries and converges; no reliance on MERGE/MATCH-WHERE-SET alone (test injects interleaving). F1 lease tests (renewal + fencing rejection of stale token) exist but are gated OFF in MVP.
- Cost: 1 flock + 1–2 statements per dispatch/claim. Compatibility risk: **medium** (dispatch path). Rollback: see §12 — fail-closed to single-host lock; never to the old duplicate-permitting filesystem-only guard. Complexity: **L**.

### T6 — Trusted Memory Gateway: service + credential/network isolation boundary  [Immediate · Prereq: T1,T3]
- Locations: `opencode.json` (MCP creds), `oc-memory`/`oc-dispatch` call sites, transport in `oc-memory` `cy()`.
- Files: `oc-brain` (enforcement), `docs/coordination/BRAIN_GATEWAY.md` (route table + enforceability matrix), `scripts/tests/brain/bypass.test.sh`. **No prod credential/MCP change during planning.**
- Design — CORRECTED for Neo4j Community (no role-based least-privilege DB users):
  - **The security boundary is a trusted SERVICE plus credential/network isolation, NOT a Neo4j role.** Community cannot enforce label/property/read-only privileges per user, so a "gateway DB user" is NOT a restricted role and must not be presented as one.
  - **Enforcement model:** all sanctioned orchestration access goes through `oc-brain`, which derives `project_id` from **trusted repo/worktree identity** (never from an agent-supplied argument), applies scoping/authorization/PII+secret refusal, wraps retrieved content with provenance + explicit instruction boundaries, and fails closed.
  - **Bypass surfaces that MUST be addressed (or documented as unenforceable):** direct MCP tools, `graph_query`, `cypher-shell`, raw Bolt with the DB password. Because any holder of `NEO4J_PASSWORD` can bypass the gateway on Community, the only real controls on this Mac/Windows topology are: (1) **credential isolation** — keep the Bolt password out of worker/agent environments; workers reach memory ONLY via the `oc-brain`/`oc-dispatch` injection path, not by holding Bolt creds; (2) **network isolation** — Windows Bolt is Tailscale-only; restrict which hosts/identities can reach `100.99.119.124:7687`; (3) **no raw superuser in agent contexts**.
  - **Explicit limitation to document:** on Neo4j Community, an agent that obtains the Bolt password CAN bypass the gateway; there is no in-database enforcement. Full in-DB least-privilege requires Enterprise (future-scale F5) and is out of scope. This limitation is stated in `BRAIN_GATEWAY.md` and is NOT claimed as solved.
- Acceptance (harness) — isolation is NOT claimed secure until bypass tests pass: agent-supplied `project_id` ignored in favor of trusted identity; cross-project read via gateway denied; **bypass tests** confirm a worker context has no Bolt credentials and cannot open a direct Bolt/cypher-shell session; injected content cannot alter worker instructions; PII/secret payload refused; enforcement cannot be disabled as a rollback (§12).
- Cost: per-call checks + credential-handling change. Compatibility risk: **medium** (must preserve `MEMORY_DEGRADED`). Rollback: §12 fail-closed only. Complexity: **L**.

### T7 — Provenance, scope & stale-candidate logic  [Next phase · Prereq: T2,T5]
- Locations: both writer paths; `oc-dispatch inspect_completion`.
- Files: `oc-brain` provenance API, `oc-memory` write props, `scripts/tests/brain/provenance.test.sh`.
- Design: four scopes (`PROJECT_ARCHITECTURE|BRANCH_OBSERVATION|HISTORICAL_DECISION|TASK_STATUS`); explicit `verified` + `commit_sha` + `branch` + `agent_id` on both paths. Read-time: if `commit_sha` not reachable from current branch → tag result `STALENESS_CANDIDATE` (not false). Completion promoted only when Git shows a new commit (hard gate).
- Acceptance: unreachable-commit memory returns flagged not dropped; architecture-scope memory returned regardless of branch; worker COMPLETE without commit is NOT promoted.
- Cost: read-time git check (cache). Compatibility risk: **low**. Rollback: disable stale flag (still store provenance). Complexity: **M**.

### T8 — Isolation-aware retrieval + benchmark integration  [Next phase · Prereq: T3,T6]
- Files: `oc-brain` retrieval fusion, `scripts/tests/brain/isolation.test.sh`, benchmark hook (§6).
- Design: exact/full-text/vector/graph tested independently; avoid global-topk-then-filter — pre-scope by `project_id` or over-fetch+verify; 5.26-compatible only; benchmark before proposing any DB upgrade.
- Acceptance: cross-project recall = 0 across all four retrieval modes; project-scoped recall not silently reduced vs unfiltered baseline on the labeled set.
- Cost: measured (§5 latency layers). Compatibility risk: **low**. Rollback: feature-flag fusion → vector-only. Complexity: **L**.

### T9 — Recovery + rollout enablement (gated)  [Next phase · Prereq: T2–T8 green on harness]
- Files: `docs/.../BRAIN_RECOVERY.md`, `docs/.../BRAIN_DEPLOYMENT_CHECKLIST.md`, backup scripts (Windows-side, documented).
- Design: offline Community `neo4j-admin database dump` schedule + downtime window; DB + system/auth recovery; separate backup storage; integrity verification; isolated restore drill; monitoring/alerts; **measure** RPO/RTO. Rollout per §1.7 with verified backup + shadow retrieval + explicit approval before live migration.
- Acceptance: restore drill on isolated instance reproduces graph; measured RPO/RTO recorded (targets NOT claimed until measured); shadow retrieval matches legacy before cutover.
- Cost: scheduled downtime for dumps. Compatibility risk: **medium** (operational). Rollback: keep legacy read/write live; fail closed on security. Complexity: **L**.

---

## 4. Permitted read/write route table (to finalize in BRAIN_GATEWAY.md)

| Route | Path | Auth | Scope source |
|---|---|---|---|
| Coordination write | agent → `oc-brain` → oc-memory backend | gateway user | trusted project_id |
| Semantic write (opt-in) | agent → `oc-brain` (embed=true) → agent-memory | gateway user | trusted project_id |
| Retrieval | agent → `oc-brain` fusion | gateway user | trusted project_id |
| Direct MCP tools | discouraged; discovery only | gateway user | gateway-enforced |
| Raw superuser | operators only, off agent hosts | `neo4j` | n/a |

Direct `oc-memory`/MCP writes that bypass scoping are disallowed in orchestration once T6 lands.

## 5. Latency measurement (report separately, p50/p95)
DB time · network time · embedding time · agent-visible time. No sub-ms target.

## 6. Retrieval benchmark specification
Labeled set: `{query → expected memory_ids, project_id}`. Metrics: recall@k, precision@k, cross-project leakage (must be 0), per-mode (exact/full-text/vector/graph). Run on harness with production-shaped seed. Benchmark BEFORE any DB-upgrade proposal.

## 7. Production deployment checklist (gate order)
baseline snapshot → verified backup (integrity-checked) → isolated implementation on harness → failing tests written → passing tests → compatibility verification (MCP + oc-memory still work) → shadow retrieval parity → user approval → gradual rollout → post-rollout monitoring. Security/integrity fail closed throughout.

## 8. oc-dispatch worker decomposition (Kiro remains lead)
Sequential where file ownership overlaps; parallel only when disjoint.

- **W1 (T0 harness)** — `--class repo_implementation --class-tag tests` — disjoint (new dir). Parallel-safe.
- **W2 (T1 adapter+contract)** — `--class repo_implementation --class-tag implementation`. Prereq W1.
- **W3 (T2 migration+rollback)** — `--class backend_runtime --class-tag implementation`. Prereq W2. SEQUENTIAL (schema).
- **W4 (T3 full-text)** — `--class backend_runtime --class-tag implementation`. Prereq W3. SEQUENTIAL (schema).
- **W5 (T4 idempotency)** — `--class repo_implementation --class-tag implementation`. Prereq W2. Parallel with W4 (disjoint files).
- **W6 (T5 concurrency)** — `--class backend_runtime --class-tag implementation`. Prereq W5. SEQUENTIAL (dispatch path).
- **W7 (T6 gateway/security)** — `--class backend_runtime --class-tag implementation`. Prereq W2,W4. SEQUENTIAL (security). Independent reviewer required (high-risk).
- **W8 (T7 provenance)** — `--class repo_implementation --class-tag implementation`. Prereq W3,W6.
- **W9 (T8 isolation+benchmark)** — `--class integration --class-tag tests`. Prereq W4,W7.
- **W10 (T9 recovery/rollout docs)** — `--class architecture --class-tag investigation`. Prereq all green.
- **Review:** independent `task_reviewer` per meaningful task; `high_risk_reviewer` for W3, W6, W7, W9, W10.

Each worker: work only in its worktree, smallest correct change, RED→GREEN→REFACTOR, verify on harness, write durable handoff to project-memory, report via Orca. No worker touches the production DB.

## 9. Compatibility & risk summary
- All schema changes additive; agent-memory 0.6.0 property names untouched.
- 5.26.30-only features (fulltext procedures, single-statement MERGE, explicit tx CAS). No 2026.x `SEARCH`.
- Highest-risk tasks: T5 (concurrency), T6 (security) — sequential + high-risk review + fail-closed.
- No infra install, no live migration, no production writes during planning or harness phases.

## 12. Rollback guarantees (CONFIRMED — correction 5)Rollback must NEVER reintroduce a state that permits duplicate task claims, unauthorized project access, or cross-project retrieval. Two and only two acceptable rollback modes:

1. **Revert to a previously VERIFIED-SECURE implementation** (a prior release that already passed the concurrency + bypass tests), or
2. **Fail closed** — deny the operation / degrade to `MEMORY_DEGRADED` rather than fall back to an insecure path.

Concrete rules:
- **T5 rollback** never returns to the old filesystem-only `task_active()` guard as the sole control (it permits cross-host duplicates). It fails closed to the real single-host `flock` lock + `TaskClaim` uniqueness, or blocks.
- **T6 rollback** never disables gateway enforcement, credential isolation, or project scoping. Security/integrity fail closed. Disabling enforcement is explicitly NOT a valid rollback and is asserted against in tests.
- **T2/T2b rollback** only unsets additive fields/labels; it never deletes Fact records and never reduces access control.
- Any rollback that would weaken a security or concurrency guarantee blocks the rollout instead.

## 10. Decisions (CONFIRMED by user 2026-09-19)

**D1 — Single authoritative dispatcher, multiple concurrent workers.** Real single-dispatcher lock, atomic task claims, idempotency, safe state transitions. "Single dispatcher" does NOT mean single worker. Multiple independent dispatcher HOSTS stay disabled until leases + renewal + fencing are implemented AND tested (future-scale F1).

**D2 — Backups: daily during an agreed maintenance window + mandatory pre-migration backup.** Include system/auth recovery, separate backup storage, integrity checks, isolated restore drill. Measure actual backup downtime and restore duration; never claim RPO/RTO without evidence. Do NOT auto-stop the live Windows DB until the downtime procedure is approved separately.

**D3 — Local disposable Neo4j test harness APPROVED.** Separate volumes, separate credentials, localhost-only ports. Never mount production volumes or modify the live DB. Synthetic/sanitized data only. Only the isolated test DB may be reset/destroyed.

## 11. Execution authorization & hard constraints (CONFIRMED)

Authorized now (safe preparation): final plan review, harness creation, read-only baseline capture, writing failing tests, isolated implementation/validation that cannot affect production.

Requires SEPARATE approval (blocked): deploy to live Windows DB, live schema migration, switching production MCP config, removing rollback infrastructure.

Invariants preserved: existing 51 Fact records, Agent Memory 0.6.0 compatibility, both writing interfaces, BAAI/bge-small-en-v1.5 embedding, existing 384-dim vector indexes unchanged.

Before first production deployment, present: full test results, actual DB changes, migration dry-run results, backup+restore verification, security+concurrency test results, retrieval benchmark comparison, rollback procedure.

Kiro remains team lead: delegate implementation via OpenCode/Orca in isolated worktrees; review each result. Concurrency (T5) and security (T6) require independent high-risk review.

## 13. Production-data freeze during isolated development (CONFIRMED — correction 2)

Distinguish two separate invariants:
- **Production schema/configuration unchanged** — verified continuously (35 indexes / 12 constraints / MCP config / BGE Small).
- **Production DATA unchanged** — the earlier 3 sanctioned MCP checkpoint writes increased the production Fact count 51→53. That was before this correction.

**Policy for the remainder of isolated development (T1–T9 prep):**
- Do NOT write new Facts to production project-memory. Record worker progress in **Git, local run records (`.orca-opencode/runs`, telemetry), and checkpoint reports** only.
- Writing to production memory now requires **separate explicit authorization** (treated as a mandatory stopping condition, like production schema changes).
- The disposable harness is the only DB that development writes touch.
- Production remains readable (read-only `graph_query`/`memory_search`) for verification that it stays unchanged.

## 14. T6 target architecture — Option A + D-style network (DECISION 2026-09-19)

**Target:** `Mac Kiro/OpenCode → authenticated private MCP transport → Windows oc-brain gateway → existing Windows Neo4j`.

Authorization scope: isolated DESIGN + implementation + testing on a disposable gateway environment ONLY. NOT authorized: installing Windows services, changing firewall/Tailscale Serve, altering credentials, or deploying on the production Windows host. Production-memory freeze stays; T2b stays blocked.

**Requirements:**
- Neo4j credentials remain on the trusted Windows side; agent processes get NO raw Neo4j credential.
- Gateway runs under a dedicated, isolated service identity where supported (Windows service account).
- All agent-accessible memory ops enforce project authorization from trusted server-side config / authenticated identity — NOT an agent-supplied `project_id`.
- No unrestricted `graph_query`/raw Cypher tool exposed.
- BGE Small, existing embeddings, Agent Memory 0.6.0, existing graph data remain compatible.
- No extra Windows DB/VM/infra unless feasibility testing proves it necessary.

**CONFIRMED bypass finding (read-only, 2026-09-19):** There is currently **NO Tailscale Serve config**. The Mac reaches Windows Neo4j Bolt **directly over the raw tailnet** — `nc -z 100.99.119.124 7687` SUCCEEDS. So Bolt is exposed to every tailnet node. **Moving the gateway to Windows does NOT close this route by itself** (as warned). Bypass-closure plan (design only, no prod change yet):
- Bind Neo4j Bolt to Windows loopback (`127.0.0.1:7687`) so only the co-located gateway connects; OR
- Tailscale ACL / host firewall restricting `:7687` to the gateway identity only; expose ONLY the gateway's authenticated MCP transport over the tailnet.
- Keep the existing local Docker rollback stopped.

**Threat-model boundary (explicit):** isolation is claimed against a NON-privileged agent/tailnet host. It is NOT claimed against an actor with Windows administrator, Docker administrator, or tailnet-admin privileges — such an actor can always reach the DB or credential. Documented, not defended against.

**Credential ownership / service identity (target):** Neo4j password stored only on Windows (service account secret store / DPAPI or restricted file under the gateway service user); never transmitted to Mac; never in agent env/argv/MCP wire. Agents authenticate to the gateway with a separate gateway token/identity.
