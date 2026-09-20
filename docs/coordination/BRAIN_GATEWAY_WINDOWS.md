# BRAINv2 T6 — Remote Transport + Windows Gateway (design)

Status: **DESIGN + DISPOSABLE PROOF** — branch `worker/brainv2-t6-remote-transport`,
gate `scripts/tests/brain/remote-transport.test.sh` (19/19 PASS, exit 0).
Execution allowed only on the disposable in-memory gateway; **no production
networking, no firewall/tailscale changes, no production config edits** were
made or are made by this task.

This document answers, for the production topology decision in
`BRAIN_GATEWAY.md` §6 Option A: *what runs on the Windows host, how the
credential is held, how the direct-Bolt route is closed, and how Kiro +
OpenCode actually reach the gateway.* The transport contract proven here
(streamable HTTP + bearer auth, bridge fallback, degraded/recovery behavior)
is exactly what the production gateway deploys with the real `oc-brain`
surface (16-tool inventory, see `BRAIN_TOOL_INVENTORY.md`).

---

## 1. Target architecture (Option A — Windows host gateway)

```
           ┌──────────────────────── 100.99.119.124 (Windows host) ────────────────────────┐
           │  OC-BRAIN GATEWAY  (oc_brain_gateway, the ONLY TRUSTED proxy)                 │
           │   • FastMCP server, streamable-HTTP transport on 127.0.0.1:8377/mcp, bearer   │
           │   • reuses neo4j-agent-memory 0.6.0 SDK internally (real 16-tool surface)     │
           │   • reads Bolt credential from Windows-protected secret (owner-scope Secret)   │
           │   • allowlist tools only; no graph_query / raw Cypher                          │
           │                                        │  Bolt (credential-gated)             │
           │                                        v                                       │
           │  NEO4J 5.x (localhost:7687)  ← Bolt listener is bound to LOCALHOST ONLY       │
           └────────────────────────────────────────────────────────────────────────────────┘
                  ▲  MCP streamable-HTTP over tailnet, bearer-auth (agent → host:8377)
                  │  (no direct-Bolt path exists from the Mac fleet)
        ┌─────────┴────────────────────────────────┐
        │  Kiro CLI (Amazon Q Developer CLI)       │   .kiro/settings/mcp.json  (type: http)
        │  OpenCode (any dev Mac)                  │   opencode.json            (type: remote)
        └──────────────────────────────────────────┘
```

Two independent guarantees, each sufficient on its own and both deployed:

1. **Credential**: only the gateway process ever holds the Neo4j password.
   It is injected by the Windows service identity from a protected store; it
   never appears in agent configs, on the MCP wire, or in repo files.
2. **Network**: the Neo4j Bolt listener is bound to the Windows host
   *localhost only*. From any agent Mac there is **no route to `:7687` at
   all**; the only entry point is the gateway's authenticated MCP endpoint.

---

## 2. Windows service identity

Run the gateway as a **dedicated, low-privilege Windows service account**
(`NT SERVICE\OCBrainGateway`), not as a user-owned process and not as SYSTEM.

- **OS account / token**: a virtual service account with *no interactive
  logon*, *no administrator membership*, and **Log on as a service** right
  only. It is the sole account allowed to access the Neo4j credential and
  the only account that holds a live Bolt session.
- **Install**: `sc create OCBrainGateway binPath= "C:\Program Files\BrainGateway\live.bat" start=auto obj= "NT SERVICE\OCBrainGateway"`; service
  failure actions (restart with backoff, then restart after 1 min) configured
  via `sc failure` or Group Policy. A watchdog restarts the process if it
  exits non-zero; memory/CPU limits are out of scope for T6.
- **Listening shape**: the gateway binds `127.0.0.1:8377` under this same
  identity. Tailnet works by directing agent traffic to the host:
  `http://100.99.119.124:8377/mcp` (see §5 — *no* Tailscale port-forwarding
  config is introduced; the loopback bind + tailnet route is used as-is).
- **Replacement/upgrade**: stop service → replace deploy dir → start service.
  No secrets move during upgrade (credential stays in the store below).

---

## 3. Windows credential storage

Production rule (same as the harness): the password never reaches the gateway
process as an environment variable in the parent cmdline, never via argv, and
never through the agent. Storage options, best first:

1. **Windows DPAPI *user* secret scoped to the service account**
   (`CredWrite` / `CredRead` with `CRED_TYPE_GENERIC`, or the service's
   `%APPDATA%` DPAPI blob). Decrypt runs under the service account's own
   identity, so even administrator *users* (on the Mac side) cannot decrypt
   it. Implementation guidance for the later build: the gateway reads it once
   at startup with `CredReadW`, zeroes the buffer after connecting.
2. **Neo4j `SERVER_SERVICE_SECRET` / Azure Key Vault** where corporate secrets
   are already managed — same *read-once, never persist in repo/env* rule.
3. Fallback for supervised local pilot: a file ACL'd to the service account
   only (rights: the service account, *not* Administrators), mirroring the
   harness' 0600 file. This is the weakest option and should be short-lived.

The harness analogue (`OC_BRAIN_BEARER_TOKEN_FILE` + 0600 file) demonstrates
the same *supervisor writes secret file → server reads file → 401 otherwise*
flow in `remote-transport.test.sh`.

---

## 4. Closing the direct-Bolt route (Mac → 100.99.119.124:7687)

The goal is that an agent Mac can *never* reach Neo4j Bolt, even if it
somehow obtained a password. Two changes on the Windows host, both outside
T6's execution window, both tiny and reversible:

1. **Neo4j bind**: set `server.bolt.listen_address=127.0.0.1:7687` and confirm
   `server.bolt_advertised_address=127.0.0.1:7687` in `neo4j.conf`, then
   restart the service. Verify with `netstat -ano | findstr 7687` that the
   listener shows `127.0.0.1`, not `0.0.0.0` or the LAN address.
2. **Windows Defender Firewall**: block inbound **TCP 7687** from the tailnet
   interface for non-gateway remote addresses (a deny rule covers any future
   bind drift), and allow inbound **TCP 8377** from the tailnet only.

Explicit decision: **do not configure Tailscale port-forwarding / serve**
(`tailscale serve` / Funnel). Mac agents already have tailnet routes to the
Windows host; adding a proxy merely widens the attack surface and is
unnecessary for a plain authenticated HTTP port. The route closure is done at
the *destination* (Neo4j bind + firewall), which is the stronger boundary and
remains closed even if tailscale configuration drift occurs.

---

## 5. Client configuration (Kiro + OpenCode)

Both agents talk to `http://100.99.119.124:8377/mcp` with the same bearer.
Credentials come from each user's secret store via env expansion; the tokens
are themselves generated per-client or rotated, distinct from the Neo4j
password.

**OpenCode** (`opencode.json`, one entry per dev Mac):

```jsonc
{
  "mcp": {
    "oc-brain": {
      "type": "remote",
      "url": "http://100.99.119.124:8377/mcp",
      "enabled": true,
      "headers": { "Authorization": "Bearer ${OC_BRAIN_GATEWAY_TOKEN}" },
      "timeout": 10
    }
  }
}
```

**Kiro / Amazon Q Developer CLI** (`.kiro/settings/mcp.json`, `mcpServers`):

```jsonc
{
  "mcpServers": {
    "oc-brain": {
      "type": "http",
      "url": "http://100.99.119.124:8377/mcp",
      "headers": {
        "Authorization": "Bearer ${OC_BRAIN_GATEWAY_TOKEN}"
      }
    }
  }
}
```

Both transports were proven end-to-end on the disposable gateway by
`remote-transport.test.sh` phase 3 (OpenCode model-driven tool call:
`brain-remote_ping` → identity envelope with `auth_subject: bearer-verified`;
`brain-remote_gateway_echo` → `{"echo": "HELLO-REMOTE"}`). Kiro-side is
documented, not executed (no `kiro` binary available in this environment).

---

## 6. Timeout / restart / degraded behavior (the MEMORY_DEGRADED contract)

Observed transport behavior on the disposable gateway (probe assertions):

| Condition | Behavior proven |
|---|---|
| No/wrong bearer | 401 + `WWW-Authenticate: Bearer`; SDK clients fail initialize; raw clients get 401 |
| Gateway down | client fails fast (connect error), `scripts/oc-memory` prints **`MEMORY_DEGRADED`**, orchestration continues, exit 0 |
| Slow tool + short read timeout | client gives up in ~1.2 s instead of hanging (measured, `sse stream ended` surfaced) |
| Slow tool + adequate timeout | 5 s tool call completes normally (gateway not broken; timeout is client-side) |
| Gateway restart | direct transport is green again immediately (deterministic recovery) |
| Hostile `project_id` | rejected / ignored; authority stays with trusted server config (`ping` unchanged) |

Production wiring:

- **Gateway outbound**: FastMCP/httpx read timeout ≥ 60 s so embeddings and
  search finish; Bolt driver maintains its own sockets.
- **Client timeout**: OpenCode `timeout: 10` (per server); Kiro inherits its
  default server timeout. Long tools (trace builds) should either complete
  inside the window or be exposed via async/step tools later — out of scope.
- **Windows restart**: service failure-action restarts with backoff → gateway
  recovers on its own; probes verified restart-recovery is deterministic.
- **Degraded path**: `scripts/oc-memory` (each agent's shared-memory wrapper)
  already contains the contract — degrade, never crash the caller, never
  silent-fallback. Agents continue with reduced coordination, exactly as on
  today's Bolt-down path.

---

## 7. Admin threat-model boundary

The model guarantees **process-level isolation from agent-run work**: the
gateway service account owns the credential and the only live Bolt session;
ordinary agent processes cannot read the credential, cannot reach Bolt, and
cannot learn hidden facts or mutate precedence state except through the
allowlisted MCP tools (which never accept client Cypher).

Boundary — what the model does NOT claim:

- **Administrators on the Windows host can bypass everything** (they can
  grant themselves the service account's token, read the secret store, or
  connect locally). This is standard for any service host and is accepted.
- **The gateway's own code is a new trusted process**: it replays the same
  secrets the deterministic backend already trusts, so its compromise equals
  today's backend compromise — no new class of authority.
- API parity: the remote surface exposes the *same canonical action IDs and
  outcomes* as desk/visual/structured modes only insofar as the underlying
  deterministic backend stays the sole authority; the gateway adds transport,
  never facts/procedures/evidence.

---

## 8. Follow-ups required before production switchover (explicitly NOT T6)

1. Build the production `oc-brain` gateway (real SDK surface per
   `BRAIN_TOOL_INVENTORY.md`) as a Windows service on the Windows host.
2. Credential intake via Windows-protected store (§3) + service-account
   hardening checks (§2).
3. Neo4j loopback bind + firewall closure and a reachability sweep from a Mac
   (`nc -z 100.99.119.124 7687` must fail; `8377` must succeed).
4. Provision rotating per-client gateway tokens; move Kiro + OpenCode configs
   live (only after the gateway exists — configs stay in this doc until then).
5. Re-run the T6 gate with the production gateway as the endpoint for a
   final parity check; then a high-risk/release review.

## 9. Deliverables in this worktree

- `scripts/brain/oc_remote_gateway.py` — disposable streamable-http gateway
  (bearer auth, server-side project identity, in-memory store, timeout sink).
- `scripts/brain/oc_remote_probe.py` — deterministic client assertions
  (direct / bridge / degraded phases).
- `scripts/brain/oc_remote_bridge.py` — optional local stdio → remote bridge
  for clients without remote-HTTP support yet.
- `scripts/tests/brain/remote-transport.test.sh` — the RED→GREEN gate
  (19/19 PASS, exit 0); production configs asserted untouched.
- `docs/coordination/BRAIN_TOOL_INVENTORY.md` — refined 16-tool inventory.