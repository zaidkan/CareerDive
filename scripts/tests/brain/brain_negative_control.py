#!/usr/bin/env python3
"""BrainV2 T5 negative controls — deliberately-unsafe primitives (harness only).

These are PROOF-OF-FAILURE controls for the two documented failure modes the
gated primitives must never regress into (see docs/coordination/BRAIN_CONCURRENCY.md):

  * bare ``MERGE`` mints duplicate nodes when no uniqueness constraint exists
    (observed: 8 Counter + 8 CounterLock nodes for one name);
  * bare ``MATCH (n) WHERE n.version = expected SET …`` loses acknowledged
    writes under concurrency (observed: 24 reported increments, final version 23).

They run ONLY against the disposable harness and operate on NEGATIVE-CONTROL
labels ``NcCounter`` / ``NcCounterLock`` that deliberately carry NO uniqueness
constraint and no lock node, so the safe gate is never weakened.

Commands:

  merge-race <name> <rounds> <writers>
      Each round: W threads barrier-synchronised; every thread runs
      ``MERGE (n:NcCounter {name})`` and ``MERGE (l:NcCounterLock {name})``.
      Without the uniqueness constraint multiple ON-CREATE writers commit, so
      duplicate nodes appear. Reports max node counts observed per round.

  bare-cas <name> <writers> <increments> <rounds>
      Each writer performs ``increments`` acknowledged increments using the
      UNSAFE read-modify-write shape: read the current version, then
      ``MATCH (n:NcCounter {name}) WHERE n.version = $expected SET
      n.version = $next`` where ``$next`` is computed CLIENT-SIDE from the
      earlier read (``expected + 1``). There is NO CounterLock node to
      serialize readers, so with barrier-aligned contention two or more
      writers satisfy the same stale ``WHERE`` and each writes ``expected + 1``
      — acknowledged writes that never each land once (24-reported/23-final
      class). Reports total matched writes ("reported") vs the final version.

Both commands print one JSON line and exit 0; the assertions live in
concurrency.test.sh, which requires each documented failure mode to manifest
within a bounded number of rounds while the GATED primitives never do.
"""
from __future__ import annotations

import json
import os
import sys
import threading
import time
from typing import Any

DEFAULT_URI = os.environ.get("OC_BRAIN_NEO4J_URI", "bolt://127.0.0.1:7688")
DEFAULT_USER = os.environ.get("OC_BRAIN_NEO4J_USER", "neo4j")
DEFAULT_DATABASE = os.environ.get("OC_BRAIN_NEO4J_DATABASE", "neo4j")

MERGE_COUNTER = "MERGE (n:NcCounter {name: $name})"
MERGE_LOCK = "MERGE (l:NcCounterLock {name: $name})"
COUNT_QUERY = "MATCH (n:{label} {{name: $name}}) RETURN count(n) AS c"
READ_VERSION = "MATCH (n:NcCounter {name: $name}) RETURN n.version AS version"
# UNSAFE: write value computed client-side from the earlier read ($next).
BARE_CAS_QUERY = (
    "MATCH (n:NcCounter {name: $name}) WHERE n.version = $expected "
    "SET n.version = $next RETURN n.version AS version"
)
INIT_COUNTER = "MERGE (n:NcCounter {name: $name}) SET n.version = 0"


def _driver() -> Any:
    from neo4j import GraphDatabase

    password = os.environ.get(
        "OC_BRAIN_NEO4J_PASSWORD", os.environ.get("NEO4J_PASSWORD", "")
    )
    if not password:
        raise RuntimeError("OC_BRAIN_NEO4J_PASSWORD / NEO4J_PASSWORD must be set")
    return GraphDatabase.driver(
        DEFAULT_URI, auth=(DEFAULT_USER, password), database=DEFAULT_DATABASE
    )


def _reset(driver: Any, name: str) -> None:
    with driver.session() as session:
        session.run("MATCH (n:NcCounter {name: $name}) DETACH DELETE n", name=name)
        session.run("MATCH (l:NcCounterLock {name: $name}) DELETE l", name=name)


def merge_race(driver: Any, name: str, rounds: int, writers: int) -> dict[str, Any]:
    results: dict[str, list[int]] = {"counter": [], "lock": []}
    for _ in range(1, rounds + 1):
        _reset(driver, name)
        barrier = threading.Barrier(2 * writers)
        errors: list[str] = []

        def hit(query: str, key: str) -> None:
            del key
            try:
                barrier.wait()
                with driver.session() as session:
                    session.run(query, name=name)
            except BaseException as exc:  # record only; control is best-effort
                errors.append(f"{query}: {exc}")

        threads = []
        for w in range(writers):
            threads.append(threading.Thread(target=hit, args=(MERGE_COUNTER, "counter")))
        for w in range(writers):
            threads.append(threading.Thread(target=hit, args=(MERGE_LOCK, "lock")))
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        with driver.session() as session:
            results["counter"].append(
                session.run(COUNT_QUERY.format(label="NcCounter"), name=name).single()["c"]
            )
            results["lock"].append(
                session.run(COUNT_QUERY.format(label="NcCounterLock"), name=name).single()["c"]
            )
    return {
        "control": "merge-race",
        "name": name,
        "rounds": rounds,
        "writers": writers,
        "duplicates_demonstrated": any(c > 1 for c in results["counter"]) or any(
            l > 1 for l in results["lock"]
        ),
        "max_counter_nodes": max(results["counter"]),
        "max_lock_nodes": max(results["lock"]),
        "counter_counts": results["counter"],
        "lock_counts": results["lock"],
        "errors": errors,
    }


def bare_cas(
    driver: Any, name: str, writers: int, increments: int, rounds: int
) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    for r in range(1, rounds + 1):
        _reset(driver, name)
        with driver.session() as session:
            session.run(INIT_COUNTER, name=name)
            stale = session.run(READ_VERSION, name=name).single()["version"]
        barrier = threading.Barrier(writers)
        each: list[int] = []
        errors: list[str] = []

        def run_writer(w: int) -> None:
            del w
            local: list[int] = []
            try:
                barrier.wait()
                with driver.session() as session:
                    for _ in range(increments):
                        row = session.run(
                            BARE_CAS_QUERY,
                            name=name,
                            expected=stale,
                            next=stale + 1,
                        ).single()
                        if row is not None:
                            local.append(row["version"])
            except BaseException as exc:  # record only
                errors.append(str(exc))
            each.append(len(local))

        threads = [threading.Thread(target=run_writer, args=(w,)) for w in range(writers)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        with driver.session() as session:
            final = session.run(READ_VERSION, name=name).single()["version"]
        reported = sum(each)
        results.append(
            {
                "round": r,
                "reported": reported,
                "final_version": final,
                "lost_updates": reported - final,
                "ack_per_writer": each,
            }
        )
    return {
        "control": "bare-cas",
        "name": name,
        "writers": writers,
        "increments": increments,
        "rounds": rounds,
        "lost_updates_demonstrated": any(d["reported"] != d["final_version"] for d in results),
        "results": results,
        "errors": errors,
    }


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    cmd, rest = argv[0], argv[1:]
    driver = _driver()
    try:
        if cmd == "merge-race":
            name, rounds, writers = rest[0], int(rest[1]), int(rest[2])
            print(json.dumps(merge_race(driver, name, rounds, writers), default=str))
            return 0
        if cmd == "bare-cas":
            name, writers, increments, rounds = (
                rest[0],
                int(rest[1]),
                int(rest[2]),
                int(rest[3]),
            )
            print(json.dumps(bare_cas(driver, name, writers, increments, rounds), default=str))
            return 0
        sys.stderr.write(f"unknown command: {cmd}\n")
        return 2
    finally:
        driver.close()


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))