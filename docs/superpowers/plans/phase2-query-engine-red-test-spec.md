# Phase 2 — Query Engine RED-Test / Fixture Specification

**Status:** Future implementation specification. Planning only.
**Canonical spec (wins all disagreements):** `docs/superpowers/specs/interactivity-and-content-depth-design.md` (§5.1, §6, §7, §17, §18 Phase 2, Appendix R)
**Content source:** `docs/superpowers/specs/soc-structured-content-pack.md` (rows `A*`, `V*`, `D*`, `AL*`, `PH*`, `SC*`, `KB*`)
**Fixture companion:** `docs/superpowers/specs/soc-structured-record-fixtures.md`
**Implementation prep:** `docs/superpowers/plans/phase2-query-engine-implementation-prep.md` (reusable patterns, normalization rules, action-shape recommendation)
**Build contract:** `career-sim-build-spec.md` + `AGENT_CONTEXT.md` + `AGENTS.md`

**Do NOT modify production code. Do NOT implement Phase 2.**
**Do NOT assume interrupted Phase 1 work is complete.** Every section marked `PHASE 1 CONTRACT REQUIRED` must be confirmed against the Phase 1-frozen tree before the corresponding tests are written. If the frozen contract differs from an assumption recorded here, the frozen contract wins and this document must be amended, not the contract.

**How to use this document:** each test entry is written as a RED test recipe — setup, action, expected failure/behavior — so a future implementation worker can translate it almost mechanically into a failing test before writing engine code. Test IDs (`Q-NORM-01`, `Q-FILT-03`, …) are stable labels for tracking; use them in commit messages and the test-layer matrix (§14).

**Conventions used throughout:**

- `simMinutes` = integer minutes since midnight, office-local shift date. Canonical mapping: 06:12 → 372, 06:58 → 418, 07:15 → 435, 07:29 → 449, 07:31 → 451, 07:33 → 453, 07:38:02 → 458, 07:40:51 → 460, 07:41:09 → 461, 07:43 → 463, 07:45 → 465, 07:55 → 475, 08:02 → 482, 08:05 → 485, 09:01 → 541, 09:12 → 552.
- Time windows are half-open: `[windowStartSimMinutes, windowEndSimMinutes)`. A record at exactly `start` is included; a record at exactly `end` is excluded.
- Stable result order: `simMinutes` ascending, tie-break `id` lexicographic ascending (byte order). Rows without timestamps sort by `id` only.
- The single canonical query action ID below is written as `query_records`. If the Phase 2 contract author instead freezes per-dataset action IDs (`query_auth`, `query_vpn`, …), substitute mechanically in every test; the filter semantics are unchanged. Confirm against frozen `turn.ts` / `SimulationActionIdSchema` first (`PHASE 1 CONTRACT REQUIRED`).
- Fixture row IDs below reuse the content-pack prefixes (`AUTH-`, `V-`, `D-`, `AL-`, `SC-`). These are the RED-test fixture IDs, not a claim about final pack schema field names.

---

## 1. Phase 2 behavioral contract

### 1.1 Phase 2 owns

1. **Structured record definitions.** Per-dataset Zod schemas promoting the `packages/schemas/src/records.ts` sketch (`StructuredDatasetSchema` / `StructuredRecordSchema`) into runtime-validated row shapes for `auth`, `vpn`, `devices`, `alerts`, `scanner` (and the `phishing` affordance; greenfield rows land in Phase 7). Strict objects, closed vocabularies as `z.enum`, stable string IDs.
2. **Bounded query action.** One canonical query action (`query_records` + `datasetId` + closed filter payload, carried on the existing `SimulationAction` envelope per the prep-doc recommendation) with pack-authored `ActionDefinition` entries (system, time cost, energy cost). No SQL, no generalized language, no `OR` / negation / regex / free text inside structured filters.
3. **Filter normalization.** Pure normalization before matching: trim, `user` lowercase, exact-match semantics, half-open integer windows, closed allowlist per dataset (§3). The normalized form is what is stored and replayed.
4. **Deterministic query evaluation.** Pure function over `rules` datasets: same scenario version + same normalized filters → same record set, every time, every renderer. No wall clock, no randomness (`rng.ts` was deleted via wire-or-delete; no replacement randomness source is permitted).
5. **Stable result ordering.** `simMinutes` ascending, `id` lexicographic tie-break; documented comparator; insertion-order independence.
6. **Query history.** Append-only, reducer-local, replayed instance state: `queryId`, `seq`, `datasetId`, normalized filters, result IDs in stable order, `totalCount`, `truncated`, `simMinutes`, actor event context (§7).
7. **Zero-result query representation.** Explicit empty result with metadata (`records: []`, `totalCount: 0`), not an error; storable, replayable, distinguishable from invalid filters (§6).
8. **Safe client result projection.** Result rows carry player-visible fields only; history stays server-side; per-query results expose IDs + visible fields + `queryId` (§8, §9).
9. **Replay.** Queries are logged interactions on the existing `foldActionLog` path; same ordered log → byte-identical query state and history (§10).

### 1.2 Phase 2 does NOT own

Explicit non-goals. Tests in this document must never assert any of them:

1. **Evidence Fact discovery.** No discovery evaluation, no absence detection runtime, no attachability checks. Phase 2 retains query-history metadata that Phase 3 rules will consume; it never evaluates `EvidenceProvenanceSchema` rules. (The sketch in `packages/schemas/src/evidence-facts.ts` stays types-only; no runtime module may import it — extend the existing `sketches.test.ts` no-import assertion if new sketch-adjacent modules appear.)
2. **Absence-fact semantic evaluation.** Phase 2 asserts that covering queries are *retained with the metadata Phase 3 needs* (dataset, normalized dimensions, window, zero result IDs, snapshot anchor). It never asserts "fact F discovered".
3. **Structured ticket behavior.** No ticket state machine, no attachment rules, no status transitions, no `build_summary` retirement. Those are Phase 4.
4. **NPC reasoning.** No availability, no intent contracts, no knowledge projection, no fallback phrasing. Phase 6.
5. **Conditional consequences.** No predicate evaluation at fire time, no cancellation/supersession, no typed operations beyond what exists. Phase 5. Query actions should carry no `resolve`, no `consequence`, and observation marking only where the record-open rule applies.
6. **SOC content migration.** No re-authoring of the A-1042 chain onto query mechanics, no greenfield phishing rows, no `TaskRequiredError` gate releases. The first query-backed migration follows the §15.0 protocol later; Phase 2 RED tests use synthetic pack fixtures, not the migrated live shift.

### 1.3 Boundary tests (contract-guard tests)

- **Q-BOUND-01.** A test that submits a query and asserts no `EvidenceFactDiscoveryState` entries are created or modified (import the Phase 3 sketch type for shape comparison only if still types-only; otherwise assert the discovery-state collection, whatever its frozen name, is unchanged).
- **Q-BOUND-02.** A test asserting query execution emits no consequence ledger entries beyond the standard `action_applied` effect (no `resolve`, no scheduled consequence).
- **Q-BOUND-03.** A test asserting the query path does not import `evidence-facts`, `ticket`, or `npc-intent` runtime modules (extend the `sketches.test.ts` grep pattern to the new `query.ts` engine module).

---

## 2. Fixture datasets

All fixtures are intentionally small. Every row has a stable canonical ID. Times are `simMinutes` (see mapping above). These fixtures live in RED-test files (or `packages/testing/` shared helpers if the Phase 2 author creates them there); they are NOT the live pack migration.

### 2.1 Authentication fixtures (`auth`, 10 rows)

Compact subset of the content-pack §2 rows: central rows + baseline + boundary + two distractors. (Full 14-row corpus arrives with content migration; the engine must not depend on corpus size.)

| ID | User | simMinutes | Source | Device | Method | Result | Session | VPN |
|---|---|---|---|---|---|---|---|---|
| `AUTH-0731-PATEL` | j.patel@example.com | 451 | 198.51.100.20 | corp-macbook-patel | password + extra_identity_check | success | S-0731 | V-218 |
| `AUTH-0738-GROUP` | j.patel@example.com | 458 | 203.0.113.44 | — (absent) | extra_identity_check | fail | — (none) | — (absent) |
| `AUTH-0741-PATEL` | j.patel@example.com | 461 | 203.0.113.44 | unknown-laptop-17 | password (extra-check result absent) | success | S-0741 | — (absent) |
| `AUTH-0743-REFRESH` | j.patel@example.com | 463 | — (portal) | — (absent) | session_refresh | n/a | S-0741 | — (absent) |
| `AUTH-0715-PATEL-HQ` | j.patel@example.com | 435 | 10.20.4.18 (HQ Wi-Fi) | corp-macbook-patel | password + extra_identity_check | success | S-0722 | — (absent) |
| `AUTH-0658-PATEL-PHONE` | j.patel@example.com | 418 | HQ Wi-Fi | corp-phone-patel | mobile_sso | success | S-0719 | — (absent) |
| `AUTH-0612-PATEL-TYPO` | j.patel@example.com | 372 | HQ Wi-Fi | corp-macbook-patel | password (fail once, success 06:13 same row) | fail | — (none) | — (absent) |
| `AUTH-0740-GARCIA` | m.garcia@example.com | 460 | HQ Wi-Fi | corp-macbook-garcia | password (1/5 lockout, then success 461) | fail | — (none) | — (absent) |
| `AUTH-0733-OKONKWO` | c.okonkwo@example.com | 453 | HQ Wi-Fi | corp-macbook-okonkwo | password + extra_identity_check | success | S-0735 | — (absent) |
| `AUTH-0802-RIVERA-VPN` | a.rivera@example.com | 482 | VPN V-219 (exit 198.51.100.21) | corp-macbook-rivera | password + extra_identity_check | success | S-0802 | V-219 |

Notes:

- `AUTH-0738-GROUP` carries `attemptCount: 6` and window 458–460. It is the boundary-timestamp row: group start 07:38:02 (458), group end 07:40:51 (460).
- `AUTH-0740-GARCIA` (simMinutes 460) and the `AUTH-0738-GROUP` end (460) form the **same-timestamp tie pair** for ordering tests (tie-break by ID: `AUTH-0738-GROUP` < `AUTH-0740-GARCIA` lexicographically).
- Absent fields are explicit `undefined`/missing, never empty strings — malformed-shape tests (§12) use empty strings as invalid input.

### 2.2 VPN fixtures (`vpn`, 5 rows + absence)

| ID | User | Window (simMinutes) | Exit IP | Device | Session | Status |
|---|---|---|---|---|---|---|
| `V-218` | j.patel@example.com | 449–485 | 198.51.100.20 | corp-macbook-patel | S-0731 | active |
| `V-219` | a.rivera@example.com | 482–open (end absent) | 198.51.100.21 | corp-macbook-rivera | S-0802 | active |
| `V-217` | c.okonkwo@example.com | 440–470 | 198.51.100.20 (shared exit) | corp-macbook-okonkwo | S-0735 | active |
| `V-214` | m.garcia@example.com | last week (window 0–10080 scope test) | 198.51.100.20 | corp-macbook-garcia | S-0697 | closed |
| `V-220` | d.nguyen@example.com | 540–open | — (pending) | — | — (none) | provisioning |

Plus the absence statement (not a row): **no row for (j.patel, 203.0.113.44, 385–465) exists** in snapshot `NET-VPN-04@07:45`. Required scenarios:

- matching account/IP/time record: `V-218` for (j.patel, 198.51.100.20, 449–485);
- account match but wrong IP: query (j.patel, 203.0.113.44) → zero rows;
- IP match but outside time window: query exit 198.51.100.20 with window excluding all rows (e.g. 465–475) → zero rows;
- nearby legitimate records: `V-217`/`V-219` share exit facility but differ by connection ID;
- zero qualifying records: the canonical absence probe (§6).

### 2.3 Device fixtures (`devices`, 8 rows)

| Label | Assigned user | Class | Enrolled | Assignment | Last check-in |
|---|---|---|---|---|---|
| `corp-macbook-patel` | j.patel@example.com | macbook | true | active | 450 (07:30) |
| `corp-phone-patel` | j.patel@example.com | phone | true | active | 418 |
| `unknown-laptop-17` | — (unassigned) | laptop | false | unassigned | — (never) |
| `corp-macbook-okonkwo` | c.okonkwo@example.com | macbook | true | active | 450 |
| `corp-macbook-rivera` | a.rivera@example.com | macbook | true | active | 480 |
| `corp-macbook-patel-old` | j.patel@example.com | macbook | false | retired (2025) | — (none) |
| `unknown-laptop-04` | — (unassigned) | laptop | false | unassigned | last month (out of window) |
| `loaner-pool-02` | IT loaner pool | laptop | true | loaner (returned) | last week |

Trap coverage: `corp-macbook-patel-old` (similar name, retired — exact-active-label discipline), `unknown-laptop-04` (similar `unknown-*` prefix, different label/date — prefix matching must NOT conflate), `loaner-pool-02` (stale lifecycle state).

### 2.4 Alert fixtures (`alerts`, 5 rows)

| ID | Severity | Category | Account | simMinutes | State | Linked work item |
|---|---|---|---|---|---|---|
| `A-1042` | high | sign-in monitoring | j.patel@example.com | 458–461 | open | evt-suspicious-login-1 |
| `A-1180` | low | connection monitoring | — (system) | Monday 10:18 (out-of-shift-window fixture value) | open | evt-routine-alert-1 |
| `A-1191` | low | phishing report (duplicate) | a.rivera@example.com | 552 | open | evt-phishing-1 |
| `A-1174` | low | backup-job spike | — (system) | nightly window | open | evt-routine-alert-2 |
| `A-1204` | medium-low | impossible-travel estimate (benign contrast) | c.okonkwo@example.com | 453 | open | evt-fp-review-1 |

Same-user-different-type: `A-1042` vs `A-1191`-adjacent Garcia-style rows are covered in auth; at alert level, `A-1042` (sign-in) vs any second j.patel alert of a different category if the author adds one — otherwise assert filtering `account=j.patel` returns exactly the j.patel rows and no others. Same-IP-different-time: query layer does not join alerts by IP directly (alerts carry account/device/sourceRefs per prep §3.4); test that an alert query filtered by a time window excluding `A-1042`'s window returns zero j.patel rows while the account filter alone returns them.

### 2.5 Scanner fixtures (`scanner`, 3 rows)

| ID | Scanner | Scope | Window | Status | Coverage | Change ref |
|---|---|---|---|---|---|---|
| `RUN-FIN-031` | vuln-scan-03 | finance-vlan | Monday 10:05–10:32 | completed | discovery connections only | SCAN-FIN-MON |
| `RUN-FIN-030` | vuln-scan-03 | finance-vlan | prior Monday 10:06–10:31 | completed | discovery connections only | SCAN-FIN-MON |
| `SC-NOTE-01` | — (memo) | finance-vlan | Monday 10:18 | noted | delivery-vs-event memo | SCAN-FIN-MON |

Mundane-work texture: `RUN-FIN-030` proves recurrence; `SC-NOTE-01` makes delivery-vs-event a record. All three share `SCAN-FIN-MON` so scope-filter tests return deterministic multi-row sets.

### 2.6 Fixture-scale rule

No RED-test fixture dataset in this document exceeds 10 rows. The engine must treat corpus size as an input, never a constant: every filtering/ordering test must pass identically if filler rows are added or removed, except the tests that assert exact `totalCount` values (which pin their own fixture).

---

## 3. Query normalization tests

Normalization is a pure function: raw filter input → normalized filter form. Tests target the normalizer directly (schema/unit layer) AND through the query action (core layer) to prove the stored history holds the normalized form.

- **Q-NORM-01 filter-order independence.** Same filters supplied in different key orders (e.g. `{user, sourceIp, windowStart…}` vs `{windowEnd…, sourceIp, user}`) produce identical normalized forms and identical result IDs in identical order. Assert deep equality of both.
- **Q-NORM-02 normalized time range.** `{windowStartSimMinutes: 461, windowEndSimMinutes: 461}` normalizes to the empty half-open interval `[461, 461)` and matches zero rows (valid query, zero results — not an error). Open-ended filters (`windowStart` only / `windowEnd` only) match unbounded on the missing side.
- **Q-NORM-03 duplicate filters.** The transport carries each filter dimension once (object shape). If the frozen payload schema permits repeated filter entries (e.g. array-form filters), duplicates with equal values collapse to one; duplicates with conflicting values are rejected as invalid. `PHASE 1 CONTRACT REQUIRED`: confirm the frozen payload shape first; if object-form only, this test asserts the schema rejects array-form filters.
- **Q-NORM-04 empty optional filters.** `{datasetId: "auth", filters: {}}` is valid and returns the whole dataset in stable order, bounded by the result cap (§12). Empty-string values (`user: ""`, `sourceIp: "  "`) are treated as absent after trimming, not as literal matches — assert they do NOT match zero rows as a literal empty user, but behave as if the dimension were unspecified.
- **Q-NORM-05 canonical entity ID handling.** `user` filters normalize with trim + lowercase: `"  J.Patel@Example.com "` → `j.patel@example.com` and matches all 7 j.patel auth rows. `sessionId`, `deviceLabel`, `alertId`, `vpnId`, `recordId` normalize with trim only and stay case-sensitive: `" s-0741 "` trims but `"S-0741"` ≠ `"s-0741"` — assert lowercase `s-0741` matches zero rows (valid query, zero results).
- **Q-NORM-06 whitespace.** Leading/trailing whitespace on every string dimension trims before matching (`" 203.0.113.44 "` matches; `" unknown-laptop-17 "` matches). Interior whitespace does not collapse: `"unknown  laptop-17"` matches zero rows.
- **Q-NORM-07 unsupported filter rejection.** Each dataset rejects filter keys outside its closed allowlist (per-dataset table in prep §4; e.g. `deviceLabel` on `scanner`, `urlHost` on `auth`, `unknownField` anywhere). Assert rejection category `invalid_filter` (§12), no history entry appended, no state mutation.
- **Q-NORM-08 malformed timestamps.** Non-integer window values (`461.5`), non-numeric strings (`"07:41"`), `NaN`, and negative values are rejected as `invalid_filter`. String integers (`"461"`) are rejected unless the frozen schema explicitly coerces — `PHASE 1 CONTRACT REQUIRED`: Zod default is no coercion; assert strict rejection and document if the contract author chooses `z.coerce`.
- **Q-NORM-09 start > end.** `{windowStartSimMinutes: 465, windowEndSimMinutes: 385}` is rejected as `invalid_filter` (not zero results). Rationale: distinguishes "bad request" from "no rows", which absence semantics depend on.
- **Q-NORM-10 invalid dataset/filter combination.** A dimension valid on one dataset but not another (e.g. `sessionId` on `devices`, `assignedUser` on `vpn`) is rejected as `invalid_filter` for that dataset. Unknown `datasetId` (`"email"`, `"vpn-records"`, `""`) is rejected as `unknown_dataset`.

---

## 4. Deterministic result tests

- **Q-DET-01 same state + same query = same results.** Fix scenario version + fixture pack; run `query_records {auth, {sessionId: "S-0741"}}` twice from the same initial state; assert byte-identical result IDs, field payloads, `totalCount`, and history entries (up to `queryId`/`seq`/`simMinutes`, which differ by design — assert those differ while everything else is equal).
- **Q-DET-02 stable order.** Query `{auth, {user: "j.patel@example.com"}}` (no window) returns the 7 j.patel rows ordered by `simMinutes` ascending: `AUTH-0612-PATEL-TYPO` (372), `AUTH-0658-PATEL-PHONE` (418), `AUTH-0715-PATEL-HQ` (435), `AUTH-0731-PATEL` (451), `AUTH-0738-GROUP` (458), `AUTH-0741-PATEL` (461), `AUTH-0743-REFRESH` (463). Assert exact sequence.
- **Q-DET-03 insertion-order independence.** Shuffle the pack `records[]` array order in the fixture (reverse it; then random-permutation with a fixed seed — never `Math.random()`), re-run the Q-DET-02 query; assert the identical ordered result. This test fails if the engine iterates a `z.record` map or unsorted array directly.
- **Q-DET-04 boundary timestamps.** Window `[461, 463)`: includes `AUTH-0741-PATEL` (461), excludes `AUTH-0743-REFRESH` (463). Window `[458, 460)`: includes `AUTH-0738-GROUP` (start 458), excludes `AUTH-0740-GARCIA` (460). Window `[460, 461)`: includes `AUTH-0740-GARCIA`, excludes `AUTH-0741-PATEL`. Assert all three.
- **Q-DET-05 result ID stability.** Result rows expose the fixture's stable IDs verbatim (`AUTH-0741-PATEL`, not derived keys, not array indices). Assert `resultIds` equal the row `id` fields for every dataset in §2.
- **Q-DET-06 replay reproduces results/history.** Build an action log: 2 queries + 1 legacy action (e.g. `review_alert`) + 1 zero-result query; `foldActionLog` from the same initial state twice; assert deep equality of the full final `WorldState` slices holding query state (history array, observed sets, `simClock`). Assert the two folds are byte-identical via canonical JSON comparison.

---

## 5. Filtering tests

For each entry: input query → expected record IDs in exact stable order. All use the §2 fixtures. Dataset `auth` unless stated.

- **Q-FILT-01 exact account.** `{user: "j.patel@example.com"}` → the 7-row Q-DET-02 sequence.
- **Q-FILT-02 exact IP.** `{sourceIp: "203.0.113.44"}` → `[AUTH-0738-GROUP, AUTH-0741-PATEL]`. `{sourceIp: "198.51.100.20"}` → `[AUTH-0731-PATEL]` (only auth rows carry this as source; the VPN exit-sharing lesson lives in the `vpn` dataset).
- **Q-FILT-03 exact device.** `{datasetId: "devices", filters: {deviceLabel: "unknown-laptop-17"}}` → `[unknown-laptop-17]` exactly one row; assert `unknown-laptop-04` is NOT returned. `{deviceLabel: "corp-macbook-patel"}` → `[corp-macbook-patel]` exactly; assert retired `corp-macbook-patel-old` is NOT returned.
- **Q-FILT-04 time interval.** `{windowStartSimMinutes: 449, windowEndSimMinutes: 465}` → `[AUTH-0731-PATEL (451), AUTH-0733-OKONKWO (453), AUTH-0738-GROUP (458), AUTH-0740-GARCIA (460), AUTH-0741-PATEL (461), AUTH-0743-REFRESH (463)]`. Note the tie at 460 is absent here (only one row at 460 in auth: `AUTH-0740-GARCIA` — the tie pair spans the grouped-row end boundary; assert order `[…, AUTH-0738-GROUP, AUTH-0740-GARCIA, …]`).
- **Q-FILT-05 combined account + interval.** `{user: "j.patel@example.com", windowStartSimMinutes: 449, windowEndSimMinutes: 465}` → `[AUTH-0731-PATEL, AUTH-0738-GROUP, AUTH-0741-PATEL, AUTH-0743-REFRESH]`.
- **Q-FILT-06 combined IP + interval.** `{sourceIp: "203.0.113.44", windowStartSimMinutes: 385, windowEndSimMinutes: 465}` → `[AUTH-0738-GROUP, AUTH-0741-PATEL]`. Same filters with window `[465, 475)` → `[]` (valid, zero results — IP match but outside time window).
- **Q-FILT-07 account + IP + interval.** `{user: "j.patel@example.com", sourceIp: "203.0.113.44", windowStartSimMinutes: 385, windowEndSimMinutes: 465}` → `[AUTH-0738-GROUP, AUTH-0741-PATEL]`. Same with `sourceIp: "198.51.100.20"` → `[AUTH-0731-PATEL]`.
- **Q-FILT-08 no filters.** `{datasetId: "alerts", filters: {}}` → all 5 alert rows in stable order `[A-1180 (out-of-window fixture value sorts first or last per comparator — pin the exact order in the test after the comparator is frozen), A-1042, A-1204, A-1174, A-1191]`; assert `totalCount: 5`, `truncated: false`. If the frozen contract forbids empty filters, this test instead asserts `invalid_filter` — confirm first (`PHASE 1 CONTRACT REQUIRED`); prep recommends valid-with-cap.
- **Q-FILT-09 unsupported filter forbidden.** `{datasetId: "auth", filters: {urlHost: "mailbox-check.example.net"}}` → rejected `invalid_filter`, no results, no history entry. Phishing-campaign keys are content text, never query operators.

---

## 6. Zero-result tests

Zero results are load-bearing: Phase 3 absence rules consume them. These tests assert retention and shape, never discovery.

- **Q-ZERO-01 legitimate zero succeeds.** `vpn` query `{user: "j.patel@example.com", sourceIp: "203.0.113.44", windowStartSimMinutes: 385, windowEndSimMinutes: 465}` → success result `{records: [], totalCount: 0, truncated: false}` with the query's `queryId`, normalized filters, and execution `simMinutes`. Assert no error is thrown and the action is recorded as applied.
- **Q-ZERO-02 history records normalized query.** After Q-ZERO-01, the latest history entry holds the normalized filters (lowercased user, trimmed IP, integer window), `datasetId: "vpn"`, `resultIds: []`, `totalCount: 0`, `truncated: false`, plus the snapshot anchor `NET-VPN-04@07:45` if the frozen history schema carries it (prep §8 recommends retaining it; if absent, this test records the gap for Phase 3).
- **Q-ZERO-03 result IDs are empty, not null.** Assert `resultIds` deep-equals `[]` (array), `records` deep-equals `[]`; assert `totalCount === 0`. Consumers must not need null checks.
- **Q-ZERO-04 zero is not error.** The turn result for a zero-result query contains the standard `action_applied` effect and advances `simClock` per the action definition, exactly like a non-empty query. Assert `simClock` delta equals the definition's `simulatedMinutes`.
- **Q-ZERO-05 narrow vs broad distinguishable.** Narrow unrelated query `{vpn, {user: "m.garcia@example.com", sourceIp: "203.0.113.44", window: 385–465}}` → zero rows (wrong account). Broad relevant query `{vpn, {user: "j.patel@example.com", window: 360–510}}` (no IP, wider window) → `[]` as well on current fixtures (no j.patel VPN row outside V-218's window overlap… V-218 IS j.patel's: window 449–485 overlaps 360–510, so this returns `[V-218]` — non-empty). Assert the two history entries differ in normalized filters AND in `resultIds` (`[]` vs `[V-218]`), proving coverage-relevant queries are distinguishable after the fact. (This is the "broader queries qualify" retention property; evaluation itself is Phase 3.)

---

## 7. Query-history tests

Canonical history entry shape (conceptual; Phase 2 author formalizes in `world.ts` + Zod):

```ts
QueryHistoryEntry = {
  queryId: string;            // `${sessionId}-q${seq}`
  seq: number;                // monotonic per session, starts at 1
  datasetId: string;
  normalizedFilters: object;  // post-normalization (§3)
  resultIds: string[];        // stable order; pre-truncation IDs if truncated
  totalCount: number;
  truncated: boolean;
  simMinutes: number;         // simClock when executed
  actorEventId: string;       // Work Item context from the action envelope
};
```

- **Q-HIST-01 append one per accepted query.** From a fresh state, run 3 accepted queries (including one zero-result); assert history length 3, `seq` values `[1, 2, 3]`, `queryId` values `[`${sessionId}-q1"`, …]`.
- **Q-HIST-02 deterministic ID.** Assert `queryId` format and monotonicity; assert IDs contain no wall-clock, no randomness, no renderer tag. Two identical sessions replaying the same log produce identical `queryId` sequences.
- **Q-HIST-03 dataset recorded.** Mixed-dataset sequence (auth → vpn → devices → alerts → scanner) asserts each entry's `datasetId` matches the submitted dataset.
- **Q-HIST-04 normalized filters recorded.** Submit unnormalized input (`"  J.Patel@Example.com "`, padded IP, reversed-but-valid key order); assert the stored `normalizedFilters` equal the canonical normalized form, not the raw input.
- **Q-HIST-05 result IDs recorded.** Assert stored `resultIds` equal the returned result order exactly (stable order, pre-truncation IDs + `truncated: true` when capped — see §12).
- **Q-HIST-06 simClock/action association.** Assert each entry's `simMinutes` equals the post-advance `simClock` (or pre-advance, per frozen reducer convention — confirm and pin one; the test must state which). Assert `actorEventId` equals the submitted `eventId`. `PHASE 1 CONTRACT REQUIRED`: if the frozen `EventInstance` field names for Work Item linkage differ, update this test, not the schema.
- **Q-HIST-07 repeated identical query.** Submit the same normalized query twice (with another action between, so `simMinutes` differs). Assert two entries, distinct `queryId`/`simMinutes`, identical `datasetId`/`normalizedFilters`/`resultIds`.
- **Q-HIST-08 failed/invalid query appends nothing.** Each rejection in §12/§3 (unknown dataset, bad filter, start > end, bad timestamp) asserts history length unchanged and `seq` counter not consumed (next accepted query reuses the un-consumed `seq`).
- **Q-HIST-09 history replay equality.** Action log with 4 queries (mixed datasets, one zero-result, one repeated) folded twice from the same initial state; assert deep-equal history arrays including `queryId`, `seq`, `simMinutes`.

---

## 8. Security / hidden-state tests

Player sees records, never the designer's answer map. Each test serializes the relevant payload and scans it.

- **Q-HIDE-01 no authoring relevance.** Result payloads and history-derived client data contain no `requiredOptionIds`, no `attemptCount`-as-importance, no `relatedRecordIds` beyond the per-record natural joins the dataset schema allows. Assert `relatedRecordIds` on returned rows never enumerates the full join map (content §9) — spot-check `AUTH-0741-PATEL`: its `relatedRecordIds` must not list every joinable row.
- **Q-HIDE-02 no Evidence Fact IDs.** No `fact-*` identifiers, no `satisfiedProvenance`, no `attachable` flags appear in any query result or client projection.
- **Q-HIDE-03 no hidden answer keys.** No `templateId`, no branch labels (` compromised`/`benign`/`malicious`/`attacker`), no verdict fields, no `correctPath`/`expectedAction` keys. Scan with a denylist regex over canonical JSON of the result payload.
- **Q-HIDE-04 no related hidden artifact IDs.** Unopened record bodies/metadata stay gated: querying a dataset does not mark rows examined and does not expose gated fields. Assert that a query returning `unknown-laptop-17`'s row does not expose any field the serializer would withhold from an unobserved artifact.
- **Q-HIDE-05 no future consequence metadata.** No `delayMinutes`, `dueAt`, `escalateOnApply`, consequence descriptions, or predicate text in result payloads.
- **Q-HIDE-06 no assessment state.** No `stress`/`fatigue`/`trust`/`cognitiveLoad`/`accuracy`/`riskExposure` numerics, no `ConfidenceLevel` values, no `EvidenceSignal` fields (session/action/rhythm/category/dimension) in any query-adjacent payload.
- **Q-HIDE-07 no internal template keys.** No pack-internal keys (`templateId`, action-definition internals, task-gate flags, `releasesActionGate`) leak via query results, result metadata, or error messages. Error messages for invalid filters name the offending dimension only, never internal rule text.
- **Q-HIDE-08 restricted fact quarantine.** The restricted private-travel disclosure (`employee-private-travel`: planned travel to Montreal, `knownBy: [employee]`) appears in no fixture row, no result set, no history entry, no error string, and no test helper. Add a positive grep test: the string `Montreal` (as employee-location claim) and the fact ID `employee-private-travel` match zero files under the Phase 2 fixture/result paths. (City-as-network-estimate text on `AUTH-0731-PATEL`/`V-218` notes is permitted and must be phrased as exit-estimate, never employee location.)

---

## 9. Client projection tests

- **Q-SER-01 visible record fields.** A `toClientView`-adjacent result view for `query_records {auth, {sessionId: "S-0741"}}` exposes exactly the frozen player-visible field set (record ID, user, display time, source IP, device label, method, result, session link, VPN link, scope-caveat note). Pin the field list in the test after the contract freeze.
- **Q-SER-02 hidden fields stripped.** The same view omits everything §8 forbids; assert by denylist scan plus an allowlist assertion on top-level keys.
- **Q-SER-03 query-history projection.** The client view never contains the full history array. Per-query responses expose at most that query's `queryId` + its result rows. Assert `history` (or frozen field name) is absent from `ClientView` JSON.
- **Q-SER-04 large/free-form metadata excluded.** Record `note`/body text beyond the frozen visible set, `searchableText`-style indexes, and lookup-key indexes beyond reviewed exact identifiers do not serialize with results. (KB `searchableText` pre-open exception stays KB-scoped; structured datasets never accept free text.)
- **Q-SER-05 ordering preserved after serialization.** Serialize → parse → re-read result IDs; assert order equals pre-serialization stable order for a multi-row query (Q-DET-02 set) and for a tie-pair query (Q-DET-04 window `[458, 461)`).

---

## 10. Replay tests

- **Q-REP-01 full canonical sequence.** From a fixed initial state (pinned scenario version + seed):
  1. `query_records {auth, {user: "j.patel@example.com", window: 449–465}}` → 4 rows;
  2. `query_records {vpn, {user: "j.patel@example.com", sourceIp: "203.0.113.44", window: 385–465}}` → zero rows;
  3. one canonical non-query action (e.g. `review_alert` on the linked event, if legal in the fixture pack — otherwise any frozen legal action; pin it);
  4. `query_records {devices, {deviceLabel: "unknown-laptop-17"}}` → 1 row;
  5. `foldActionLog` from start over the logged sequence;
  6. compare complete canonical query state/history via deep equality.
  Expected: deep equality between live-reduced state and folded state, including history entries, `resultIds`, `simClock`, and observed sets.
- **Q-REP-02 replay with zero results.** Log containing only the Q-ZERO-01 probe + one normal query; fold twice; assert both folds equal each other and the live state, with the zero-result entry intact (`resultIds: []`, `totalCount: 0`).
- **Q-REP-03 order sensitivity.** Same queries in a different log order produce correspondingly different histories (entries follow log order) but identical per-query `resultIds`. Assert history `seq`/`simMinutes` reflect log order while each entry's `resultIds` match the Q-REP-01 values.
- **Q-REP-04 interleaved legacy effects.** Queries interleaved with observation-marking actions (`observeArtifactIds`-carrying actions) replay identically; assert returned-vs-opened distinction survives replay (a record returned by a query but never opened stays unexamined after fold).

---

## 11. Renderer-independent action tests

The canonical query action never depends on frontend renderer. These are shared-contract tests: the same normalized action payload submitted through each renderer's test harness produces identical canonical query state.

- **Q-PAR-01 triple-submit equality.** Payload `query_records {auth, {sessionId: "S-0741"}}` submitted via the 3D-workstation harness, the desk harness, and the accessible harness (whatever harnesses exist at freeze time — at minimum direct `applyAction` calls tagged per renderer plus the existing `AccessibleMode` parity helpers): assert identical `resultIds`, identical history entry content (modulo `queryId` session prefix if sessions differ — prefer one shared session), identical `simClock` delta.
- **Q-PAR-02 zero-result parity.** The Q-ZERO-01 probe through all three harnesses: identical empty shape, identical history metadata.
- **Q-PAR-03 invalid-filter parity.** An unsupported-filter payload through all three harnesses: identical rejection category and message, no history entry in any case.
- **Q-PAR-04 no renderer-only filter dimension.** Assert the frozen filter UI contracts expose the same closed dimension set per dataset in all renderers: any dimension queryable in one harness is queryable in all three (check at the schema/contract level if UI harnesses do not exist yet; mark UI-harness coverage as Phase 8 follow-up, not Phase 2 acceptance).

---

## 12. Performance / bounds tests

Bounded beta system. Values below are test pins, not architecture: the Phase 2 contract author may change the cap constant, but must update these tests explicitly.

- **Q-BOUND-CAP-01 result cap.** Proposed cap: 50 rows. Fixture: synthetic dataset with 60 rows (generated deterministically in-test, not stored). Query with empty filters → exactly 50 rows returned in stable order (first 50), `totalCount: 60`, `truncated: true`. Assert truncation drops from the end of stable order (row 51+ absent, rows 1–50 present).
- **Q-BOUND-CAP-02 cap is not silent.** Assert every truncated response carries `totalCount` and `truncated: true`; client copy shows "N of M" (assert the fields exist; UI copy is Phase 8).
- **Q-BOUND-CAP-03 no unbounded search.** Assert the engine never materializes more than `cap + fixtureSize` row evaluations per query — in practice: assert the result array length ≤ cap for the 60-row fixture, and assert no second unbounded collection (e.g. history `resultIds` holds pre-truncation IDs but is itself bounded by fixture size; history array growth is session-bounded per §7).
- **Q-BOUND-CAP-04 malformed huge input rejected.** Filters object with >32 keys, any single string value >2,000 chars, or window spans exceeding `±2^31` are rejected as `invalid_filter`/`invalid_payload` before evaluation. Assert rejection happens without iterating the dataset (history unchanged, fast failure — assert via history-unchanged + error category, not timing).
- **Q-BOUND-CAP-05 realistic-scale determinism.** 200-row deterministic synthetic dataset (fixed-seed generation in-test); run the same filtered query twice with shuffled insertion order; assert identical ordered results and identical `totalCount`. This is a correctness-under-scale test, not a benchmark — no timing assertions.

---

## 13. Negative tests

Expected failure categories (frozen names may differ; pin at contract freeze — the distinction that must survive is **invalid request** vs **valid request with zero rows**):

| Test | Input | Expected category |
|---|---|---|
| Q-NEG-01 unknown dataset | `{datasetId: "email"}` / `"vpn-records"` / `""` | `unknown_dataset`; no history entry |
| Q-NEG-02 invalid field | `{auth, {urlHost: "x"}}`, `{auth, {unknownField: "x"}}` | `invalid_filter`; no history entry |
| Q-NEG-03 incompatible filter | `{devices, {sessionId: "S-0741"}}`, `{scanner, {deviceLabel: "x"}}` | `invalid_filter`; no history entry |
| Q-NEG-04 malformed ID | `{auth, {sessionId: ""}}` after trim → treated as absent (Q-NORM-04), but `{devices, {deviceLabel: "!!!"}}` violating the ID pattern if the frozen schema constrains it | `invalid_filter` where pattern-constrained, else absent-dimension semantics — pin per frozen schema; test must state which |
| Q-NEG-05 bad timestamp | `{windowStartSimMinutes: "07:41"}`, `461.5`, `NaN`, `-5` | `invalid_filter`; no history entry |
| Q-NEG-06 impossible range | `{windowStart: 465, windowEnd: 385}` | `invalid_filter` (never zero-results) |
| Q-NEG-07 hidden-field request | filter key naming a hidden/authoring field (`verdict`, `importanceRank`, `requiredOptionIds`, `templateId`) | `invalid_filter`; error message names only the offending key |
| Q-NEG-08 record shape violation | pack/dataset fixture with a row missing `id`, with `fields` holding an object/array value, or with duplicate row IDs | pack-load validation failure (in `superRefine` tradition); engine tests assert the invalid pack never reaches evaluation |

Additional negative invariants:

- **Q-NEG-09 no correct/incorrect semantics.** No rejection message, result payload, or history entry contains the words "correct", "incorrect", "wrong choice", "try again", "you missed". Positive grep test over query-engine sources and over actual rejection strings produced in-test.
- **Q-NEG-10 unauthorized action context.** A query naming an event ID the player cannot currently act on (or carrying no `eventId` if the frozen contract requires one) follows the existing legality path (`ActionUnavailableError` or equivalent) — assert it behaves exactly like any other unavailable action, with no history entry.

---

## 14. Phase 3 handoff contract

### Phase 3 Contract Tests To Enable Later

Phase 2 does not implement these. It guarantees the outputs below are stable, typed, and covered by the tests referenced, so Phase 3 can build discovery rules without re-proving the substrate.

| Phase 2 output | Stability guarantee | Proven by |
|---|---|---|
| Normalized `datasetId` | Closed string enum value stored per history entry, immutable after append | Q-HIST-03, Q-FILT-08/09 |
| Normalized filters | Canonical post-§3 form stored per entry; key order, case, and whitespace already folded | Q-HIST-04, Q-NORM-01/05/06 |
| Time window | Integer half-open `[start, end)` in `simMinutes`; missing bound = unbounded, recorded explicitly | Q-DET-04, Q-NORM-02 |
| Returned result IDs | Stable-ordered string array, empty (not null) for zero results, immutable after append | Q-HIST-05, Q-ZERO-03 |
| Zero-result distinction | Invalid requests throw before mutation; valid empty requests store `resultIds: []` + `totalCount: 0` + `truncated: false` | Q-ZERO-01/04, Q-NEG-06, invalid-vs-zero suite |
| Query-history ID/provenance | `${sessionId}-q${seq}`, monotonic `seq`, execution `simMinutes`, actor event context, snapshot anchor (`NET-VPN-04@07:45` or frozen equivalent) on VPN entries | Q-HIST-01/02/06/09, Q-ZERO-02 |
| Returned-vs-opened distinction | Query results never mark rows examined; only explicit open/observe actions do | Q-REP-04, prep §6.5 |
| Coverage-friendly retention | Broader queries stored with full normalized windows (no exact-string collapsing), so ⊇-coverage checks are computable later | Q-ZERO-05, prep §8 fixture 9 |

Phase 3 will additionally need (explicitly NOT in Phase 2 scope, listed here only so Phase 2 does not accidentally pre-decide them): `requiredDimensions` vocabularies, `coveredWindowMinutes` values, per-fact provenance rules, attachability, and the at-most-once-per-query evaluation hook (entries must therefore stay immutable — Q-HIST tests should assert a freeze/seal if the runtime supports it).

---

## 15. Test-layer matrix

Rule: assert each behavior once, at the lowest layer that can see it. Higher layers check wiring, not logic.

| Test | Schema (`packages/schemas`) | Core (`packages/core`) | Replay | Serializer / client view | Renderer / E2E (`apps/web`, `packages/testing`) |
|---|---|---|---|---|---|
| Record definitions valid/invalid (Batch 1) | ✅ primary: accept minimum per-dataset rows; reject unknown keys (`.strict()`), off-vocab enums, duplicate IDs, bad shapes | — | — | — | — |
| Query payload schema (action envelope, closed filter allowlists) | ✅ primary: accept/reject payload shapes | ✅ wiring: reducer parses via schema | — | — | — |
| Normalization (Q-NORM-01–10) | ✅ pure normalizer unit tests where extractable | ✅ through-action tests for stored-normalized-form | — | — | — |
| Filtering (Q-FILT-01–09) | — | ✅ primary | — | — | — |
| Ordering / determinism (Q-DET-01–06) | — | ✅ primary (incl. shuffle test) | ✅ Q-DET-06/Q-REP sequences | — | — |
| Zero results (Q-ZERO-01–05) | — | ✅ primary | ✅ Q-REP-02 | ✅ empty-state shape survives projection | ✅ announced as status (Phase 8 UI; contract pinned here) |
| History (Q-HIST-01–09) | ✅ entry schema accept/reject | ✅ append/replay behavior | ✅ Q-HIST-09 equality | ✅ history absent from client view (Q-SER-03) | — |
| Hidden state (Q-HIDE-01–08) | — | ✅ payload construction excludes | — | ✅ primary: denylist scans on serialized output | ✅ no hidden text in rendered surfaces (spot-check) |
| Serializer (Q-SER-01–05) | ✅ result-view schemas | — | — | ✅ primary | — |
| Replay (Q-REP-01–04) | — | — | ✅ primary | — | — |
| Renderer equivalence (Q-PAR-01–04) | ✅ dimension-set parity (contract level) | ✅ triple-submit equality | — | — | ✅ harness-level equality; full UI parity deferred to Phase 8 |
| Bounds (Q-BOUND-CAP-01–05) | ✅ oversize-payload rejection shapes | ✅ cap/truncation behavior | — | ✅ `totalCount`/`truncated` survive projection | — |
| Negative (Q-NEG-01–10) | ✅ schema-level rejections | ✅ reducer-level categories + no-mutation | — | ✅ error surfaces carry no internals | ✅ identical rejection in all harnesses (Q-PAR-03) |
| Phase 3 handoff (§14) | ✅ field types frozen | ✅ retention behavior | ✅ entries survive fold | — | — |
| Contract guards (Q-BOUND-01–03) | ✅ no-import test (extend `sketches.test.ts`) | ✅ no discovery/ledger side effects | — | — | — |

Server transport (`apps/server/src/trpc/`): input/output schema reuse + error mapping for `unknown_dataset` / `invalid_filter` get exactly one test each (invalid dataset via procedure; invalid filter via procedure); all other behavior is covered at schema/core layers, not re-asserted over tRPC.

---

## 16. Recommended RED-test implementation order

Adjust to repo conventions: Vitest everywhere (`*.test.ts(x)` colocated: `packages/schemas/test/`, `packages/core/test/`, `apps/web/test/`); RED-GREEN-REFACTOR per behavior change; focused test first, then broaden proportional to shared-state risk; one coherent change per commit.

### Batch 1 — schemas and valid/invalid record definitions

1. Per-dataset row schemas (auth, vpn, devices, alerts, scanner; phishing affordance as empty-valid dataset or deferred table — pin at freeze): accept minimum rows from §2 fixtures; reject unknown keys (`.strict()`), off-vocab `result`/`state`/`status` values, missing `id`, duplicate IDs within a dataset (pack-load `superRefine` check).
2. Query payload schema: `query_records` envelope (or frozen per-dataset IDs), closed per-dataset filter allowlists; accept §5 examples; reject §3/§13 negatives at parse level.
3. `QueryHistoryEntry` schema: accept §7 shape; reject missing `queryId`/`seq`/`datasetId`, non-array `resultIds`, negative `simMinutes`.
4. Result-view schemas (client-visible fields only): accept §9 field sets; reject payloads carrying §8 denylisted keys.
5. Extend the `sketches.test.ts` no-runtime-import assertion to the new engine module path(s).

### Batch 2 — basic query filtering

Q-FILT-01–09 against §2 fixtures at the core layer, plus Q-DET-05 (ID stability). No normalization edge cases yet — use already-normalized inputs. Prove: exact matches, combined dimensions, time windows, empty-filter behavior, unsupported-filter rejection category.

### Batch 3 — normalization

Q-NORM-01–10. Prove: order independence, window semantics (incl. empty `[461, 461)`), duplicate handling per frozen payload shape, empty-string-as-absent, `user` fold vs ID case-sensitivity, whitespace trimming, all rejection paths, dataset/dimension compatibility matrix. Re-run Batch 2 through unnormalized inputs as a regression sweep.

### Batch 4 — query history

Q-HIST-01–09 + Q-ZERO-01–05 (zero results are history entries first, UI states second). Prove: append-only, deterministic IDs, normalized storage, result-ID recording, clock/event association, repeat behavior, invalid-appends-nothing, replay equality.

### Batch 5 — serialization / hidden state

Q-HIDE-01–08 + Q-SER-01–05 + Q-NEG-09 (no correct/incorrect language). Prove: visible-field allowlists, history kept server-side, denylist scans green, restricted-fact quarantine, ordering survives serialization. `PHASE 1 CONTRACT REQUIRED`: build on the Phase 1-cleaned projection (stripped `templateId`, scoped related records) — confirm before writing.

### Batch 6 — replay

Q-DET-06 + Q-REP-01–04 + Q-ZERO-05 + §14 retention checks. Prove: full-sequence deep equality, zero-result folds, order sensitivity, legacy interleaving, returned-vs-opened survival, coverage-computable metadata.

### Batch 7 — integration / parity

Q-PAR-01–04 + Q-BOUND-CAP-01–05 + Q-NEG-10 + tRPC error-mapping tests (one per category). Prove: renderer-independent payloads, bounded results with explicit truncation, huge-input rejection, unavailable-context legality, transport error parity. Defer full UI-harness parity and copy polish to Phase 8; pin the contracts here.

---

## Appendix A. Biggest implementation risks uncovered (for the Phase 2 contract author)

1. **Phase 1 contract drift.** At prep time, `templateId` stripping, `turn.ts` envelope choice (`SimulationAction`+payload vs new `LoggedInteraction` variant), `EventInstance` field names, and gate-release mechanics were still in flight, with uncommitted Phase 1 recovery edits in the worktree. Every `PHASE 1 CONTRACT REQUIRED` item above is a potential silent mismatch. Mitigation: freeze Phase 1 first; then do a mechanical pass replacing each marker with the frozen name before writing Batch 1 tests.
2. **Exact-query vs coverage semantics.** The easiest wrong implementation is matching absence against exact filter strings (a hidden answer key by another name, violating spec §2.1/§14.3/R7). Q-ZERO-05 and the §14 retention rows exist specifically to force semantic (⊇) retention; Phase 3 must still author the coverage check itself.
3. **`user` fold vs ID exactness split.** One normalizer, two rules: `user` is trim+lowercase, IDs are trim-only case-sensitive. A single "normalize all strings" helper breaks either calibration (Garcia/Okonkwo lookups) or exact-label discipline (D6/D7 traps). Q-NORM-05 pins the split.
4. **Returned ≠ opened.** If query results auto-mark rows examined, the quote-vs-query distinction (content Absence 2) collapses and Phase 3 provenance becomes unprovable. Q-REP-04 and Q-HIDE-04 guard the split; the reducer branch must reuse the existing `observeArtifactIds`/`observedArtifactIds` machinery for opens only.
5. **Truncation vs absence validity.** A truncated result set cannot prove absence. With the beta corpus (~40–48 rows) truncation never triggers, so the bug hides until scale. Q-BOUND-CAP tests pin `truncated` propagation; the contract must state whether VPN-sized datasets forbid truncation or Phase 3 treats `truncated: true` entries as non-covering.
6. **History as Phase 3's read surface.** Eviction, mutation, or renderer-tagged entries would silently break future absence evaluation. The no-eviction default, immutability after append, and no-renderer-tags rules (Q-HIST-08/09, Q-DET-01) are load-bearing beyond Phase 2.
7. **Map/iteration-order dependence.** `z.record` maps and object key order are the classic determinism leak (Q-DET-03). The comparator must sort explicitly; tests must shuffle insertion order, not just run twice.
8. **Restricted-fact proximity.** Fixture authors working from the content pack will have the private-travel disclosure in context; a single pasted sentence into a fixture note becomes a leak. Q-HIDE-08's positive grep test is the backstop; fixture review must treat it as blocking.

## Appendix B. Source-faithfulness notes

- Canonical entities, times (07:31 S-0731, 07:38–07:40 six fails, 07:41:09 S-0741, 07:43 refresh, V-218→198.51.100.20, unknown-laptop-17, 203.0.113.44 not an approved exit, collection end 07:45), absence semantics (coverage, never exact-query), and the Phase 2/Phase 3 boundary are restated from the canonical design spec §5.1/§5.2/§6/§7/§18 and Appendix R (R1, R4, R7–R9) without alteration.
- Row content (IDs, relationships, distractors, cut order) derives from the structured content pack and fixtures companion; classifications (EXISTING/PROPOSED/OPTIONAL) are preserved by reference rather than repeated per row, since RED-test fixtures are synthetic engine fixtures, not pack content.
- Normalization rules, action-shape recommendation, history shape, result-cap proposal (50), and `PHASE 1 CONTRACT REQUIRED` items follow the Phase 2 implementation-prep document; where this spec pins a test value the prep left open (e.g. cap = 50, `simMinutes` mapping), the pin is marked as changeable-with-test-update in §12.
- Repo-reality anchors verified in-tree: `records.ts` sketch shape, `evidence-facts.ts` absence-coverage provenance kinds, `actions.ts` envelope (no query ID yet), `turn.ts` `LoggedInteraction` variants, `WorldState` (no dataset/history fields yet), `WorkSystemId` closed enum (5 systems), `replay.ts` fold path, `serializer.ts` observed-gating + category-bucket pattern, `sketches.test.ts` conventions (including the no-runtime-import grep test to extend).
