#!/usr/bin/env python3
"""oc-brain feasibility probe: MCP SDK stdio client against oc_brain_server.

Spawns ``scripts/brain/oc_brain_server.py`` (the gateway) WITHOUT holding the
Neo4j credential: the password value is never present in this client's
environment or argv. The gateway reads it from the 0600 secret file whose path
this client forwards via ``OC_BRAIN_NEO4J_PASSWORD_FILE``.

Asserts, over the real MCP wire:

  * discovery (``list_tools``): all five oc-brain tools present; no
    ``graph_query`` and no Cypher-suffixed tool present.
  * fact lifecycle with embeddings preserved:
      add fact -> retrieve (exact subject) -> semantic search (paraphrase,
      not a substring) -> supersede -> retrieve shows old fact invalidated
      and replacement present -> semantic search ranks replacement.
  * stock compatibility of ``memory_search`` (same signature/envelope).
  * client environment hygiene: the credential is absent from our process env.

Exit code is 0 only when every assertion passes.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import uuid
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

TOKEN = "gateway-probe-" + uuid.uuid4().hex[:8]
SUBJECT = f"astronaut-{TOKEN}"
OLD_DRINK = "espresso every morning"
NEW_DRINK = "oolong tea after lunch"
OLD_RESULT = {"stored": True, "type": "fact"}


def _tool_text(result: Any) -> str:
    for part in result.content or []:
        if getattr(part, "type", None) == "text" and getattr(part, "text", None):
            return part.text
    return getattr(result, "text", "") or str(result)


def _load(result: Any) -> Any:
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


async def run(args: argparse.Namespace) -> int:
    report = Report()

    # ── Client-side hygiene: this process must not hold the credential ──
    leaked_keys = [
        k for k in ("NEO4J_PASSWORD", "OC_BRAIN_NEO4J_PASSWORD") if k in os.environ
    ]
    report.check(
        "client env: no Neo4j credential key present in client process env",
        not leaked_keys,
        f"keys={leaked_keys}",
    )

    with open(args.self_pid_file, "w", encoding="utf-8") as fh:
        fh.write(str(os.getpid()))

    server_env = dict(os.environ)
    server_env.pop("NEO4J_PASSWORD", None)
    server_env.pop("OC_BRAIN_NEO4J_PASSWORD", None)
    server_env["OC_BRAIN_NEO4J_PASSWORD_FILE"] = args.password_file
    server_env["OC_BRAIN_PID_FILE"] = args.pid_file
    if not server_env.get("OC_BRAIN_NEO4J_URI"):
        server_env["OC_BRAIN_NEO4J_URI"] = "bolt://127.0.0.1:7688"

    params = StdioServerParameters(
        command=args.python,
        args=[args.server],
        env=server_env,
    )

    async with stdio_client(params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()

            tools = (await session.list_tools()).tools
            names = {t.name for t in tools}
            expected = {
                "memory_add_fact",
                "memory_search",
                "memory_get_facts",
                "memory_search_facts",
                "memory_supersede_fact",
            }
            report.check(
                "discover: oc-brain tools registered",
                expected.issubset(names),
                f"missing={sorted(expected - names)}",
            )
            forbidden = {t for t in names if "cypher" in t.lower()} | (names & {"graph_query"})
            report.check(
                "discover: no raw Cypher / graph_query exposed",
                not forbidden,
                f"found={sorted(forbidden)}",
            )

            # ── Fact create ────────────────────────────────────────────
            stored = _load(
                await session.call_tool(
                    "memory_add_fact",
                    {
                        "subject": SUBJECT,
                        "predicate": "prefers_drink",
                        "object_value": OLD_DRINK,
                        "metadata": {"harness": TOKEN},
                    },
                )
            )
            report.check(
                "fact: memory_add_fact stored (stock envelope)",
                stored.get("stored") is True and stored.get("type") == "fact" and stored.get("id"),
                json.dumps(stored),
            )
            fact_id = stored.get("id")

            # ── Fact retrieve (exact subject) ──────────────────────────
            facts = _load(
                await session.call_tool("memory_get_facts", {"subject": SUBJECT})
            )
            match = [f for f in facts if f.get("id") == fact_id]
            report.check(
                "fact: memory_get_facts retrieves stored fact",
                bool(match) and match[0]["object"] == OLD_DRINK,
                json.dumps(match[0] if match else facts)[:200],
            )

            # ── Semantic search: paraphrase, not substring ─────────────
            # Query shares words but is not a substring of the stored triple,
            # so a hit proves embedding-based search, not exact match.
            para_query = "who always drinks their hot caffeinated coffee in the morning"
            hits = _load(
                await session.call_tool(
                    "memory_search_facts",
                    {"query": para_query, "limit": 5},
                )
            )
            top = hits[0] if hits else {}
            report.check(
                "facts-search: semantic paraphrase hit preserves embeddings",
                bool(hits) and top.get("subject") == SUBJECT,
                f"hits={len(hits)} top={json.dumps(top)[:200]}",
            )
            report.check(
                "facts-search: result carries similarity score",
                "similarity" in top,
                json.dumps(top)[:200],
            )

            # ── Stock-compatible memory_search envelope ────────────────
            stock = _load(
                await session.call_tool(
                    "memory_search",
                    {"query": para_query, "limit": 3},
                )
            )
            report.check(
                "search: stock memory_search returns {results, query} envelope",
                isinstance(stock, dict) and "results" in stock and "query" in stock,
                json.dumps(stock)[:200],
            )
            stock_facts = _load(
                await session.call_tool(
                    "memory_search",
                    {"query": para_query, "limit": 5, "memory_types": ["facts"]},
                )
            )
            report.check(
                "search: memory_types=['facts'] routed to fact index",
                bool(stock_facts.get("results", {}).get("facts")),
                json.dumps(stock_facts)[:200],
            )

            # ── Supersede path ─────────────────────────────────────────
            superseded = _load(
                await session.call_tool(
                    "memory_supersede_fact",
                    {
                        "subject": SUBJECT,
                        "predicate": "prefers_drink",
                        "new_object": NEW_DRINK,
                        "reason": "harness supersede proof",
                    },
                )
            )
            report.check(
                "supersede: old fact invalidated and replacement created",
                superseded.get("stored") is True
                and fact_id in superseded.get("superseded", [])
                and superseded.get("created", {}).get("id"),
                json.dumps(superseded)[:220],
            )
            new_id = superseded.get("created", {}).get("id")

            after = _load(
                await session.call_tool("memory_get_facts", {"subject": SUBJECT})
            )
            by_id = {f.get("id"): f for f in after}
            old = by_id.get(fact_id, {})
            new = by_id.get(new_id, {})
            report.check(
                "supersede: old fact valid_until set + superseded marker",
                bool(old.get("valid_until"))
                and old.get("metadata", {}).get("superseded") is True
                and old.get("metadata", {}).get("superseded_by") == new_id,
                json.dumps(old)[:220],
            )
            report.check(
                "supersede: replacement fact is the current value",
                new.get("id") == new_id
                and new.get("object") == NEW_DRINK
                and new.get("valid_until") is None,
                json.dumps(new)[:220],
            )

            new_hits = _load(
                await session.call_tool(
                    "memory_search_facts",
                    {"query": "likes drinking warm tea after eating lunch", "limit": 5},
                )
            )
            new_top = new_hits[0] if new_hits else {}
            report.check(
                "supersede: semantic search ranks replacement fact",
                bool(new_hits) and new_top.get("subject") == SUBJECT
                and new_top.get("object") == NEW_DRINK,
                json.dumps(new_hits)[:220],
            )

    print(f"RESULT: {report.passed} passed, {report.failed} failed")
    return 0 if report.failed == 0 else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--server", required=True, help="path to oc_brain_server.py")
    parser.add_argument("--python", required=True, help="python interpreter that runs the server")
    parser.add_argument(
        "--password-file", required=True, help="path to 0600 file holding the Neo4j password"
    )
    parser.add_argument("--pid-file", default="/tmp/oc-brain-probe-pid")
    parser.add_argument("--self-pid-file", default="/tmp/oc-brain-probe-self.pid")
    args = parser.parse_args()
    try:
        return asyncio.run(run(args))
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    sys.exit(main())