# Evidence and peer modes — implementation slice

> **Supersession (2026-09-22):** historical slice describing the Walk/Desk/List mode selector. Peer product modes are superseded: Career Expo is one experience (3D workplace → Desk OS); see `docs/planning/desk-os-audit/DESK_OS_OVERHAUL_PLAN.md`. Kept for history; not current roadmap.

## Implemented

- App mode selector: Walk the office, Desk only, Simple list. Selection survives manager guidance. Switching mode is presentation-only, with no canonical action or session reset.
- Desk/list expose existing finite snack, fridge, coffee, Jules, and emergency recovery interactions. A spatial render error selects desk mode.
- Handoff email's two steps use literal selectable passages, not detached answer cards. Open the message, mark a passage, submit findings, then identify the omitted reference.
- Pack source contracts bind option IDs to exact quotes in related records. Invalid or mixed bindings are rejected. Quotes are omitted from client tasks until the source is observed and available.
- Server enforces inspection before source-based answers. Legacy task definitions without source bindings still work. Golden replay includes record-opening interactions.
- All task panels offer related-source opening and display observed records. New source rendering is shared by desk, spatial workstation, and structured interfaces.

## Try it

Start the development app in this worktree. Create a fresh session so the updated pack is loaded; existing sessions retain their stored rules. Enter the floor, choose Desk only or Simple list, and open the handoff email. Mark the unfinished device check, submit, then mark the missing scanner reference. Both selections remain server-checked; no correctness keys are sent to the browser.

## Next bounded work

1. Build an actual two-record comparison surface for the main login investigation; preserve uncertainty and existing action IDs.
2. Add search-and-cite reference matching and editable ticket composition (Task 8). Do not turn every later step into passage selection.
3. Test the entire real server-backed shift through keyboard-only and spatial routes. Measure readability, navigation burden, and duration with novices.

## Limits

Only the handoff has source-bound selections in this slice. Later tasks still use structured choices; this is not the complete content-depth overhaul. Mode switching preserves canonical progress, but unsubmitted local selections and spatial presentation can reset. React error fallback does not guarantee recovery from every GPU/context-loss event. Pack prose changes still need practitioner validation before release.

No cutscene built. See `future-arrival-concept.md` for the user's future vision. No deployment or account-wide settings changed.

## Verification

262 tests across 36 files pass, including core replay, server integration, real-pack passage interaction, mode switching, and manager-return coverage. Workspace type checks and lint pass. Build retains the existing large lazy-loaded RoomCanvas warning. Full manual browser/screen-reader testing is still outstanding. The independent review agent hit a usage limit; parent review was performed instead, so independent review remains outstanding.
