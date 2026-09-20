#!/usr/bin/env python3
"""BrainV2 T4 idempotency probe: MCP stdio client against oc_brain_server.

Spawns ``scripts/brain/oc_brain_server.py`` on a disposable harness Bolt and,
over the real MCP wire, proves the idempotency contract for ``memory_add_fact``
with an ``op_id``:

  1. first call with a fresh op_id commits (``replayed: false``, same id).
  2. retry with the SAME op_id + SAME payload replays the committed result
     byte-for-byte (``replayed: true``, same id) — no duplicate fact.
  3. retry with the SAME op_id + DIFFERENT payload is refused with
     ``error == "OP_CONFLICT"`` and nothing is written (the caller's downstream
     test counts Operation/Fact rows to prove exactly one committed write).

Client hygiene mirrors the T1 probe: the Neo4j password is fed to the gateway
via ``OC_BRAIN_NEO4J_PASSWORD_FILE`` and is never present in the client's own
environment or argv.

Exit code 0 only when every assertion passes.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


def _tool_text(result) -> str:
    for part in result.content or []:
        if getattr(part, "type", None) == "text" and getattr(part, "text", None):
            return part.text
    return getattr(result, "text", "") or str(result)


def _load(result):
    return json.loads(_tool_text(result))


class Report:
    def __init__(self) -> None:
        self.passed = 0
        self.failed = 0

    def check(self, name: str, cond: bool, detail: str = "") -> None:
        self.passed += cond
        self.failed += not cond
        print(("PASS" if cond else "FAIL") + f": {name}" + (f" — {detail}" if detail else ""))


async def run(args: argparse.Namespace) -> int:
    report = Report()

    leaked = [k for k in ("NEO4J_PASSWORD", "OC_BRAIN_NEO4J_PASSWORD") if k in os.environ]
    report.check(
        "client env: no Neo4j credential key in client process env",
        not leaked,
        f"keys={leaked}",
    )

    server_env = dict(os.environ)
    server_env.pop("NEO4J_PASSWORD", None)
    server_env.pop("OC_BRAIN_NEO4J_PASSWORD", None)
    server_env["OC_BRAIN_NEO4J_PASSWORD_FILE"] = args.password_file
    if not server_env.get("OC_BRAIN_NEO4J_URI"):
        server_env["OC_BRAIN_NEO4J_URI"] = "bolt://127.0.0.1:7688"

    params = StdioServerParameters(command=args.python, args=[args.server], env=server_env)

    subject = f"itest-mcp-{args.op_id}"
    first_object = "carbon-fiber bicycle frame"
    second_object = "fiberglass bicycle frame"  # same op_id, DIFFERENT payload

    async with stdio_client(params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()

            tools = {t.name for t in (await session.list_tools()).tools}
            expected = {"memory_add_fact", "task_claim", "task_complete", "counter_increment"}
            report.check(
                "discover: T4/T5 oc-brain tools registered",
                expected.issubset(tools),
                f"missing={sorted(expected - tools)}",
            )

            first = _load(
                await session.call_tool(
                    "memory_add_fact",
                    {
                        "subject": subject,
                        "predicate": "prefers_frame_material",
                        "object_value": first_object,
                        "confidence": 0.97,
                        "op_id": args.op_id,
                    },
                )
            )
            report.check(
                "fact: fresh op_id commits (replayed: false)",
                first.get("stored") is True
                and first.get("type") == "fact"
                and first.get("id") == f"op-{args.op_id}"
                and first.get("replayed") is False,
                json.dumps(first)[:200],
            )

            second = _load(
                await session.call_tool(
                    "memory_add_fact",
                    {
                        "subject": subject,
                        "predicate": "prefers_frame_material",
                        "object_value": first_object,
                        "confidence": 0.97,
                        "op_id": args.op_id,
                    },
                )
            )
            report.check(
                "fact: same op_id + same payload replays committed write",
                second.get("stored") is True
                and second.get("id") == first.get("id")
                and second.get("replayed") is True,
                json.dumps(second)[:200],
            )

            conflict = _load(
                await session.call_tool(
                    "memory_add_fact",
                    {
                        "subject": subject,
                        "predicate": "prefers_frame_material",
                        "object_value": second_object,
                        "confidence": 0.97,
                        "op_id": args.op_id,
                    },
                )
            )
            report.check(
                "fact: same op_id + different payload refused (OP_CONFLICT)",
                conflict.get("error") == "OP_CONFLICT"
                and conflict.get("op_id") == args.op_id
                and bool(conflict.get("committed_payload_sha256")),
                json.dumps(conflict)[:240],
            )

    print(f"RESULT: {report.passed} passed, {report.failed} failed")
    return 0 if report.failed == 0 else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--server", required=True, help="path to oc_brain_server.py")
    parser.add_argument("--python", required=True, help="interpreter that runs the server")
    parser.add_argument("--password-file", required=True, help="0600 file with harness password")
    parser.add_argument("--op-id", required=True, help="client-generated op_id under test")
    args = parser.parse_args()
    try:
        return asyncio.run(run(args))
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    sys.exit(main())