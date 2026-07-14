# Career Simulation Progression Design

**Date:** 2026-07-14  
**Status:** Approved direction; written-spec review pending  
**Scope:** Evolve current cybersecurity prototype from action-card quiz into a lightweight visual workplace simulation, while preserving deterministic rules and accessible parity.

## 1. Outcome

Career Expo should let a user experience ordinary work inside a believable workplace, not answer a sequence of career questions. The Junior Cybersecurity Analyst shift becomes the first complete vertical slice.

Target experience:

- User navigates a workplace and chooses what to inspect.
- Work happens through recognizable tools: alert dashboard, email, ticket queue, knowledge base, and team chat.
- Multiple events overlap and change over simulated time.
- Information is incomplete and distributed across tools and people.
- Decisions create immediate and delayed consequences.
- NPC knowledge, availability, and reactions reflect canonical state.
- 2D and future 3D presentations consume the same deterministic simulation state.
- Structured mode exposes equivalent actions, facts, consequences, and pacing without requiring spatial navigation.

## 2. Current Baseline

Current build already provides useful foundations:

- Seeded deterministic simulation reducer.
- Server-owned world and hidden state.
- One suspicious-login event with review, inspection, escalation, dismissal, documentation, and help-seeking actions.
- Simulated time and delayed consequences.
- tRPC/Fastify session API.
- React work surface and structured accessible mode.
- Evidence and debrief foundations.
- Career-pack validation and bounded AI infrastructure.

Current experience feels quiz-like because it shows one event, presents all available actions as answer cards, and has no persistent workplace tools, spatial context, competing work, or user-directed investigation.

## 3. Design Principles

### 3.1 Simulation before rendering

Graphics display canonical state; they never determine rules, evidence, deadlines, facts, or outcomes. Every player interaction becomes a validated `SimulationAction` handled by the deterministic engine.

### 3.2 Work through tools, not answer lists

Normal mode should not center a generic list of choices. Actions appear where they belong:

- Alert review and evidence inspection in alert dashboard.
- Notes and status updates in ticket queue.
- Reports and handoffs in email.
- Requests and conversation in team chat or NPC dialogue.
- Procedure lookup in knowledge base.

Structured mode may use explicit controls, but groups them under the same workplace systems and preserves action IDs and consequences.

### 3.3 Information creates decisions

Difficulty should come from prioritization, incomplete context, time, trade-offs, and conflicting signals—not hidden controls or reflex skill. No numeric compatibility meter or disguised assessment prompt appears during play.

### 3.4 Progressive visual investment

Build depth first, then 2D navigation, then one 3D slice. Each stage must remain useful if later visual work pauses.

### 3.5 Accessibility is a peer renderer

Spatial presentation cannot become required for assessment. Work-surface, structured, 2D, and future 3D adapters must expose equivalent canonical interactions and outcomes. Navigation behavior itself produces no career evidence.

## 4. Recommended Progression

## Stage 1: Complete deterministic workplace shift

Expand core from one hard-coded event into a pack-driven shift containing:

- Suspicious login.
- False positive.
- Phishing report.
- Incomplete handoff.
- Routine alert review.

Events can be pending, active, resolved, escalated, or expired. Several may overlap. Each event owns triggers, deadlines, facts, permitted actions, resolution rules, and delayed consequences. Shift completion depends on time and event state, not a fixed question sequence.

Add canonical workplace state:

- Active system and selected artifact.
- Inbox, tickets, alerts, chat threads, and knowledge documents.
- NPC location, availability, knowledge, mood, and memory.
- Tasks, deadlines, handoffs, and notifications.
- Player-created notes and documentation.

Acceptance target: full 15–20 minute shift runs without AI or generic quiz logic. Same seed and action log reproduce identical state.

## Stage 2: Workplace-tool interfaces

Replace central action grid with a desktop-like work environment:

- Persistent system dock/navigation.
- Alert dashboard with alert rows and detail pane.
- Email inbox and message viewer.
- Ticket queue with editable investigation notes and status.
- Knowledge base search and procedure documents.
- Team chat and bounded manager dialogue.
- Shift clock, task notifications, and non-scoring activity history.

Actions remain explicit server contracts but originate from contextual controls. Example: opening login details emits `inspect_login_context`; saving a ticket note emits `document_ticket`; sending an escalation from the ticket emits `escalate_alert`.

Acceptance target: user can finish shift without seeing a generic answer-card list. Automated adapter tests prove contextual UI and structured mode expose equivalent valid actions.

## Stage 3: Lightweight 2D workplace

Add a small top-down or isometric office shell around workplace tools:

- Operations floor, workstation, manager desk, and break/pause area.
- Click-to-move or hotspot navigation.
- Workstations open existing DOM tool interfaces.
- NPC moves according to deterministic schedule.
- Notifications, lighting, and ambient sound reflect world state.
- Reduced-motion and no-spatial-navigation options remain available.

No collision-heavy gameplay, reflex scoring, inventory system, or avatar customization enters this stage.

Acceptance target: location and availability affect how tools and NPC interactions are reached, but do not alter evidence based on navigation speed or gaming skill.

## Stage 4: Renderer-independent boundary

Before 3D, formalize a renderer-safe client contract:

```text
Career pack → deterministic core → server-owned world state
                                      ↓
                                ClientWorldView
                                      ↓
             structured | work tools | 2D office | future 3D
                                      ↓
                         validated SimulationAction
```

`ClientWorldView` includes only public presentation state: locations, interactables, visible artifacts, NPC presentation state, notifications, available contextual actions, and simulated time. Hidden assessment values and restricted facts never cross this boundary.

Each renderer implements a `ViewAdapter` that:

- Renders only `ClientWorldView`.
- Sends typed action intents.
- Cannot mutate canonical state.
- Maps every contextual interaction to a stable action ID.
- Supports parity tests against other adapters.

## Stage 5: One lightweight 3D vertical slice

Build 3D only after deterministic shift and 2D/tool loop test well. Reuse same client contract and DOM work tools.

Initial 3D scope:

- One low-poly security office.
- One navigation model selected after 2D testing.
- Workstation and manager as interactable scene objects.
- Workstations open existing accessible DOM panels.
- NPC position and animation follow server state.
- Visible notifications, lighting changes, and consequence cues.
- No physics-driven rules, open world, character creator, multiplayer, or new assessment signals.

Acceptance target: same action log through 3D and structured adapters produces identical canonical state, evidence, and debrief.

## Stage 6: Visual polish and content expansion

After vertical-slice validation:

- Improve low-poly models, animation, lighting, sound, and transitions.
- Add richer deterministic NPC routines.
- Add more shift variants and event combinations.
- Optimize low-end laptop performance.
- Run accessibility, realism, bias, and gaming-skill-confound studies.
- Add another career only after cybersecurity content reaches quality gate.

## 5. Architecture Changes

### Core and schemas

Replace event-specific booleans with pack-driven artifact and event state. Introduce contracts for:

- `WorkSystem`, `WorkArtifact`, and artifact visibility.
- `TaskState` and deadlines.
- `Notification` and `WorldPresentationEffect`.
- `NpcSchedule`, `NpcLocation`, and availability.
- `ContextualAction` with system, artifact, target, and action ID.
- `ClientWorldView`, containing no hidden state.

Keep `applyAction` pure. Time advancement triggers event activation, NPC schedule updates, notifications, deadlines, and delayed consequences in deterministic order.

### Career packs

Move event triggers, artifacts, facts, legal action transitions, consequences, and tool placement into validated pack content. Pack errors fail startup. Core receives generic definitions and does not import cybersecurity identifiers.

### Web app

Split current monolithic UI into:

- Session shell.
- Tool navigator.
- Alert dashboard.
- Email.
- Ticket queue.
- Knowledge base.
- Team chat/NPC conversation.
- Structured renderer.
- Later 2D scene renderer.

Use one controller for session data and action submission. Renderers receive data and callbacks; they do not call APIs independently.

### Server

Continue serial turn processing per session. Validate contextual targets against current state. Reject stale, duplicate, unauthorized, or unavailable actions. Return updated `ClientWorldView` plus safe presentation effects.

## 6. Data Flow

1. Server creates seeded canonical world from approved career pack.
2. Server serializes public `ClientWorldView`.
3. Renderer displays visible locations, tools, artifacts, NPC state, and contextual controls.
4. User interacts with tool, artifact, location, or NPC.
5. Adapter creates typed `SimulationAction`.
6. Server validates action against canonical state.
7. Pure reducer advances time and applies deterministic effects.
8. Server records action, snapshot, consequences, and eligible evidence.
9. New public view returns to every renderer through same contract.

AI may phrase bounded NPC dialogue after deterministic intent resolution. AI cannot add facts, actions, deadlines, evidence, or outcomes.

## 7. Failure Handling

- Invalid or stale action: reject without state mutation; refresh public view.
- Missing pack content: fail startup with validation path and pack version.
- AI unavailable or invalid: use deterministic approved fallback; simulation remains playable.
- Renderer crash: session resumes from action log and snapshot.
- Unsupported graphics: load work-tool or structured renderer.
- Slow device: lower visual quality without changing simulation timing rules or evidence.
- Missing asset: show accessible labeled placeholder; interaction remains available.

## 8. Testing

Every stage uses RED–GREEN–REFACTOR.

Required additions:

- Event scheduler and overlapping deadline unit tests.
- Pack-driven golden paths covering routine, delayed, incorrect, help-seeking, and off-script play.
- Artifact visibility and restricted-fact tests.
- Contextual action authorization tests.
- Replay tests across complete shifts.
- Adapter parity tests using stable action IDs.
- Structured-mode keyboard tests.
- Tutorial and navigation non-evidence tests.
- Renderer contract tests proving `hidden` cannot serialize.
- 2D/3D performance smoke tests on low-end target settings.
- Cross-renderer replay proving identical canonical outcomes.

## 9. First Implementation Slice

First slice stops before 2D. It creates foundation needed for every later renderer:

1. Generalize world state for multiple events and workplace artifacts.
2. Add deterministic event scheduling and deadline processing.
3. Implement suspicious login plus routine alert overlap.
4. Add alert dashboard, ticket queue, email, knowledge base, and team-chat client contracts.
5. Build contextual React tool shell with alert dashboard and ticket queue functional first.
6. Keep structured mode in parity through shared action mapping.
7. Add full-shift replay fixture and end-to-end test.

Slice succeeds when user investigates and resolves overlapping work through workplace tools, generic action cards are absent from normal mode, and replay remains deterministic.

## 10. Explicit Non-Goals for First Slice

- 2D or 3D renderer.
- Physics or collision.
- Character models or animation.
- Multiple speaking NPCs.
- Multiplayer.
- Inventory or crafting.
- Recommendation ranking.
- New career pack.
- Evidence based on navigation speed or interface skill.

## 11. Decision Gates

After first slice, test whether workplace tools reduce quiz feeling. If not, fix task and information design before visual work.

After 2D slice, test whether spatial navigation improves understanding and engagement without introducing gaming-skill bias. Use results to select 3D camera and controls.

After 3D slice, compare against tool-only and structured modes for career understanding, usefulness, accessibility parity, authoring cost, performance, and session cost. Expand visuals only if value justifies complexity.
