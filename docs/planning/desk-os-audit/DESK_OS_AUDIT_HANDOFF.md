# Desk OS audit handoff for architecture

Audit date: 2026-09-20. Checkout verified on branch `main`, HEAD `3e8fe62382ed1b9d7aa83a8fab47bb28c66500ba`. Audit covers current local working tree, not a clean release. No application code changed; no branch, dependency install or redesign created.

**Planning update 2026-09-22 on `zaidkan/product-experimental`:** the seven product questions below are **resolved**; the one-experience product goal is settled; the implementation plan is [DESK_OS_OVERHAUL_PLAN.md](DESK_OS_OVERHAUL_PLAN.md). Findings in this file remain the historical audit record — do not rewrite them as if the old plan always had the new direction.

Read [current-state audit](DESK_OS_AUDIT.md), [architecture map](DESK_OS_ARCHITECTURE_MAP.md), then [gap matrix](DESK_OS_GAP_MATRIX.md).

## Settled product direction (2026-09-22)

Career Expo ships **ONE** user-facing simulation experience:

`Arrival/onboarding → 3D workplace → walk to workstation → sit → full Desk OS → do the job → stand/move/return → Desk OS resumes in place → complete shift.`

- **No** peer product modes for Walk the office / Desk only / Simple list; **no** user-facing renderer/mode selector for those three (selector removal is a late overhaul task after useful behaviors migrate — migration rule in the overhaul plan).
- **No separate “Desk only” product mode.** **No separate “Simple list” product mode.**
- The 3D workplace + Desk OS together are the product. Accessibility is designed **into** that experience, not maintained as a permanent simplified twin (temporary no-WebGL fallback is an in-experience presentation, not a product mode — see overhaul plan A2/X1).
- Any older requirement that Walk/Desk/List must remain equivalent **peer** renderers is **superseded** (see overhaul plan “Superseded assumptions”). Canonical action/observation/equality guarantees still apply **within** the single experience.

## Most important findings

1. Desk OS is a **single-active-pane React shell**, not a window manager. Browser, Files and Notes stay mounted behind `hidden`; Desktop is a launcher. Traffic-light controls are decorative. Untracked WindowChrome/appCatalog are disconnected prototypes.
2. Walk mode reaches local login by sitting at the desk. No power/boot flow exists. Fixed simulated credentials unlock Browser/Ops Console, not desktop. Leaving desk unmounts OS, so returning requires login and resets local state. Canonical work survives during the App session.
3. **Desk only is a separate WorkSurface**, not the OS without 3D. Simple list is another peer renderer. Preserve canonical action/observation/resource parity across all three. *(Historical finding — superseded 2026-09-22: peer product modes are being removed; parity requirements move inside the single experience — see “Settled product direction” and G26 RESOLVED.)*
4. Browser is a two-page React viewer: read-only address, fixed bookmarks, back/forward, cosmetic reload. Seven console sections are not browser tabs. Intranet is placeholder text.
5. Files is a flat, four-file in-memory model with open/move support. No canonical document linkage, nested paths or durable save. Notes scratch is separate from canonical notebook and investigation notes.
6. Actual SOC foundations are substantial: observed artifacts, guide/inventory lookup, saved notes, event-targeted actions, interruptions, escalation and delayed consequences. Do not replace these with decorative content.
7. Current content is mid-migration: runtime probe found 3 events, 16 artifacts, 5 datasets, 10 tasks with 9 released gates. Initial view has no tasks. **Login-ticket summary remains gated.** Legacy source-highlighting/comparison components are not proof those interactions are currently offered.
8. Structured query engine and form exist, but form has no submit callback from SystemToolPanel and browser client cannot carry queryPayload. Evidence-fact helper has no connected runtime caller found. Untracked structured-ticket code is not integrated into reducer/router.
9. First assignment is created with session, before login. Initial notification count is zero. Morgan welcome is an observed chat artifact; the only configured notification is routine scanner arrival at simulated minute 25. Banner is inside Ops Console, invisible while other apps/pages are active.
10. Older AGENT_CONTEXT paths/status/content claims are stale. Current pack has no active phishing or separate false-positive event. Do not turn specification prose or historical test counts into implementation claims.

## Verified reusable components

- `LaptopOverlay`: readable DOM outside Canvas, fullscreen handling; scene remains presentation.
- `DeskOs`, Desktop and Taskbar: small app-host/launcher foundations, not reusable multiwindow infrastructure.
- `useBrowserHistory` and pure FakeFs move helper: bounded local state utilities.
- `SystemApp`, SystemToolPanel, EmailTool, AlertTool, GuideSearch, InventoryLookup, ArtifactDetail/NotesEditor, CaseRail: shared workplace UI foundations.
- `useMutationCoordinator`, MutationStatus, notification acknowledgement/focus sequencing: existing duplicate/stale/retry protection.
- Core public serializer, canonical observation/actions/notes/events/notification state, query engine and repository interface: preserve authority boundaries.
- SourceEvidence, RecordComparison and WorkTaskPanel: code exists and may be reusable, but legacy gate assumptions require deliberate review.

“Reusable” means inspected implementation with a useful existing contract, not blanket acceptance or visual approval.

## Architectural constraints and dependencies

Backend alone owns simulated time, legal actions, consequences, resources, observations, NPC facts and evidence. OS login, window navigation and cosmetic file operations must not become career evidence. New browser/file pages may consume only permitted public data; opening a record must preserve canonical observation semantics.

App owns canonical requests and public view. Window lifecycle changes must respect local drafts, hidden focus and one-mutation-at-a-time coordination. Global CSS and shared tools affect other renderers. Break recovery/Jules/resource controls must remain reachable. AI may phrase bounded dialogue only; current manager action path is deterministic.

Postgres persistence exists, but current web startup creates a new session after reload. OS-local state has no durable storage contract. Real account identity and simulated workstation credentials are separate concerns. No second career or broader platform scope is implied.

## Fresh verification

- Focused 8-file suite: **51 pass / 6 fail**. Desk OS, shell, hardening, experience routing, workplace parity and task-recovery files passed. Lifecycle test expects a now-missing initial task; golden paths fail on missing saved handoff, aggregate trace count and energy-full break action. Full-shift completion is not verified.
- `pnpm --filter @sim/web typecheck`: pass.
- `pnpm --filter @sim/web build`: pass, chunk warning. RoomCanvas 1,014.13 kB (270.99 gzip), app JS 414.17 kB (120.06 gzip), SceneEffects 82.94 kB (22.81 gzip).
- Read-only pack/core probe verified counts, release flags, event states and zero initial notifications.
- No live browser/screenshot, GPU, heap, screen-reader, production DB or full release checks. No claim of measured performance failure.

## Architect inspection order

1. `apps/web/src/experience/ExperienceShell.tsx`, `world/SpatialShell.tsx`, `world/presentation.ts` — renderer split and entry lifecycle.
2. `apps/web/src/world/deskOs/DeskOs.tsx`, `LaptopOverlay.tsx`, `LockScreen.tsx` — app mounting, login, expansion.
3. `apps/web/src/world/deskOs/os/{BrowserApp.tsx,browserState.ts,FileExplorer.tsx,useFakeFs.ts,Notes.tsx}` — bounded OS applications.
4. `apps/web/src/world/deskOs/{OpsConsole.tsx,SystemApp.tsx,tabs.ts,DashboardHome.tsx}` — console navigation and canonical connections.
5. `apps/web/src/components/SystemToolPanel.tsx`, `components/tools/`, `artifacts.tsx`, `useMutationCoordinator.ts`, `client.ts` — reuse and integration gaps.
6. `packages/core/src/{availability.ts,serializer.ts,reducer.ts,tasks.ts,notifications.ts,effects.ts,query.ts}` and `content/packs/cybersecurity-analyst/pack.yaml` — actual reachable mechanics.
7. `apps/server/src/trpc/router.ts`, `repository/types.ts`, `db/repository.ts` — transport/persistence boundaries.
8. `apps/web/src/styles.css`, `world/RoomCanvas.tsx`, `world/effects/useAdaptiveQuality.tsx`, relevant tests listed in audit.
9. `docs/superpowers/specs/interactivity-and-content-depth-design.md` and approved workplace overhaul spec — target requirements; do not mistake phase-status prose for fresh implementation evidence.

## Resolved product decisions (were: “Questions needing user/product decisions”)

All seven questions from the 2026-09-20 audit are **settled product decisions** (2026-09-22). Do not re-open them; implement per [DESK_OS_OVERHAUL_PLAN.md](DESK_OS_OVERHAUL_PLAN.md).

| Old question | Resolution |
| --- | --- |
| Must Desk-only expose the same OS, or remain a direct tools view? | **Neither.** Remove Desk-only as a product mode. Full experience is 3D workplace → workstation → Desk OS (plan A2/R1). |
| Which window operations and how many simultaneous windows? | **Bounded multi-window:** open, focus/front, drag, minimize, restore, close, sensible maximize. **Hard cap: 4 open windows.** Not a full OS clone (plan D1/W1). |
| Leaving desk: keep unlocked, lock, or log out? What survives? | **Preserve the full OS session** on leave (windows, minimized, focus/last-active, positions, browser state/tabs/history, open files, scratch notes, local drafts, work context). Optional lock screen is **presentation over that session**, never destructive logout (plan D2/S1). |
| Which documents are canonical vs cosmetic? Scratch notes save/privacy? | Cosmetic/local FS stays **non-canonical** with useful first-day content only; no filler; ops never affect assessment. Scratch Notes remain local utility; never silently become evidence; strict A/B boundary cosmetic FS vs canonical records (plan D4/D5/F1). |
| Which internal websites/bookmarks? Arbitrary external nav? | **Internal/approved only** (Verdaly/Career Expo-authored). No arbitrary public internet. Believable URL/bookmark/history/unsupported-address behavior (plan D3/B1). |
| Morgan introduction trigger and nonspatial equivalence? | **Authored session-scoped trigger on first successful workstation login** (start-of-shift/first-day); single experience only; must not duplicate on remount or workstation return; content stays the observed `chat-morgan` artifact — intro does not auto-observe (plan D6/N1). |
| Hardware/viewport/accessibility/performance “lightweight” targets? | **Chromebook-class primary:** integrated GPU, 4–8 GB RAM, current Chrome, ~1366×768; no discrete GPU dependency; seated use must reduce 3D work; measurable acceptance criteria + later low-end verification; no measured-FPS claims without benchmark (plan D7/P1/V1). |

## Outstanding uncertainties and continuity

Live visual feel, keyboard/screen-reader completeness, small-screen behavior and low-end performance remain unverified. Exact causes of all golden-path failures were not exhaustively diagnosed. In-flight structured-ticket/window-chrome/perf files may change independently; recheck Git before planning integration.

Genuine decisions still open (documented in the overhaul plan, not re-opened here): long-term no-WebGL product shape pending device data; browser tabs (default off for v1); corner resize; durable OS-local resume across page refresh (G30); G24 query wiring / G25 content migration outside this overhaul’s critical path.

Planning phase is complete when handoff, gap matrix, architecture map supersession section, and [DESK_OS_OVERHAUL_PLAN.md](DESK_OS_OVERHAUL_PLAN.md) agree. **Implementation has not started** in this docs pass; no Orca completion or Kiro acceptance is claimed. `project-memory` was unavailable through exposed tools; these documents are the durable handoff.
