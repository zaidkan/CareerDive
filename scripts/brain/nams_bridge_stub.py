#!/usr/bin/env python3
"""TCK bridge stub for the neo4j-agent-memory NAMS backend.

Implements the snake-case POST bridge protocol (each method maps to
``POST {endpoint}/{snake_case_method}``) exactly as the stock 0.6.0
client expects, and persists to a bolt Neo4j harness so the MCP server
round-trips a real write + read through the gateway.

Run directly for development:
    .venv/bin/python scripts/brain/nams_bridge_stub.py --port 8777 --api-key test-key

The integration test starts it automatically.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
from uuid import UUID, uuid4

from neo4j import GraphDatabase

DEFAULT_CONVERSATION_ID = "00000000-0000-0000-0000-000000000001"

# Methods the 0.6.0 NAMS client can actually reach over the bridge wire.
# Facts/preferences are NOT here: the client raises NotSupportedError
# client-side before any HTTP request goes out.
SUPPORTED = {
    "list_conversations",
    "get_conversation",
    "list_messages",
    "add_message",
    "bulk_add_messages",
    "get_context",
    "search_messages",
    "list_entities",
    "get_entity",
    "add_entity",
    "search_entities",
    "get_observations",
    "get_reflections",
    "get_extraction_status",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class BridgeStub:
    """Owns the Neo4j driver and implements each bridge method."""

    def __init__(self, bolt_uri: str, bolt_user: str, bolt_password: str, database: str) -> None:
        self._driver = GraphDatabase.driver(bolt_uri, auth=(bolt_user, bolt_password))
        self._db = database
        with self._session() as s:
            s.run("RETURN 1")

    @contextmanager
    def _session(self):
        session = self._driver.session(database=self._db)
        try:
            yield session
        finally:
            session.close()

    def close(self) -> None:
        self._driver.close()

    # ------------------------------------------------------------------ helpers

    @staticmethod
    def _message_dict(row: dict, conversation_id: str) -> dict:
        return {
            "id": str(row["id"]),
            "conversationId": conversation_id,
            "role": row["role"],
            "content": row["content"],
            "createdAt": row["created_at"],
            "tokenCount": None,
            "score": None,
        }

    @staticmethod
    def _entity_dict(row: dict) -> dict:
        return {
            "id": str(row["id"]),
            "name": row["name"],
            "type": row["type"],
            "description": row.get("description"),
            "confidence": row.get("confidence"),
            "createdAt": row["created_at"],
            "updatedAt": row.get("updated_at"),
        }

    # ------------------------------------------------------------- conversations

    def list_conversations(self, body: dict) -> dict:
        with self._session() as s:
            rows = s.run(
                "MATCH (c:Conversation) RETURN c ORDER BY c.created_at"
            ).data()
        return {"conversations": [self._conv_header(r["c"]) for r in rows]}

    @staticmethod
    def _conv_header(node: dict) -> dict:
        return {
            "id": str(node["id"]),
            "userId": node.get("user_id"),
            "workspaceId": None,
            "metadata": {},
            "createdAt": node.get("created_at", _now_iso()),
            "updatedAt": node.get("updated_at"),
        }

    def get_conversation(self, body: dict) -> dict:
        with self._session() as s:
            rows = s.run(
                "MATCH (c:Conversation {id: $id}) RETURN c",
                {"id": DEFAULT_CONVERSATION_ID},
            ).data()
        if not rows:
            return {"error": "conversation not found"}
        return self._conv_header(rows[0]["c"])

    def _messages(self, conversation_id: str) -> list[dict]:
        with self._session() as s:
            rows = s.run(
                "MATCH (c:Conversation {id: $id})-[:HAS_MESSAGE]->(m:Message) "
                "RETURN m ORDER BY m.created_at, m.id",
                {"id": conversation_id},
            ).data()
        return [self._message_dict(r["m"], conversation_id) for r in rows]

    def list_messages(self, body: dict) -> dict:
        return {"messages": self._messages(DEFAULT_CONVERSATION_ID)}

    def add_message(self, body: dict) -> dict:
        content = body.get("content", "")
        role = body.get("role", "user")
        message_id = str(uuid4())
        now = _now_iso()
        with self._session() as s:
            s.run(
                "MERGE (c:Conversation {id: $id}) "
                "ON CREATE SET c.created_at = $now, c.updated_at = $now "
                "CREATE (m:Message {id: $mid, role: $role, content: $content, "
                "created_at: $now}) "
                "CREATE (c)-[:HAS_MESSAGE]->(m)",
                {
                    "id": DEFAULT_CONVERSATION_ID,
                    "mid": message_id,
                    "role": role,
                    "content": content,
                    "now": now,
                },
            )
        return {
            "id": message_id,
            "conversationId": DEFAULT_CONVERSATION_ID,
            "role": role,
            "content": content,
            "createdAt": now,
            "tokenCount": None,
            "score": None,
        }

    def bulk_add_messages(self, body: dict) -> dict:
        now = _now_iso()
        made: list[dict] = []
        with self._session() as s:
            for item in body.get("messages") or []:
                mid = str(uuid4())
                s.run(
                    "MERGE (c:Conversation {id: $id}) "
                    "ON CREATE SET c.created_at = $now, c.updated_at = $now "
                    "CREATE (m:Message {id: $mid, role: $role, content: $content, "
                    "created_at: $now}) "
                    "CREATE (c)-[:HAS_MESSAGE]->(m)",
                    {
                        "id": DEFAULT_CONVERSATION_ID,
                        "mid": mid,
                        "role": item.get("role", "user"),
                        "content": item.get("content", ""),
                        "now": now,
                    },
                )
                made.append(
                    {
                        "id": mid,
                        "conversationId": DEFAULT_CONVERSATION_ID,
                        "role": item.get("role", "user"),
                        "content": item.get("content", ""),
                        "createdAt": now,
                    }
                )
        return {"messages": made}

    def search_messages(self, body: dict) -> dict:
        query = body.get("query", "")
        limit = int(body.get("limit") or 10)
        with self._session() as s:
            rows = s.run(
                "MATCH (c:Conversation {id: $id})-[:HAS_MESSAGE]->(m:Message) "
                "WHERE m.content CONTAINS $q "
                "RETURN m ORDER BY m.created_at, m.id LIMIT $limit",
                {"id": DEFAULT_CONVERSATION_ID, "q": query, "limit": limit},
            ).data()
        return {
            "messages": [self._message_dict(r["m"], DEFAULT_CONVERSATION_ID) for r in rows],
            "searchType": "text",
        }

    def get_context(self, body: dict) -> dict:
        messages = self._messages(DEFAULT_CONVERSATION_ID)
        return {
            "reflections": [],
            "observations": [],
            "recentMessages": messages[-10:],
        }

    def get_observations(self, body: dict) -> dict:
        return {"observations": []}

    def get_reflections(self, body: dict) -> dict:
        return {"reflections": []}

    def get_extraction_status(self, body: dict) -> dict:
        return {"messages": [], "summary": {"completed": 1}}

    # --------------------------------------------------------------- entities

    def list_entities(self, body: dict) -> dict:
        with self._session() as s:
            rows = s.run("MATCH (e:Entity) RETURN e ORDER BY e.created_at").data()
        return {"entities": [self._entity_dict(r["e"]) for r in rows]}

    def get_entity(self, body: dict) -> dict:
        return {"error": "entity not found", "detail": "bridge drops path params"}

    def add_entity(self, body: dict) -> dict:
        entity_id = str(uuid4())
        now = _now_iso()
        name = body.get("name", "")
        entity_type = body.get("type", "custom")
        description = body.get("description")
        confidence = body.get("confidence")
        with self._session() as s:
            s.run(
                "CREATE (e:Entity {id: $id, name: $name, type: $type, "
                "description: $description, confidence: $confidence, "
                "created_at: $now, updated_at: $now})",
                {
                    "id": entity_id,
                    "name": name,
                    "type": entity_type,
                    "description": description,
                    "confidence": confidence,
                    "now": now,
                },
            )
        return self._entity_dict(
            {
                "id": entity_id,
                "name": name,
                "type": entity_type,
                "description": description,
                "confidence": confidence,
                "created_at": now,
                "updated_at": now,
            }
        )

    def search_entities(self, body: dict) -> dict:
        query = body.get("query", "")
        limit = int(body.get("limit") or 10)
        with self._session() as s:
            rows = s.run(
                "MATCH (e:Entity) WHERE e.name CONTAINS $q "
                "RETURN e ORDER BY e.name LIMIT $limit",
                {"q": query, "limit": limit},
            ).data()
        return {
            "entities": [self._entity_dict(r["e"]) for r in rows],
            "searchType": "text",
        }


class Handler(BaseHTTPRequestHandler):
    stub: BridgeStub  # assigned by the server factory
    api_key: str = ""

    def log_message(self, format: str, *args) -> None:  # noqa: A002
        print(f"[stub] {format % args}", flush=True)

    def _send(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authorized(self) -> bool:
        return self.headers.get("Authorization") == f"Bearer {self.api_key}"

    def do_GET(self) -> None:  # noqa: N802
        if urlsplit(self.path).path.rstrip("/") == "/health":
            self._send(200, {"status": "ok"})
            return
        self._send(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        if not self._authorized():
            self._send(401, {"error": "invalid or missing API key"})
            return
        # Bridge routes are {endpoint}/{snake_case_method}; the endpoint prefix
        # itself is arbitrary (the 0.6.0 client sends the body to that URL and
        # treats the final path segment as the method name).
        method = urlsplit(self.path).path.strip("/").rsplit("/", 1)[-1] or "unknown"
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b""
        try:
            body = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            self._send(400, {"error": "invalid JSON body"})
            return
        if not isinstance(body, dict):
            self._send(400, {"error": "JSON body must be an object"})
            return
        if method not in SUPPORTED:
            self._send(501, {"error": f"unsupported bridge method: {method}"})
            return
        print(f"[stub] method={method}", flush=True)
        try:
            result = getattr(self.stub, method)(body)
        except Exception as exc:  # pragma: no cover - defensive
            self._send(500, {"error": f"{type(exc).__name__}: {exc}"})
            return
        if isinstance(result, dict) and result.get("error") and method == "get_conversation":
            self._send(404, result)
            return
        self._send(200, result)


def _free_port() -> int:
    import socket

    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=0)
    parser.add_argument("--api-key", default="test-key")
    parser.add_argument("--bolt-uri", default="bolt://127.0.0.1:7688")
    parser.add_argument("--bolt-user", default="neo4j")
    parser.add_argument("--bolt-password", default="brainv2testpw")
    parser.add_argument("--database", default="neo4j")
    args = parser.parse_args()

    stub = BridgeStub(args.bolt_uri, args.bolt_user, args.bolt_password, args.database)

    Handler.stub = stub
    Handler.api_key = args.api_key
    port = args.port or _free_port()
    httpd = ThreadingHTTPServer((args.host, port), Handler)
    print(f"STUB READY http://{args.host}:{port}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
        stub.close()


if __name__ == "__main__":
    main()