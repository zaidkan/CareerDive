#!/usr/bin/env python3
"""oc-brain: replacement MCP tool surface for BrainV2 T1 (feasibility harness).

A minimal MCP gateway that reuses the ``neo4j-agent-memory`` 0.6.0 SDK
INTERNALLY (embeddings, schema setup, vector/semantic search, and the Bolt
graph client) and exposes a curated, stock-compatible tool surface to MCP
clients WITHOUT handing the client the Neo4j credential or unrestricted
Cypher.

Stock-compatible tools (names/inputs/outputs match
``mcp serve --profile extended``):

  * ``memory_add_fact``  — identical signature + return envelope.
  * ``memory_search``    — identical signature; additionally accepts the
    ``memory_types`` value ``"facts"`` and returns the same envelope as the
    stock tool plus a ``results["facts"]`` list.

oc-brain extension tools (no stock counterpart; documented as EXTENSIONS in
docs/coordination/BRAIN_GATEWAY.md):

  * ``memory_get_facts``     — retrieve facts about a subject.
  * ``memory_search_facts``  — semantic fact search straight off the fact
    vector index (proves embeddings survive the gateway).
  * ``memory_supersede_fact``— supersede path: invalidates the currently
    valid fact for a subject/predicate and stores a replacement.

Security posture (see docs/coordination/BRAIN_GATEWAY.md):

  * ``graph_query`` is NOT exposed. The gateway only executes hardcoded,
    parameterized, allowlisted Cypher written in this file or shipped in the
    SDK's own query module.
  * The Neo4j password reaches the rest of the process world only as an
    inherited secret during startup. Preferred intake is a 0600 secret FILE
    (``OC_BRAIN_NEO4J_PASSWORD_FILE``), with the plain value
    ``OC_BRAIN_NEO4J_PASSWORD`` as a fallback for supervised environments.

Env vars:

  * ``OC_BRAIN_NEO4J_URI``          (default ``bolt://127.0.0.1:7688``)
  * ``OC_BRAIN_NEO4J_USER``         (default ``neo4j``)
  * ``OC_BRAIN_NEO4J_DATABASE``     (default ``neo4j``)
  * ``OC_BRAIN_NEO4J_PASSWORD``     (plaintext password; fallback)
  * ``OC_BRAIN_NEO4J_PASSWORD_FILE``(path to 0600 secret file; preferred)
  * ``OC_BRAIN_EMBEDDING_MODEL``    (default ``BAAI/bge-small-en-v1.5``)
  * ``OC_BRAIN_EMBEDDING_DEVICE``   (default ``cpu``)
  * ``OC_BRAIN_PID_FILE``           (optional; write own pid for tests)

Run (stdio MCP server, credential-less clients):
  ``OC_BRAIN_NEO4J_PASSWORD_FILE=/secrets/oc-brain-gw`` +
  ``.venv/bin/python scripts/brain/oc_brain_server.py``
"""

from __future__ import annotations

import asyncio
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from fastmcp import Context, FastMCP
import oc_brain_concurrency as oc

if TYPE_CHECKING:
    from neo4j_agent_memory import MemoryClient, MemoryIntegration

# ── Allowlisted gateway-internal Cypher ──────────────────────────────
# The only write the gateway itself performs beyond the SDK's own query
# module. Parameterized, constant, no string interpolation. ``metadata`` is a
# JSON string exactly like ``queries.CREATE_FACT`` stores it.
SUPERSEDE_FACT_QUERY = """
MATCH (f:Fact {id: $id})
SET f.valid_until = $valid_until,
    f.superseded_by = $superseded_by,
    f.metadata = $metadata
RETURN f.id AS id
"""

READ_ANNOTATIONS = {
    "read_only_hint": True,
    "destructive_hint": False,
    "idempotent_hint": True,
}

WRITE_ANNOTATIONS = {
    "read_only_hint": False,
    "destructive_hint": False,
    "idempotent_hint": False,
}


def _secret() -> str:
    """Read the Neo4j password from ``OC_BRAIN_NEO4J_PASSWORD_FILE`` or the
    ``OC_BRAIN_NEO4J_PASSWORD`` env value. Prefers the file form so that the
    password never needs to sit in the gateway's own environment; the file
    handle is read and the buffer zeroed immediately.
    """
    pw_file = os.environ.get("OC_BRAIN_NEO4J_PASSWORD_FILE")
    if pw_file:
        with open(pw_file, "r", encoding="utf-8") as fh:
            value = fh.read().strip()
        return value
    pw = os.environ.get("OC_BRAIN_NEO4J_PASSWORD", "")
    if not pw:
        raise RuntimeError(
            "OC_BRAIN_NEO4J_PASSWORD or OC_BRAIN_NEO4J_PASSWORD_FILE must be set"
        )
    return pw


def _build_settings():
    from neo4j_agent_memory.config.settings import (
        EmbeddingConfig,
        EmbeddingProvider,
        Neo4jConfig,
    )
    from neo4j_agent_memory import MemorySettings

    return MemorySettings(
        neo4j=Neo4jConfig(
            uri=os.environ.get("OC_BRAIN_NEO4J_URI", "bolt://127.0.0.1:7688"),
            username=os.environ.get("OC_BRAIN_NEO4J_USER", "neo4j"),
            password=_secret(),
            database=os.environ.get("OC_BRAIN_NEO4J_DATABASE", "neo4j"),
        ),
        embedding=EmbeddingConfig(
            provider=EmbeddingProvider.SENTENCE_TRANSFORMERS,
            model=os.environ.get("OC_BRAIN_EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5"),
            device=os.environ.get("OC_BRAIN_EMBEDDING_DEVICE", "cpu"),
        ),
    )


def _get_integration(ctx: Context) -> "MemoryIntegration":
    context: dict[str, Any] = ctx.lifespan_context
    if not context:
        raise RuntimeError("oc-brain lifespan context unavailable")
    return context["integration"]


def _get_client(ctx: Context) -> "MemoryClient":
    context: dict[str, Any] = ctx.lifespan_context
    if not context:
        raise RuntimeError("oc-brain lifespan context unavailable")
    return context["client"]


def _get_concurrency_ops(ctx: Context) -> oc.SdkOps:
    """T4/T5 Bolt surface over the SDK's single authenticated connection.

    Reuses the gateway's one Neo4j connection pool for the idempotency gate,
    task claims, and CAS primitives instead of opening a parallel driver.
    """
    return oc.SdkOps(_get_client(ctx).long_term._client)


def _fact_to_dict(
    fact: Any,
    *,
    include_similarity: bool = False,
) -> dict[str, Any]:
    """Serialize a ``memory.LongTermMemory.Fact`` (or dedup info) to the JSON
    shape consumers of the memory tools expect.
    """
    metadata = dict(fact.metadata or {})
    payload: dict[str, Any] = {
        "id": str(fact.id),
        "subject": fact.subject,
        "predicate": fact.predicate,
        "object": fact.object,
        "confidence": fact.confidence,
        "valid_until": fact.valid_until.isoformat() if fact.valid_until else None,
        "metadata": metadata,
    }
    if include_similarity and "similarity" in metadata:
        payload["similarity"] = metadata.pop("similarity")
    if "deduplicated" in metadata:
        payload["deduplicated"] = metadata.pop("deduplicated")
    return payload


def create_server() -> FastMCP:
    """Build the oc-brain FastMCP server (stdio transport)."""

    @asynccontextmanager
    async def _lifespan(server: FastMCP):
        from neo4j_agent_memory import MemoryClient
        from neo4j_agent_memory.integration import MemoryIntegration

        # Optional: record own pid so a supervising harness can inspect the
        # gateway's process state without the client holding any credential.
        pid_file = os.environ.get("OC_BRAIN_PID_FILE")
        if pid_file:
            with open(pid_file, "w", encoding="utf-8") as fh:
                fh.write(str(os.getpid()))

        settings = _build_settings()
        async with MemoryClient(settings) as client:
            integration = MemoryIntegration(
                client,
                session_strategy="per_conversation",
                auto_preferences=False,
            )
            yield {
                "client": client,
                "integration": integration,
            }

    mcp = FastMCP(
        name="oc-brain",
        instructions=(
            "oc-brain: replacement gateway surface for BrainV2 T1 feasibility. "
            "Stock-compatible memory_add_fact / memory_search plus oc-brain "
            "extensions memory_get_facts, memory_search_facts, memory_supersede_fact. "
            "No raw graph_query / Cypher is exposed."
        ),
        lifespan=_lifespan,
    )

    # ── Stock-compatible: memory_add_fact ──────────────────────────────
    @mcp.tool(annotations=WRITE_ANNOTATIONS)
    async def memory_add_fact(
        ctx: Context,
        subject: str,
        predicate: str,
        object_value: str,
        confidence: float = 1.0,
        valid_from: str | None = None,
        valid_until: str | None = None,
        metadata: dict[str, Any] | None = None,
        op_id: str | None = None,
    ) -> str:
        """Store a subject-predicate-object fact triple.

        Records declarative knowledge as a structured triple with optional
        temporal validity bounds and arbitrary metadata. Compatible with the
        stock ``neo4j-agent-memory`` tool of the same name.

        Idempotent mode (T4): pass a client-generated ``op_id`` (UUID) and the
        write becomes idempotent under retry. The same ``op_id`` + SAME payload
        replays the committed result without duplicating the fact; the same
        ``op_id`` + DIFFERENT payload returns a conflict error and writes
        nothing. ``op_id`` is the identity; the payload SHA-256 is tracked
        separately. When ``op_id`` is omitted the stock SDK path is used.

        Args:
            subject: The subject of the fact (e.g., 'Earth').
            predicate: The relationship (e.g., 'has_radius_km').
            object_value: The object/value (e.g., '6371').
            confidence: Confidence score 0.0-1.0 (default: 1.0).
            valid_from: ISO date string for when this fact becomes valid.
            valid_until: ISO date string for when this fact expires.
            metadata: Additional metadata (e.g., scope, stack_tags, temporality).
            op_id: Optional client-generated UUID reused on retry (T4 idempotency).
        """
        if op_id:
            payload = {
                "subject": subject,
                "predicate": predicate,
                "object_value": object_value,
                "confidence": confidence,
                "valid_from": valid_from,
                "valid_until": valid_until,
                "metadata": metadata,
            }
            payload_sha = oc.payload_sha256(payload)
            fact_id = f"op-{op_id}"
            result_json = json.dumps(
                {
                    "stored": True,
                    "type": "fact",
                    "id": fact_id,
                    "op_id": op_id,
                    "replayed": False,
                },
                default=str,
            )
            outcome = oc.write_once(
                _get_concurrency_ops(ctx),
                op_id=op_id,
                payload_sha256=payload_sha,
                fact_fields={
                    "fact_id": fact_id,
                    "subject": subject,
                    "predicate": predicate,
                    "object_value": object_value,
                    "confidence": confidence,
                    "metadata_json": json.dumps(metadata, default=str) if metadata else None,
                },
                result_json=result_json,
            )
            if outcome["status"] == "conflict":
                return json.dumps(
                    {
                        "error": "OP_CONFLICT",
                        "op_id": op_id,
                        "detail": (
                            "op_id reused with a DIFFERENT payload; refusing to "
                            "overwrite the already-committed write. Retry with the "
                            "original payload or mint a new op_id."
                        ),
                        "committed_payload_sha256": outcome["committed_payload_sha256"],
                    },
                    default=str,
                )
            envelope = json.loads(outcome["result"] or result_json)
            envelope["replayed"] = outcome["status"] == "replayed"
            return json.dumps(envelope, default=str)

        integration = _get_integration(ctx)
        result = await integration.add_fact(
            subject=subject,
            predicate=predicate,
            object_value=object_value,
            confidence=confidence,
            valid_from=valid_from,
            valid_until=valid_until,
            metadata=metadata,
        )
        return json.dumps(result, default=str)

    # ── oc-brain extension: memory_get_facts ───────────────────────────
    @mcp.tool(annotations=READ_ANNOTATIONS)
    async def memory_get_facts(
        ctx: Context,
        subject: str,
        limit: int = 100,
    ) -> str:
        """Get all facts about a subject (by exact subject match).

        Args:
            subject: The fact subject.
            limit: Maximum results (default: 100).
        """
        client = _get_client(ctx)
        facts = await client.long_term.get_facts_about(subject, limit=limit)
        return json.dumps([_fact_to_dict(f) for f in facts], default=str)

    # ── oc-brain extension: memory_search_facts ────────────────────────
    @mcp.tool(annotations=READ_ANNOTATIONS)
    async def memory_search_facts(
        ctx: Context,
        query: str,
        limit: int = 10,
        threshold: float = 0.7,
    ) -> str:
        """Search facts by semantic similarity against the fact vector index.

        Args:
            query: Search query text (embedded with the same model as writes).
            limit: Maximum results (default: 10).
            threshold: Minimum similarity threshold 0.0-1.0 (default: 0.7).
        """
        client = _get_client(ctx)
        facts = await client.long_term.search_facts(
            query=query,
            limit=limit,
            threshold=threshold,
        )
        return json.dumps(
            [_fact_to_dict(f, include_similarity=True) for f in facts],
            default=str,
        )

    # ── Stock-compatible: memory_search ────────────────────────────────
    @mcp.tool(annotations=READ_ANNOTATIONS)
    async def memory_search(
        ctx: Context,
        query: str,
        limit: int = 10,
        memory_types: list[str] | None = None,
        session_id: str | None = None,
        threshold: float = 0.7,
    ) -> str:
        """Search across memory types using hybrid vector + graph search.

        Compatible with the stock tool. In addition to ``messages``,
        ``entities``, ``preferences``, and ``traces``, oc-brain accepts
        requesting ``facts`` (routed to the fact vector index) in the same
        ``memory_types`` list.

        Args:
            query: Natural language search query.
            limit: Maximum results per memory type (default: 10).
            memory_types: Types to search. Options: 'messages', 'entities',
                'preferences', 'traces', 'facts'. Defaults to messages,
                entities, preferences.
            session_id: Filter message search to a specific session.
            threshold: Similarity threshold 0.0-1.0 (default: 0.7).
        """
        integration = _get_integration(ctx)

        if memory_types is None:
            payload = await integration.search(
                query,
                memory_types=None,
                session_id=session_id,
                limit=limit,
                threshold=threshold,
            )
        else:
            include_facts = "facts" in memory_types
            rest = [t for t in memory_types if t != "facts"]
            if not rest:
                payload = {"results": {}, "query": query}
            else:
                payload = await integration.search(
                    query,
                    memory_types=rest,
                    session_id=session_id,
                    limit=limit,
                    threshold=threshold,
                )
            if include_facts and isinstance(payload, dict) and "error" not in payload:
                facts = await integration.client.long_term.search_facts(
                    query=query,
                    limit=limit,
                    threshold=threshold,
                )
                results = dict(payload.get("results", {}))
                results["facts"] = [
                    _fact_to_dict(f, include_similarity=True) for f in facts
                ]
                payload = {"results": results, "query": query}

        if isinstance(payload, dict) and "error" in payload:
            return json.dumps(payload, default=str)

        return json.dumps(payload, default=str)

    # ── oc-brain extension: memory_supersede_fact ──────────────────────
    @mcp.tool(annotations=WRITE_ANNOTATIONS)
    async def memory_supersede_fact(
        ctx: Context,
        subject: str,
        predicate: str,
        new_object: str,
        confidence: float = 1.0,
        reason: str | None = None,
    ) -> str:
        """Supersede the currently valid fact for a subject/predicate.

        Invalidates every target fact that has no ``valid_until`` yet (records
        ``valid_until = now``, ``superseded_by``, metadata markers) and stores
        a replacement fact via the SDK's ``add_fact`` (embedding + dedup
        preserved). Returns the ids of superseded facts plus the stored
        replacement.

        Args:
            subject: The fact subject (e.g., 'Earth').
            predicate: The relationship (e.g., 'has_radius_km').
            new_object: The replacement object/value (e.g., '6371.0088').
            confidence: Confidence score 0.0-1.0 (default: 1.0).
            reason: Optional human-readable supersede reason (stored in metadata).
        """
        client = _get_client(ctx)
        integration = _get_integration(ctx)
        now = datetime.now(timezone.utc)

        targets = [
            f
            for f in await client.long_term.get_facts_about(subject)
            if f.predicate == predicate and f.valid_until is None
        ]

        replacement = await client.long_term.add_fact(
            subject=subject,
            predicate=predicate,
            obj=new_object,
            confidence=confidence,
            valid_from=now,
            generate_embedding=True,
            metadata={"reason": reason} if reason else None,
        )
        replacement_id = str(replacement.id)

        superseded_ids: list[str] = []
        for fact in targets:
            metadata = dict(fact.metadata or {})
            metadata.update(
                {
                    "superseded": True,
                    "superseded_by": replacement_id,
                    "superseded_at": now.isoformat(),
                }
            )
            if reason:
                metadata["reason"] = reason
            await client.long_term._client.execute_write(
                SUPERSEDE_FACT_QUERY,
                {
                    "id": str(fact.id),
                    "valid_until": now.isoformat(),
                    "superseded_by": replacement_id,
                    "metadata": json.dumps(metadata),
                },
            )
            superseded_ids.append(str(fact.id))

        return json.dumps(
            {
                "stored": True,
                "type": "fact",
                "superseded": superseded_ids,
                "created": {
                    "id": replacement_id,
                    "triple": f"{subject} -> {predicate} -> {new_object}",
                },
            },
            default=str,
        )

    # ── oc-brain extension: T5 task_claim ───────────────────────────────
    @mcp.tool(annotations=WRITE_ANNOTATIONS)
    async def task_claim(
        ctx: Context,
        task_id: str,
        owner: str,
    ) -> str:
        """Atomically claim a dispatch task (T5 single-host authority).

        Backed by the ``TaskClaim.task_id`` uniqueness constraint and a single
        ``MERGE ... ON CREATE`` write transaction, so only the ON-CREATE writer
        wins under concurrent claims. Returns ``claimed`` (this attempt won),
        ``reaffirmed`` (already owned by this same owner), or ``taken_by``
        (another dispatcher holds it; nothing was written). Gate ownership with
        ``task_complete`` which re-verifies ``claimed_by`` internally.

        Args:
            task_id: The authoritative dispatch task id being claimed.
            owner: The dispatcher/agent identity making the claim.
        """
        ops = _get_concurrency_ops(ctx)
        return json.dumps(oc.claim_task(ops, task_id=task_id, owner=owner), default=str)

    # ── oc-brain extension: T5 task_complete ────────────────────────────
    @mcp.tool(annotations=WRITE_ANNOTATIONS)
    async def task_complete(
        ctx: Context,
        task_id: str,
        owner: str,
    ) -> str:
        """Complete a task claim with inline ownership re-verification.

        The privileged write only matches ``TaskClaim {task_id} WHERE
        claimed_by = owner``; a stale or non-owner caller is denied with no side
        effect (fail-closed), satisfying the T5 re-verify-before-write rule.

        Args:
            task_id: The claimed task id.
            owner: The claimant identity that must match the stored claim.
        """
        ops = _get_concurrency_ops(ctx)
        return json.dumps(oc.complete_task(ops, task_id=task_id, owner=owner), default=str)

    # ── oc-brain extension: T5 counter_increment (CAS) ──────────────────
    @mcp.tool(annotations=WRITE_ANNOTATIONS)
    async def counter_increment(
        ctx: Context,
        name: str,
        writer: str,
    ) -> str:
        """Compare-and-set version increment (T5 safe transitions).

        Reads the current version, then in an explicit write transaction runs
        ``MATCH (n:Counter {name}) WHERE n.version = expected SET version =
        version + 1``. A lost compare retries with bounded jittered backoff. N
        concurrent writers on one counter produce exactly N increments — no lost
        update, losers converge. Returns the new version and attempt count.

        Args:
            name: The counter name (shared contention point).
            writer: The writer identity reporting the increment.
        """
        ops = _get_concurrency_ops(ctx)
        return json.dumps(
            oc.cas_increment(ops, name=name, writer=writer), default=str
        )

    return mcp


async def main() -> None:
    server = create_server()
    await server.run_async(transport="stdio", show_banner=False)


if __name__ == "__main__":
    asyncio.run(main())