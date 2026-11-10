# Desk OS Overhaul — Spec (DRAFT, pending owner answers)

## Problem (why we're overhauling, not patching)
The current Desk OS is confusing: a player doesn't know what to do, where to go, or what to click — it feels like "too much." Root cause in code: TWO overlapping navigation systems stacked together —
- Desktop metaphor: DeskOs + os/Desktop + os/Taskbar + os/WindowFrame/windows (draggable windows, taskbar)
- Console-with-tabs: OpsConsole + SystemApp + tabs.ts (Dashboard/Alerts/Email/Tickets/Guides/Team/Meetings)
- Plus ~20 tool components (AlertTool, EmailTool, TicketComposer, RecordQueryTool, CaseEvidence, RecordComparison, GuideSearch, InventoryLookup, TeamChatTool, HandoffBuilder, Notes, FileExplorer, BrowserApp...).
There is no single clear "what do I do next" spine, so the player wanders.

## Goal
One clear, guided, gamified flow for a ~15-min shift, aimed at middle/high-schoolers with zero cybersecurity background. The player should ALWAYS know: what's happening, what to do next, where to click. Slim content, cleaner visuals, fewer competing surfaces. Keep the real investigative substance (evidence, honest judgment, consequences) and the already-built multi-select options + honest debrief.

## Design directions (to confirm with owner)
- Collapse to ONE navigation model (not desktop-windows AND tabs). Likely: a single focused "console" with a clear current-task spotlight.
- A persistent "current objective / next step" indicator so the player is never lost.
- Guided progression: the next action is always obvious; optional depth stays optional.
- Keep: canonical systems (Alerts, Email, Tickets, Knowledge/Guides, Team Chat), the A-1042 / A-1180 / finance / Rivera / handoff cases, multi-select reasoning options, honest evidence-based debrief, consequence system.
- Fix dialogue placement (owner wants it centered-ish, bigger text — NOT bottom-right corner) + confirm the varied typing beep works post-merge.
- Slimmer record content (reuse the ~40–80 word targets from the dialogue/deskos review).
- Cleaner visuals throughout.

## Keep vs cut (preliminary)
KEEP: investigation substance, multi-select ticket options, honest debrief, consequences, the 5 canonical tools conceptually.
CUT/MERGE: the dual desktop+tabs navigation; redundant windows/taskbar if the single-model wins; duplicate tool surfaces; excess prose.

## Open questions — see chat.
