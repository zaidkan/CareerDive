# V1 golden-path verification matrix

**Status:** planning/QA document only · **created:** 2026-09-22 on `zaidkan/product-experimental` (worktree) · **implementation: none.** No product, site, arrival, Desk OS A2/W1, or test code is changed by this file.

**Purpose:** Define how Task **V1** (`DESK_OS_OVERHAUL_PLAN.md` Phase V) will prove the eventual single-experience flow end-to-end, which automated tests already cover each step, which tests are still missing, and what must be checked by hand on Chromebook-class hardware. Aligns with `docs/REPO_STATUS.md` and `docs/validation-gate.md` (debrief reliability and accessible-mode conclusion parity remain release gates).

**Scope boundaries:**

- Do **not** redesign product behavior in this task.
- Do **not** touch site/arrival implementation (merge in progress; `site-entry` / `ArrivalFilm` / `DoorHud` remain source of truth for film behavior).
- Do **not** implement A2 (single-experience entry), W1 (multi-window), or other overhaul tasks as part of writing this plan.
- Where the eventual flow names capabilities that do not exist yet (multi-window, Morgan intro host, post-A2 single entry), mark them **blocked on** the plan task — V1 cannot pass those rows until that task lands.

**Eventual flow (plan V1 golden path):**

```text
landing
  → arrival film
  → enter workplace
  → reach desk
  → login
  → Morgan intro
  → Desk OS
  → multi-window work
  → complete investigation / routine work
  → stand up
  → move around office
  → return to desk
  → same OS session restored
  → finish shift
  → debrief
```

**How to use this matrix:** For each step, fill all seven columns at V1 execution time. “Exists” means a green automated test in-repo **today** (or as of the V1 run). “Missing” is work for the listed overhaul task or a dedicated V1 test — not an excuse to skip the row. Never claim measured FPS or device budgets without the P1/V1 measurement rows.

---

## Status legend

| Symbol | Meaning |
| --- | --- |
| Exists | Automated test present and expected green at V1 |
| Missing | Named test or checklist item does not exist yet |
| Manual | Must be performed on a real browser / lowest available device |
| Blocked | Cannot pass until a plan task (A2, W1, S1, B1, N1, …) lands |

---

## 1. Step-by-step matrix

### 1.1 Landing

| Column | Expectation |
| --- | --- |
| **Visible** | Public site shell; hero CTA “Start your first day”; “How the 10 minutes move”; systems named without fake quotes or film teaser; no simulation session created on `/`. |
| **Canonical** | No session create, no actions, no evidence. Landing is static. |
| **A11y** | Hero CTA keyboard-reachable; landmarks/headings sensible; contrast in light and dark themes. |
| **Failure / recovery** | Unknown routes fall back to `/`; no crash if optional marketing copy missing. |
| **Exists** | `site-entry.test.tsx`: route parse; landing without session; no fake quotes/film teaser; vague surprises; hero → start gate; per-route titles. |
| **Missing** | Optional: axe on landing; footer Start parity (currently one entry — document as intended). |
| **Manual** | Visual pass at 1366×768; keyboard tab through hero CTA; theme toggle persistence. |

### 1.2 Arrival film

| Column | Expectation |
| --- | --- |
| **Visible** | `/start` gates on “Short preview film”; play control; doors freeze → DoorHud unlock → single “Start your first day”; no skip path before gate resolves. |
| **Canonical** | No `createSession` until gate complete; then exactly one assessed session create. |
| **A11y** | Play/CTA operable by keyboard; video has accessible name/fallback alt; reduced-motion users still get a clear path (see §2.2). |
| **Failure / recovery** | Missing/`error` on `arrival-film.mp4` → poster + stills/transcript, “film unavailable…”, DoorHud still unlocks — **no soft-lock**. |
| **Exists** | `site-entry.test.tsx`: start gate forces film through doors freeze; fallback shows DoorHud when video errors; resume-at-sim after film seen (legacy key). |
| **Missing** | Reduced-motion film path automated test if not already implied by ArrivalFilm unit behavior; broken-network poster load (asset 404 vs `error` event) if distinct. |
| **Manual** | Play film to freeze on Chromebook; kill network mid-film once; confirm fallback copy and continue; do not re-gate on refresh after film seen (session vs storage — §2.6). |

### 1.3 Enter workplace

| Column | Expectation |
| --- | --- |
| **Visible** | After start, session boots into workplace path (default tutorial/briefing behavior unless `briefing="hidden"` from site); floor map → SOC room entry path available. |
| **Canonical** | One created session; initial `ClientView` without hidden fields; no accidental double-create on remount. |
| **A11y** | Entry controls reachable by keyboard; loading/retry states announced (see lifecycle recovery). |
| **Failure / recovery** | Assessed create failure → retry without permanent loading screen; practice late debrief ignored after assessed start. |
| **Exists** | `shift-lifecycle-recovery.test.tsx` (startup retry, assessed retry, late debrief); `site-entry` StartPage session create; `world.test.tsx` map → room guidance. |
| **Missing** | Single automated chain: film-end → createSession → first floor-map frame without test-only mode buttons (blocked on **A2** for product path). |
| **Manual** | From `/` full click-through to visible SOC room; no blank screen; DevTools console free of uncaught errors. |

### 1.4 Reach desk

| Column | Expectation |
| --- | --- |
| **Visible** | Journey copy steers to SOC → desk; sit hotspot/cue; chair not inside furniture; no stuck walk-block. |
| **Canonical** | Movement IDs only when player walks (no fake progress); no evidence from navigation skill. |
| **A11y** | Keyboard walk / hotspot activation available (parity tests); controls help not a permanent key dump. |
| **Failure / recovery** | Blocked aisle → recovery path; pointer-look does not eat UI clicks. |
| **Exists** | `world.test.tsx`; `journey.test.ts` (floor map / room / desk steps); `sit-zone.test.ts`; `soc-layout.test.ts`; `movement-parity.test.tsx`; `player-controller` / `look-controls`; `controls-help.test.tsx`. |
| **Missing** | End-to-end: enter workplace → sit without intermediate mode selector (blocked on **A2**); full keyboard sit-only path if not fully covered by movement-parity. |
| **Manual** | Walk with trackpad; confirm sit from legal standing spot; 1366×768 HUD not clipped. |

### 1.5 Login (lock screen)

| Column | Expectation |
| --- | --- |
| **Visible** | Lock chrome on sit (`desk_login`); credentials note; single Leave desk (no duplicate stand); successful login → workstation. |
| **Canonical** | Login remains presentation/credential simulation — not a new evidence event by itself; no double `login_success`. |
| **A11y** | Username/password labels; Enter submits; error message on bad credentials; focus into form. |
| **Failure / recovery** | Failed login stays on lock with message; leave desk from lock works once. |
| **Exists** | Desk OS tests + golden path login helpers; `journey.test.ts` (credentials when seated); lock single-leave fix documented in `REPO_STATUS.md` / covered via desk-os lock phase tests. |
| **Missing** | Explicit automated “no duplicate leave control” assertion if not already a named desk-os case (verify at V1; add if absent); lock-as-presentation over preserved session is **S1**. |
| **Manual** | Wrong password then correct; leave from lock once; return sits again. |

### 1.6 Morgan intro (first day)

| Column | Expectation |
| --- | --- |
| **Visible** | Authored first-day/start-of-shift welcome pointing at Team chat / handoff; **once per session**; not duplicated on remount or workstation return. |
| **Canonical** | Intro alone must **not** fire `respondToNotification` or invent observation of `chat-morgan`; substance stays observed through normal Team Chat flow. |
| **A11y** | Intro reachable/dismissible by keyboard; does not trap focus over lock or console. |
| **Failure / recovery** | Dismiss then leave/return → intro does not reappear in same session; new session may show again. |
| **Exists** | Related: Team Chat / Morgan guidance tests (`workplace-parity`, content-depth Morgan thread rules, golden path TeamChat). Full **intro** behavior is plan **N1**. |
| **Missing** | `morgan-intro.test.tsx` (once per session across leave/return/lock; no notification ack on intro alone). |
| **Manual** | First login shows intro once; stand/sit/lock cycle does not re-show; no forced evidence. **Blocked on N1** for pass/fail. |

### 1.7 Desk OS (single-pane baseline until W1)

| Column | Expectation |
| --- | --- |
| **Visible** | After login: default Browser + Ops Console bookmark; taskbar Desktop/Files/Notes; lock hides workspace until login; expand workstation control. |
| **Canonical** | OS shell interactions fire zero `onAction` / workplace mutations; Ops Console remains canonical gateway for work actions only. |
| **A11y** | Keyboard path to taskbar/bookmarks/tabs; headings on app open; polite live regions for status notes. |
| **Failure / recovery** | Unmount mid-reload safe; app switch preserves session state (A1 session slice). |
| **Exists** | `os-session.test.tsx`; `os-shell.test.tsx`; `os-shell-harden.test.tsx` (keyboard, reduced motion, state preserve, reload); `desk-os.test.tsx` (mutations, focus, expansion). |
| **Missing** | Post-A2: “no peer mode buttons” product assertions already planned under A2 (not V1 to invent). |
| **Manual** | Full OS tour after login; confirm default browser/ops; expand/exit fullscreen. |

### 1.8 Multi-window work

| Column | Expectation |
| --- | --- |
| **Visible** | Open/focus/drag/minimize/restore/close/maximize; **cap 4**; refuse 5th with clear message; real WindowChrome controls. |
| **Canonical** | Window chrome never mutates evidence; closing an app follows local-state policy only. |
| **A11y** | Keyboard focus cycle; labeled min/close; focus restore after close; cap message announced. |
| **Failure / recovery** | Cap enforcement; minimize keeps record; notification focus still works when browser open but not focused. |
| **Exists** | Single-app session tests only (A1). **No window tests yet.** |
| **Missing** | Entire **W1** suite (`os-windows.test.tsx` + desk-os/os-shell updates). |
| **Manual** | Simulate Email+Alert, Alert+Notes, Browser+Ticket pairs; drag within workspace; 4 vs 5 window. **Blocked on W1.** |

### 1.9 Complete investigation / routine work

| Column | Expectation |
| --- | --- |
| **Visible** | Alerts/email/knowledge/inventory/ticket composer reachable from seated console; relative deadlines; history collapsed; tasks as tasks. |
| **Canonical** | Server sole authority; observation gating; ticket composer canonical; debrief inputs intact; **duplicate rapid submit once**. |
| **A11y** | Notification → focus after ack; mutation error → focus + Retry; keyboard-activatable actions. |
| **Failure / recovery** | Network fail-once → retry preserves dirty notes; late old-session response ignored; debrief read retry. |
| **Exists** | `workplace-golden-path.test.tsx` (assessed shift, network-retry branches, debrief record); `desk-os.test.tsx`; `work-tools`, `artifact-open`, `source-evidence`, `task-recovery`, `record-query`, `guide-search`, `inventory-lookup`, `content-depth`, `workplace-parity`. |
| **Missing** | Single-experience rewrite of golden path (plan **V1/R2** — drop desk/list/os mode loop); seated-only recovery/Jules/emergency completeness is **A3/X1**. |
| **Manual** | Full investigation + one routine alert through UI only; confirm no mode selector required once A2/R1 land. |

### 1.10 Stand up

| Column | Expectation |
| --- | --- |
| **Visible** | Leave desk / stand returns player to room walk; OS overlay unmounts from DOM’s active view without destroying session slice. |
| **Canonical** | No logout API; no session destroy; standing does not submit fake evidence. |
| **A11y** | Leave control labeled once on lock chrome; keyboard operable. |
| **Failure / recovery** | Standing while mutation pending → coordinator policy unchanged (controlled disable / pending gate). |
| **Exists** | Spatial stand path in `world` / golden path / desk-os stand callbacks; A1 unit unmount/remount of DeskOs. |
| **Missing** | Full spatial stand → overlay gone → session retained integration test spanning SpatialShell phases (**S1**). |
| **Manual** | Stand mid-shift with Files open and notes typed; watch overlay disappear cleanly. |

### 1.11 Move around office

| Column | Expectation |
| --- | --- |
| **Visible** | Room walk, break room, fridge/coffee/Jules reachable; energy meter; no stuck pointer lock. |
| **Canonical** | Finite resource interactions single-submit; energy deterministic; no wall-clock drain. |
| **A11y** | Keyboard hotspots; Escape closes Jules; controls help available. |
| **Failure / recovery** | Pending fridge close races handled once; failed reply does not loop. |
| **Exists** | `break-room.test.tsx`; `jules.test.tsx`; `movement-parity`; `navigation` / spatial tests. |
| **Missing** | Explicit “OS session still owned above overlay while walking” assertion in SpatialShell (**S1** / A1 already covers DeskOs-only). |
| **Manual** | Walk break room and back; use fridge once; Jules open/close with Escape. |

### 1.12 Return to desk

| Column | Expectation |
| --- | --- |
| **Visible** | Sit again → lock (if S1 keeps lock) in front of **preserved** desktop; unlock shows prior app/layout. |
| **Canonical** | Still one canonical session; no second `createSession`. |
| **A11y** | Lock focus into credentials; unlock restores sensible focus (desktop/console). |
| **Failure / recovery** | Refresh during leave is **not** required to restore OS-local state (§2.6); in-session return is. |
| **Exists** | A1: DeskOs unmount/remount restores active app/file/FS/history/notes. Spatial sit path exists in world/journey tests. |
| **Missing** | Spatial: stand → walk → sit → lock → login → same state (**os-session-continuity**, plan **S1**). |
| **Manual** | Leave with scratch text + moved file + intranet history; return; confirm all three. |

### 1.13 Same OS session restored

| Column | Expectation |
| --- | --- |
| **Visible** | Active app, open file, FS positions, browser history, notes, (W1) window z-order/minimized/bounds match pre-leave. |
| **Canonical** | Restoration emits **zero** mutations; lock copy may say session locked not logged out. |
| **A11y** | Restored focus does not dump user into hidden pane; live status if needed. |
| **Failure / recovery** | Accidental double restore must be idempotent; never persist OS session to server/Postgres (stop condition). |
| **Exists** | `os-session.test.tsx` (component-level). |
| **Missing** | Full S1 continuity file; window geometry after W1. |
| **Manual** | Side-by-side checklist before leave / after return (§2.6 table). |

### 1.14 Finish shift

| Column | Expectation |
| --- | --- |
| **Visible** | Complete remaining canonical actions/tasks through Desk OS until shift completion path. |
| **Canonical** | Same server authority; no weakened gates; energy/recovery still finite. |
| **A11y** | Completion reachable without pointer-only dead ends. |
| **Failure / recovery** | Mid-completion network fail → retry; findings preserved on task request fail. |
| **Exists** | Golden path completion branches; task-recovery; shift-lifecycle partially. |
| **Missing** | Post-A2 single-flow completion without mode matrix (V1 rewrite). |
| **Manual** | Finish assessed shift on Chromebook-class profile. |

### 1.15 Debrief

| Column | Expectation |
| --- | --- |
| **Visible** | Loading → “Shift debrief” with all eight sections; confidence; consequences text. |
| **Canonical** | Debrief from server (`getDebrief`); no client-fabricated sections; privacy/redaction intact. |
| **A11y** | Heading structure; retry button on failure; no focus trap. |
| **Failure / recovery** | Debrief read fail → Retry loading debrief; late practice debrief after assessed start ignored. |
| **Exists** | `workplace-golden-path` debrief assertions; `shift-lifecycle-recovery` debrief retry / late practice; `app.test` eight sections. |
| **Missing** | Debrief after true multi-window leave/return session (depends on S1 continuity + golden rewrite). |
| **Manual** | Read all eight sections; confirm no coach/hidden leakage in UI text; validation-gate debrief reliability remains a **product** gate, not a UI checklist pass alone. |

---

## 2. Cross-cutting checks (run once per V1 candidate)

### 2.1 1366×768 Chromebook-class

| Check | Expectation | Exists | Missing / manual |
| --- | --- | --- | --- |
| Viewport fit | Taskbar primary controls, desk HUD, lock actions not clipped or requiring horizontal scroll | jsdom insufficient | **Manual** at 1366×768 CSS (P1 criterion 4) |
| Input latency | Typing and clicks feel usable on lowest available machine | — | **Manual**; record qualitative notes only until P1/V1 instrument |
| Device profile | ~4 cores / 4–8 GB / integrated GPU treated as low-end by adaptive quality | `adaptive-quality.test.ts` unit | **Manual** confirm composer off while seated on real device (no FPS claim) |
| RAM pressure | No multi-tab leak storm; leave/close tab reclaims | — | **Manual** rough observation |

### 2.2 Reduced motion

| Check | Expectation | Exists | Missing / manual |
| --- | --- | --- | --- |
| OS reload feedback | No timer-dependent pending state; content immediate | `os-shell-harden` reduced-motion | — |
| Film / ambient | Reduced-motion users not soft-locked; ambient/figure motion respect preference | `ambient-props`, ArrivalFilm behavior (site) | Confirm film path with OS reduced-motion ON **manual** |
| Adaptive grain/composer | Grain dropped with reduced motion; composer policy intact | `adaptive-quality.test.ts` | — |

### 2.3 Keyboard-only flow

| Check | Expectation | Exists | Missing / manual |
| --- | --- | --- | --- |
| Site hero → start | CTA reachable | partial site-entry | **Manual** full chain |
| Film gate → continue | Play/start without mouse | partial | **Manual** |
| Walk / sit / interact | Hotspots + Enter/E | `movement-parity`, `jules`, `break-room` | Sit-from-keyboard E2E after A2 |
| Lock login | Tab + Enter | desk-os/journey partial | **Manual** assert order |
| Desk OS shell | Taskbar, bookmarks, file Enter | `os-shell-harden` keyboard-only | Window cycle **after W1/X1** |
| Canonical actions | All `availableActions` operable seated | workplace-parity / work-tools | Single-experience rewrite **A3/X1** |
| Escape/focus return | Controls help, Jules, dialogs | controls-help, jules | — |

### 2.4 WebGL failure fallback

| Check | Expectation | Exists | Missing / manual |
| --- | --- | --- | --- |
| Spatial renderer throws | Fallback presentation, not dead-end | `experience-shell` falls back when spatial fails | Post-A2: fallback is in-experience reduced presentation with energy + ticket actions (**A2**) |
| Fallback completeness | Energy recovery + ticket actions without canvas | partial experience-shell recovery reuse | Expand per A2 tests |
| No peer product mode | Fallback is not a lasting “Desk only” product choice | — | **Missing** until A2/R1 |

### 2.5 Arrival video failure

| Check | Expectation | Exists | Missing / manual |
| --- | --- | --- | --- |
| `video` `error` event | Poster/stills/transcript; DoorHud unlocks; “film unavailable” | `site-entry` fallback test | — |
| Missing file / 404 | Same fallback (REPO_STATUS cleanup) | implementation present | Confirm automated case if only `error` is fired in tests — **manual** 404 |
| Continue → session | Still exactly one `createSession` | covered in fallback test | — |
| Soft-lock regression | Enter never permanently hidden | asserted absence of enter before gate + unlock after | Keep |

### 2.6 Refresh vs session-only expectations

| State | On **page refresh** | On **leave desk / return** (same page session) | Test |
| --- | --- | --- | --- |
| Canonical `ClientView` / server session | New client session per current product (G30 durable resume **out of scope**) | Unchanged server session | Lifecycle + golden path |
| Film gate seen | May persist via existing storage keys (`first-shift-start-gate` / legacy briefing → sim) | n/a | `site-entry` resume test |
| OS active app, open file, fake FS, notes, browser history | **Resets** (session-only; no localStorage/IndexedDB by design) | **Preserved** (A1; S1 full) | `os-session`; missing spatial S1 |
| Mode/theme preferences | `career-expo-mode` / `career-expo-theme` in localStorage | persist | site-entry cleanup implies presence |
| Windows (future) | Reset on refresh | Preserved (**W1+S1**) | Missing |
| Lock appearance | N/A | May re-show; must not clear slice | **S1** |

**Manual script:** (1) note app/files/notes/history → refresh → confirm **defaults** for OS-local and document storage keys still gate film; (2) note again → stand → sit → login → confirm **preserved** OS-local and unchanged canonical shift.

### 2.7 No accidental public-web browser access

| Check | Expectation | Exists | Missing / manual |
| --- | --- | --- | --- |
| Allowed pages | `verdaly://` ops + intranet only today | `os-shell` navigation | B1 allowlist suite **browser-allowlist** |
| External URL / unknown host | Unsupported-address page; **no network** | — | **Missing until B1**; manual: open DevTools Network while typing `https://example.com` |
| iframe/fetch to internet | None | — | **Manual** Network panel |
| History | Bounded local entries only | session reducer | B1 history list optional |

### 2.8 No fake-files becoming evidence

| Check | Expectation | Exists | Missing / manual |
| --- | --- | --- | --- |
| Move/cut/paste | Zero `onAction` | `os-shell` keyboard + DnD | — |
| Open file → Notes | Zero canonical effect | harden Enter/dbl-click | Ensure open never auto-fills ticket (**F1**) |
| Scratch notes | Never promoted to evidence/ticket silently | Notes copy; plan D5 | Explicit assert “scratch not in debrief/evidence” at V1 manual + future F1 test |
| Seeds | No answer-key pack leakage | — | **Missing `fs-content` until F1** |

### 2.9 No duplicate canonical actions

| Check | Expectation | Exists | Missing / manual |
| --- | --- | --- | --- |
| Rapid double-click action | Single submit; controls disabled while pending | `desk-os` duplicate once | — |
| Workplace resource close races | One close | `break-room` queue tests | — |
| Notification Handle retry | One accepted outcome; focus after success | desk-os / workplace-parity | — |
| Session create | One per start path | site-entry `toHaveBeenCalledTimes(1)` | Film + fallback both covered |
| Morgan intro | Must not duplicate ack/intro (**N1**) | — | **Missing until N1** |
| Leave desk control | Exactly one on lock chrome | REPO_STATUS fix | Confirm named test at V1 |

### 2.10 Measurable performance checks (no invented FPS)

Record only what can be measured without a fabricated frame budget:

| Metric | How to measure | Pass signal | Exists |
| --- | --- | --- | --- |
| Production build sizes | `pnpm --filter @sim/web build`; note entry + RoomCanvas gzip | Report numbers; soft review if entry/RoomCanvas gzip regresses **>15%** without justification (P1) | Manual CI log / PR note |
| Unit: minimized/never-opened panes | Future W1/P1 test: children not rendered | Test green | **Missing until W1/P1** |
| Unit: seated quality policy | `adaptive-quality` composer off while seated; reduced motion grain | Already green | Exists |
| Unit: low-end classification | `isLowEndDevice` cores/memory | Already green | Exists |
| Idle while seated | Code review + optional `performance.mark` / DevTools Performance: no continuous high-frequency scene work beyond documented idle floor | Qualitative + marks; **no FPS number required** | Partial (P1) |
| Hidden document | Pause policy if implemented | `visibilityState` not counting frames | Adaptive-quality already ignores hidden frames |
| Device wall-clock | Manual: time film→first desk action on lowest machine | Record seconds observed; no precommitted FPS | **Manual only** |

**Do not** invent or pre-commit FPS targets in this document. Device FPS verification is explicitly deferred to V1 execution on hardware after P1 criteria exist.

---

## 3. Automated suite rollup (what V1 will run)

```bash
pnpm lint
pnpm --filter @sim/web typecheck
pnpm test                 # full workspace; expect prior baseline ~84 files / 630+ pass
pnpm --filter @sim/web build
```

**Focused golden-related files for V1 reporting:**

| File | Role in V1 |
| --- | --- |
| `site-entry.test.tsx` | Landing + film gate + video failure |
| `workplace-golden-path.test.tsx` | Assessed shift + debrief (rewrite single-flow under V1/R2) |
| `shift-lifecycle-recovery.test.tsx` | Create/debrief failures |
| `desk-os.test.tsx` | Canonical desk behavior + no-duplicate actions |
| `os-session.test.tsx` | Session ownership above overlay |
| `os-shell.test.tsx` / `os-shell-harden.test.tsx` | Shell, keyboard, reduced motion, cosmetic FS |
| `world.test.tsx` / `journey.test.ts` / `break-room.test.tsx` / `jules.test.tsx` | Reach desk, move, return context |
| `experience-shell.test.tsx` | WebGL fallback until A2 rewrites |
| `adaptive-quality.test.ts` | Seated/low-end unit policies |
| `workplace-parity.test.ts` / `work-tools` / `source-evidence` / `task-recovery` | Canonical work + a11y focus (migrate under A3/R2) |

**Future files expected before V1 can fully pass:** `browser-allowlist` (B1), `fs-content` (F1), `morgan-intro` (N1), `os-windows` (W1), `os-session-continuity` (S1), rewritten golden path (V1).

---

## 4. V1 execution checklist (append results here during V1)

- [ ] Full lint / typecheck / test / build green on candidate commit  
- [ ] §1 steps 1–15 each marked Exists/Missing with commit SHA of suite  
- [ ] §2.1–2.10 completed; paste build gzip numbers; paste manual notes (no FPS claims)  
- [ ] Breakage log: product bugs filed as small plan tasks — **do not weaken evidence assertions to go green**  
- [ ] Validation-gate items still owned by product research (debrief reliability, accessible conclusion parity) noted as **not** closed by this UI matrix alone  
- [ ] Commit for V1 implementation work (when run): `test(product): single-experience golden path and verification record` — **separate from this planning commit**

---

## 5. Related documents

| Doc | Role |
| --- | --- |
| `docs/planning/desk-os-audit/DESK_OS_OVERHAUL_PLAN.md` | Authoritative task graph A1→V1; V1 definition |
| `docs/REPO_STATUS.md` | Branch map; site/arrival integration; test baseline counts |
| `docs/validation-gate.md` | Phase 1.5 product outcomes (not superseded by this matrix) |
| `docs/planning/desk-os-audit/DESK_OS_GAP_MATRIX.md` | Gap IDs (G30 refresh, G13 files, etc.) |

**Planning commit message:** `docs(qa): define V1 golden-path verification matrix`
