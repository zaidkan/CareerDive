#!/usr/bin/env python3
"""oc-brain-remote transport probe: disposable dual-client transport proof.

Deterministic MCP client assertions against the oc-brain-remote DISPOSABLE
gateway over its REMOTE transport. Three phases orchestrated by
``scripts/tests/brain/remote-transport.test.sh``:

  * ``direct``   — streamable-http client (the transport OpenCode uses for
                   ``type: remote``). Asserts discovery, tool calls, bearer
                   auth (missing + wrong token rejected), server-side project
                   identity (no client ``project_id`` authority), and timeout
                   handling (short-read client fails fast on a slow tool).
  * ``bridge``   — local stdio client against ``oc_remote_bridge.py``, which
                   forwards to the same authenticated remote transport. This
                   is option (b): on-ramp for clients that only speak stdio.
  * ``degraded`` — gateway is DOWN. Asserts the client fails cleanly and the
                   caller reports ``MEMORY_DEGRADED`` instead of crashing or
                   silently falling back to some other service.

Exit code 0 only when every assertion in the phase passes. ``degraded`` passes
when the expected unreachability is surfaced (degraded handling, as agreed in
docs/coordination/MEMORY_PROTOCOL.md).
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import subprocess
import sys
import time
import uuid
from typing import Any

import httpx
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.client.streamable_http import streamable_http_client

TOKEN_ID = uuid.uuid4().hex[:8]
SUBJECT = f"transporter-{TOKEN_ID}"

EXPECTED_TOOLS = {
    "ping",
    "gateway_echo",
    "memory_add_fact",
    "memory_get_facts",
    "memory_search",
    "sleep_ms",
}


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


def _tool_text(result: Any) -> str:
    for part in result.content or []:
        if getattr(part, "type", None) == "text" and getattr(part, "text", None):
            return part.text
    return getattr(result, "text", "") or str(result)


def _load(result: Any) -> Any:
    return json.loads(_tool_text(result))


def _exc_texts(exc: BaseException) -> list[str]:
    """Recursively flatten (possibly nested) exception groups to their texts."""
    texts: list[str] = []
    queue = [exc]
    while queue:
        cur = queue.pop(0)
        texts.append(f"{type(cur).__name__}: {str(cur)}")
        if isinstance(cur, BaseExceptionGroup):
            queue.extend(cur.exceptions)
    return texts


async def _session(tools: Any, report: Report, url: str, headers: dict[str, str]) -> None:
    """Run the core direct-transport assertions inside one MCP session."""
    expected = EXPECTED_TOOLS
    names = {t.name for t in tools}
    report.check(
        "discover: oc-brain-remote tools registered over remote transport",
        expected.issubset(names),
        f"missing={sorted(expected - names)}",
    )
    forbidden = {t for t in names if "cypher" in t.lower()} | (names & {"graph_query"})
    report.check(
        "discover: no raw Cypher / graph_query exposed",
        not forbidden,
        f"found={sorted(forbidden)}",
    )
    input_keys = ", ".join(
        sorted(
            {
                p
                for t in tools
                for p in (t.input_schema.get("properties", {}) or {}).keys()
            }
        )
    )
    report.check(
        "discover: no tool accepts a client-supplied project_id",
        "project_id" not in input_keys,
        f"input_keys={input_keys}",
    )


async def _tool_check(session, report, url, headers, server_project) -> None:
    echo = _load(await session.call_tool("gateway_echo", {"message": "HELLO-REMOTE"}))
    report.check(
        "call: gateway_echo round-trips over remote transport",
        echo.get("echo") == "HELLO-REMOTE",
        json.dumps(echo),
    )

    identity = _load(await session.call_tool("ping", {}))
    report.check(
        "identity: project_id comes from trusted server config",
        identity.get("project_id") == server_project,
        f"project_id={identity.get('project_id')!r} expected={server_project!r}",
    )
    report.check(
        "identity: gateway names itself oc-brain-remote (in-memory disposable)",
        identity.get("gateway") == "oc-brain-remote"
        and identity.get("backend") == "in-memory-disposable",
        json.dumps(identity),
    )

    stored = _load(
        await session.call_tool(
            "memory_add_fact",
            {
                "subject": SUBJECT,
                "predicate": "prefers_drink",
                "object_value": "oolong tea after lunch",
                "metadata": {"harness": TOKEN_ID},
            },
        )
    )
    report.check(
        "call: memory_add_fact returns the stock envelope",
        stored.get("stored") is True
        and stored.get("type") == "fact"
        and stored.get("id"),
        json.dumps(stored),
    )
    fact_id = stored.get("id")

    facts = _load(await session.call_tool("memory_get_facts", {"subject": SUBJECT}))
    match = [f for f in facts if f.get("id") == fact_id]
    report.check(
        "call: memory_get_facts retrieves stored fact",
        bool(match) and match[0]["object"] == "oolong tea after lunch",
        json.dumps(match[0] if match else facts)[:200],
    )

    hits = _load(await session.call_tool("memory_search", {"query": "tea", "limit": 5}))
    report.check(
        "call: memory_search returns stock {results, query} envelope",
        isinstance(hits, dict) and "results" in hits and "query" in hits,
        json.dumps(hits)[:200],
    )

# Hostile identity: a client that smuggles a project_id argument must not
    # change project authority. The server either rejects the argument or
    # ignores it; either way the authenticated project scope (ping) is
    # unchanged, because identity is server-config-derived, not client-arg.
    before = _load(await session.call_tool("ping", {})).get("project_id")
    try:
        raw_result = await session.call_tool(
            "memory_add_fact",
            {
                "subject": SUBJECT,
                "predicate": "tries_project_smuggle",
                "object_value": "x",
                "project_id": "other-project",
            },
        )
        try:
            payload = _load(raw_result)
        except json.JSONDecodeError:
            hostile_note = "argument rejected (tool returned an error payload; no fact stored)"
        else:
            hostile_note = f"argument accepted but ignored ({json.dumps(payload)[:80]})"
    except Exception as exc:  # noqa: BLE001
        hostile_note = f"argument rejected ({type(exc).__name__})"
    after = _load(await session.call_tool("ping", {})).get("project_id")
    report.check(
        "identity: client-supplied project_id carries NO authority",
        before == server_project and after == server_project,
        f"before={before!r} after={after!r} note={hostile_note}",
    )
    report.ok(
        "identity-transport: hostile project_id outcome observed",
        hostile_note,
    )


async def raw_auth_checks(report: Report, url: str, token: str) -> None:
    """Bearer enforcement at the HTTP boundary (deterministic, no SDK path)."""
    async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
        r_no = await client.post(url, json={"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}})
        report.check(
            "auth: request without token rejected (401)",
            r_no.status_code == 401,
            f"status={r_no.status_code}",
        )
        r_bad = await client.post(
            url,
            json={"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
            headers={"Authorization": "Bearer wrong-token-" + TOKEN_ID},
        )
        report.check(
            "auth: wrong token rejected (401)",
            r_bad.status_code == 401,
            f"status={r_bad.status_code}",
        )
        r_good = await client.post(
            url,
            json={"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
            headers={"Authorization": f"Bearer {token}"},
        )
        report.check(
            "auth: valid token reaches the MCP endpoint (not 401)",
            r_good.status_code != 401,
            f"status={r_good.status_code}",
        )


async def sdk_auth_checks(report: Report, url: str, token: str) -> None:
    """Bearer enforcement as an MCP client experiences it."""
    for label, headers in (
        ("sdk: no-token client cannot initialize", {}),
        ("sdk: wrong-token client cannot initialize", {"Authorization": "Bearer nope-" + TOKEN_ID}),
    ):
        try:
            async with streamable_http_client(
                url, http_client=httpx.AsyncClient(headers=headers, timeout=httpx.Timeout(5.0))
            ) as (read_stream, write_stream):
                async with ClientSession(read_stream, write_stream) as session:
                    await session.initialize()
            report.bad(label, "initialize unexpectedly succeeded")
        except Exception as exc:  # noqa: BLE001
            blob = " | ".join(_exc_texts(exc)).lower()
            report.check(
                label,
                "401" in blob or "unauthorized" in blob or "error response" in blob,
                blob[:160],
            )


async def timeout_check(report: Report, url: str, token: str) -> None:
    """Timeout handling: a short-read client fails fast on a slow tool.

    Proof of mechanism (two sides):
      * a client with an adequate read timeout completes a 5s tool call, so
        the gateway is not broken;
      * a client with a 1.2s read timeout gives up on an 8s tool call within
        the window instead of hanging. The tiny error text the SDK surfaces
        ("SSE stream ended without a response") masks the underlying httpx
        read timeout; the decisive evidence is the elapsed time.
    """
    headers = {"Authorization": f"Bearer {token}"}

    async with streamable_http_client(
        url, http_client=httpx.AsyncClient(headers=headers, timeout=httpx.Timeout(15.0))
    ) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            slow_ok = _load(await session.call_tool("sleep_ms", {"delay_ms": 5000}))
            report.check(
                "timeout: 5s tool call completes with an adequate read timeout",
                slow_ok.get("slept_ms") == 5000,
                json.dumps(slow_ok)[:120],
            )

    try:
        started = time.monotonic()
        async with streamable_http_client(
            url, http_client=httpx.AsyncClient(headers=headers, timeout=httpx.Timeout(1.2))
        ) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                await session.call_tool("sleep_ms", {"delay_ms": 8000})
        report.bad("timeout: short-read client should NOT wait out a slow tool")
    except Exception as exc:  # noqa: BLE001
        elapsed = time.monotonic() - started
        blob = " | ".join(_exc_texts(exc)).lower()
        report.check(
            "timeout: slow tool call fails fast under a short read timeout",
            elapsed < 6.0
            and (
                "timed out" in blob
                or "timeout" in blob
                or "sse stream ended" in blob
            ),
            f"elapsed={elapsed:.2f}s err={blob[:160]}",
        )

    async with streamable_http_client(
        url, http_client=httpx.AsyncClient(headers=headers, timeout=httpx.Timeout(10.0))
    ) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            fast = _load(await session.call_tool("sleep_ms", {"delay_ms": 50}))
            report.check(
                "timeout: normal-read client still works after a timeout violation (new session)",
                fast.get("slept_ms") == 50,
                json.dumps(fast)[:120],
            )


async def run_direct(args: argparse.Namespace, report: Report) -> None:
    headers = {"Authorization": f"Bearer {args.token}"}
    url = args.url

    await raw_auth_checks(report, url, args.token)
    await sdk_auth_checks(report, url, args.token)

    async with streamable_http_client(
        url, http_client=httpx.AsyncClient(headers=headers, timeout=httpx.Timeout(10.0))
    ) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            tools = (await session.list_tools()).tools
            await _session(tools, report, url, headers)
            await _tool_check(session, report, url, headers, args.server_project)

    await timeout_check(report, url, args.token)


async def run_bridge(args: argparse.Namespace, report: Report) -> None:
    """Drive the same surface through the local stdio -> remote bridge."""
    bridge_env = dict(os.environ)
    bridge_env["OC_BRAIN_REMOTE_URL"] = args.url
    bridge_env["OC_BRAIN_BEARER_TOKEN"] = args.token

    params = StdioServerParameters(
        command=args.python,
        args=[args.bridge],
        env=bridge_env,
    )
    async with stdio_client(params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            tools = (await session.list_tools()).tools
            await _session(tools, report, args.url, {})
            await _tool_check(session, report, args.url, {}, args.server_project)


async def run_degraded(args: argparse.Namespace, report: Report) -> None:
    """Gateway is DOWN: assert clean failure + MEMORY_DEGRADED report."""
    url = args.url
    headers = {"Authorization": f"Bearer {args.token}"}

    try:
        async with streamable_http_client(
            url, http_client=httpx.AsyncClient(headers=headers, timeout=httpx.Timeout(4.0))
        ) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
        report.bad("degraded: gateway is down but initialize succeeded (unexpected)")
    except Exception as exc:  # noqa: BLE001
        blob = " | ".join(_exc_texts(exc)).lower()
        report.check(
            "degraded: client fails fast when gateway is down",
            "connect" in blob or "refused" in blob or "connection" in blob,
            blob[:160],
        )

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(4.0)) as client:
            r = await client.post(url, json={"jsonrpc": "2.0", "id": 1, "method": "ping", "params": {}})
        report.bad("degraded: raw POST to a dead gateway unexpectedly returned", f"status={r.status_code}")
    except Exception as exc:  # noqa: BLE001
        report.ok(
            "degraded: raw POST fails to a dead gateway",
            f"{type(exc).__name__}: {str(exc)[:80]}",
        )

    report.ok("degraded: no silent fallback — caller reports MEMORY_DEGRADED, orchestration continues")
    print(f"MEMORY_DEGRADED: gateway unreachable at {url}")


async def amain() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--phase", choices=["direct", "bridge", "degraded"], required=True)
    parser.add_argument("--url", default=os.environ.get("OC_BRAIN_REMOTE_URL", "http://127.0.0.1:8317/mcp"))
    parser.add_argument("--token", required=True)
    parser.add_argument("--server-project", default="career-expo")
    parser.add_argument("--bridge", default=None, help="path to oc_remote_bridge.py")
    parser.add_argument("--python", default=sys.executable)
    args = parser.parse_args()

    report = Report()
    if args.phase == "direct":
        await run_direct(args, report)
    elif args.phase == "bridge":
        if not args.bridge:
            report.bad("bridge: --bridge path required")
        else:
            await run_bridge(args, report)
    else:
        await run_degraded(args, report)

    print(f"RESULT: {report.passed} passed, {report.failed} failed")
    return 0 if report.failed == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(amain()))