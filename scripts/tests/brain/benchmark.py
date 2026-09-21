#!/usr/bin/env python3
"""Repeatable T8 isolation/retrieval benchmark on the disposable harness."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import statistics
import sys
import time
from pathlib import Path
from typing import Any

from neo4j import GraphDatabase

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts" / "brain"))
import oc_brain_server as server  # noqa: E402

HERE = Path(__file__).resolve().parent
QUERY_VECTOR = [1.0] + [0.0] * 383
BASELINE_QUERIES = {
    "exact": """
MATCH (f:Fact)
WHERE toLower(coalesce(f.id, '')) = $query_lower
   OR toLower(coalesce(f.subject, '')) = $query_lower
   OR toLower(coalesce(f.predicate, '')) = $query_lower
   OR toLower(coalesce(f.object, '')) = $query_lower
RETURN properties(f) AS fact, 1.0 AS score LIMIT $limit
""",
    "fulltext": """
CALL db.index.fulltext.queryNodes('coordination_fulltext', $query)
YIELD node AS f, score
RETURN properties(f) AS fact, score ORDER BY score DESC LIMIT $limit
""",
    "vector": """
MATCH (f:Fact) WHERE f.embedding IS NOT NULL
WITH f, vector.similarity.cosine(f.embedding, $embedding) AS score
WHERE score >= $threshold
RETURN properties(f) AS fact, score ORDER BY score DESC LIMIT $limit
""",
    "graph": """
MATCH (seed:Fact)-[]-(f:Fact)
WHERE toLower(coalesce(seed.id, '')) = $query_lower
   OR toLower(coalesce(seed.subject, '')) = $query_lower
   OR toLower(coalesce(seed.predicate, '')) = $query_lower
   OR toLower(coalesce(seed.object, '')) = $query_lower
RETURN properties(f) AS fact, 1.0 AS score LIMIT $limit
""",
}


class _Embedder:
    async def embed(self, query: str) -> list[float]:
        return QUERY_VECTOR


class _Graph:
    def __init__(self, driver: Any) -> None:
        self.driver = driver

    async def execute_read(self, query: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        with self.driver.session(database=os.environ.get("OC_BRAIN_NEO4J_DATABASE", "neo4j")) as session:
            return [dict(row) for row in session.run(query, params)]


class _LongTerm:
    def __init__(self, driver: Any) -> None:
        self._client = _Graph(driver)
        self._embedder = _Embedder()


class _Client:
    def __init__(self, driver: Any) -> None:
        self.long_term = _LongTerm(driver)


def percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, int((len(ordered) - 1) * fraction))]


def latency(values: list[float]) -> dict[str, float]:
    return {"p50_ms": round(percentile(values, 0.50), 3), "p95_ms": round(percentile(values, 0.95), 3)}


def run_query(session: Any, mode: str, item: dict[str, Any], limit: int) -> tuple[list[dict[str, Any]], float, float]:
    params = {
        "project_id": item["project_id"],
        "query": item["query"],
        "query_lower": item["query"].lower(),
        "embedding": QUERY_VECTOR,
        "threshold": 0.7,
        "limit": limit,
    }
    started = time.perf_counter()
    result = session.run(server.SCOPED_FACT_QUERIES[mode], params)
    rows = [dict(row) for row in result]
    summary = result.consume()
    wall_ms = (time.perf_counter() - started) * 1000
    db_ms = float((summary.result_available_after or 0) + (summary.result_consumed_after or 0))
    return rows, db_ms, max(0.0, wall_ms - db_ms)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs", type=int, default=20)
    parser.add_argument("--skip-embedding-latency", action="store_true")
    args = parser.parse_args()
    labeled = json.loads((HERE / "benchmark-set.json").read_text())
    driver = GraphDatabase.driver(
        os.environ.get("OC_BRAIN_NEO4J_URI", "bolt://127.0.0.1:7688"),
        auth=(os.environ.get("OC_BRAIN_NEO4J_USER", "neo4j"), os.environ["OC_BRAIN_NEO4J_PASSWORD"]),
    )
    metrics: dict[str, dict[str, float]] = {}
    db_times: list[float] = []
    network_times: list[float] = []
    agent_times: list[float] = []
    failed = False
    with driver.session(database=os.environ.get("OC_BRAIN_NEO4J_DATABASE", "neo4j")) as session:
        for mode in server.SCOPED_FACT_QUERIES:
            relevant = retrieved = leaked = baseline_relevant = 0
            cases = [item for item in labeled if item["mode"] == mode]
            for item in cases:
                rows, _, _ = run_query(session, mode, item, 1)
                ids = [str(row["fact"]["id"]) for row in rows]
                expected = set(item["expected_ids"])
                relevant += len(expected.intersection(ids))
                retrieved += len(ids)
                leaked += sum(row["fact"].get("project_id") != item["project_id"] for row in rows)
                params = {
                    "query": item["query"], "query_lower": item["query"].lower(),
                    "embedding": QUERY_VECTOR, "threshold": 0.7, "limit": len(cases),
                }
                baseline_ids = {
                    str(row["fact"]["id"])
                    for row in session.run(BASELINE_QUERIES[mode], params)
                }
                baseline_relevant += len(expected.intersection(baseline_ids))
            expected_total = sum(len(item["expected_ids"]) for item in cases)
            scoped_recall = relevant / expected_total
            baseline_recall = baseline_relevant / expected_total
            metrics[mode] = {
                "recall_at_1": scoped_recall,
                "precision_at_1": relevant / retrieved if retrieved else 0.0,
                "cross_project_leakage": float(leaked),
                "unfiltered_baseline_recall": baseline_recall,
                "scoped_recall_delta": scoped_recall - baseline_recall,
            }
            failed |= relevant != expected_total or leaked != 0 or scoped_recall < baseline_recall

        for _ in range(args.runs):
            for item in labeled:
                _, db_ms, network_ms = run_query(session, item["mode"], item, 1)
                db_times.append(db_ms)
                network_times.append(network_ms)
                os.environ["OC_BRAIN_PROJECT_ID"] = item["project_id"]
                started = time.perf_counter()
                fused = asyncio.run(
                    server._search_project_facts(
                        _Client(driver), item["query"], limit=4, threshold=0.7
                    )
                )
                agent_times.append((time.perf_counter() - started) * 1000)
                failed |= any(row["project_id"] != item["project_id"] for row in fused)
    driver.close()

    embedding_times: list[float] = []
    if not args.skip_embedding_latency:
        from sentence_transformers import SentenceTransformer

        model = SentenceTransformer(os.environ.get("OC_BRAIN_EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5"), device="cpu")
        for item in labeled:
            started = time.perf_counter()
            model.encode(item["query"])
            embedding_times.append((time.perf_counter() - started) * 1000)

    report = {
        "runs": args.runs,
        "metrics": metrics,
        "latency": {
            "db": latency(db_times),
            "network": latency(network_times),
            "embedding": latency(embedding_times) if embedding_times else "not measured in isolation gate",
            "agent_visible": latency(agent_times),
        },
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
