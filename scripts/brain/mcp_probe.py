#!/usr/bin/env python3
"""Drive the stock neo4j-agent-memory MCP server against the bridge stub.

Spawns ``neo4j-agent-memory mcp serve --backend nams --endpoint <stub>``
over stdio and exercises one write + multiple reads, asserting the
spike's core claim: stock MCP round-trips through a NAMS-mode gateway.

Also captures (but does not gate on) the known NAMS gaps:
  * memory_add_fact -> NotSupportedError (client-side, never on the wire)
  * default memory_search (includes preferences) -> error
  * memory_search without session_id -> error
  * memory_add_entity -> error (integration unpacks NAMS Entity as tuple)

Prints one PASS/FAIL line per assertion plus a final RESULT line.
Exit code is 0 only when all assertions pass.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import shutil
import sys
import uuid
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

TOKEN = "bridge-spike-" + uuid.uuid4().hex[:8]
CONTENT = f"NAMS bridge stub stores {TOKEN} through the gateway"
SID = "bridge-spike-session"


def _tool_text(result: Any) -> str:
    for part in result.content or []:
        if getattr(part, "type", None) == "text" and getattr(part, "text", None):
            return part.text
    return getattr(result, "text", "") or str(result)


def _load(result: Any) -> dict:
    return json.loads(_tool_text(result))


class Report:
    def __init__(self) -> None:
        self.passed = 0
        self.failed = 0

    def ok(self, name: str, detail: str = "") -> None:
        self.passed += 1
        print(f"PASS: {name}" + (f" — {detail}" if detail else ""))

    def bad(self, name: str, detail: str = "") -> None:
        self.failed += 1
        print(f"FAIL: {name}" + (f" — {detail}" if detail else ""))

    def check(self, name: str, cond: bool, detail: str = "") -> None:
        (self.ok if cond else self.bad)(name, detail)


async def run(port: int, api_key: str) -> int:
    report = Report()
    endpoint = f"http://127.0.0.1:{port}/namsbridge"
    uvx = shutil.which("uvx") or "/opt/homebrew/bin/uvx"
    server_args = [
        "--from",
        "neo4j-agent-memory[mcp,sentence-transformers]",
        "neo4j-agent-memory",
        "mcp",
        "serve",
        "--backend",
        "nams",
        "--api-key",
        api_key,
        "--endpoint",
        endpoint,
        "--profile",
        "extended",
        "--session-strategy",
        "per_conversation",
    ]
    env = {
        **os.environ,
        "NAM_BACKEND": "nams",
        "MEMORY_API_KEY": api_key,
        "MEMORY_ENDPOINT": endpoint,
    }
    params = StdioServerParameters(command=uvx, args=server_args, env=env)

    async with stdio_client(params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()

            tools = (await session.list_tools()).tools
            names = {t.name for t in tools}
            expected = {
                "memory_store_message",
                "memory_get_context",
                "memory_search",
                "memory_add_fact",
                "memory_add_entity",
                "memory_add_preference",
            }
            missing = expected - names
            report.check("tools: core profile registered", not missing, f"missing={sorted(missing)}")

            stored = _load(
                await session.call_tool(
                    "memory_store_message",
                    {"content": CONTENT, "role": "user", "session_id": SID},
                )
            )
            report.check(
                "store: message persisted",
                bool(stored.get("stored")) and bool(stored.get("id")),
                json.dumps(stored),
            )

            ctx = _load(
                await session.call_tool(
                    "memory_get_context",
                    {"session_id": SID, "include_reasoning": False},
                )
            )
            context = ctx.get("context", "")
            report.check(
                "context: read back stored message",
                ctx.get("has_context") and TOKEN in context and "## Conversation History" in context,
                json.dumps(ctx),
            )

            search = _load(
                await session.call_tool(
                    "memory_search",
                    {
                        "query": TOKEN,
                        "session_id": SID,
                        "memory_types": ["messages"],
                    },
                )
            )
            msgs = search.get("results", {}).get("messages", [])
            report.check(
                "search: messages hit via gateway",
                msgs and TOKEN in msgs[0].get("content", ""),
                json.dumps(search),
            )

            no_default_ok = "default search without session_id errors"
            no_sid = _load(await session.call_tool("memory_search", {"query": TOKEN}))
            report.check(no_default_ok, "error" in no_sid, json.dumps(no_sid)[:200])

            pref_ok = "default search (incl. preferences) errors on NAMS"
            with_sid = _load(
                await session.call_tool(
                    "memory_search",
                    {"query": TOKEN, "session_id": SID},
                )
            )
            report.check(
                pref_ok,
                "error" in with_sid
                and "NAMS does not expose a preferences endpoint" in with_sid.get("error", ""),
                json.dumps(with_sid)[:200],
            )

            fact = _load(
                await session.call_tool(
                    "memory_add_fact",
                    {"subject": "bridge", "predicate": "stores", "object_value": TOKEN},
                )
            )
            report.check(
                "facts: NotSupportedError client-side",
                "NAMS does not expose a facts endpoint" in fact.get("error", ""),
                json.dumps(fact)[:200],
            )

            entity = _load(
                await session.call_tool(
                    "memory_add_entity",
                    {"name": "Bridge Gateway", "entity_type": "OBJECT", "description": TOKEN},
                )
            )
            report.check(
                "entities: memory_add_entity errors (NAMS tuple-unpack gap)",
                "error" in entity,
                json.dumps(entity)[:200],
            )

    print(f"RESULT: {report.passed} passed, {report.failed} failed")
    return 0 if report.failed == 0 else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--api-key", default="test-key")
    args = parser.parse_args()
    try:
        return asyncio.run(run(args.port, args.api_key))
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    sys.exit(main())