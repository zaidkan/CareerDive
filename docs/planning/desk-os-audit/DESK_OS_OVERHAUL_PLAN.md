# Desk OS overhaul implementation plan

**Status:** approved planning document · **created:** 2026-09-22 on `zaidkan/product-experimental` · **implementation: not started.** No application code is changed by this plan.

**Product goal (settled):** Career Expo has **one** user-facing simulation experience:

```text
Arrival / onboarding
  → 3D workplace
  → player walks to workstation
  → sits → full Desk OS
  → performs the job through Desk OS
  → can stand up / move around / return
  → Desk OS resumes exactly where they left off
```

There is **no** product concept of peer modes “Walk the office”, “Desk only”, or “Simple list”. The 3D workplace + Desk OS **are** the Career Expo experience. An eventual no-WebGL / reduced presentation is an **accessibility fallback inside the same experience**, not a permanent alternate product (see Task A2).

**Companion docs:** [audit](DESK_OS_AUDIT.md) · [architecture map](DESK_OS_ARCHITECTURE_MAP.md) · [gap matrix](DESK_OS_GAP_MATRIX.md) · [handoff](DESK_OS_AUDIT_HANDOFF.md) (7 product decisions resolved there). Historical workplace plan: `docs/product/workplace-systems-overhaul-plan.md` (Tasks 1–9 done; mode-parity framing superseded — supersession notes in that file).

**Audience:** bounded agent-worker tasks (e.g. MiMo V2.6 Flash). Each task is one commit-sized unit with an explicit stop condition. Do not start a task whose dependencies are not checked off.

---

## Global constraints (every task)

- Backend remains sole authority over canonical time, actions, evidence, observations, resources, hidden state. `useMutationCoordinator` stays the only mutation boundary.
- **Never** turn into career evidence: OS navigation, window movement/drag/minimize, walking skill, cosmetic file ops, scratch notes, lock/unlock.
- Preserve: observation gating, ticket composer semantics, Team Chat / Morgan guidance boundaries, alerts/email/knowledge/inventory behavior, privacy/redaction, deterministic replay, recovery/break/Jules controls.
- Chromebook-class target is first-class: ~integrated GPU, 4–8 GB RAM, current Chrome, ~1366×768. Do not claim measured performance without a later benchmark step (Task P1).
- Migration rule: **inspect before delete.** Useful behavior in `WorkSurface` / `AccessibleMode` / list-mode must be migrated into the main experience **before** peer renderers and the mode selector are removed (Tasks R1–R2).
- No rewrite of completed history in older plans; supersession notes only.

### Settled product decisions (do not re-litigate)

| # | Decision |
| --- | --- |
| D1 | **Window model:** bounded multi-window workstation (open/focus/drag/minimize/restore/close, sensible maximize). **Hard cap: 4 open windows.** Not an OS clone: no arbitrary processes, unlimited windows, virtual desktops, software install, decorative terminal. |
| D2 | **Leaving the desk** preserves OS session (windows, minimized, focus/last-active, positions, browser state/tabs/history, open files, scratch notes, local drafts, canonical work context). Lock screen (if kept) is presentation over that preserved session, not logout. |
| D3 | **Browser** is internal-only: Career Expo / Verdaly-authored sites + approved resources. No public internet. Believable chrome: internal URLs, bookmarks, bounded history, clear unsupported-address behavior; tabs only if plan includes them. |
| D4 | **Files** stay cosmetic/local. Remove meaningless filler; keep first-day / contacts / cheat-sheet / office-map / onboarding flavor. No hidden evidence or answer keys. Move/delete never affects assessment. Strict boundary: (A) cosmetic FS vs (B) canonical records. |
| D5 | **Notes:** local scratch ≠ canonical investigation notes ≠ ticket content ≠ evidence. No silent promotion of scratch to evidence. |
| D6 | **Morgan introduction:** authored first-day/start-of-shift trigger inside the one experience; no separate renderer paths; must not duplicate on remount or workstation return. |
| D7 | **Performance:** low-end Chromebook-class primary target; pause/reduce 3D work while seated; measurable acceptance criteria + later low-end verification step. |

---

## Dependency graph

```text
A1 architecture / OS session state ownership
  → A2 single-experience entry + fallback (no peer product modes)
    → A3 migrate shared WorkSurface/AccessibleMode behaviors into main experience
      → W1 bounded window model
        → S1 leave/return session continuity (+ lock-as-presentation)
          → B1 browser (internal-only) improvements
            → F1 files/notes refinement
              → N1 desktop notifications + Morgan onboarding (D6)
                → P1 performance (D7 acceptance + instrumentation)
                  → X1 accessibility designed into main experience
                    → R1 remove mode selector / peer renderers
                      → R2 remove obsolete tests/architecture leftovers
                        → V1 golden path + regression + low-end verification
```

Tasks within a phase may parallelize only when listed files do not overlap. Later tasks must re-read the tree: in-flight uncommitted perf/scene work on this branch (`RoomCanvas`, `SceneEffects`, `useAdaptiveQuality`, ambient props) is **out of scope** for every task below unless a task explicitly lists those files.

---

## Phase A — Architecture and single experience

### Task A1 — OS session state ownership

- **Goal:** Lift Desk OS runtime state out of the `LaptopOverlay → DeskOs` unmount path into a session-scoped owner so leave/return and multi-window work do not depend on React mount lifetime.
- **Files (likely):** create `apps/web/src/world/deskOs/osSession.ts` (or equivalent store); modify `apps/web/src/world/deskOs/DeskOs.tsx`, `apps/web/src/world/deskOs/LaptopOverlay.tsx`, `apps/web/src/world/SpatialShell.tsx`, `apps/web/src/index.tsx` (only if ownership must reach App); tests `apps/web/test/desk-os.test.tsx`, new `apps/web/test/os-session.test.tsx`.
- **Dependencies:** none.
- **Changes:** defined OS session slice (open app ids, active app, open file, browser history, fake FS instance, notes drafts, later window geometry); ownership lives above the laptop overlay mount; `DeskOs` reads/writes through the owner.
- **Does not change:** canonical ClientView path, mutation coordinator, login credentials flow, window count (still single-pane), peer renderers, mode selector.
- **Tests first:** session slice persists across simulated unmount/remount of `DeskOs`; active app and open file survive; empty session initializes to current defaults (`browser` active, locked until login phase).
- **Steps:** inventory every `useState` under `deskOs/`; extract pure slice + reducer/hook; wire DeskOs; keep lock phase behavior; run focused tests; commit.
- **Acceptance:** leave-desk unmount + re-sit in a unit test restores active app/open file; no canonical action fired; typecheck green.
- **Verify:** `pnpm --filter @sim/web exec vitest run test/os-session.test.tsx test/desk-os.test.tsx && pnpm --filter @sim/web typecheck`
- **Stop if:** canonical props or server contracts would need to change (escalate; smallest safe adjustment must be documented, not improvised).
- **Commit:** `feat(desk-os): own workstation session state above overlay mount`

### Task A2 — Single-experience entry; retire peer mode as product

- **Goal:** `ExperienceShell` becomes the single experience entry: always the workplace → desk path. Mode selector (`Walk the office` / `Desk only` / `Simple list` buttons + mode note) is designed out of the **product** path. Keep an explicit, documented **fallback presentation** for WebGL failure / extreme low-end until X1 replaces it — not a user-facing “Desk only product mode”.
- **Files (likely):** `apps/web/src/experience/ExperienceShell.tsx`, `apps/web/src/index.tsx` (experienceMode state), `apps/web/src/experience/experience.css`; tests `experience-shell.test.tsx`, `app.test.tsx` (mode button expectations), `shift-lifecycle-recovery.test.tsx`, `movement-parity.test.tsx`.
- **Dependencies:** A1.
- **Changes:** default always spatial single experience; `SpatialModeBoundary` fallback switches to an in-experience reduced presentation (reuse migrated shared controls — see A3) instead of `onModeChange("desk")`; remove peer mode nav from default UI path (full removal of components deferred to R1 if imports still needed by fallback).
- **Does not change:** canonical actions, WorkSurface/AccessibleMode source files yet, golden-path mechanics, site shell.
- **Tests first:** rewrite mode-selector tests → “single experience exposes sit/desk path and does not render three peer mode buttons”; fallback test asserts reduced presentation still exposes energy recovery + ticket actions without WebGL.
- **Steps:** restructure shell; move `NonspatialResources` usage so fallback can render it; update failing tests; keep temporary internal `presentation` enum if needed (not user-facing).
- **Acceptance:** no user-facing peer mode selector in the main path; WebGL failure does not dead-end; all existing canonical tests for walk path still pass or are updated with justification.
- **Verify:** `pnpm --filter @sim/web exec vitest run test/experience-shell.test.tsx test/app.test.tsx test/movement-parity.test.tsx && pnpm --filter @sim/web typecheck`
- **Stop if:** removing selector breaks an unrehearsed test relying on mode buttons outside this task’s file list — update those tests only if listed; otherwise stop and extend plan.
- **Commit:** `feat(experience): collapse peer modes into one experience entry`

### Task A3 — Migrate valuable WorkSurface / AccessibleMode / list behaviors

- **Goal:** Before any deletion, move still-needed behavior into the main Desk OS / experience surface: keyboard focus management, notification focus-after-ack, mutation error focus + retry, structured action fallback, NotesEditor/TicketComposer/TeamChat/AlertRecords/Guide/Inventory/Query already shared via `SystemToolPanel`, Nonspatial recovery/Jules reachability, heading focus, operational messages.
- **Files (likely):** `WorkSurface.tsx`, `AccessibleMode.tsx` (read + harvest only), `DeskOs.tsx`, `OpsConsole.tsx`, `SystemToolPanel.tsx`, `NotificationBanner.tsx`, `MutationStatus.tsx`, `apps/web/test/workplace-parity.test.tsx`, `desk-os.test.tsx`, `work-tools.test.tsx`.
- **Dependencies:** A1, A2.
- **Changes:** main experience guarantees: every canonical action reachable while seated; break/Jules/emergency recovery reachable while seated (today they are spatial HUD or NonspatialResources — unify); notification → focus event after ack; mutation error → alert focus + Retry.
- **Does not change:** delete WorkSurface/AccessibleMode; pack content; server API; window model.
- **Tests first:** parity tests re-expressed as **single-experience coverage**: “while seated, all `availableActions` ids appear”; “notification handle focuses event”; “error focuses Retry” — without `mode=` loops.
- **Steps:** write migration matrix (behavior → destination component); implement destination wiring; keep WorkSurface/AccessibleMode compiling until R1; run parity + desk-os suites.
- **Acceptance:** migration matrix complete; single-experience tests cover previous peer-mode action sets; no behavior only reachable via Desk-only/List.
- **Verify:** `pnpm --filter @sim/web exec vitest run test/workplace-parity.test.tsx test/desk-os.test.tsx test/work-tools.test.tsx && pnpm --filter @sim/web typecheck`
- **Stop if:** a listed “valuable” behavior has no safe home without violating canonical boundaries — document conflict, propose smallest adjustment, stop.
- **Commit:** `feat(desk-os): absorb shared workstation behaviors into main experience`

---

## Phase W — Bounded windows

### Task W1 — Window model (cap 4)

- **Goal:** Replace `activeApp` single-pane enum with a bounded multi-window workstation: open, focus/bring-to-front, drag, minimize, restore, close, maximize-to-workspace; **max 4 open windows** (`MAX_OPEN_WINDOWS = 4`); Browser (Ops Console) + Notes + Files + at most one more concurrent realistic pair (Email/A alert investigation style use case).
- **Files (likely):** create `apps/web/src/world/deskOs/os/windows.ts` (types + pure helpers); modify `DeskOs.tsx`, `os/Taskbar.tsx`, `os/Desktop.tsx`, `os/WindowChrome.tsx`, `os/appCatalog.ts`, `styles.css`; tests new `apps/web/test/os-windows.test.tsx`, update `desk-os.test.tsx`, `os-shell.test.tsx`.
- **Dependencies:** A1 (session slice owns window records), A3 (console stays mounted correctly when backgrounded).
- **Changes:** window records `{ id, app, z, minimized, bounds, maximized }`; focus stack; drag via pointer events within workspace; keyboard: focus cycle, minimize/restore/close affordances with labels; opening a 5th window is refused with a clear message or auto-minimizes LRU (choose **refuse with toast** — simpler, testable); decorative traffic lights become real controls on WindowChrome.
- **Does not change:** which apps exist; canonical tools; login; lock; fullscreen workstation expand; no resize-from-corner required in v1 (optional stretch); no virtual desktops/processes.
- **Tests first:** cap enforcement; focus raises z; minimize hides but keeps record; close disposes local state per app policy; drag updates bounds; keyboard equivalents; OpsConsole notification target still works when browser window not focused-but-open.
- **Steps:** pure state module + tests → DeskOs integration → Taskbar/Desktop open/focus → WindowChrome controls → styles → full web suite.
- **Acceptance:** 4-window cap documented in code constant + plan; Email+Alert, Alert+Notes, Browser+Ticket, Team+investigation pairs simulatable; no unbounded growth.
- **Verify:** `pnpm --filter @sim/web exec vitest run test/os-windows.test.tsx test/desk-os.test.tsx test/os-shell.test.tsx test/os-shell-harden.test.tsx && pnpm --filter @sim/web typecheck && pnpm --filter @sim/web build`
- **Stop if:** focus/drag fights fullscreen or spatial input — document conflict before hacking around it.
- **Commit:** `feat(desk-os): bounded multi-window workstation (cap 4)`

---

## Phase S — Session continuity

### Task S1 — Leave desk preserves session; lock is presentation

- **Goal:** Standing up / leaving never destroys OS session state (D2). Returning shows lock screen (kept) **in front of** the preserved desktop; unlock restores the same session, not a fresh login reset. Canonical backend authority untouched.
- **Files (likely):** `DeskOs.tsx`, `LockScreen.tsx`, `LaptopOverlay.tsx`, `SpatialShell.tsx`, `world/presentation.ts`, `osSession.ts`; tests `desk-os.test.tsx`, new `os-session-continuity.test.tsx`.
- **Dependencies:** A1, A3; W1 if window geometry must survive (window records already on session slice).
- **Changes:** on `stand`/leave, session slice retained; on re-sit, phase may be `desk_login` again **without** clearing slice; login_success reveals previous desktop/windows; document that page refresh still creates a new client session (G30 unchanged — durable resume out of scope).
- **Does not change:** credential simulation; canonical session on server; logout product feature (none).
- **Tests first:** open Files + scratch text → stand → re-sit → lock → login → same file open, same scratch, same window z-order.
- **Acceptance:** continuity test green; no evidence emitted; lock copy may say session locked not “logged out”.
- **Verify:** `pnpm --filter @sim/web exec vitest run test/os-session-continuity.test.tsx test/desk-os.test.tsx && pnpm --filter @sim/web typecheck`
- **Stop if:** anything tries to persist OS session to server/Postgres — reject; local only.
- **Commit:** `feat(desk-os): preserve workstation session across leave/return`

---

## Phase B — Browser

### Task B1 — Internal-only believable browser

- **Goal:** D3: approved internal sites only; better chrome (URL entry parsing against allowlist, bookmarks, bounded history list optional, tabs optional/small, unsupported-address behavior); more useful workplace pages; no arbitrary internet.
- **Files (likely):** `os/browserState.ts`, `os/BrowserApp.tsx`, `os/WindowChrome`/window integration, pack-safe authored page content module `os/browserPages.ts`; tests `os-shell.test.tsx`, new `browser-allowlist.test.ts`.
- **Dependencies:** W1 (browser as window), A1 (history survives leave).
- **Changes:** URL parse `verdaly://…` allowlist; unknown host → in-app “unsupported address” page (never network); bookmarks catalog ≥ ops, intranet, directory/office map, helpdesk placeholder as authored static pages; history entries recorded; optional 2-tab strip if within cap and state cost is low — **default: no tabs in v1**, revisit only with written justification in this file.
- **Does not change:** iframe/network fetch to real web; OpsConsole as canonical gateway; reload remains cosmetic; no evidence from navigation.
- **Tests first:** `https://example.com` and unknown `verdaly://x` → unsupported page; allowlisted navigation works; history back/forward; navigation creates zero mutations.
- **Verify:** `pnpm --filter @sim/web exec vitest run test/browser-allowlist.test.tsx test/os-shell.test.tsx && pnpm --filter @sim/web typecheck`
- **Stop if:** a required workplace page needs pack-hidden data — use only public/authored static flavor.
- **Commit:** `feat(desk-os): bounded internal browser with unsupported-address behavior`

---

## Phase F — Files and notes

### Task F1 — Useful cosmetic FS + notes boundary

- **Goal:** D4/D5: replace filler with relevant first-day content (welcome, team contacts, cheat sheet, office map, onboarding, harmless internal downloads); keep move/open; **no** fake “promote to evidence”; strengthen copy distinguishing scratch vs canonical notes; optional minimal rename later — **not** required for this task.
- **Files (likely):** `os/useFakeFs.ts` (seed content), `os/FileExplorer.tsx`, `os/Notes.tsx`, `DeskOs.openFileInNotes`; tests `os-shell.test.tsx`, new `fs-content.test.ts`.
- **Dependencies:** A1 (FS instance on session), S1 if continuity asserts file positions.
- **Changes:** authored seed files with workplace relevance; UI note that file ops are local workstation only; Notes placeholder already says never assessed — keep and align FileExplorer copy; ensure open file body never feeds TicketComposer automatically.
- **Does not change:** pack artifacts; serializer; adding IndexedDB persistence (out of scope); delete/rename as assessment features.
- **Tests first:** seeds match allowlisted ids/names; moveFile pure; opening file does not call `onAction`/`onWorkplaceInteraction`.
- **Verify:** `pnpm --filter @sim/web exec vitest run test/fs-content.test.tsx test/os-shell.test.tsx && pnpm --filter @sim/web typecheck`
- **Stop if:** content team requires pack-linked documents — that is a different architecture (G13 remains open as future, not silently done here).
- **Commit:** `feat(desk-os): relevant cosmetic files and explicit notes boundary`

---

## Phase N — Notifications and Morgan

### Task N1 — Desktop-visible notifications + Morgan onboarding

- **Goal:** G20 presentation + D6: work notifications visible outside Ops Console (desktop/global banner layer on Desk OS workspace); Morgan first-day intro with **canonical-safe authored trigger** that does not duplicate on remount/return.
- **Files (likely):** create `apps/web/src/world/deskOs/os/notificationsHost.tsx` or lift `NotificationBanner`; modify `DeskOs.tsx`, `Taskbar.tsx` (badge optional), `OpsConsole.tsx`; onboarding module `apps/web/src/world/deskOs/os/morganIntro.ts`; pack read-only unless a pure presentation flag is needed client-side; tests `desk-os.test.tsx`, new `morgan-intro.test.tsx`.
- **Dependencies:** A3 (focus sequencing), W1 (badge/focus app), S1 (seen flag on session slice).
- **Changes:** session-scoped `morganIntroSeen` set on first successful workstation login in session (or first shift start — **choose first successful login in session**); shows short welcome pointing at Team chat / handoff; content remains observed artifact `chat-morgan` for substance; notifications host shows unread count and routes Handle → existing `respondToNotification` + focus-after-ack (already designed); no new realtime transport.
- **Does not change:** pack event scheduling; making login a canonical gate; AI dialogue; duplicate notification creation in core.
- **Tests first:** intro renders once per session across leave/return and lock cycles; no `respondToNotification` on intro alone; Handle waits for accepted state before focus (existing contract).
- **Verify:** `pnpm --filter @sim/web exec vitest run test/morgan-intro.test.tsx test/desk-os.test.tsx && pnpm --filter @sim/web typecheck`
- **Stop if:** intro would need to mark chat-morgan observed automatically without player action — that would invent observation; do not.
- **Commit:** `feat(desk-os): global notification host and session-safe Morgan intro`

---

## Phase P — Performance

### Task P1 — Chromebook-class acceptance criteria + seated 3D throttling

- **Goal:** D7: define measurable acceptance criteria; implement safe wins already implied by architecture (do not over-claim): ensure seated Desk OS reduces GPU/CPU work (RoomCanvas already `enabled={walking && …}` and seated disables shadows/composer — verify and extend carefully), avoid mounting expensive hidden trees, code-split obvious heavy UI if practical, document bundle numbers from `pnpm build` as **build artifacts not device FPS**.
- **Files (likely):** `world/RoomCanvas.tsx`, `world/effects/*`, `experience/ExperienceShell.tsx`, `vite.config.ts`, `DeskOs` hidden-pane strategy (defer mount when `minimized`/never-opened); tests: unit for “minimized window does not subscribe/render children”; no fake FPS tests.
- **Dependencies:** W1 (minimize → unmount/pause policy), S1.
- **Changes:** written criteria in this file’s appendix + code changes that are testable without hardware; optional `document.visibilityState` pause.
- **Does not change:** canonical logic; claiming Chromebook FPS without running Task V1 device check.
- **Acceptance criteria (measurable):**
  1. While seated and all 3D interaction idle: no continuous high-frequency animation work attributable to the scene beyond a documented idle floor (code review + optional perf marks; device FPS only after V1).
  2. Minimized/never-opened OS app panes do not render their children (unit-tested).
  3. `pnpm --filter @sim/web build`: report entry + RoomCanvas gzip sizes in PR description; fail review only on regression >15% without justification (soft budget).
  4. Target viewport 1366×768 CSS must not clip taskbar primary controls (jsdom insufficient — checked in V1 manual).
  5. Low-end verification checklist executed in V1 on lowest available machine /throttled profile — **not claimed done in P1**.
- **Verify:** `pnpm --filter @sim/web exec vitest run test/os-windows.test.tsx test/desk-os.test.tsx && pnpm --filter @sim/web build`
- **Stop if:** optimization requires weakening adaptive quality correctness or changing canonical timing.
- **Commit:** `perf(desk-os): seated-session render discipline + documented budgets`

---

## Phase X — Accessibility

### Task X1 — Accessibility into the real experience

- **Goal:** Keyboard/screen-reader paths exist **in** the single experience (window cycle, dialogs, notifications, recovery), not as a parallel list product. Harvest remaining AccessibleMode-only affordances per A3 matrix; ensure reduced-motion; ensure fallback presentation for no-WebGL is still the same product flow.
- **Files (likely):** `DeskOs`, `windows.ts` keyboard model, `NotificationBanner`, `BreakRoomPanel` reachability while seated, `styles.css` focus styles; tests extend `os-shell-harden.test.tsx`, `workplace-parity` a11y cases, vitest-axe where already used.
- **Dependencies:** W1, N1, A3.
- **Changes:** roving/arrow focus for window list & tabs; skip-to-workspace; focus restore after close; all canonical actions operable without pointer; emergency recovery reachable when seated without walking.
- **Does not change:** removing structured renderers used by tests until R2; claiming WCAG certification without audit.
- **Tests first:** axe on primary OS surface; keyboard-only open/focus/min/close window; recovery from keyboard while seated.
- **Verify:** `pnpm --filter @sim/web exec vitest run test/os-shell-harden.test.tsx test/workplace-parity.test.tsx && pnpm --filter @sim/web typecheck`
- **Stop if:** focus trap conflict with native fullscreen — document.
- **Commit:** `feat(desk-os): accessibility controls inside the single experience`

---

## Phase R — Removal

### Task R1 — Remove peer-renderer product architecture

- **Goal:** After A3/X1 acceptance, delete user-facing peer product mode: mode selector fully gone; `WorkSurface` and `AccessibleMode` removed **or** reduced to clearly marked internal building blocks if still imported (prefer extract shared pieces then delete). Update exports in `index.tsx`.
- **Files (likely):** delete or gut `WorkSurface.tsx`, `AccessibleMode.tsx`; `ExperienceShell.tsx`; `index.tsx` exports; all tests importing them (`app`, `experience-shell`, `workplace-parity`, `work-tools`, `guide-search`, `inventory-lookup`, `login-case-depth`, `shift-lifecycle-recovery`, `movement-parity`, golden path harness).
- **Dependencies:** A3, W1, S1, B1, F1, N1, X1 green; V-test migrations from R2 partially prepared.
- **Does not change:** `SystemToolPanel` and tool components (still used inside Desk OS).
- **Acceptance:** `rg 'WorkSurface|AccessibleMode|Simple list|Desk only|Walk the office'` clean in `apps/web/src` except historical docs; suite green.
- **Verify:** `pnpm lint && pnpm --filter @sim/web typecheck && pnpm test`
- **Stop if:** fallback (A2) still imports WorkSurface — extract needed pieces first; do not leave hidden permanent alternate experience without a written technical reason in this file.
- **Commit:** `refactor(experience): remove obsolete peer renderers`

### Task R2 — Test architecture migration completion

- **Goal:** Finish replacing obsolete peer-parity guarantees with single-experience guarantees without losing safety (see test strategy below). Delete only tests proven obsolete; migrate the rest.
- **Files:** test files listed in strategy table; CI workflow if it names removed files.
- **Dependencies:** parallelizable with late X1; must finish before V1.
- **Verify:** `pnpm test` full workspace green.
- **Commit:** `test(experience): single-experience golden coverage replaces peer parity`

---

## Phase V — Verification

### Task V1 — Golden path, regression, low-end verification

- **Goal:** Prove the product flow end-to-end and execute the low-end checklist from P1.
- **Files:** `workplace-golden-path.test.tsx` rewritten to single flow; manual checklist appended to this file’s appendix; optional Playwright not required unless already in repo (it is not — stay with vitest + manual).
- **Dependencies:** all previous.
- **Golden path (eventual):** start → enter workplace → reach desk → workstation activation/login → Morgan/start-of-shift context → multi-window Desk OS → inspect work → stand up → move around → return → same session resumes → continue canonical work → complete shift → debrief.
- **Verify:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build` + manual browser pass at 1366×768 + lowest available device.
- **Stop if:** golden path fails — fix in small tasks; do not weaken evidence assertions to go green.
- **Commit:** `test(product): single-experience golden path and verification record`

---

## Test strategy (peer parity → single experience)

| Test file | Classification | Action |
| --- | --- | --- |
| `experience-shell.test.tsx` | Peer selector + fallback-to-desk | **Replace** (A2): single entry + fallback presentation tests |
| `app.test.tsx` mode buttons (~L491–665) | Assumes three mode buttons | **Migrate** (A2/R1): remove/replace with single-experience expectations |
| `movement-parity.test.tsx` | `it.each` walk/desk/list | **Migrate**: spatial bucket vs seated “Walk 5 meters” remains valid as **control parity inside one experience**; drop mode looping once selector gone |
| `workplace-parity.test.tsx` | Desk vs structured renderer pairs | **Migrate**: re-express as SystemToolPanel vs structured section **within** Desk OS / fallback; keep action-id equality assertions |
| `workplace-golden-path.test.tsx` | Harness per mode + spatial combo | **Replace** (V1): one golden path; keep network-retry branches |
| `shift-lifecycle-recovery.test.tsx` | Clicks “Desk only”/“Simple list” | **Migrate**: debrief retry via single experience |
| `desk-os.test.tsx` | OS behavior (still valid) | **Remain**; extend for windows/session |
| `os-shell.test.tsx`, `os-shell-harden.test.tsx` | Files/keyboard/hardening | **Remain**; extend B1/F1/W1 |
| `work-tools.test.tsx`, `guide-search`, `inventory-lookup`, `source-evidence`, `content-depth`, `login-case-depth` | Often `desk` vs `structured` harness | **Migrate** harness to shared tools + structured fallback renderer retained as **internal** accessibility rendering, not product mode |
| `task-recovery.test.tsx`, `break-room`, `jules`, `navigation`, spatial tests | Unaffected or valid | **Remain** |
| `site-entry.test.tsx` | Site shell | **Remain** |

Safety rule: every removed parity assertion must be replaced by an assertion that the **single** experience still exposes the same canonical action ids, observation gating, and keyboard recovery — not deleted.

---

## Superseded assumptions (explicit)

1. **“Preserve canonical parity across three peer renderers”** (handoff finding 3, gap G26 old wording, workplace design locked principle, plan global constraint) — superseded: parity is now **within one experience** (seated windows vs spatial HUD vs temporary no-WebGL fallback), until R1 removes peer products.
2. **“Desk-only mode must use the same OS or remain a direct tools view”** (handoff question 1) — resolved differently: **Desk-only product mode is removed**, not harmonized.
3. **Mode selector as lasting UX** (`2026-09-07-evidence-and-modes.md`, app tests) — historical; superseded by this plan.
4. **Workplace overhaul Tasks 10–11 as mode-parity work** — Tasks 1–9 remain historically complete; Task 10 structured-mode framing is superseded by A3/X1/R2 (see supersession note in that plan file).
5. **G13 “files become canonical artifacts”** as default desire — rejected for now: D4 keeps cosmetic FS; bridging remains a future explicit product decision only.

## Genuine remaining open decisions (not settled here)

1. **No-WebGL long-term shape:** temporary reduced presentation vs permanent “workstation-first” degraded 3D — default: temporary until V1 device data; re-decide after P1/V1 metrics.
2. **Browser tabs:** plan default **no tabs (v1)**; reopen only with state-cost justification.
3. **Window resize:** drag move + maximize in v1; corner resize optional later.
4. **Durable page-refresh resume of OS-local state (G30):** out of scope; still open as product/infra question.
5. **G24 structured query submit wiring and G25 content migration:** unchanged, outside Desk OS UI overhaul critical path (track in old workplace plan / audit).

## Out of scope (do not do in these tasks)

Canonical schema changes for cosmetic UX, second career, virtual desktops, real web browsing, deleting pack content, paid AI evals, merging to `main`, private BrainV2 work, and any unrequested app implementation outside task file lists.
