# A3 migration inventory — peer-mode behaviors

> **Scope:** planning only. Read + harvest map for [DESK_OS_OVERHAUL_PLAN.md](DESK_OS_OVERHAUL_PLAN.md) Task A3. No application code changes. WorkSurface / AccessibleMode / ExperienceShell stay compiling until R1.
>
> **Rule:** inspect before delete. Every MUST-migrate row has a destination in the single experience (Desk OS / OpsConsole / SystemApp / SystemToolPanel / shared components) and a protecting test that must keep covering the behavior after migration.

## Architecture snapshot (current)

| Layer | Role today |
| --- | --- |
| `ExperienceShell` (`experience/ExperienceShell.tsx`) | Peer mode selector (`walk` \| `desk` \| `list`); owns `NonspatialResources` (energy, walk, fridge/coffee/snack, emergency recovery, Talk to Jules); `SpatialModeBoundary` WebGL fallback → `onModeChange("desk")`. |
| `SpatialShell` → `LaptopOverlay` → `DeskOs` | Single-experience seated path after A1: session slice (`osSession`) above mount; OpsConsole browser page; `SystemApp` queue + detail focus. |
| `WorkSurface` (`components/WorkSurface.tsx`) | Peer “Desk only” renderer. System dock, queue/detail, GuidancePanel, CaseRail, NotificationBanner, MutationStatus, OperationalMessages → `SystemToolPanel`. |
| `AccessibleMode` (`components/AccessibleMode.tsx`) | Peer “Simple list” renderer. Flat sections per system, structured-event focus IDs, NotesEditor/TicketComposer inline, alert-source gating, utilities, OperationalMessages. |
| Shared | `SystemToolPanel`, `NotificationBanner`, `MutationStatus`, `CaseRail`, `GuidancePanel`, `OperationalMessages`, `ModeProps`, tools under `components/tools/`, `artifacts.tsx`. Already mounted by OpsConsole/`SystemApp` when seated. |

**Target homes (single experience):** seated path = `DeskOs` / `OpsConsole` / `SystemApp` / `SystemToolPanel` / shared components; spatial HUD fallback = `SpatialShell` / break-room hotspots; A2 in-experience no-WebGL fallback reuses migrated shared controls (not a peer product mode).

## Migration matrix

Buckets: **MUST** = migrate before R1 deletion; **ALREADY** = present in main experience (verify test still covers); **OBSOLETE** = superseded by one-experience direction (no destination needed beyond test rewrite).

### MUST migrate before deletion

| Behavior | Current file(s) | Why | Target home | Protecting test(s) | Risk |
| --- | --- | --- | --- | --- | --- |
| Keyboard focus after system/event navigation (heading `tabIndex=-1` + focus request) | `WorkSurface.tsx` (`focusRequest`, `headingRef`); also `SystemApp.tsx` (already has request ID) | Plan A3: keyboard focus management; `workplace-parity` desk-mode focus | Keep `SystemApp` seated path; ensure fallback/`OpsConsole` navigation uses same request pattern | `workplace-parity.test.tsx` “focuses the selected tool heading…”; `desk-os.test.tsx` “moves focus to an app heading…” / “scopes selected events…” | Medium: focus order must not fight OpsConsole tab focus |
| Notification handle → open system + focus linked event after ack (retained callback across retry) | `WorkSurface.tsx` `openSystem(notification.systemId, notification.eventId)`; `AccessibleMode.tsx` `structured-event-${eventId}` focus; `OpsConsole.tsx` `pendingNotificationTarget` | Plan A3: notification focus-after-ack; notification focus parity suite | `OpsConsole` already has pending target + `SystemApp` focus; ensure ack focus still works for Handle/retry without WorkSurface | `desk-os.test.tsx` “notification focus parity” (WorkSurface + AccessibleMode); “waits for the canonical notification view…”; “focuses the linked work only when a failed Handle retry is applied” | High: only peer renderers currently prove WorkSurface/list focus; must re-express against OpsConsole/systemApp |
| Mutation error → inline alert focus + Retry | `MutationStatus.tsx` (focus on error/success); `WorkSurface` / `AccessibleMode` / `OpsConsole` mount it with `onRetryMutation` | Plan A3: mutation error focus + retry | Keep `MutationStatus` shared; ensure any A2 fallback and seated status strip always mount it with retry | `workplace-parity.test.tsx` “announces and focuses mutation failures…”; `desk-os.test.tsx` retry suite; `shift-lifecycle-recovery.test.tsx` retry; `movement-parity.test.tsx` retry while walking | Medium: retry wiring lives in `index.tsx` coordinator — do not invent second retry |
| Structured action fallback (flat action buttons, primary vs utility, pending disable) | `AccessibleMode.tsx` `StructuredActionButton` / `interactionActions` / `utilities`; `SystemToolPanel` `ActionButtons` / `WorkInteraction` | Plan A3: structured action fallback; all `availableActions` reachable | Seated: `SystemToolPanel` (already); fallback (A2): reuse `SystemToolPanel` or extract minimal action list — not a second product | `app.test.tsx` identical action ids / keyboard activation; `workplace-golden-path.test.tsx` identical action ids across renderers; `work-tools.test.tsx` desk+structured | High: golden path currently loops modes — must become single-experience without losing action-set guarantee |
| NotesEditor (investigation notes + notebook) | `AccessibleMode` inline ticket/notebook editors; `SystemToolPanel` ticket_queue `NotesEditor`; `artifacts.tsx` | Plan A3: NotesEditor already shared via SystemToolPanel | Already seated via SystemToolPanel; AccessibleMode inline is duplicate path | `app.test.tsx` ticket notes; `desk-os.test.tsx` dirty notes per action/event | Low: already ALREADY for seated; AccessibleMode path obsolete after R1 |
| TicketComposer (`document_ticket` + draft) | `AccessibleMode` ticket_queue map; `SystemToolPanel` ticket_queue | Plan A3: TicketComposer shared via SystemToolPanel | Already seated via SystemToolPanel | `work-tools` / `content-depth` / golden path ticket steps | Low for seated; list-only rendering obsolete |
| TeamChat + Morgan thread continuity | `AccessibleMode` `TeamChatTool`; `SystemToolPanel` team_chat; `OperationalMessages` | Plan A3: Team Chat/Morgan boundaries; Morgan available after manager actions disappear | Already seated via SystemToolPanel + OpsConsole ticker | `workplace-parity.test.tsx` “keeps Morgan's thread…”; `content-depth.test.tsx` Morgan | Medium: list mode keeps team_chat section even when empty — preserve “Morgan messages imply section exists” if fallback still needs it |
| AlertRecords + `bindAlertAction` + open-before-investigate gate | `AccessibleMode` needsAlertSource; `SystemToolPanel` alert_dashboard `records.length && !source` disable | Plan A3: alert source binding; canonical investigation gate | Already seated via SystemToolPanel | `work-tools.test.tsx` alert record bind desk+structured; `desk-os` alerts tabs | Medium: list disables without status copy; desk shows role=status — keep one message form |
| GuideSearch (canonical + local search) | `AccessibleMode` knowledge_base; `SystemToolPanel` knowledge_base | Plan A3: Guide already shared | Already seated | `guide-search.test.tsx` structured + SystemToolPanel | Low |
| InventoryLookup | `AccessibleMode` (only if `onOpenArtifact`); `SystemToolPanel` knowledge_base | Plan A3: Inventory already shared | Already seated | `inventory-lookup.test.tsx` visual + structured | Low |
| RecordQueryTool (G24 path still outside overhaul critical path) | `AccessibleMode`; `SystemToolPanel` knowledge_base | Mount parity only — query wiring itself is G24 | Already seated mount | `record-query.test.tsx` “mounts in desk KB panel and accessible view” | Low for A3; do not expand into G24 |
| CaseReview | Both peer renderers + `SystemToolPanel` `WorkInteraction` | Shared review controls | Already seated | `content-depth` / work tools | Low |
| TaskInteraction (observed artifacts, step feedback) | Both peers + `SystemToolPanel` `WorkInteraction` | Canonical task mechanics | Already seated | `task-recovery.test.tsx`; `desk-os` step feedback; golden path tasks | Medium: structured “work step refreshing” copy vs desk empty-actions — keep one status |
| CaseRail resume → system + event focus | `WorkSurface` `openSystem`; `AccessibleMode` focus structured id; `OpsConsole` `openTab` | Resume into correct pane + focus | `OpsConsole` `onResume` → `openTab` (already) | `content-depth.test.tsx` CaseRail; golden path resume | Medium: list resume focuses DOM id that only exists in AccessibleMode |
| Shift header / clock / open counts / system dock | `WorkSurface` header + `system-dock` + `WORK_SYSTEMS` open counts | Visible workload affordances | OpsConsole status strip (time/energy/objective) already; dock is desk-only chrome — optional for fallback | Golden path / workplace-parity coverage of counts and hot tabs | Low: OpsConsole tabs + suggested dot cover “what next” without full dock |
| GuidancePanel (“Open {system}”, guided titles) | `WorkSurface` + `GuidancePanel.tsx`; OpsConsole uses `getShiftGuidance` for suggested tab | Guided practice / next step | OpsConsole suggested tab + `DashboardHome` guidance; extract GuidancePanel only if fallback needs CTA | `app.test.tsx` tutorial; `desk-os` guided; `journey.test.ts` steps | Medium: dual guidance UIs (WorkSurface panel vs OpsConsole dot) — pick one primary, keep CTA reachable |
| OperationalMessages floor ticker | `shared.tsx`; WorkSurface, AccessibleMode; OpsConsole does **not** render it today (no `OperationalMessages` in OpsConsole) | Floor messages/Morgan visibility while seated without leaving browser page | Mount `OperationalMessages` (or compact ticker) in OpsConsole / status strip | `content-depth` / `workplace-parity` Morgan; any ticker assertions | Medium: seated path may currently rely on email/Morgan tools only — gap to close in A3 wiring |
| Structured location + simClock lede | `AccessibleMode` location/time line | Lightweight context for keyboard users | OpsConsole status strip already has time; location optional | Minimal — do not invent duplicate clocks | Low |
| Alert source status copy (“Open alert record before…”) | `SystemToolPanel` only (AccessibleMode only disables button) | Consistent guidance when gated | Keep SystemToolPanel status; ensure fallback includes it | work-tools alert tests | Low |
| Keyboard-only reachability of all workstation actions while seated | Implied by peer renderers + `os-shell-harden` keyboard flow | Plan A3 acceptance: every canonical action reachable while seated | Seated = OpsConsole keyboard path; A2 fallback = same shared panels | `os-shell-harden` keyboard-only flow; golden path keyboard steps | High: acceptance gate for A3/A2 |
| Break/Jules/emergency recovery reachable while **seated** (not only spatial HUD / NonspatialResources) | `ExperienceShell` `NonspatialResources`; spatial HUD / `BreakRoomPanel`; Desk OS has **no** Jules/break controls today | Plan A3 explicit: unify recovery while seated | Taskbar/break-room entry or seated panel that reuses `BreakRoomPanel` + `JulesDialogue` + emergency control (same handlers as spatial) | `experience-shell.test.tsx` desk recovery+Jules; `workplace-parity` emergency recovery spatial + structured; `jules.test.tsx`; `break-room.test.tsx`; `movement-parity` emergency_recovery | High: only reachable via peer Nonspatial today when in desk/list — must not die with mode selector |
| Walk-5m non-evidence exertion while non-spatial | `NonspatialResources` + `useMovementExertion` | Optional movement without career evidence | Keep for spatial; fallback may drop or keep one control — never evidence | `movement-parity.test.tsx` walk across modes | Medium: plan says navigation never evidence — preserve if control kept |
| SpatialModeBoundary → in-experience reduced presentation (not peer desk product) | `ExperienceShell` fallback → `onModeChange("desk")` | Plan A2 depends on A3 migrated controls | A2: fallback UI composed of migrated shared controls | `experience-shell.test.tsx` fallback (rewritten by A2) | High: if WorkSurface deleted while fallback still imports it — R1 stop condition |

### Already duplicated in main experience (verify, do not re-implement)

| Behavior | Peer source | Already in | Protecting test | Gap to watch |
| --- | --- | --- | --- | --- |
| System queue + event selection + detail meta + SystemToolPanel | WorkSurface | `SystemApp` + OpsConsole tab | `desk-os.test.tsx` selection/focus; golden path `os` mode | WorkSurface-only empty-state copy differs slightly |
| NotificationBanner + handle/snooze/continue + pending keys | WorkSurface, AccessibleMode, OpsConsole | `OpsConsole` body (hidden when locked) | `desk-os` notification tests | Banner hidden when not on Browser app (known limitation — N1/taskbar badge later) |
| MutationStatus + Retry | all three | OpsConsole status strip | desk-os retry; workplace-parity | Peer paths still mount for tests until R1 |
| CaseRail | WorkSurface, AccessibleMode | OpsConsole | content-depth | Resume target map OK |
| Shift clock / energy strip | WorkSurface header / Nonspatial EnergyMeter | OpsConsole status strip + EnergyMeter | golden path / break-room | Dual presentations until R1 |
| All SystemToolPanel tools (Email, Alert, Guide, Inventory, Query, TeamChat, Ticket, Task, Case, Notes) | both peers | `SystemApp` via SystemToolPanel | tool suites above | Structured-only call sites must retarget SystemToolPanel or stay until R1 |
| Suggested next tab (guidance systemId) | WorkSurface GuidancePanel / dock | OpsConsole `desk-os-tab-target` + guided effect | desk-os guided tests | No big CTA button equivalent |
| Session persistence across overlay remount | N/A (peers have local state only) | A1 `osSession` | `os-session.test.tsx` | Peers do not own session — do not move peer local selection into session unless W1 needs it |
| Independent OwnerDeskOs without SpatialShell | N/A | A1 | `os-session` owner suite | — |

### Obsolete after one experience (no migration destination; retire with R1/R2)

| Item | Why obsolete | Test rewrite note |
| --- | --- | --- |
| `ExperienceMode` type + `MODES` nav (“Walk the office / Desk only / Simple list”) | Plan: no peer product modes; A2 removes from default path | `app.test.tsx` peer-mode dashboard tests; `experience-shell` mode select; `shift-lifecycle-recovery` it.each mode labels; `site-entry` `career-expo-mode` |
| Mode-preservation through manager guidance | Product no longer has mode product choice | Rewrite to “mode/fallback state does not leak into manager surface” or delete |
| “Same actions in every mode” copy / mode-note | Superseded by single experience | Golden path cross-renderer equality becomes seated vs fallback (A2) or seated-only (post-R1) |
| WorkSurface as **product** entry (Desk only without OS login) | Desk-only is not the product; sit → login → Desk OS is | `app` / `experience-shell` desk-only assertions → fallback assertions under A2 |
| AccessibleMode as **product** Simple list peer | List is not a permanent alternate product; keyboard paths move in-experience (X1) | structured-only tests retarget seated panels + X1 keyboard shell |
| `ModeProps` as three-renderer contract | Handlers stay; type may shrink to shared props | Update imports when peers deleted |
| `index.tsx` exports of WorkSurface/AccessibleMode | R1 cleanup | Public export tests |
| Golden path `for (const mode of …)` peer parity | Superseded: parity within one experience | R2: single-experience golden + temporary fallback case only while A2 fallback exists |
| Nonspatial-only placement of recovery/Jules **as the sole path** | Must exist seated too (MUST row above); spatial NonspatialResources can remain for walk mode | Do not delete spatial resources until seated path proven |
| CSS-only mode chrome (`.experience-modes`) after A2 | Dead UI | Visual/typecheck after removal |

## A2 / A3 / R1 dependency notes

1. **A3 matrix (this file) → A3 wiring** (OperationalMessages in OpsConsole; seated recovery/Jules; ensure notification focus + MutationStatus retry proven against OpsConsole/SystemApp, not only peers).
2. **A2** reuses migrated controls for no-WebGL fallback; must not import WorkSurface if R1 will delete it — prefer SystemToolPanel / NotificationBanner / MutationStatus / CaseRail / BreakRoom+Jules composition.
3. **R1** deletes peers only when MUST rows are green and `rg 'WorkSurface|AccessibleMode|…'` clean in `apps/web/src`.
4. **R2** rewrites mode-loop tests to single-experience guarantees without dropping action-set, focus, retry, alert-gate, or Morgan coverage.
5. **Do not migrate:** G24 query backend work, window geometry (W1), site/arrival files, server API, evidence rules, second mode selector.

## Acceptance checklist (from plan Task A3)

- [ ] Migration matrix complete (this document).
- [ ] No behavior only reachable via Desk-only/List (MUST rows have target + test).
- [ ] Single-experience tests cover previous peer-mode action sets (rewrite plan noted per test).
- [ ] WorkSurface/AccessibleMode still compile (harvest only).
- [ ] Verify command (when implementation lands): `pnpm --filter @sim/web exec vitest run test/workplace-parity.test.tsx test/desk-os.test.tsx test/work-tools.test.tsx && pnpm --filter @sim/web typecheck`.
- [ ] Stop if a “valuable” behavior has no safe home without violating canonical boundaries — document conflict here, propose smallest adjustment, stop.

## Commit

- Document only: `docs(desk-os): inventory peer-mode behaviors for A3 migration`.
