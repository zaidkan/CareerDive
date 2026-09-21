#!/usr/bin/env python3
"""oc-brain-remote: DISPOSABLE remote-transport gateway for BrainV2 T6.

A streamable-HTTP MCP gateway that reuses the oc-brain feasibility server
pattern (FastMCP lifespan + ``@mcp.tool`` annotations) and exposes the same
curated tool contract over a REMOTE transport instead of stdio.

THIS IS A DISPOSABLE PROOF, NOT THE PRODUCTION GATEWAY:

  * Backend is an in-memory fact store (no Neo4j, no SDK, no model download).
    Production will run the real oc-brain surface (neo4j-agent-memory SDK +
    Bolt) on the Windows host; see docs/coordination/BRAIN_GATEWAY_WINDOWS.md.
  * Binds to 127.0.0.1 only. Never exposed to a real network here.
  * Bearer token required on every HTTP request. Project identity comes from
    TRUSTED SERVER-SIDE CONFIG (env supplied by the supervisor), never from an
    agent-supplied ``project_id`` argument.

Tools (stock-compatible names where the oc-brain contract has them):

  * ``ping``              -> server identity envelope (project_id from server
                             config, gateway id, backend, verified auth subject).
  * ``gateway_echo``      -> trivial echo; the simplest cross-client call.
  * ``memory_add_fact``   -> stock-compatible envelope; stores in memory.
  * ``memory_get_facts``  -> facts for a subject.
  * ``memory_search``     -> stock envelope ``{"results": {...}, "query": ...}``.

Transport-proof helpers:

  * ``sleep_ms``          -> latency sink for timeout-handling proofs.

No tool accepts ``project_id``. No ``graph_query``/raw Cypher is exposed.

Env vars:

  * ``OC_BRAIN_REMOTE_HOST``        (default 127.0.0.1)
  * ``OC_BRAIN_REMOTE_PORT``        (default 8317)
  * ``OC_BRAIN_MCP_PATH``           (default /mcp)
  * ``OC_BRAIN_PROJECT_ID``         trusted server-side project scope (default
                                    career-expo). NEVER read from the client.
  * ``OC_BRAIN_BEARER_TOKEN``       bearer value, or
  * ``OC_BRAIN_BEARER_TOKEN_FILE``  path to the 0600 secret file (preferred)
  * ``OC_BRAIN_PID_FILE``           optional; write own pid for the harness

Run (streamable-http, credential-less clients, localhost only):
  ``OC_BRAIN_BEARER_TOKEN_FILE=/tmp/gw-token OC_BRAIN_PROJECT_ID=career-expo \
   .venv/bin/python scripts/brain/oc_remote_gateway.py``
"""

from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from fastmcp import FastMCP
from starlette.middleware import Middleware
from starlette.types import Receive, Scope, Send


def _bearer_token() -> str:
    """Read the bearer token from ``OC_BRAIN_BEARER_TOKEN_FILE`` (preferred,
    0600 secret file) or ``OC_BRAIN_BEARER_TOKEN`` env value. Mirrors the
    oc-brain credential-separation rule: the value never travels on a wire
    into this process -- the supervisor injects it.
    """
    token_file = os.environ.get("OC_BRAIN_BEARER_TOKEN_FILE")
    if token_file:
        with open(token_file, "r", encoding="utf-8") as fh:
            value = fh.read().strip()
        if value:
            return value
    value = os.environ.get("OC_BRAIN_BEARER_TOKEN", "")
    if not value:
        raise RuntimeError(
            "OC_BRAIN_BEARER_TOKEN or OC_BRAIN_BEARER_TOKEN_FILE must be set"
        )
    return value


def _server_project_id() -> str:
    return os.environ.get("OC_BRAIN_PROJECT_ID", "career-expo")


class BearerAuthMiddleware:
    """Starlette middleware: require ``Authorization: Bearer <token>`` on
    every request. Missing/invalid credentials get ``401`` + ``WWW-Authenticate``.
    The accepted token is this server's own configured secret (trusted config),
    so the verified auth subject is server-derived, never client-asserted.
    """

    def __init__(self, app: Any) -> None:
        self.app = app
        self.token = _bearer_token()

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope.get("headers", [])}
        auth = headers.get("authorization", "")
        valid = auth.startswith("Bearer ") and auth[len("Bearer "):].strip() == self.token
        if not valid:
            body = json.dumps({"error": "unauthorized"}).encode("utf-8")
            await send(
                {
                    "type": "http.response.start",
                    "status": 401,
                    "headers": [
                        (b"content-type", b"application/json"),
                        (b"content-length", str(len(body)).encode()),
                        (b"www-authenticate", b"Bearer"),
                    ],
                }
            )
            await send({"type": "http.response.body", "body": body})
            return

        await self.app(scope, receive, send)


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


@dataclass
class Fact:
    id: str
    subject: str
    predicate: str
    object_value: str
    confidence: float
    valid_from: str | None
    valid_until: str | None
    metadata: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "subject": self.subject,
            "predicate": self.predicate,
            "object": self.object_value,
            "confidence": self.confidence,
            "valid_from": self.valid_from,
            "valid_until": self.valid_until,
            "metadata": self.metadata,
        }


class InMemoryStore:
    """Disposable fact store keyed under the SERVER-side project id. The
    client can neither choose nor override the namespace: writes, reads, and
    search all key on ``self.project_id`` set at startup from trusted config.
    """

    def __init__(self, project_id: str) -> None:
        self.project_id = project_id
        self.facts: dict[str, Fact] = {}

    def add_fact(
        self,
        subject: str,
        predicate: str,
        object_value: str,
        confidence: float,
        valid_from: str | None,
        valid_until: str | None,
        metadata: dict[str, Any] | None,
    ) -> dict[str, Any]:
        fact = Fact(
            id="mem-" + uuid.uuid4().hex[:12],
            subject=subject,
            predicate=predicate,
            object_value=object_value,
            confidence=confidence,
            valid_from=valid_from,
            valid_until=valid_until,
            metadata=metadata or {},
        )
        self.facts[fact.id] = fact
        return {
            "stored": True,
            "type": "fact",
            "id": fact.id,
            "triple": f"{subject} -> {predicate} -> {object_value}",
        }

    def get_facts(self, subject: str, limit: int) -> list[dict[str, Any]]:
        hits = [f.to_dict() for f in self.facts.values() if f.subject == subject]
        return hits[:limit]

    def search(self, query: str, limit: int) -> list[dict[str, Any]]:
        q = query.lower()
        hits = [
            f.to_dict()
            for f in self.facts.values()
            if q in f.subject.lower()
            or q in f.predicate.lower()
            or q in f.object_value.lower()
        ]
        return hits[:limit]


def create_server() -> FastMCP:
    """Build the oc-brain-remote FastMCP server (streamable-http transport)."""
    project_id = _server_project_id()
    store = InMemoryStore(project_id)

    mcp = FastMCP(
        name="oc-brain-remote",
        instructions=(
            "oc-brain-remote: DISPOSABLE remote-transport gateway for BrainV2 "
            "T6 proof. Exposes a stock-compatible memory tool subset over "
            "streamable-http with bearer auth. Project identity is set by the "
            "trusted server configuration; no client-supplied project_id is "
            "accepted. No graph_query / raw Cypher is exposed."
        ),
    )

    @mcp.tool(annotations=READ_ANNOTATIONS)
    async def ping() -> str:
        """Return the gateway's server-side identity envelope.

        The project id and auth subject are derived from trusted server
        configuration (env + verified bearer), never from client arguments.
        """
        return json.dumps(
            {
                "pong": True,
                "gateway": "oc-brain-remote",
                "backend": "in-memory-disposable",
                "project_id": store.project_id,
                "auth_subject": "bearer-verified",
            }
        )

    @mcp.tool(annotations=READ_ANNOTATIONS)
    async def gateway_echo(message: str) -> str:
        """Echo the message back unchanged.

        The simplest cross-client call used to prove discovery+call over the
        remote transport from any MCP client.

        Args:
            message: String to echo.
        """
        return json.dumps({"echo": message})

    @mcp.tool(annotations=WRITE_ANNOTATIONS)
    async def memory_add_fact(
        subject: str,
        predicate: str,
        object_value: str,
        confidence: float = 1.0,
        valid_from: str | None = None,
        valid_until: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """Store a subject-predicate-object fact triple (in-memory).

        Envelope is stock-compatible:
        ``{"stored": true, "type": "fact", "id": ..., "triple": ...}``.

        Args:
            subject: The subject of the fact (e.g., 'Earth').
            predicate: The relationship (e.g., 'has_radius_km').
            object_value: The object/value (e.g., '6371').
            confidence: Confidence score 0.0-1.0 (default: 1.0).
            valid_from: ISO date string for when this fact becomes valid.
            valid_until: ISO date string for when this fact expires.
            metadata: Additional metadata (e.g., scope, stack_tags, temporality).
        """
        result = store.add_fact(
            subject=subject,
            predicate=predicate,
            object_value=object_value,
            confidence=confidence,
            valid_from=valid_from,
            valid_until=valid_until,
            metadata=metadata,
        )
        return json.dumps(result, default=str)

    @mcp.tool(annotations=READ_ANNOTATIONS)
    async def memory_get_facts(subject: str, limit: int = 100) -> str:
        """Get stored facts about a subject (exact subject match, in-memory).

        Args:
            subject: The fact subject.
            limit: Maximum results (default: 100).
        """
        return json.dumps(store.get_facts(subject, limit), default=str)

    @mcp.tool(annotations=READ_ANNOTATIONS)
    async def memory_search(
        query: str,
        limit: int = 10,
        memory_types: list[str] | None = None,
        session_id: str | None = None,
        threshold: float = 0.7,
    ) -> str:
        """Search stored facts (literal-match stand-in; production uses the
        SDK's embedding search). Keeps the stock ``{results, query}`` envelope
        so transport compatibility is measured, not embeddings.

        Args:
            query: Search query text.
            limit: Maximum results (default: 10).
            memory_types: Ignored for the in-memory stand-in; kept for the
                stock-compatible signature. 'facts' is always searched.
            session_id: Ignored for the in-memory stand-in.
            threshold: Ignored for the in-memory stand-in.
        """
        facts = store.search(query, limit)
        return json.dumps({"results": {"facts": facts}, "query": query}, default=str)

    @mcp.tool(annotations=READ_ANNOTATIONS)
    async def sleep_ms(delay_ms: int) -> str:
        """Sleep ``delay_ms`` then return the elapsed time.

        Deliberate latency sink for timeout-handling and degraded-mode proofs.

        Args:
            delay_ms: Milliseconds to sleep.
        """
        start = time.monotonic()
        await asyncio.sleep(max(0, delay_ms) / 1000.0)
        return json.dumps({"slept_ms": delay_ms, "elapsed_ms": round((time.monotonic() - start) * 1000, 1)})

    return mcp


async def main() -> None:
    pid_file = os.environ.get("OC_BRAIN_PID_FILE")
    if pid_file:
        with open(pid_file, "w", encoding="utf-8") as fh:
            fh.write(str(os.getpid()))

    host = os.environ.get("OC_BRAIN_REMOTE_HOST", "127.0.0.1")
    port = int(os.environ.get("OC_BRAIN_REMOTE_PORT", "8317"))
    path = os.environ.get("OC_BRAIN_MCP_PATH", "/mcp")

    server = create_server()
    await server.run_http_async(
        transport="streamable-http",
        host=host,
        port=port,
        path=path,
        show_banner=False,
        uvicorn_config={"log_level": "warning"},
        middleware=[Middleware(BearerAuthMiddleware)],
        host_origin_protection="auto",
    )


if __name__ == "__main__":
    asyncio.run(main())