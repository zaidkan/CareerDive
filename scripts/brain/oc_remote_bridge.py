#!/usr/bin/env python3
"""oc-brain-remote bridge: local stdio -> remote authenticated transport.

Transparent JSON-RPC bridge for MCP clients that only speak stdio (a common
case before a client gains remote-HTTP support). The bridge process is a stdio
MCP *server* in front of the same remote streamable-http gateway, forwarding
every message both ways. It attaches the bearer token on its outbound HTTP
requests, then forgets it (kept only in this process env / argv hygiene: the
disposable harness passes it by env).

Credentials never stay in the repo and the bridge is DISPOSABLE. Production
would not need it at all when the client supports ``type: http`` natively
(OpenCode does; Kiro CLI does); this exists to prove option (b) in the T6
brief: a local stdio -> remote on-ramp.

Env:
  * ``OC_BRAIN_REMOTE_URL``        remote gateway URL (streamable-http).
  * ``OC_BRAIN_BEARER_TOKEN``      bearer token for the gateway (disposable).

Run:
  ``OC_BRAIN_REMOTE_URL=http://127.0.0.1:8317/mcp \
   OC_BRAIN_BEARER_TOKEN=<token> .venv/bin/python scripts/brain/oc_remote_bridge.py``
"""

from __future__ import annotations

import asyncio
import os
import sys

import httpx
from mcp.client.streamable_http import streamable_http_client
from mcp.server.stdio import stdio_server


async def _pump(src, dst) -> None:
    async for message in src:
        await dst.send(message)


async def main() -> None:
    url = os.environ.get("OC_BRAIN_REMOTE_URL")
    token = os.environ.get("OC_BRAIN_BEARER_TOKEN")
    if not url or not token:
        raise SystemExit("OC_BRAIN_REMOTE_URL and OC_BRAIN_BEARER_TOKEN are required")

    headers = {"Authorization": f"Bearer {token}"}

    async with stdio_server() as (local_read, local_write):
        async with streamable_http_client(
            url, http_client=httpx.AsyncClient(headers=headers, timeout=httpx.Timeout(30.0))
        ) as (remote_read, remote_write):
            await asyncio.gather(
                _pump(local_read, remote_write),
                _pump(remote_read, local_write),
            )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(0)