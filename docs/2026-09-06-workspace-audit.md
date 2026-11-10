# Career Expo workspace audit and visual blueprint

Date: 2026-09-06. Baseline: `d942d8d`, `feature/career-sim-beta`.

## Scope and evidence

Inspected application entry, workstation tools, task/guidance content, spatial scene and quality controls, deterministic engine, persistence, AI/safety, migrations and CI. This is a source-code audit with automated verification, not a browser playthrough, GPU benchmark, live Supabase policy test, or practitioner review. Recommendations below are proposed work, not implemented features. No account-wide settings changed.

Existing strengths: pure simulation reducers, safe artifact projection, canonical mutation coordinator, finite break resources, stage-aware Jules, one connected login investigation and scanner interruption, and adaptive scene effects. These are useful foundations. The central experience gap is that the player still primarily selects answers rather than manipulates workplace records.

**Correction to previous status:** Task 7 is partial. Email/Alert viewers and artifact redaction shipped, but all five task kinds still map to `StructuredTask` in `apps/web/src/components/tools/TaskInteraction.tsx:24`. Tests passing did not prove the promised sentence highlighting or direct alert-row investigation. Earlier claims that every renderer is reachable are also incorrect for this baseline: `apps/web/src/index.tsx:362` mounts only `SpatialShell`.

## Code fixes applied

- Shared `ArtifactOpenButton`: catches failed open requests, exposes a readable retry message, and suppresses duplicate requests synchronously. Email, Alerts and structured artifacts now use it. The server response still controls observation; a click never reveals a body optimistically.
- Restored missing open controls for Guides, Tickets and generic Team artifacts through `ArtifactDetail`. Previously these screens displayed “Open this item” without a usable control.
- Root Vitest configuration now includes package-local `test/**` paths. Reproduced `pnpm --filter @sim/core test` failing to discover files; after correction all 43 core tests ran successfully.
- Removed deprecated `--parallel` from the dev script; persistent, independent dev tasks are already declared in `turbo.json`.
- Default career-pack loader now uses the current date rather than permanently treating June 22, 2026 as today. Callers can still pass a fixed date for fixtures. Regression test moves the clock to 2030 and confirms stale content is rejected.
- Project `AGENTS.md` records the user's limit of two open subagents, including completed agents awaiting closure.

Representative corrected snippets:

```tsx
try {
  await onOpenArtifact(artifactId);
} catch {
  setError(true);
} finally {
  pendingRef.current = false;
  setPending(false);
}
```

```ts
export function loadDefaultCybersecurityPack(now = new Date()): CareerPack {
  return loadCareerPack(readFileSync(packPath, "utf8"), now);
}
```

No speculative dead-code removal: older phishing action IDs and exported peer renderers may be compatibility surfaces. Their lifecycle needs a deliberate content/version decision.

Verification after fixes: `pnpm test` passed 33 files / 254 tests; `pnpm lint`, `pnpm typecheck`, and `pnpm build` each passed all 10 packages. Package-local core discovery passed 43 tests. Dev task dry-run succeeded. The build still warns about the RoomCanvas chunk: 1,003.39 kB minified, 267.77 kB gzip. This is a transfer/parse concern, not an FPS measurement. Profile the lazy scene load before selecting further splitting or asset changes. Independent review found no blocking issue in the shared open control; subsequent generic-tool wiring and date correction were verified locally with regression tests.

## Major structural issues

Priority indicates importance, not a mandatory sequence. Each item needs a scoped implementation/review.

### High: work interactions and information architecture

- **Task mechanics remain quiz-shaped.** `TaskInteraction.tsx:24` delegates every kind to one radio/checkbox panel. `AlertTool.tsx` displays records but does not make their rows selectable. Its test named “selected alert rows” selects an ordinary option label. Build dedicated email-fragment, record-comparison, reference-lookup and ticket-composer renderers. Bind safe source-field IDs to existing task option IDs; keep evaluation on the server. Acceptance: a player can mark evidence on an opened record, compare it with a baseline, and reuse the selection in a ticket.
- **Observation and progression are weakly coupled.** `packages/core/src/tasks.ts:32` checks task availability and answer selections, not required observations. `packages/core/src/workplace.ts:39` exposes artifacts attached to any visible event; later employee evidence can be opened before its intended narrative beat. The pack search action also observes `scanner-window` automatically (`pack.yaml:537`). Add explicit pack-authored discovery prerequisites; distinguish previews, available records, observed records and task completion. Preserve valid alternate routes and coaching.
- **Guides lose search when search becomes a task.** `SystemToolPanel.tsx:292` hides the search form for task-bearing actions. The missing open-button bug is now fixed, but a real search/select/open loop and exact inventory lookup remain Task 8 work.
- **Ticket and chat tools remain incomplete.** Notes exist, but there is no three-part evidence/uncertainty/next-step composer. Morgan guidance replaces the whole workspace (`index.tsx:138`, `:349`), which unmounts local spatial/desk state. Keep Morgan in an OS thread, with durable accepted messages and contextual return links.

### High: accessibility and navigation

- **Peer views exist but cannot be selected from App.** `index.tsx:362` always selects the spatial shell; structured/desk surfaces are exported at the end of the file only. Introduce an `ExperienceShell` that selects all three modes with identical handlers. Add a WebGL failure boundary offering desk mode. Reduced-motion preference should reduce movement, not silently force a different mode. Acceptance must exercise the actual App, not only isolated renderer components.
- **Click navigation has no stuck recovery.** Raw floor targets feed movement (`rooms/SocRoom.tsx:124`, `PlayerController.tsx:250`); collisions can prevent arrival indefinitely. Implement nearest standable target, blocked-movement detection and safe-anchor recovery. Recovery must be presentation-only, with no energy/evidence penalty.

### High before public/provider-backed release: backend integrity

- **Concurrent turns can overwrite history.** `apps/server/src/db/repository.ts:108` saves a whole state, deletes/reinserts logs and evidence, and writes empty accepted deltas. The surrounding read/mutate/save workflow lacks a session-version check. Use optimistic concurrency or a transactional per-session lock, append accepted interactions, and write versioned snapshots. Test simultaneous task/action requests and retries from two tabs.
- **DB authorization assumptions are unproven.** Policies use `auth.uid()` (`drizzle/0001_initial.sql:150`); the plain Postgres pool (`db/repository.ts:263`) does not establish per-request JWT claims. Application ownership checks exist, but actual RLS behavior depends on the deployment role. Current migration tests inspect SQL text, not database access. Document the intended trusted-backend/DB role model; run authenticated-owner, stranger, recipient, revoked-grant and deletion tests on a real disposable DB. This audit does not establish a live data leak.
- **AI budget is not cumulative.** `ai/npc-dialogue.ts:31` creates a new budget each request and records cost after generation; exception fallback reports zero even if a provider call already spent money. Reserve bounded cost before calls, persist actual usage per session, and release only unused reservation. Keep deterministic actions available when the budget closes.
- **Output safety depends on declared fact IDs.** `packages/safety/src/index.ts:60` verifies `referencedFactIds` but not claims in dialogue. Empty IDs do not prove text is safe. Add restricted-content scanning, supported-claim/contradiction checks, classifier and conditional deep validation before provider-backed release. These stages are declared but not executed in the current dialogue path. Retain deterministic fallback.

### Medium: content depth, confidence and maintainability

- **Guidance knows action order better than player intent.** `guidance.ts:11` prioritizes handoff IDs then the first available action. Author presentation beats with objective, destination, optional term help, interruption/resume cue and visible consequence. Canonical prerequisites must remain in core, not in UI guidance.
- **Beginner scaffolding is thin.** Pack options contain terms such as MFA, ASN, VLAN and MDM, but no `term`/`termHelp` entries populate the existing explanation UI. Write plain-language instructions first; expose technical terms on demand. Show one objective and one next destination, with evidence and extra context expandable.
- **Depth needs continuity, not more cases.** Keep approved main case plus scanner interruption. Make the missing handoff reference matter, introduce employee reply at the right beat, and show both supported escalation and delayed dismissal outcomes. Orphaned phishing definitions are content debt, not a reason to enlarge this shift automatically. Mark/archive legacy content through a versioned pack change.
- **Evidence replay is narrower than world replay.** `packages/evidence/src/from-action.ts` generates UUIDs/wall-clock timestamps while core replay folds interactions. Define which metadata is persisted versus reproducible, and compare evidence provenance explicitly. RNG is currently unused; wire its state only when content needs seeded variation.
- **Modularity needs focused extraction.** `styles.css` is 3,344 lines; `SpatialShell.tsx` ~493, `SystemToolPanel.tsx` ~435, router ~511. Size alone is not a defect, but each combines unrelated responsibilities. Extract tools as they gain behavior; split CSS by shell/workstation/world; split router by session/simulation/privacy/profile while retaining shared auth middleware. Avoid a blanket rewrite.
- **Verification claims exceed current tests.** Add full App keyboard completion, true record interaction tests, live RLS checks, browser failure paths and measured shift playtime. Keep paid AI evaluation nightly/manual as planned; add a release decision based on its results, not paid calls to every PR.

## Visual and transition blueprint

### Concept: First Shift at Verdaly

A quiet office already has a day in progress. At reception, the player sees a visitor badge and a short message from Morgan: “Your desk is ready. The night analyst left one thing unfinished.” The same badge, room sign, amber notification and handoff subject recur at the desk. That continuity is the hook; the login case gives the player a reason to sit down.

### Entry journey

Current route is preparation text → briefing → timed floor map → Canvas → desk login. The timed map uses 620ms steps plus a final delay (`FloorMap.tsx:112`); Canvas content uses empty Suspense fallbacks (`RoomCanvas.tsx:75`). There is no source evidence of an actual page reload; discontinuity comes from separate rendered surfaces and loading gaps.

Proposed presentation states: `preparing → reception → entering → roomReady → seated`. One `EntryFlow` reducer owns presentation transitions, with explicit ready/failure/cancel events. Session creation remains in the server client. Preload the lazy room module during the briefing; wait for genuine scene readiness before replacing the reception shell. Retain a readable status and desk-mode fallback if loading fails.

- Reception: optional name/badge interaction, plain-language 10–15-minute target, practice/shift choice and access settings. No personal data beyond existing authorized onboarding requirements.
- Door: a 250–400ms handle/light response; optional short camera transition after readiness. Provide Skip/Enter directly; reduced motion enters immediately. No artificial countdown or added simulated time.
- Arrival: Morgan's direction appears at the room sign, followed by one desk cue. Reveal movement help only when useful. Keep nearby interaction labels readable and keyboard reachable.
- Sit: settle camera over 300–450ms, then focus the DOM workstation heading. Preserve case/tab/notes state on standing and returning. Announce location changes without reading the entire page again.
- Sound: opt-in office ambience after user gesture, separate volume/mute, one quiet arrival cue and meaningful notification sounds. Pair every audio cue with text; suspend ambience when hidden. No new audio package needed initially.

### Workspace density with purpose

Create clusters, not uniformly scattered props. Keep clear walking lanes and sightlines to the desk/break nook.

- Player desk: notebook, shift checklist, headset, labeled monitor and carried snack. Notebook and checklist open existing tools; purely decorative objects do not glow as clickable.
- Team wall: current public queue count, shift rota and escalation route. A public-state adapter supplies content; background screens never fabricate case facts.
- Break nook: grouped cups, finite fridge stock, coffee-state indicator, Jules near a clear standing spot. Existing stock and coffee stage drive visuals.
- Background: repeated chairs, monitors, storage, restrained papers/cable trays and a small number of plants. Reuse meshes/materials and instance repeated objects; do not add a shadow light per prop. See [R3F scaling guidance](https://r3f.docs.pmnd.rs/advanced/scaling-performance).
- Atmosphere: distinct warm break area and cool workstation lighting, readable signage, restrained monitor flicker/vent movement. Preserve current adaptive quality and reduced effects while seated. Measure frame time/draw calls before and after density changes.

### Tactile workstation

Email fragments highlight in place; selected evidence enters a compact case tray with its source. Alerts compare flagged and known-normal records side by side. Guides show a searchable index and selected document. Tickets assemble verified evidence, uncertainty and next action with a live draft preview. Team chat retains messages next to the current case. One-click Resume restores interrupted work.

Use CSS for 100–160ms hover/focus and 160–220ms tab/panel transitions. Use transform/opacity rather than animating whole layouts. Use existing R3F frame updates for door hinges, coffee steam and camera settling, gated by visibility/quality/motion settings. A Framer Motion dependency is unnecessary for this first pass. Animation finishes never resolve canonical tasks or advance deadlines.

Reduced motion replaces camera travel and spatial slides with immediate focus changes or a restrained fade; OS preference detection is supported through [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion). Keep user control over motion and audio.

### Proposed module ownership

- `experience/ExperienceShell`: mode choice and fallback; shared public view/handlers only.
- `experience/EntryFlow`: readiness, entry transitions and focus restoration.
- `components/tools/*`: one workstation tool per module; shared artifact-open control and task submission adapter.
- `world/scene/*`: room geometry, props, interaction anchors and presentation effects.
- `world/audio/*`: opt-in ambient/cue lifecycle; no simulation authority.
- `content/...`: approved beats, beginner copy, source records and consequence text; Zod reference validation.
- `packages/core`: canonical observation prerequisites, task resolution and consequences.

## Reviewable delivery roadmap

1. Finish Task 7 properly: sentence/row interactions, source mappings and tests proving actual record selection. Restore App mode selection alongside this work.
2. Task 8: searchable Guides/inventory, ticket composer and persistent Morgan thread; author prerequisite-aware discovery and visible callbacks.
3. Task 9: reachable navigation and recovery. Preserve return-to-desk state.
4. EntryFlow and one desk/break-nook visual pass. Measure loading, frame times and keyboard focus; add props only within the measured budget.
5. Task 10/11: complete shift in all modes, delayed-consequence route, beginner playtest, interruption recovery and independent final review.

Backend concurrency, DB authorization tests and persistent AI budget/safety run as separately scoped release work. They are not prerequisites for adding decorative props to local development, but public/provider-backed release needs their acceptance evidence.

Suggested playtest targets, not measured results: beginners identify their next action without facilitator help; resume interrupted case in one control; complete intended 10–15-minute route without padding; explain what evidence changed their decision. Test keyboard-only, 200% zoom, reduced motion and a representative low-power machine. Do not infer career ability from interface speed or energy expenditure.
