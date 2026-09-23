#!/usr/bin/env node
/**
 * check-dev — verify the local Career Expo dev stack is healthy.
 *
 * Confirms:
 *   - web answers expected at http://localhost:5173 (not a jumped port)
 *   - API health at http://localhost:3001/health
 *   - session/tRPC API reachable at http://localhost:3001/trpc
 *
 * Usage: pnpm check:dev
 * Exit 0 = healthy, non-zero = problem (message says what to fix).
 */
import { connect } from "node:net";

const WEB_PORT = Number(process.env.WEB_PORT ?? 5173);
const API_PORT = Number(process.env.PORT ?? 3001);
const WEB_ORIGIN = `http://localhost:${WEB_PORT}`;
const API_BASE = `http://localhost:${API_PORT}`;

/** @param {number} port @param {number} [timeoutMs] */
function portOpen(port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    // "localhost" + autoSelectFamily covers Vite/Node binding either loopback
    // family (::1 or 127.0.0.1); a hard-coded IPv4 probe false-fails on IPv6.
    const socket = connect({ port, host: "localhost" });
    const done = (ok) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

/** @param {string} url @param {RequestInit} [init] */
async function tryFetch(url, init) {
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(2000),
      headers: { accept: "application/json", ...init?.headers },
    });
    return { ok: true, res };
  } catch (error) {
    return { ok: false, error };
  }
}

async function main() {
  /** @type {string[]} */
  const failures = [];
  /** @type {string[]} */
  const notes = [];

  // 1) Web must be on the expected port (strictPort prevents silent jumps).
  const webListening = await portOpen(WEB_PORT);
  if (!webListening) {
    failures.push(
      `Web is not listening on ${WEB_PORT}. Expected ${WEB_ORIGIN}. ` +
        `Start with \`pnpm dev\`. If another process holds ${WEB_PORT}, ` +
        `stop it: lsof -nP -iTCP:${WEB_PORT} -sTCP:LISTEN`,
    );
  } else {
    // Vite returns 404 for / when Accept prefers JSON; ask for HTML/*.
    const web = await tryFetch(`${WEB_ORIGIN}/`, {
      headers: { accept: "*/*" },
    });
    if (!web.ok) {
      failures.push(`Web port ${WEB_PORT} is open but HTTP failed: ${String(web.error)}`);
    } else if (!web.res.ok) {
      failures.push(`Web at ${WEB_ORIGIN} returned HTTP ${web.res.status}.`);
    } else {
      notes.push(`web ok: ${WEB_ORIGIN}`);
    }
  }

  // 2) API health on 3001
  const apiListening = await portOpen(API_PORT);
  if (!apiListening) {
    failures.push(
      `API is not listening on ${API_PORT}. Expected ${API_BASE}/health. ` +
        `Start with \`pnpm dev\`. If occupied: lsof -nP -iTCP:${API_PORT} -sTCP:LISTEN`,
    );
  } else {
    const health = await tryFetch(`${API_BASE}/health`);
    if (!health.ok) {
      failures.push(`API health at ${API_BASE}/health failed: ${String(health.error)}`);
    } else if (!health.res.ok) {
      failures.push(`API health returned HTTP ${health.res.status}.`);
    } else {
      const body = await health.res.json().catch(() => null);
      if (body?.status !== "ok") {
        failures.push(`API health body unexpected: ${JSON.stringify(body)}`);
      } else {
        notes.push(`api health ok: ${API_BASE}/health`);
      }
    }
  }

  // 3) Session/tRPC surface reachable (no full session create; just path existence).
  if (apiListening) {
    // tRPC mutations reject GET; any HTTP status means the route is served.
    const trpc = await tryFetch(`${API_BASE}/trpc/session.create`);
    if (!trpc.ok) {
      failures.push(`Session/tRPC API unreachable at ${API_BASE}/trpc: ${String(trpc.error)}`);
    } else {
      notes.push(`session api reachable: ${API_BASE}/trpc (HTTP ${trpc.res.status})`);
    }
  }

  // Extra diagnostic when web is up but on a non-canonical situation.
  if (webListening && WEB_PORT !== 5173) {
    notes.push(
      `WARNING: checking non-default web port ${WEB_PORT}; Career Expo dev CORS only allows 5173.`,
    );
  }

  for (const n of notes) {
    console.log(`ok: ${n}`);
  }
  if (failures.length > 0) {
    console.error("\nDev environment check FAILED:");
    for (const f of failures) {
      console.error(`  - ${f}`);
    }
    console.error(
      "\nRecognize a port collision: Vite must stay on 5173 (strictPort). " +
        "If you see 5174/5175 or CORS/session errors, a stale process is holding a port.",
    );
    process.exit(1);
  }
  console.log("Dev environment check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
