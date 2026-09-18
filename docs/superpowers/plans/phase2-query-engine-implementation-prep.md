# Phase 2 — Structured Records / Query Engine Implementation Prep

**Status:** Preparation only. No production code changed by this document.
**Canonical spec:** `docs/superpowers/specs/interactivity-and-content-depth-design.md` (wins all disagreements).
**Content source:** `docs/superpowers/specs/soc-structured-content-pack.md` (rows referenced as `A*`, `V*`, `D*`, `AL*`, `PH*`, `SC*`, `KB*`).
**Realism reference:** `docs/superpowers/specs/soc-shift-realism-reference.md` (verbs, workflows; adds no facts).
**Parity contract:** `docs/superpowers/specs/renderer-parity-accessibility-matrix.md` (§4–§7 for query/record interactions).
**Build contract:** `career-sim-build-spec.md` + `AGENT_CONTEXT.md` (deterministic backend owns truth; Zod at every boundary; replay invariant).
**Phase 1 boundary:** `docs/superpowers/specs/interactivity-and-content-depth-design.md` §18 Phase 1 + Appendix R + `docs/superpowers/plans/phase1-interactivity-foundation-plan.md`.

Do NOT depend on the current Phase 1 recovery audit. Do NOT assume any interrupted Phase 1 task is complete. Where Phase 2 needs a Phase 1 contract whose final shape is still in flight, this document writes `PHASE 1 CONTRACT REQUIRED` instead of guessing.

Phase 2 objective (spec §18): enable actual investigation over scenario data — structured dataset schemas, one canonical query action, deterministic filter/search engine, client record views, Desk OS query UIs + accessible equivalents. RED tests: deterministic results, invalid-filter rejection, stable ordering, no hidden-field exposure. Acceptance: A-1042 investigable via auth/VPN/device data; at least one select-clues chain replaced; same queries work across renderers.

Out of scope for Phase 2 (later phases own the runtime): Evidence Fact discovery evaluation (Phase 3), structured ticket state machine (Phase 4), conditional/cancellable consequences (Phase 5), NPC availability/intent runtime (Phase 6), full-shift content re-author (Phase 7).

---

## 1. Existing reusable patterns

All paths verified against the current worktree. Phase 2 reuses these; it does not reinvent them.

### 1.1 Zod schemas at every boundary

- Pattern: each domain module in `packages/schemas/src/` exports a Zod schema + `z.infer` type; `index.ts` re-exports. Build spec §3 requires Zod at every trust boundary (HTTP in, pack load, LLM out).
- Directly reusable: `StructuredDatasetSchema` / `StructuredRecordSchema` (`packages/schemas/src/records.ts`) is already the Phase 1 sketch shape — `datasetId`, `allowedFilterFields` (min 1), `records[]` with `id`, `fields` (string/number/boolean record), `relatedRecordIds` (default `[]`), `.strict()`. Phase 2 extends this sketch into per-dataset field schemas rather than replacing it.
- Directly reusable: `EvidenceProvenanceSchema` discriminated union (`packages/schemas/src/evidence-facts.ts`) already defines `query_presence` and `query_absence_coverage` provenance kinds with `datasetId`, `requiredDimensions`, `coveredWindowMinutes`. Phase 2 must emit query-history metadata that these Phase 3 rules can consume, but must NOT implement discovery evaluation.
- Directly reusable: `StructuredTicketSchema` (`packages/schemas/src/ticket.ts`), `NpcIntentSchema` (`packages/schemas/src/npc-intent.ts`) — confirms the sketch-type convention Phase 2 follows: strict objects, serializable predicates only, no callbacks.
- Convention to keep: `.strict()` on new authoring schemas, `.default([])` / `.default({})` on additive collections so old fixtures parse, `z.enum` for closed vocabularies, `z.record` for maps keyed by ID.

### 1.2 Canonical state split (content vs. instance)

- Pattern: `WorldState.rules` is the pack snapshot (actions, event templates, tasks, notifications); mutable per-session truth lives in instance state (`events`, `artifacts`, `observedArtifactIds`, `ticketNotes`, `notebook`, `kbQuery`, `ledger`, `simClock`). Spec §6: authored definitions (dataset rows, fact definitions, ticket defaults, consequence rules) live in content; discovery/decision/attachment state lives in instance state.
- Reuse: datasets belong in `rules` (immutable scenario facts, versioned with the scenario); query history belongs in instance state (what the player asked, when, what came back). This mirrors how `artifacts` (content) + `observedArtifactIds` (instance) already work.
- Reuse: records that simulate changing systems change only through deterministic transitions — same rule as artifacts today. Beta datasets are overwhelmingly immutable; the phishing duplicate (AL-4) and scanner follow-up are new rows/events emitted by the existing scheduler path, not in-place row mutation.

### 1.3 Action payloads (`SimulationAction` / `AvailableAction`)

- Pattern: `SimulationActionSchema = { id, actorId, eventId?, freeText? }` (`packages/schemas/src/actions.ts`); `AvailableActionSchema = { id, eventId, systemId, label, description, simulatedMinutes, taskId? }`. The client submits typed intents; the server validates legality then reduces.
- Reuse: the Phase 2 query action follows the same envelope. New fields (dataset, filters) go in a validated payload object carried alongside `id`/`eventId` — see §4. Do NOT add a second action transport; extend the existing one.
- Reuse: `ActionDefinitionSchema` (`systemId`, `label`, `description`, `simulatedMinutes`, `energyCost`, `tracksCompletion`, `defaultEffect`) — query actions get definitions in the same table so availability, time cost, and energy cost flow through existing code.
- Reuse: `WorkSystemIdSchema` (`packages/schemas/src/session.ts`) — datasets map onto existing systems (auth/VPN/device/alerts under their Desk OS tools; KB stays document-oriented). No new top-level transport needed.

### 1.4 Reducer dispatch (`applyAction`)

- Pattern: `packages/core/src/reducer.ts` — look up `availableActions(state)`, throw `ActionUnavailableError` / `TaskRequiredError`, check `rules.actions[id]` definition + energy, `structuredClone`, push `action_applied` effect, advance `simClock` by `simulatedMinutes`, append `completedActionIds`, resolve + apply effect, then `activatePendingEvents` → `wakeSnoozedNotifications` → `expireOverdueEvents` → `applyDueConsequences`, return `WorldStateSchema.parse(state)`.
- Reuse: query execution is a reducer branch on the same path: legality check → clone → filter evaluation (pure function over `rules` datasets) → append query-history entry → mark records visible/opened as applicable → evaluate nothing about evidence (Phase 3 owns that) → scheduler tail unchanged → `WorldStateSchema.parse`. Queries that only read still advance `simClock` per their action definition (time parity depends on this; see §9).
- Reuse: `resolveActionEffect` / `applyResolvedEffect` (`packages/core/src/effects.ts`) — template override falls back to action default. Query actions should have minimal effects (no resolve, no consequence); observation marking follows the `observeArtifactIds` pattern where applicable.

### 1.5 Deterministic serialization (`toClientView`)

- Pattern: `packages/core/src/serializer.ts` — server-only derivation; observed-gating (`observedArtifactIds` set + `canOpenArtifact`); `ClientArtifactSchema` omits `body`/`metadata`/`relatedArtifactIds`/`searchableText` until observed; KB documents expose `searchableText` pre-open as the approved exception; `InventoryLookupKeysSchema` exposes only reviewed exact identifiers.
- Reuse: query results serialize through the same gate. A query returns record IDs + player-visible fields only; unopened record bodies stay gated; `relatedRecordIds` never serialize as exhaustive relevance metadata (spec §6.10 / Appendix R8). The existing comment in `serializer.ts` ("references surface only inside record bodies and query results, never as precomputed relevance metadata") is the exact rule Phase 2 result views follow.
- Reuse: `workItemCategoryForTemplate` bucket mapping — coarse display categories that never join back to pack rules. Dataset/result views must not leak template IDs, progression, effects, or answer keys by any new path.
- `PHASE 1 CONTRACT REQUIRED`: final `WorkItem`/`ClientEvent` projection shape (Phase 1 strips raw `templateId` and scopes related-record lists). Phase 2 result views must build on the Phase 1-cleaned projection, not on the pre-Phase-1 shape observed during prep (`templateId` still present in serializer output at prep time; frontend still consumes it in `CaseRail.tsx`, `GuideSearch.tsx`).

### 1.6 Action logs / replay (`foldActionLog`)

- Pattern: `packages/core/src/replay.ts` — sort `ActionLogEntry[]` by `sequence`, fold with `applyAction` / `applyTaskAttempt` / `respondToNotification` / `applyWorkplaceInteraction`. `LoggedInteractionSchema` (`packages/schemas/src/turn.ts`) is the discriminated union of loggable interactions; `DomainEffectSchema` + `TurnResultSchema` close the loop.
- Reuse: queries are logged interactions like any other action. Replay determinism (`same scenario + same ordered actions/time → same state`, spec §8.5/§17.3) covers query results and query history automatically if filter evaluation is pure and history writes are reducer-local. No separate replay path for queries.
- `PHASE 1 CONTRACT REQUIRED`: whether the query interaction is a new `LoggedInteraction` variant (`{ type: "query", ... }`) or a `SimulationAction` with a filter payload. Prep recommends the latter (smallest diff; see §4), but the final call belongs to the Phase 2 contract author confirming against the Phase 1-frozen `turn.ts`.

### 1.7 Content pack definitions + validation

- Pattern: `content/packs/cybersecurity-analyst/pack.yaml` drives the engine; `CareerPackSchema.superRefine` cross-validates references (event/action/artifact/task/notification, source-quote exactness). Spec §14.5 extends — not replaces — these checks.
- Reuse: datasets are pack-authored data validated at load: duplicate IDs, missing references, impossible transitions, invalid provenance, hidden-state marked client-visible. Phase 1 adds `observeArtifactIds` target validation, `instanceId` uniqueness, orphaned-action/undefined-artifact detection, trigger/deadline sanity (spec §14.5). Phase 2 adds dataset/record/provenance-reference checks in the same `superRefine` tradition.
- `PHASE 1 CONTRACT REQUIRED`: final Phase 1 validation rule set. Phase 2 must not duplicate or contradict it; dataset validation composes with it.

### 1.8 Client projections

- Pattern: `ClientViewSchema` (`packages/schemas/src/client-view.ts`) — session, clock, location, events, availableActions, operationalMessages, pacing, artifacts, ticketNotes, notebook, kbQuery, tasks, notifications, workplace. `workstation.ts` derives shared views for every adapter; `systems.ts` catalogs work systems + action filters; `guidance.ts` derives next-action hints from state (never truth).
- Reuse: query UI reads from the same `ClientView`; query state (active filters, result list, opened record) is either local UI state (non-canonical, not replayed) or canonical history (replayed). Only the canonical subset enters `WorldState`; filter drafts and scroll position stay client-local. This matches how `kbQuery` (free text) is canonical while KB scroll position is not.
- Reuse: `canOpenArtifact` (`packages/core/src/workplace.ts`) gating pattern for record-open visibility.

### 1.9 Renderer actions (parity infrastructure)

- Pattern: all three renderers (3D walk-the-office, Desk-only, Simple list) submit the same canonical action IDs through shared handlers (`apps/web/src/client.ts` `performAction`, `workstation.ts` derivation, `AccessibleMode.tsx` parity helpers, `SystemToolPanel.tsx`). Parity matrix entries name the canonical concept per interaction; `AGENT_CONTEXT.md` confirms shared canonical handlers already exist.
- Reuse: the query action is one canonical ID (per dataset verb) invoked from all three renderers. 3D uses the same Desk OS record surface or a canonical wrapper (matrix §4–§6); it never re-implements matching. Existing `search_knowledge_base` wiring (`SystemToolPanel`, `AccessibleMode`, `index.tsx`) is the closest UI precedent — controlled filter UI → results → detail — but it is free-text precedent only; Phase 2 adds structured filter evaluation behind a similar surface.
- `PHASE 1 CONTRACT REQUIRED`: final per-action parity contract-test harness (Phase 8 owns the full matrix, but Phase 2 must ship query parity tests in the same style: same sequence in 3 renderers → same canonical end state).

---

## 2. Phase 1 contracts required

Do not guess these. Confirm each against the Phase 1-frozen tree before writing Phase 2 code.

1. **`EventInstance` final shape** — Phase 1 adds `acknowledgedAt`, priority/attention metadata, `linkedTicketId`, `waiting`/`monitoring` states, follow-up references (spec §6, §18 Phase 1). Query history entries that link to Work Items (e.g. "queried while investigating A-1042") must reference the frozen field names.
2. **`WorkItem`/`ClientEvent` projection shape** — `PHASE 1 CONTRACT REQUIRED`. Category bucket values, which `EventInstance` fields project, `followUpRefs` optionality.
3. **Hidden-state cleanup** — raw `templateId` stripped from client events (opaque bucket instead); `relatedArtifactIds` scoped per surfacing view, never exhaustive (spec §6.10, R8). Query result views must inherit this; no new path may re-expose either.
4. **Gate-release semantics** — per-action compatibility flag letting migrated actions escape `TaskRequiredError` while unmigrated stay gated (spec §15.0, R2; `releasesActionGate` in rules/tasks). The first query-backed investigation must release its actions' gates per the §15.0 migration protocol — hiding quiz UI is not migration.
5. **Pack validation rule set** — `observeArtifactIds` targets, `instanceId` uniqueness, orphan detector, trigger/deadline sanity (spec §14.5). Dataset validation composes with these.
6. **Sketch-type freezes** — `records.ts`, `evidence-facts.ts`, `ticket.ts`, `npc-intent.ts` are types-only forward contracts (P1-T06). Phase 2 promotes the records sketch to runtime; it must not silently change the evidence/ticket/NPC sketches owned by Phases 3/4/6.
7. **`turn.ts` interaction envelope** — whether query payloads ride `SimulationAction` or a new `LoggedInteraction` variant. Prep recommends `SimulationAction` + payload (smallest replay-compatible diff).
8. **`rng.ts` resolution** — wire-or-delete (Phase 1). Query engine must not introduce `Math.random()` or any non-seeded randomness (build spec §15). Deterministic ordering comes from sort rules, not shuffling.
9. **Frontend `templateId` consumer migration** — `CaseRail.tsx`, `GuideSearch.tsx` must read the Phase 1-safe bucket before query UI lands, or query views inherit a leak path.

---

## 3. Proposed bounded record schemas

Design rules (spec §7, §14): stable IDs; deterministic relationships; suggested fields per dataset; benign + irrelevant + boundary rows so filters do work; no enormous corpus; filler never resolves the central case; private travel disclosure never surfaces anywhere. Types below are contract sketches for the Phase 2 author to formalize in Zod — field names follow the content pack + spec §7 suggested fields. All timestamps are office-local simulated minutes (same clock as `simClock`); absolute-date rendering is presentation-only and derives from the pack's relative dating (content pack §7 shift-date assumption stays labeled PROPOSED until schema translation).

Common base (extends the `StructuredRecord` sketch, not a replacement):

```ts
// Base for every Phase 2 row.
{
  id: string;                    // stable, e.g. "AUTH-0741-PATEL"
  datasetId: "auth" | "vpn" | "devices" | "alerts" | "scanner" | "phishing";
  simMinutes: number;            // canonical ordering + window key
  relatedRecordIds: string[];    // natural joins only; never exhaustive relevance
}
```

### 3.1 Authentication (`auth`) — ~14 rows (grouped-failure form)

Canonical rows restate `prior-session-1`, timeline, `login-context-1`; neighbors instantiate `account-history-1` scope. Per-row fields: `recordId`, `user`, `simMinutes` (+ display time), `sourceIp`, `deviceLabel`, `method`, `result` (`success | fail | n/a`), `sessionId?`, `vpnConnectionId?` (absent is data, not null-error), `attemptCount?` (grouped row only), `note` (scope caveat).

| Field | Player-visible | Notes |
|---|---|---|
| `recordId` | yes | Stable ID (A1–A14 mapping) |
| `user` | yes | Exact account string |
| `simMinutes` / display time | yes | Ordering key; display derives locally |
| `sourceIp` | yes | Pivot key |
| `deviceLabel` | yes | Exact-label discipline |
| `method` | yes | e.g. `password`, `extra_identity_check`, `mobile_sso` |
| `result` | yes | `success` / `fail` / `n/a` (refresh rows) |
| `sessionId` | yes | `S-0731`, `S-0741`, or absent (failed attempts create none) |
| `vpnConnectionId` | yes | `V-218` or explicitly absent |
| `attemptCount` + attempt list | yes | Grouped A2 row only; per-attempt expansion deferred |
| author-only metadata | no | None for auth. No verdict, no importance rank, no `requiredOptionIds` |

Example rows (content pack §2): `AUTH-0731-PATEL` (S-0731 baseline), `AUTH-0738-GROUP` (6× fail, 07:38:02–07:40:51, no session), `AUTH-0741-PATEL` (S-0741, password accepted, extra-check result absent, no VPN ID), `AUTH-0743-REFRESH` (continuation, `result: n/a`), `AUTH-0715-PATEL-HQ`, `AUTH-0658-PATEL-PHONE`, `AUTH-LASTWK-VPN-1/2`, boundary `AUTH-0612-PATEL-PWD-FAIL`, fillers `AUTH-0733-OKONKWO`, `AUTH-0740-GARCIA`, `AUTH-0802-RIVERA-VPN`, `AUTH-0755-SERVICE-BACKUP` (labeled non-interactive), `AUTH-0901-NGUYEN-RESET`.

### 3.2 VPN (`vpn`) — 5 rows + 1 absence statement

Catalogue, not haystack. Fields: `vpnId`, `user`, `startSimMinutes`, `endSimMinutes`, `exitIp`, `deviceLabel`, `sessionRef?`, `status` (`active | closed | provisioning`), coverage note.

| Field | Player-visible | Notes |
|---|---|---|
| `vpnId` | yes | `V-214`, `V-217`, `V-218`, `V-219`, `V-220` |
| `user` | yes | Connection owner |
| `startSimMinutes` / `endSimMinutes` | yes | Window key for coverage checks |
| `exitIp` | yes | `198.51.100.20` shared across connections by design |
| `deviceLabel` | yes | Join key to inventory |
| `sessionRef` | yes | `S-0731` on V-218; S-0741 joins nothing (absence) |
| `status` | yes | `provisioning` row (V-220) teaches status reading |
| snapshot/coverage metadata | yes (as record note) | `NET-VPN-04 @ 07:45; org-provided VPN only` |
| author-only metadata | no | None. Absence statement is content (§12 Absence 1), not a hidden row |

Canonical constraints preserved: V-218 → exit `198.51.100.20`; only approved exit in snapshot; `203.0.113.44` is not an approved exit; S-0741 has no connection ID. Neighbors: V-219 (Rivera, different exit — shared city ≠ shared route), V-217 (Okonkwo, shared exit IP — connection ID disambiguates), V-214 (last week, time-filter fodder), V-220 (provisioning, not a route for anything under review).

### 3.3 Devices (`devices`) — 8 rows

Fields: `deviceLabel`, `assignedUser?`, `class`, `enrolled` (bool), `assignmentState` (`active | retired | loaner | unassigned`), `lastCheckinSimMinutes?`, `tags[]`.

| Field | Player-visible | Notes |
|---|---|---|
| `deviceLabel` | yes | Exact-match key (`unknown-laptop-17`) |
| `assignedUser` | yes | Empty for unassigned/guest rows |
| `class` | yes | MacBook / phone / laptop / loaner-pool |
| `enrolled` + `assignmentState` | yes | Load-bearing distinction |
| `lastCheckinSimMinutes` | yes | `corp-macbook-patel` 07:30; absent for never-checked-in rows |
| `tags` | yes | `RETIRED`, `GUEST`, `LOANER` markers |
| author-only metadata | no | None. D6 retired namesake + D7 other-unknown-label carry explicit unrelated notes as *record body text*, not hidden flags |

Rows: D1 `corp-macbook-patel`, D2 `corp-phone-patel`, D3 `unknown-laptop-17` (unenrolled, never MDM), D4 `corp-macbook-okonkwo`, D5 Rivera pair, D6 `corp-macbook-patel-old` (RETIRED — exact-active-label rule excludes it), D7 `unknown-laptop-04` (different label/date, explicitly unrelated), D8 `loaner-pool-02`.

### 3.4 Alerts (`alerts`) — 4 min / 5 recommended / 8 max

Fields: `alertId`, `createdSimMinutes`, `category`, `severity` (automated opinion, not verdict), `account?`, `deviceLabel?`, `sourceRefs[]`, `state` (`open | acknowledged | monitoring | escalated | closed`), `linkedWorkItemId`.

| Field | Player-visible | Notes |
|---|---|---|
| `alertId` | yes | `A-1042`, `A-1180`, neighbors |
| `category` / `severity` | yes | Severity shown as automated label; never a verdict |
| `account` / `deviceLabel` / `sourceRefs` | yes | Pivot keys into auth/VPN/device datasets |
| `state` | yes | Queue-state machine surface |
| `linkedWorkItemId` | yes | Binds alert row to its Work Item |
| author-only metadata | no | No branch labels, no correct-path flags |

Rows: AL-1 `A-1042` (central), AL-2 `A-1180` (routine, delayed delivery, event time Monday 10:18), AL-3 `A-1204` PROPOSED false-positive contrast (only if T+43 confirmed — gated content, not Phase 2 default), texture AL-4 duplicate phishing report, AL-5 backup spike, AL-6 spray-blocked, AL-7 first-seen-enrolled.

### 3.5 Scanner (`scanner`) — 2–3 rows

Fields: `runId`, `scannerId`, `scope`, `startSimMinutes`, `endSimMinutes`, `status`, `coverage` (e.g. `discovery connections only`), `changeRef`, `linkedWorkItemId`.

Rows: `RUN-FIN-031` (Mon 10:05–10:32, finance VLAN, within `SCAN-FIN-MON` 10:00–12:00), prior-week `RUN-FIN-030` (recurrence texture), optional `RUN-STOR-014` (different scope), queue-delay memo `SC-NOTE-01` (delivery-vs-event distinction as a record). Player-visible: all fields. Author-only: none.

### 3.6 Phishing (`phishing`) — 4 records + 1 report, greenfield PROPOSED

No canonical artifacts exist (orphaned `phishing-email-1`/`phishing-headers-1`/`phishing-link-1` references are dead). All rows PROPOSED supporting records; Phase 2 builds the dataset affordance, Phase 7 authors final wording. Fields per record type:

- Report `PH-RPT-01`: reporter, received time, channel, status (`open | triaged | quarantined | reporter-notified | closed`), reporter words, handling note.
- Message `PH-MSG-01`: subject, displayed sender, body, link display text (underlying href inspectable, never clickable).
- Headers `PH-HDR-01`: `From` vs `Envelope-From`, `Reply-To`, SPF/DKIM/DMARC results, `Received` chain note, `Message-ID`, `Date` — each with one-line student gloss as record body text.
- Link `PH-LINK-01`: display text, actual href (`http://mailbox-check.example.net/...` — documentation domain), scheme/host/query notes, authored inspection verdict text, first-seen time.
- Player-visible: all of the above. Author-only: none. Quarantine scope (`Message-ID + URL host`) is authored content text, not a hidden rule — engine legality for quarantine actions belongs to Phase 5 decisions, not Phase 2 queries.

---

## 4. Query action shape examples

One canonical query action per dataset verb. No SQL, no generalized language. Filter dimensions are closed enums per dataset; anything outside the allowlist is rejected (see §5).

Recommended envelope (extends `SimulationAction`, smallest replay-compatible diff):

```ts
// Conceptual shape — Phase 2 author formalizes in Zod.
{
  id: "query_records",            // single canonical ID across datasets
  actorId: "player",
  eventId: "evt-suspicious-login-1",  // Work Item context making the query
  payload: {
    datasetId: "auth" | "vpn" | "devices" | "alerts" | "scanner" | "phishing",
    filters: {
      user?: string;              // exact account
      sourceIp?: string;          // exact IP
      deviceLabel?: string;       // exact label
      sessionId?: string;         // exact session
      recordType?: string;        // dataset-specific closed vocab
      windowStartSimMinutes?: number;
      windowEndSimMinutes?: number;
    }
  }
}
```

Alternative if the contract author prefers explicit IDs per dataset (`query_auth`, `query_vpn`, `lookup_device`, `query_alerts`, `query_scanner`, `query_phishing`): acceptable, but each new ID multiplies parity tests (§9/matrix checklist item 1). Single `query_records` + `datasetId` keeps the parity surface minimal. `PHASE 1 CONTRACT REQUIRED`: confirm against frozen `turn.ts` + `SimulationActionIdSchema` conventions.

Per-dataset allowed filters (closed; beta-small):

| Dataset | Allowed filters |
|---|---|
| `auth` | `user`, `sourceIp`, `deviceLabel`, `sessionId`, time window |
| `vpn` | `user`, `sourceIp` (matches client or exit per documented semantics), `sessionId`/reference ID, time window |
| `devices` | `deviceLabel`, `assignedUser`, time-agnostic (inventory snapshot) + status filter |
| `alerts` | `alertId`/record type, `account`, `deviceLabel`, time window, `state` |
| `scanner` | `scannerId`/`runId`, scope, time window |
| `phishing` | `reportId`/`sender`/`urlHost`/`messageId`, time window (campaign scope key is content text, not a query operator) |

Examples:

```ts
// Exact session lookup (auth)
{ datasetId: "auth", filters: { sessionId: "S-0741" } }

// Account history in the morning window (auth)
{ datasetId: "auth", filters: { user: "j.patel@example.com",
  windowStartSimMinutes: 390, windowEndSimMinutes: 465 } } // 06:30–07:45

// VPN absence probe (vpn) — establishes coverage, not an exact string
{ datasetId: "vpn", filters: { user: "j.patel@example.com",
  sourceIp: "203.0.113.44",
  windowStartSimMinutes: 385, windowEndSimMinutes: 465 } } // 07:25–07:45

// Exact device lookup (devices)
{ datasetId: "devices", filters: { deviceLabel: "unknown-laptop-17" } }

// Alert queue slice (alerts)
{ datasetId: "alerts", filters: { account: "j.patel@example.com" } }

// Scanner window check (scanner)
{ datasetId: "scanner", filters: { scope: "finance-vlan",
  windowStartSimMinutes: 0, windowEndSimMinutes: 10080 } } // week window
```

Action definitions (pack-authored, same table as all actions): `systemId` = the Desk OS tool owning the dataset; `simulatedMinutes` small (1–2) so time parity holds; `tracksCompletion: false` recommended so queries never satisfy legacy linear progressions by accident; no `resolve`, no `consequence`, observation marking only where the record-open rule applies (see §6).

---

## 5. Normalization rules

Filter evaluation is a pure function over `rules` datasets. Normalize before matching; store the normalized form in history (§7).

1. **Trim + exact match.** All string filters are trimmed. ID/account/IP/device/session matching is exact after normalization — no substring, no fuzzy, no case-insensitive email folding beyond documented lowercase for the `user` field. (Anti-pattern guard from realism §12: never fail on formatting; selection-based UI sends canonical values, so exactness never punishes typing.)
2. **`user` normalization:** trim + lowercase. `J.Patel@Example.com` → `j.patel@example.com`.
3. **IP normalization:** trim; no DNS, no CIDR, no range operators in beta. `sourceIp` matches the record's `sourceIp` (auth) or documented VPN semantics (client vs. exit — dataset doc states which; both checked for the absence probe per content §12 Absence 1).
4. **ID normalization:** `sessionId`, `deviceLabel`, `alertId`, `vpnId`, `recordId` — trim only, case-sensitive. Exact-label discipline is load-bearing (D6 retired namesake excluded by exactness + RETIRED state, not by fuzzy logic).
5. **Time windows:** canonical unit is integer `simMinutes`. Half-open interval `[start, end)`. Missing bound = unbounded on that side. `start > end` → invalid filter (§10 fixture). Window values clamp to `[0, +inf)`; negative → invalid. Display times (office-local strings) are presentation-only and never match keys.
6. **Unknown filter keys:** rejected as invalid (closed allowlist per dataset). Unknown `datasetId` → invalid.
7. **Empty filter object:** valid — returns the whole dataset in stable order, bounded (§6). This is the "browse the queue" path, not an error.
8. **No operators:** no `OR`, no negation, no regex, no free text inside structured filters. KB free-text search stays separate and does not touch datasets.
9. **Record-type vocabularies** (`result`, `state`, `status`, `scope`) are closed enums; off-vocab values → invalid filter, not zero results (distinguishes "bad request" from "no rows" — critical for absence semantics).

---

## 6. Stable result semantics

1. **Deterministic matching:** same scenario version + same normalized filters → same record set, every time, every renderer. No randomness, no wall-clock, no iteration-order dependence (`Object.values` over `z.record` maps must sort by key or operate on arrays whose order is pack-defined and validated).
2. **Stable sort:** primary `simMinutes` ascending; tie-break `id` lexicographic ascending (byte order). Inventory snapshot rows without timestamps sort by `id` only. Document the comparator in code; test it with deliberately shuffled pack order (fixture §10.5).
3. **Bounded results:** page size cap (proposed default 50; final value is an implementation detail, not architecture — record it in the Phase 2 contract). Results beyond the cap truncate deterministically from the end of the stable order with `truncated: true` + `totalCount`. No silent drop: the client always shows "N of M". Cursor-based pagination deferred — beta corpus is ~40–48 rows; cap + count suffices. `PHASE 1 CONTRACT REQUIRED`: none — new decision, but keep it out of replay-sensitive state (cap is code constant or pack constant, never per-query mutable state).
4. **Zero results:** explicit empty result with metadata, not an error: `{ records: [], totalCount: 0, queryId, normalizedFilters, simMinutes }`. Empty state suggests next verbs in text (parity matrix §5 accessibility: "No results" announced as status). Zero rows is the load-bearing case for absence facts — it must be storable, replayable, and distinguishable from invalid filters.
5. **Opened vs. returned:** returning a record in results does NOT mark it examined. Only an explicit `open_record`-equivalent (existing `observeArtifactIds` / `observedArtifactIds` machinery) marks examination. This preserves the content pack's quote-vs-query distinction (Absence 2: reading the A-1042 sentence restates the claim without establishing it).
6. **No hidden fields:** result rows carry player-visible fields only. No verdict, no importance rank, no `requiredOptionIds`, no branch labels, no authoring metadata. Serializer tests (§17.4) extend to result payloads.

---

## 7. Query-history requirements

Canonical instance state (new, Phase 2). Authored dataset rows live in `rules`; history lives per session:

```ts
// Conceptual — Phase 2 author formalizes.
QueryHistoryEntry = {
  queryId: string;                 // `${sessionId}-q${seq}`
  seq: number;                     // monotonic per session
  datasetId: string;
  normalizedFilters: object;       // post-§5 normalization
  resultIds: string[];             // stable-order IDs actually returned (pre-truncation IDs if truncated, plus truncated flag)
  totalCount: number;
  truncated: boolean;
  simMinutes: number;              // simClock when executed
  actorEventId: string;            // Work Item context
}
```

Requirements:

- **Append-only, reducer-local.** Every successful query appends exactly one entry. Invalid filters append nothing (they throw before mutation, like `ActionUnavailableError`).
- **Replayed.** History is `WorldState` instance state; `foldActionLog` reproduces it exactly. Never store wall-clock, random IDs, or renderer tags in entries.
- **Bounded.** Cap history length (proposed: keep all beta entries — corpus is tiny; revisit only if unbounded sessions emerge). Truncation policy, if ever needed, drops nothing the absence rules reference — absence evaluation reads entries, so eviction would break Phase 3. Default: no eviction in beta.
- **Serializable safely.** History serializes to the server only. Client views receive per-query results + their own `queryId`, never the full history array (prevents cross-query leakage analysis and keeps payloads small).
- **Evaluated at most once per query (Phase 3 hook).** Spec §5.2: discovery rules evaluate coverage deterministically at most once per query. Phase 2 must therefore make entries immutable after append — Phase 3 reads them, never rewrites them.

---

## 8. Absence-proof support

Canonical rule (spec §5.2, Appendix R7 — binding for Phase 3): an absence fact ("no matching VPN session in queried interval") is a normal fact with a coverage provenance rule, not a special primitive and never an exact-query match. A stored query establishes the absence iff:

1. its normalized filters semantically cover the authored requirement — required dimensions (account/user, source IP where applicable) plus a time interval ⊇ the authored window; and
2. the result set contains zero qualifying records.

Broader queries qualify; wrong-account or unrelated-interval queries do not. The runtime records normalized query, dataset, filters, result IDs, and sim time; the discovery rule evaluates coverage deterministically at most once per query. Phase 2 does NOT implement discovery — it retains the metadata Phase 3 needs.

Canonical VPN absence (content pack §12 Absence 1): "No matching VPN session explains S-0741." Required coverage: `NET-VPN-04` snapshot at 07:45; org-provided VPN only; queried by (`user=j.patel`, window ⊇ 07:25–07:45, `source=203.0.113.44`); both connection-ID and exit-address checked. Caveats preserved: personal VPNs out of scope; absence ≠ route identification.

Metadata Phase 2 must retain per query (superset of §7 — absence needs the snapshot anchor):

- `datasetId` (`vpn` for the canonical case)
- normalized `user`, `sourceIp`, `[windowStart, windowEnd)` in `simMinutes`
- `resultIds` + `totalCount` (must be zero qualifying rows)
- `simMinutes` of execution + `snapshotId` (`NET-VPN-04@07:45` as authored content reference)
- `truncated: false` required for absence validity — a truncated result set cannot prove absence (open implementation detail: either forbid truncation on VPN dataset given its tiny size, or mark absence evaluation invalid when truncated; recommend the former)

Why broader queries qualify: coverage is semantic (⊇), not string equality. Fixture §10.9 (broader interval) must be retainable as covering. Why exact-query matching is forbidden: it would turn absence into a hidden answer key (`requiredOptionIds` by another name), violating spec §2.1/§14.3 and R7.

Other absence candidates the same metadata shape supports (content §12): unknown-laptop-17 enrollment absence (exact-label + snapshot coverage), 90-day ASN lookback (history-wide filter scope), export-scope file/mailbox absence ("access unverified"), HR travel-register coverage limit, phishing report-store state at 09:12. Phase 2 retains uniformly; Phase 3 authors per-fact `requiredDimensions` + `coveredWindowMinutes`.

---

## 9. Renderer contract

Parity rule (canonical, matrix): every career-relevant action maps to the same canonical action concept and backend result in all three renderers. Renderer alters presentation, never truth. Query actions are career-relevant — full parity applies.

| Concern | Desk | Accessible | 3D workstation |
|---|---|---|---|
| Action ID | `query_records` + `datasetId` payload | same | same (Desk OS surface or canonical wrapper; matrix §4) |
| Filter controls | search box / controlled filter UI, visible active filters, stable record IDs | equivalent filter controls + record list, no information loss | identical record surface while seated; no spatial re-implementation |
| Results | table/list + detail view | list + reading view; "N results" announced; filters removable by keyboard | same Desk OS detail surface |
| Record inspection | detail pane; two-record comparison available | heading + table/list semantics; comparison via sequential views with labeled headings | same detail surface; comparison layout may differ, capability must not |
| Zero results | empty state + next verbs in text | announced as status, not silence | same content |
| Time cost | `simulatedMinutes` per definition | same | movement costs zero sim minutes (accepted asymmetry, R11); queries cost the same everywhere |
| Evidence parity | no prop/camera/pointer-gated discovery | same | same — record tools never re-implemented spatially |

Invariants (matrix checklist + movement/time parity):

- Same normalized query in any renderer → byte-identical result IDs in the same stable order.
- Absence derivable only from performed queries, in all renderers equally; never pre-revealed.
- No filter dimension missing in any renderer; no query constructible only via pointer (map-click time pickers need text inputs).
- Keyboard: every filter a real input/select/combobox; Enter submits, Escape clears/closes; results reachable by Tab/arrows.
- Screen reader: results count announced; discoveries (Phase 3) via live region; severity/status as text, never color-only; tables with headers or lists with roles.
- Regression: scripted identical query sequences across renderers produce identical canonical-time event logs + identical `resultIds` sequences.

---

## 10. Test fixture catalog

All fixtures use canonical entities (S-0731, S-0741, `203.0.113.44`, `198.51.100.20`, V-218, `unknown-laptop-17`, `corp-macbook-patel`, A-1042, A-1180, `j.patel@example.com`). RED-first per spec §17.8; replay fixtures extend the existing `foldActionLog` suites.

1. **Exact-match result** — `auth` filter `{ sessionId: "S-0741" }` → exactly `[AUTH-0741-PATEL]`; assert full visible field set (password accepted, extra-check absent, no VPN ID, device `unknown-laptop-17`, IP `203.0.113.44`).
2. **Broader query** — `auth` filter `{ user: "j.patel@example.com" }` (no window) → central + baseline + boundary rows (A1–A8 group, A13), excludes other-user fillers (A9–A12, A14); assert stable order + `totalCount`.
3. **Zero-result query** — `vpn` filter `{ user: "j.patel@example.com", sourceIp: "203.0.113.44", window: 07:25–07:45 }` → `records: []`, `totalCount: 0`, history entry retained with `truncated: false`. Asserts empty-state shape, not an error. (This is the canonical absence probe; Phase 2 asserts retention only, not discovery.)
4. **Invalid filter** — `{ datasetId: "auth", filters: { unknownField: "x" } }`, `{ datasetId: "nope" }`, `{ windowStart > windowEnd }`, off-vocab `result: "maybe"` → rejection before mutation; no history entry; error surfaced identically in all renderers.
5. **Stable ordering** — pack records deliberately shuffled in the fixture; same query twice → identical `resultIds` order (`simMinutes` asc, `id` lexicographic tiebreak). Include a same-timestamp tie pair.
6. **Deterministic replay** — fixed scenario version + action sequence containing queries interleaved with legacy actions → `foldActionLog` final state (including query history + `observedArtifactIds`) matches exactly; run twice, diff byte-identical.
7. **Time-window boundaries** — half-open `[start, end)`: record at exactly `end` excluded; record at exactly `start` included. Fixture: window ending at S-0741's minute excludes it; window starting at it includes it. Assert both.
8. **Same query repeated** — identical normalized filters submitted twice (different `simMinutes`) → identical `resultIds`; two history entries with distinct `queryId`/`simMinutes`. Query order never alters underlying truth (spec §5.1 acceptance).
9. **Broader interval proving absence coverage later** — `vpn` filter with window ⊇ 07:25–07:45 (e.g. 06:00–08:30) + required dims + zero rows → history entry retains normalized window + `snapshotId` so Phase 3 can evaluate coverage without an exact query string. Negative controls: wrong-account query and unrelated-interval query retained but non-covering (Phase 3 consumes; Phase 2 asserts the metadata fields exist).

Additional required suites: hidden-field scan over result payloads (no `templateId`, verdicts, branch labels, answer keys — spec §17.4); parity triple (same query sequence in Desk/Accessible/3D harness → same `resultIds`); invalid-vs-zero distinction test (invalid throws, zero returns).

---

## 11. Likely repository areas

- `packages/schemas/src/records.ts` — promote sketch to per-dataset field schemas; closed filter-field enums; `.strict()`.
- `packages/schemas/src/actions.ts` + `turn.ts` — query action ID(s) + payload schema; `LoggedInteraction` envelope decision.
- `packages/schemas/src/world.ts` — `QueryHistoryEntry` schema + `WorldState` instance-state field; datasets in `ScenarioRules` (rules snapshot).
- `packages/schemas/src/client-view.ts` — result-view schemas (player-visible fields only); history stays server-side.
- `packages/schemas/src/career-pack.ts` — dataset/record/provenance-reference validation in `superRefine` tradition.
- `packages/core/src/` — new pure filter engine module (e.g. `query.ts`; pure over `rules` datasets); reducer branch; serializer result gating; availability entries; replay covered by existing fold.
- `packages/core/test/` — RED fixtures from §10; stable-order, replay-equality, no-leak suites.
- `apps/server/src/trpc/` — input/output schemas for the query procedure; error mapping for invalid filters (transport-agnostic errors pattern).
- `apps/web/src/` — Desk OS query surfaces per dataset (extend `SystemToolPanel` idiom); `AccessibleMode` equivalents; 3D wrappers over the same Desk OS surface (`world/deskOs/`); `workstation.ts` derivation; `guidance.ts` hints (never answers).
- `content/packs/cybersecurity-analyst/` — dataset rows translated from content pack §2–§8 with stable `A-/V-/D-/AL-/PH-/SC-/KB-` IDs; prose artifacts remain the detail view.
- `packages/testing/` — shared query fixtures + cross-renderer parity helpers.

---

## 12. Risks / open implementation details (NOT architecture decisions)

Settled architecture is not revisited here. These are implementation details the Phase 2 contract author resolves:

1. **Single `query_records` vs. per-dataset action IDs** — prep recommends single ID (smaller parity surface); either satisfies the spec.
2. **Timestamp representation** — `simMinutes` integers vs. richer time type; display formatting stays presentation-only. Pack relative dating ("most recent completed Monday") needs a build-time derivation rule if absolute dates appear.
3. **Result cap value + truncation UX** — proposed 50; VPN dataset may forbid truncation (absence validity). Cap is a constant, not replay state.
4. **Dataset placement** — `rules` snapshot vs. separate pack section; either is fine if versioned with the scenario and validated at load.
5. **KB interaction shape** — KB stays document search (free text over `searchableText`); structured datasets never accept free text. Boundary between `search_knowledge_base` and `query_records` must be documented so authors use the right verb.
6. **Phishing gating** — dataset affordance ships in Phase 2; greenfield content rows + workflow legality land in Phases 5/7. Do not let empty phishing tables block auth/VPN/device acceptance.
7. **Grouped vs. per-attempt auth-failure rows** — content pack recommends grouped A2; query UI must handle `attemptCount` display either way.
8. **`sourceIp` semantics on VPN dataset** — document whether it matches client IP, exit IP, or both; absence probe requires both checked (content §12 Absence 1).
9. **Query time cost** — 1–2 sim minutes proposed; must be identical across renderers. Zero-cost queries risk time-parity exploits; high-cost queries punish investigation.
10. **History growth** — beta keeps full history; revisit only with evidence of unbounded sessions, and never evict entries absence rules reference.
11. **Migration sequencing** — first query-backed investigation follows §15.0 protocol (identify legacy WorkTasks → build replacement → verify canonical replay → expose in all renderers → release gate → retire legacy). Gate-release owner is Phase 1's mechanism; Phase 2's job is to use it, not redesign it.
12. **`relatedRecordIds` authoring discipline** — natural joins only (content §9 map); exhaustive relevance lists are a leak path (R8). Validators should flag suspiciously complete lists for review.

---

## Sources consulted (prep only)

- Canonical design spec §§1–20 + Appendix R (reconciled `a82a02b` lineage)
- Structured content pack §§1–13 (entity inventory, record sets, relationship map, absence candidates, size budgets)
- Shift realism reference §§1–14 (verbs, workflows, wrong-path responses, anti-patterns)
- Renderer parity matrix (interaction entries §§1–19, movement/time/information parity, regression checklist)
- `AGENT_CONTEXT.md`, `AGENTS.md`, `career-sim-build-spec.md` (§§0–3 verified), `docs/coordination/REQUESTS.md`
- Worktree inspection (read-only): `packages/schemas/src/{actions,records,evidence-facts,ticket,npc-intent,world,events,turn,client-view}.ts`; `packages/core/src/{reducer,serializer,replay,availability,effects}.ts`; `apps/web/src` action-wiring grep; `docs/superpowers/plans/phase1-interactivity-foundation-plan.md` (boundary only)
