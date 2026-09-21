# BrainV2 T9 — recovery documentation (docs-only, no production change)

Status: B2 recovery docs. Applies to consolidated B1 tree at `c341f94`
(T1–T8 integrated). Disposable-harness scope only. No production
DB/config/network change. B3/B4/B5 remain unauthorized.

## What can break and what to do

### 1. Disposable harness won't start

- Symptom: `harness.sh up` never reaches Bolt OK.
- Do: `docker ps` for stale `brainv2-neo4j-test`; `./harness.sh down`
  then `up` again. Never point any step at production Bolt
  (`100.99.119.124:7687`) — harness ports only.

### 2. Combined suite red after integration

- Symptom: any gate under `scripts/tests/brain/*.test.sh` fails.
- Do: stop, do not proceed to T9/B3. Record failing gate + tail output,
  `git log --oneline -5`, `git status --short`. Fix on a new branch off
  B1, re-run full suite, then re-integrate. This checkpoint caught exactly
  this once (T5 `oc-dispatch` flock file missed by file-level union).

### 3. Provenance flags look wrong (T7)

- `STALENESS_CANDIDATE` is a review signal, never a filter or verdict.
  Architecture-scope memory is exempt by design. If every result flags,
  suspect checkout detached/shallow (`_reachable_from_current_branch`
  false) rather than data corruption. Verify with
  `./provenance.test.sh` (3/3) before touching data.

### 4. Isolation recall drops (T8)

- Re-run `./isolation.test.sh` (exact/full-text/vector/graph + scoped
  recall + benchmark smoke). If `SCOPED_FACT_QUERIES` or
  `_annotate_staleness` grep checks fail, T8 layered on the wrong base —
  it must layer on post-T7 serializers, not replace them.

### 5. Lock held after crash (T5)

- `./lock.test.sh` proves SIGKILLed dispatcher releases and replacement
  reacquires. If a run wedges, inspect `scripts/oc-dispatch` flock path
  and `brain_lock.py`; never bypass flock authority.

### 6. Migration doubt (T2/T3)

- Rollback must be fingerprint-identical (`migration.test.sh` 33/33).
  Keep `schema-snapshot.cypher` + real-dump rehearsal (B3, unauthorized)
  separate from disposable-harness runs.

## Rollback rule

Every integration step keeps prior SHAs addressable
(B1 `473f406`/`f73c938`, T7 `0ef12c0`/`b3038b0`, T8 `c341f94`).
If a new commit breaks the suite, reset the integration branch to the
last green SHA and redo the step — never force-push shared branches.

## Production boundary (unchanged)

- No T9 step touches prod Neo4j, gateway, tokens, firewall, or client
  configs. `nc -z 100.99.119.124 7687` bypass stays open until B4.
- B3 (migration rehearsal vs prod-dump copy), B4 (Windows gateway
  rollout), B5 (final operational verification) all need explicit
  separate authorization.
