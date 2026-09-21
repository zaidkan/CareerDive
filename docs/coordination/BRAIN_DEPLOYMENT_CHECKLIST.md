# BrainV2 production deployment checklist

Status: gated plan only. No production deployment has begun.

## Authorization boundary

| Batch | Authorization | Status |
|---|---|---|
| B3 | **REQUIRES SEPARATE EXPLICIT USER AUTHORIZATION** | **NOT DONE / UNAUTHORIZED** |
| B4 | **REQUIRES SEPARATE EXPLICIT USER AUTHORIZATION** | **NOT DONE / UNAUTHORIZED** |
| B5 | **REQUIRES SEPARATE EXPLICIT USER AUTHORIZATION** | **NOT DONE / UNAUTHORIZED** |

This boundary covers any B3/B4/B5 production migration, gateway rollout,
deployment/cutover, configuration/network change, production dump/restore, or
rollback-infrastructure removal. T9 authorizes documentation and the disposable
harness drill only. Approval of one gate does not imply approval of the next.

## Required gate order

Complete gates strictly in order. Record evidence, reviewer, timestamp, and
explicit decision at every gate. A failure stops progression; security and
integrity controls remain fail-closed.

- [ ] **1. Production baseline snapshot.** Record Neo4j version, database and
  schema counts, config hashes, gateway/tool inventory, memory counts,
  retrieval baseline, network exposure, and service health. Harness baselines
  do not satisfy this production gate.
- [ ] **2. Verified production backup.** Obtain separate authorization and an
  approved downtime window. Offline-dump application plus `system` databases,
  hash and copy them to separate protected storage, then prove them with an
  isolated restore. The T9 harness drill is evidence for procedure shape only.
- [x] **3. Isolated implementation on disposable harness.** T1–T8 are present
  in integrated commit `c341f94`; T9 recovery drill used only
  `brainv2-neo4j-test`. This does not authorize production work.
- [x] **4. Failing tests written before implementation.** T1–T8 task evidence
  includes RED gates. T9's first drill attempts exposed and corrected
  fingerprint fail-open and path-sensitive hashing defects before final PASS.
- [x] **5. Passing isolated tests.** Kiro supplied integrated T1–T8 HEAD
  `c341f94` as green. T9 drill passed with identical fingerprint and zero
  observed snapshot loss. Re-run all release-relevant tests from the final
  integration commit before requesting production approval.
- [ ] **6. Compatibility verification on release candidate.** Freshly verify
  MCP and `oc-memory` compatibility, Agent Memory 0.6.0, BGE Small/384-dim
  indexes, schema invariants, concurrency/idempotency, stale-candidate behavior,
  cross-project isolation, degraded mode, and legacy read/write continuity.
- [ ] **7. Shadow retrieval parity.** With no authority to mutate canonical
  production state, compare legacy and scoped/fused retrieval on an approved
  sanitized or read-only shadow. Record recall/precision/leakage and latency;
  resolve mismatches before cutover.
- [ ] **8. Explicit user approval.** Present baseline, verified backup/restore,
  exact production changes, full test evidence, security review, benchmark,
  rollback steps, measured outage, and unresolved risks. Obtain separate,
  written authorization for the named batch only.
- [ ] **9. Gradual rollout.** Use the approved maintenance window and staged
  traffic. Keep legacy read/write available during migration and retrieval
  changes reversible. Stop on any auth, isolation, integrity, concurrency,
  compatibility, or health failure. Never roll back by disabling enforcement.
- [ ] **10. Post-rollout monitoring.** Verify database/gateway health, project
  isolation, raw-Bolt closure, write/read parity, latency, backup jobs, alert
  delivery, and data/schema counts. Keep heightened monitoring through the
  approved observation window before closing the change.

## Required evidence packet

- exact commit/image/config versions and reviewed diff;
- production baseline and independently verified backup/restore manifest;
- DB plus `system`/auth and host/service recovery procedure;
- full isolated test results and high-risk review adjudication;
- retrieval benchmark and shadow parity results;
- maintenance owner, verifier, outage window, abort thresholds, and contacts;
- stepwise rollout, health checks, monitoring/alerts, and rollback commands;
- explicit user authorization naming B3, B4, or B5 and its permitted scope.

## Rollback gate

Rollback keeps the legacy path available and restores only from a verified
archive/config set. It must preserve project isolation, credential/network
isolation, operation idempotency, concurrency authority, provenance, hidden
state, and fail-closed behavior. If safe rollback cannot be proven, block or
pause rollout and escalate; never weaken controls to recover availability.
