# Renderer Parity & Accessibility Acceptance Matrix

**Status:** Acceptance definition for the Career Expo SOC simulation redesign.
Not code, not architecture, not implementation. Independent of the Phase 0
architecture audit; assumes no particular backend implementation.

**Primary reference:**
`docs/superpowers/specs/interactivity-and-content-depth-design.md`
(especially §2.4 No movement-as-skill, §5 record/evidence/NPC UI, §13 Renderer
Parity, §13.3 Time parity, §13.4 Evidence parity, §16 capability split,
Phase 8 parity work). That document wins every disagreement.

**The three renderers:**

1. **3D** — "Walk the Office": first-person SOC room, spatial hotspots,
   wayfinding, Desk OS surfaces reached by walking/sitting.
2. **Desk-only** — workstation UI without 3D navigation: queue, Desk OS apps
   (records, ticket, contacts, KB), HUD equivalents.
3. **Accessible / simple-list** — linear, semantic, keyboard- and
   screen-reader-first presentation: lists, forms, action menus, announcements.

**Parity rule (canonical):** every career-relevant action maps to the same
canonical action concept and backend result in all three renderers. A renderer
may alter presentation, never truth.

**How to read each interaction entry below.** Every entry carries the same
fields:

- **Player goal** — what the player is trying to do, in plain language.
- **Canonical action concept** — the renderer-independent action (named as a
  concept, e.g. `open_alert`; exact IDs belong to implementation, not this doc).
- **3D presentation** — how it surfaces while walking the office.
- **Desk-only presentation** — how it surfaces at the workstation UI.
- **Accessible presentation** — how it surfaces in the simple-list UI.
- **Information the player receives** — the canonical content the action
  returns (same in all renderers).
- **State change that should result** — the canonical state transition.
- **What MUST remain identical** — parity invariants across renderers.
- **What MAY differ cosmetically** — allowed presentation variation.
- **Accessibility requirements** — keyboard / semantic / announcement needs.
- **Failure / regression conditions** — observable signs parity broke.

---

## Interaction entries

### 1. Viewing work queue

- **Player goal:** See what work exists and decide what to do next.
- **Canonical action concept:** `view_queue` (read of Work Item list + statuses).
- **3D:** Queue visible via Desk OS screen when seated + HUD step/objective
  line + wayfinder toward current journey target while walking.
- **Desk-only:** Queue panel/list as the primary surface; step title, body,
  item statuses.
- **Accessible:** Simple list of Work Items as headings/list items with status
  text; current objective exposed as a heading, not color alone.
- **Information received:** Item IDs, titles, types, statuses
  (new/acknowledged/in-progress/awaiting/closed), current objective reference.
- **State change:** None (read-only; viewing never mutates).
- **MUST remain identical:** Same items, same order semantics (severity then
  age unless content defines otherwise), same statuses, same objective.
- **MAY differ:** Layout, density, 3D wayfinding visuals, whether the queue
  is always visible or one click away.
- **Accessibility:** Queue reachable by keyboard in ≤ a few stops from the
  main surface; list uses real list semantics; status changes announced
  (see § Screen-reader).
- **Failure/regression:** An item visible in one renderer but missing in
  another; different status text for the same state; objective identifiable
  only via the 3D wayfinder with no text equivalent.

### 2. Acknowledging work

- **Player goal:** Mark a routine item as seen/owned so the queue reflects it.
- **Canonical action concept:** `acknowledge_item` (item → acknowledged).
- **3D:** Interact at the relevant hotspot or Desk OS queue row; same
  confirmation feedback as other renderers.
- **Desk-only:** Acknowledge button/control on the queue row.
- **Accessible:** "Acknowledge" button in the item's action list.
- **Information received:** Confirmation the item is acknowledged; any
  follow-up scheduling note (e.g. "follow-up will arrive later") in text.
- **State change:** Item status → acknowledged; follow-up may schedule.
- **MUST remain identical:** Resulting status, follow-up eligibility, no
  numeric penalty in any renderer.
- **MAY differ:** Button placement, animation, sound.
- **Accessibility:** Control is a real button with an accessible name
  including the item ("Acknowledge scanner summary"); confirmation announced.
- **Failure/regression:** Acknowledgement possible only by walking somewhere;
  follow-up arrives in one renderer but not others after identical play.

### 3. Opening alerts

- **Player goal:** Open an alert (e.g. A-1042) and read its structured metadata.
- **Canonical action concept:** `open_alert` (alert → opened; metadata revealed).
- **3D:** Walk to desk/alert wall hotspot, interact; alert opens on the Desk OS
  surface.
- **Desk-only:** Select the alert in the queue; detail view opens.
- **Accessible:** Activate the alert link/button; detail reading view opens.
- **Information received:** Alert ID, rule/type, severity label, account, time,
  source, and whatever metadata the content exposes at open — byte-identical
  across renderers.
- **State change:** Alert marked opened/read; downstream content (NPC
  availability, follow-up dialogue intents) keys off the same flag.
- **MUST remain identical:** Full metadata set, severity labels, opened flag,
  downstream unlocks.
- **MAY differ:** Whether opening requires sitting/walking first in 3D
  (navigation is presentation); transition animation.
- **Accessibility:** Alert opens via Enter/Space on a focused control; focus
  moves to the detail heading; severity conveyed in text, not color alone.
- **Failure/regression:** Metadata fields present in 3D but truncated in
  accessible view; opening the alert in one renderer fails to set the flag
  others depend on; severity shown only as a colored dot anywhere.

### 4. Authentication search

- **Player goal:** Find authentication records by user, time, session, or IP.
- **Canonical action concept:** `search_auth` with parameters
  (user / time window / session ID / IP).
- **3D:** Same Desk OS record surface (seated), or canonical action wrapper;
  record tools are identical, not re-implemented spatially.
- **Desk-only:** Search box / controlled filter UI + results table/list +
  record detail view + visible active filters + stable record IDs.
- **Accessible:** Equivalent filter controls and record list; no information loss.
- **Information received:** Deterministic matching records (same query →
  same records on replay); irrelevant-but-plausible records included equally.
- **State change:** None for searching itself; opening a record may mark it
  examined (see §7).
- **MUST remain identical:** Query parameters accepted, matching logic,
  result set, record IDs, filter display.
- **MAY differ:** Control styling, table vs. list layout, pagination vs. scroll.
- **Accessibility:** All filters keyboard-operable (real inputs/selects);
  results announced as "N results"; active filters conveyed in text and
  individually removable by keyboard.
- **Failure/regression:** A filter dimension missing in one renderer;
  different result sets for the same query; query only constructible via
  pointer (e.g. map-click time picker with no text input).

### 5. VPN search

- **Player goal:** Find VPN sessions by user, IP, time window, or reference ID —
  including establishing meaningful absence ("no matching session").
- **Canonical action concept:** `search_vpn` with parameters; absence derived
  only from a performed query.
- **3D / Desk-only / Accessible:** Same three-way pattern as §4; identical
  query surface in each renderer's record tooling.
- **Information received:** Matching sessions; explicit "no matching VPN
  session in queried interval" result when the player actually runs the query.
- **State change:** Absence-fact derivation only on performed queries, in all
  renderers equally.
- **MUST remain identical:** Absence semantics (never pre-revealed, never
  renderer-dependent), matching logic, result records.
- **MAY differ:** Cosmetic layout only.
- **Accessibility:** "No results" is a real status announcement, not silence;
  the empty state suggests next verbs in text.
- **Failure/regression:** Absence revealed without a query in any renderer;
  absence derivable in one renderer but not another; empty results announced
  nowhere.

### 6. Device lookup

- **Player goal:** Look up a device (e.g. unknown-laptop-17) for ownership and
  enrollment/trust context.
- **Canonical action concept:** `lookup_device` (inventory record read).
- **3D / Desk-only / Accessible:** Same pattern as §4; inventory search + record
  view in each renderer's record tooling.
- **Information received:** Owner, enrollment status, trust/assignment fields —
  identical record content everywhere.
- **State change:** Record marked examined (if content tracks it); no truth change.
- **MUST remain identical:** Record fields, examined flag, availability timing.
- **MAY differ:** Layout only.
- **Accessibility:** Same as §4; owner/enrollment fields labeled in text.
- **Failure/regression:** Ownership visible only as a 3D prop label; record
  fields differ between renderers.

### 7. Record inspection

- **Player goal:** Open one record and read it fully.
- **Canonical action concept:** `open_record` (record → examined).
- **3D:** Record detail on Desk OS surface.
- **Desk-only:** Record detail view/pane.
- **Accessible:** Record detail reading view with heading structure.
- **Information received:** Full field set of the record; session comparison
  affordances (open two, view both) available in all renderers.
- **State change:** Examined/discovery flags per content rules; identical set
  of unlockable Evidence Facts.
- **MUST remain identical:** Field content, comparison capability (two records
  viewable together somehow), discovery consequences.
- **MAY differ:** Side-by-side vs. stacked vs. sequential comparison layouts.
- **Accessibility:** Detail view is a heading + definition-list/table semantics;
  focus moves to the record heading on open; "back to results" returns focus
  to the originating row.
- **Failure/regression:** A field readable only in one renderer; comparison
  impossible in accessible mode; examining a record in one renderer doesn't
  set the flag others honor.

### 8. Evidence Fact discovery

- **Player goal:** Establish findings through investigation (never by guessing UI).
- **Canonical action concept:** Discovery rules fire from examined records /
  performed queries — never from selecting answer options.
- **3D / Desk-only / Accessible:** Discoveries surface identically: case file /
  evidence list gains the fact with provenance (which record/query produced it).
- **Information received:** Fact text + provenance reference, same everywhere.
- **State change:** Fact added to discovered set; downstream unlocks identical.
- **MUST remain identical:** Trigger conditions, fact content, provenance,
  downstream effects. No hidden answer-key fields reach any client.
- **MAY differ:** Notification styling (toast vs. inline vs. announcement).
- **Accessibility:** Each discovery announced via live region ("Evidence added:
  …"); evidence list uses list semantics with provenance text per item.
- **Failure/regression:** A fact discoverable in one renderer but not others
  for identical play; discovery requiring pointer precision or noticing a
  visual prop; answer-key data visible in any client.

### 9. Notebook usage

- **Player goal:** Keep running case notes during investigation.
- **Canonical action concept:** `update_notes` (timestamped note appended;
  amend supported — revision, not penalty).
- **3D:** Notes field on Desk OS ticket/case surface.
- **Desk-only:** Same ticket/case app field, autosave or explicit save with
  clear status.
- **Accessible:** Form equivalent: textarea + save, same content.
- **Information received:** Saved-note confirmation; visible note history
  including amendments.
- **State change:** Note stored; downstream content (escalation quality,
  handoff content, NPC follow-ups) reads the same notes in all renderers.
- **MUST remain identical:** Note content/capacity, save semantics, history,
  downstream reads.
- **MAY differ:** Autosave vs. explicit save affordance (status must be
  perceivable in both), editor styling.
- **Accessibility:** Labeled textarea, character guidance if limits exist,
  save status announced ("Notes saved 14:32"), history as a list.
- **Failure/regression:** Notes entered in one renderer unreadable in another;
  downstream content ignores notes from a specific renderer; save failures
  silent anywhere.

### 10. Ticket updates

- **Player goal:** Keep the case ticket current (status, summary, next steps).
- **Canonical action concept:** `update_ticket` (bounded fields: summary,
  evidence links, verdict reason, open questions — not a quiz).
- **3D / Desk-only / Accessible:** Same ticket surface in each renderer's idiom;
  fields accept canonical entity/evidence references; attach-from-evidence
  interaction present everywhere.
- **Information received:** Current ticket state rendered back; validation
  messages for genuinely missing required fields (process requirements, e.g.
  "escalations need attached evidence") — identical rules everywhere.
- **State change:** Ticket fields updated; readiness flags (e.g.
  escalation-ready) computed identically.
- **MUST remain identical:** Field set, validation rules, readiness logic.
- **MAY differ:** Layout, single-page vs. tabbed ticket.
- **Accessibility:** Every field labeled; required-vs-optional marked in text;
  errors associated with fields and announced; evidence links as real links.
- **Failure/regression:** A field missing in one renderer; different validation
  outcomes for identical input; ticket state diverging by renderer.

### 11. Attaching evidence

- **Player goal:** Link specific discovered records to the case.
- **Canonical action concept:** `attach_evidence` (record → case attachment).
- **3D:** Attach control on Desk OS case surface (attach-from-evidence).
- **Desk-only:** Same control in ticket app.
- **Accessible:** "Attach to case" button per evidence item + attached list
  with remove controls.
- **Information received:** Attached set rendered back; escalation package
  preview (if surfaced) identical.
- **State change:** Attachment added/removed; escalation quality downstream
  reads the same set.
- **MUST remain identical:** Attachable set, attach/remove semantics, package
  contents.
- **MAY differ:** Drag-and-drop may exist as an enhancement ONLY if a
  keyboard/button path does the same thing (drag never required).
- **Accessibility:** Attach/remove are real buttons named with the evidence
  ("Attach session S-0731 login record"); attached list announced on change.
- **Failure/regression:** Drag-only attachment anywhere; attached set
  differing by renderer; escalation package missing attachments added in
  another renderer.

### 12. Contacting Morgan

- **Player goal:** Get bounded peer context (handoff, prior-shift facts).
- **Canonical action concept:** `contact_morgan` with an intent
  (ask-about-handoff / ask-about-session-device / share-finding / narrow
  procedural question).
- **3D:** Approach Morgan, invoke canonical interaction; optional spatial context.
- **Desk-only:** Team Chat/contact surface → same canonical action.
- **Accessible:** "Contact Morgan" action list → same canonical action ID/outcome.
- **Information received:** Only Morgan's authored facts; delayed responses
  arrive with identical content and equivalent timing semantics in all renderers.
- **State change:** Question asked / response pending / response received flags —
  identical; Morgan never adds facts, changes state, or reveals hidden evidence.
- **MUST remain identical:** Available intents, response content, delay
  semantics, knowledge bounds.
- **MAY differ:** 3D proximity vs. chat roster vs. action list; avatar/presence
  visuals.
- **Accessibility:** NPC interaction fully keyboard-operable; pending responses
  announced on arrival in every renderer (not only via 3D approach cues);
  dialogue history re-readable.
- **Failure/regression:** An intent available in only one renderer; response
  content differing by renderer; delayed reply arriving only if the player
  walks somewhere; Morgan revealing facts in one renderer withheld in others.

### 13. Interacting with Jules

- **Player goal:** Give status, receive escalation, get bounded process guidance.
- **Canonical action concept:** Intents (give-status / escalate-case /
  ask-what-is-needed / confirm-process / report-development).
- **3D:** Approach/break-room interaction invoking canonical intents.
- **Desk-only:** Contact/lead surface invoking the same intents.
- **Accessible:** Action list invoking the same intents.
- **Information received:** Acknowledgements, evidence-gap questions ("what ties
  the session to the account?"), documentation requests — content-identical,
  state-dependent identically.
- **State change:** Escalation accepted / evidence requested / notes requested —
  identical downstream.
- **MUST remain identical:** Intent availability rules, response content,
  escalation acceptance logic. Jules never grades in any renderer.
- **MAY differ:** Presentation of presence/availability.
- **Accessibility:** Same as §12; escalation confirmation and follow-up
  requests announced; no information carried by tone of voice or facial
  expression equivalents.
- **Failure/regression:** Availability differing by renderer for identical
  state; grading/scoring language appearing in any renderer; escalation
  accepted in one renderer but pending in another.

### 14. Phishing workflow

- **Player goal:** Triage a phishing report: intake → sender/context check →
  link safety → interaction check → scope → disposition + reporter reply.
- **Canonical action concept:** Sequence of `open_report`, `inspect_sender`,
  `check_link`, `check_interaction`, `scope_recipients`, `disposition_report`,
  `reply_reporter` — each individually parity-covered.
- **3D:** Report queue + Desk OS inspection surfaces reached spatially; same
  underlying actions.
- **Desk-only:** Report inbox + inspection panes.
- **Accessible:** Stepped list/form flow with the same stages and the same
  record access.
- **Information received:** Sender fields with plain-language glosses,
  auth-result chips (pass/fail + meaning), reputation verdict cards, recipient
  counts, interaction record — identical data everywhere.
- **State change:** Stage progression, disposition (benign/simulation/
  malicious-contained), reporter-replied flag, IOCs recorded — identical.
- **MUST remain identical:** Stage order and gating, all record content,
  disposition options and their effects, reply options and effects.
- **MAY differ:** Single-page vs. stepped layout; visual verdict chips vs.
  text badges (text always present).
- **Accessibility:** Every stage keyboard-completable; verdicts as text, never
  color/shape alone; recipient counts as real numbers in text; reply options
  as radio/button group with labels.
- **Failure/regression:** A stage skippable in one renderer but gated in
  another; reputation verdict shown as color only; disposition options
  differing; reporter reply impossible outside 3D.

### 15. Scanner workflow

- **Player goal:** Review a routine scan summary; acknowledge; handle the
  normal follow-up if it arrives.
- **Canonical action concept:** `review_scan`, `acknowledge_item`,
  later `review_scan_followup` gated on acknowledgement.
- **3D / Desk-only / Accessible:** Summary view + acknowledge control in each
  renderer's queue idiom; follow-up arrives as a queue event everywhere.
- **Information received:** Scope, result summary, "expected vs. actual"
  framing — identical.
- **State change:** Acknowledged flag; follow-up eligibility; reminder state
  if ignored (no numeric penalty, all renderers).
- **MUST remain identical:** Follow-up gating logic, reminder behavior,
  benign-true-positive framing.
- **MAY differ:** Summary visualization (chart must have text/data-table
  equivalent in every renderer that shows it).
- **Accessibility:** Summary includes text equivalent of any graphic;
  follow-up arrival announced.
- **Failure/regression:** Follow-up gated on acknowledgement in one renderer
  but arriving regardless in another; chart-only information anywhere.

### 16. Monitor / escalate / close decisions

- **Player goal:** Render the shift's judgment calls with reasons.
- **Canonical action concept:** `decide_monitor` / `decide_escalate` /
  `decide_close` with reason + attached-evidence preconditions; all legal
  where content allows — none is the "right answer."
- **3D / Desk-only / Accessible:** Decision controls on the case surface in
  each idiom; preconditions (e.g. attached evidence for escalation) enforced
  identically with identical messages.
- **Information received:** Decision confirmation + what-happens-next text
  (monitor re-surface timing in fiction terms; escalation receipt; closure
  record).
- **State change:** Case routing/state per decision; downstream beats
  (returned evidence requests on thin escalations; re-surfaced items on
  monitor; closure record) — identical.
- **MUST remain identical:** Available options, preconditions, reason capture,
  downstream consequences. No scoring/ranking in any renderer, ever.
- **MAY differ:** Button styling, confirmation dialog design (must exist or
  be undoable equivalently — destructive-feeling decisions need confirm or
  undo in all renderers).
- **Accessibility:** Decisions as real controls with full context in the
  label ("Escalate A-1042 to Tier 2 with 4 attached records"); reason field
  labeled; confirmation announced; no decision conveyed by spatial gesture.
- **Failure/regression:** An option missing in one renderer; different
  preconditions per renderer; any score/stars/"correct" language anywhere;
  irreversible decision without confirm/undo in any renderer.

### 17. Delayed consequence handling

- **Player goal:** Receive and act on follow-ups to earlier work (Morgan's
  delayed answer, scanner follow-up, escalation acknowledgement, returned
  evidence requests).
- **Canonical action concept:** Scheduled/queued events consumed via
  `read_update` + resulting follow-up actions (same parity as their type).
- **3D:** Arrival via message/HUD/approach cue + queue entry; content identical.
- **Desk-only:** Inbox/queue entry + badge/text indicator.
- **Accessible:** Queue entry + live-region announcement + list position.
- **Information received:** Full event content in text in all renderers; timing
  semantics equivalent (presentation-time vs. simulated-time per § Time parity).
- **State change:** Event marked read; downstream flags set identically.
- **MUST remain identical:** Event content, availability timing relative to
  canonical time, read-state, downstream effects.
- **MAY differ:** Notification chrome (toast/banner/sound vs. badge vs.
  announcement) — content always lands in the queue too, never toast-only.
- **Accessibility:** Every delayed event announced (polite live region, or
  assertive only if it blocks current work — which should be rare); events
  re-readable from a notifications/updates list; unread state perceivable
  in text.
- **Failure/regression:** Toast-only events with no persistent entry anywhere;
  event content differing by renderer; arrival gated on 3D position.

### 18. Returning to earlier work

- **Player goal:** Resume a parked investigation with notes and evidence intact.
- **Canonical action concept:** `reopen_item` (read of preserved case state).
- **3D:** Return via queue/Desk OS; parked context restored identically.
- **Desk-only:** Queue → case restores scroll/filters/notes where feasible;
  at minimum notes + evidence + status.
- **Accessible:** Same restoration; position/focus sensibly placed at the
  case heading or last-edited field.
- **Information received:** Previously gathered notes, attached evidence,
  item history — complete in all renderers.
- **State change:** None beyond read flags; resumption never resets progress.
- **MUST remain identical:** Preserved content set; no renderer loses notes,
  attachments, or history.
- **MAY differ:** Exact scroll/focus restoration fidelity.
- **Accessibility:** Focus placed predictably (case heading); history as a
  list; no reliance on remembering spatial location ("the terminal on the
  left").
- **Failure/regression:** Notes/attachments missing after switching renderers
  or sessions; resumption resetting item state; location described only in
  spatial terms.

### 19. End-of-shift handoff

- **Player goal:** Summarize open work so the next shift continues cleanly.
- **Canonical action concept:** `write_handoff` (bounded summary fields per
  open item) + `end_shift`.
- **3D:** Handoff surface via Desk OS; leaving via exit hotspot maps to the
  same `end_shift` concept.
- **Desk-only:** Handoff form + end-shift control.
- **Accessible:** Form with the same fields + same control.
- **Information received:** Confirmation; summary of what was handed off
  (items, statuses, watch-items) rendered back in text.
- **State change:** Handoff record stored; shift closes; evaluation/debrief
  reads the identical record regardless of renderer.
- **MUST remain identical:** Field set, stored content, debrief inputs.
  The debrief must be renderer-blind.
- **MAY differ:** Ceremony around ending (walk-to-exit vs. button).
- **Accessibility:** All fields labeled; handoff reviewable before submit;
  submit confirmation announced.
- **Failure/regression:** Handoff fields differing; debrief referencing
  renderer-specific behavior ("you walked efficiently"); end-shift
  unreachable without 3D navigation.

---

## Movement parity

Movement is presentation. It must NOT influence any of the following.
Each item names the invariant and an observable test.

- **Evidence.** Invariant: no Evidence Fact is created, revealed, or gated by
  position, path, speed, camera angle, or hotspot visit order. Test: complete
  the shift in desk-only and accessible modes; the discoverable fact set must
  equal the 3D set for identical action sequences.
- **Outcomes.** Invariant: verdicts, dispositions, escalation results, and
  debrief content never depend on how the player moved. Test: same canonical
  action sequence across renderers → same end state, diffed.
- **Performance.** Invariant: no metric (time-to-close, actions-per-minute,
  path efficiency) feeds career interpretation or unlocks. Test: a slow,
  wandering 3D playthrough with identical canonical actions produces the same
  interpretation as a direct one. (Movement telemetry, if collected, is
  diagnostics only and never shown as performance.)
- **Simulated opportunity.** Invariant: walking cannot unlock, skip, or
  duplicate scheduled content; proximity cannot substitute for canonical
  actions (standing near Morgan ≠ asking Morgan). Test: position-only
  playthrough (walk everywhere, interact with nothing) changes nothing
  canonical.
- **Career interpretation.** Invariant: debrief/check-in language never
  references navigation skill ("you found everything quickly," "you got
  lost"). Test: review all debrief strings for movement vocabulary; none present.
- **Queue order and timing.** Invariant: arrival/availability of Work Items
  never depends on where the player stands. Test: idle in different 3D spots
  vs. idle in desk-only → same arrivals at same canonical times.

## Time parity

- If 3D movement consumes **presentation time only** (canonical clock
  unaffected): desk-only and accessible modes need no compensation; assert by
  test that canonical timestamps for identical action sequences match across
  renderers within tolerance zero.
- If movement consumes **canonical simulated time**: every equivalent
  non-3D action must carry the same canonical time cost (e.g. "go to Morgan"
  costs N canonical minutes whether walked or clicked), OR movement time must
  be normalized out. Mixed models (time passes while walking but actions are
  instant elsewhere) are a parity violation by construction.
- Delayed events (§17) key off **canonical time**, never wall-clock or
  renderer dwell. A player who walks slowly must meet the same consequences
  as one who clicks fast, given the same canonical actions.
- Countdowns, SLAs, or "before handoff" windows — if any exist — must be
  expressed in canonical time units visible in all renderers, with remaining
  time in text, not spatial urgency.
- Regression test: scripted identical canonical action sequences in all three
  renderers must produce identical canonical-time event logs.

## Information parity

The following must NEVER be visual-only, spatial-only, pointer-precision
dependent, or hidden in environmental props:

- Alert metadata, severity, and record field values.
- Evidence Fact existence, content, and provenance.
- Queue membership, order, status, and the current objective.
- NPC availability, pending responses, and dialogue content.
- KB/runbook procedural content cited by any interaction.
- Ticket/handoff field values and validation messages.
- Decision options, preconditions, and consequences.
- Delayed-event content (never toast-only, never proximity-only).
- Any number that matters (counts, times, record IDs).

Concretely: every wall screen, sticky note, whiteboard, nameplate, LED, glow,
pulse, or prop that carries career-relevant information must have a text
equivalent reachable through canonical surfaces in all renderers. Props may
echo information; they may never be its sole source. Discovering something by
"noticing" is presentation flavor, and the same discovery must be earnable
through a canonical action (search, open, ask) in every renderer.

## Keyboard accessibility

Expected behavior, all renderers (3D canvas included for its HTML/chrome layer;
in-canvas avatar movement itself must have non-pointer equivalents per § Movement
parity — keyboard movement is a control scheme, never a skill gate):

- **Navigation:** Tab order follows visual/logical order; skip links to queue,
  case, and actions; focus always visible; focus trapped only inside modal
  dialogs and released on close; no keyboard traps anywhere.
- **Search/filter:** Every filter is a real input/select/combobox operable and
  submittable by keyboard; results reachable by Tab/arrows; active filters
  removable by keyboard; Enter submits, Escape clears or closes per documented
  behavior.
- **Ticket editing:** All fields reachable by Tab; save/submit via keyboard;
  validation errors linked to fields and announced; no hover-only affordances
  (tooltips carrying meaning must also appear on focus).
- **Dialogs:** Real dialog semantics; focus moves in on open, returns to the
  invoker on close; Escape closes (except where data loss requires explicit
  choice — then the choice itself is keyboard-operable); confirmations for
  consequential decisions in every renderer.
- **Tool switching:** Switching record systems, ticket, contacts, KB via
  keyboard (tabs/toolbar buttons, not spatial walking); current tool announced
  or focus-placed on switch.
- **NPC interaction:** Contacting Morgan/Jules, reading replies, and choosing
  intents fully keyboard-operable; delayed replies reachable from the queue/
  updates list without returning to a spatial position.
- **Notifications:** Toasts never require keyboard dismissal to continue work
  (auto-expire AND persist to a list); the updates list is keyboard-navigable;
  unread counts exposed as text.
- **3D-specific:** Interact key (E or equivalent) documented in UI text;
  every hotspot action duplicated in an adjacent keyboard-reachable control
  or action menu; pointer-lock never required for career-relevant actions.

## Screen-reader / semantic requirements

- **Labels:** Every control has an accessible name naming its target
  ("Open alert A-1042", not "Open"); icon-only buttons forbidden without
  labels; severity/status always include text ("High severity"), never color
  or shape alone.
- **Focus order:** Queue → item detail → evidence/notes → actions mirrors
  the task flow; focus moves to new views' headings on open; focus returns
  to the invoker on close; focus never drops to body on dynamic updates.
- **Status announcements:** Item opened/acknowledged/closed, note saved,
  evidence attached, ticket updated, decision recorded, handoff submitted —
  each confirmed via assertive-or-polite live region as appropriate
  (confirmations: polite; blocking errors: assertive).
- **Queue changes:** Arrivals, status transitions, and reminder states
  announced ("New work item: employee phishing report"); the queue exposes
  aria-live summary or a "check for updates" result, plus a persistent list.
- **Delayed-event announcements:** Every §17 event announced on arrival with
  its full text available in the updates list; ترتیب preserved; unread
  distinguishable in text.
- **Table/list semantics:** Record results as real tables (with headers,
  scope, caption/label) or lists — never div grids without roles; evidence
  lists as lists with provenance text; ticket history as a list; comparison
  views label which record is which ("Session S-0731" vs. "Session S-0741"
  as headings).
- **Reduced motion:** All pulse/bob/glow motion frozen under
  prefers-reduced-motion in every renderer; no information carried by motion
  alone (a pulsing item must also be text-labeled "current objective").
- **Reading order:** DOM order matches logical task order in all renderers;
  CSS/3D positioning never reorders meaning.

## Parity regression checklist

Run this whenever a new mechanic, Work Item type, or interaction is added.
Any "no" blocks acceptance.

1. Canonical action named and renderer-independent (no renderer-specific IDs
   for career-relevant effects).
2. Same action sequence in 3D, desk-only, and accessible produces the same
   canonical end state (scripted walkthrough diffed, not eyeballed).
3. All information the mechanic reveals exists as text in all three renderers.
4. Nothing career-relevant is visual-only, spatial-only, or pointer-precision
   dependent (walk the § Information parity list per new UI element).
5. No new evidence path bypasses canonical actions (no prop-noticing,
   no hidden-area, no camera-trick discoveries).
6. Full keyboard path exists end-to-end in every renderer; no traps, no
   hover-only meaning, no drag-only actions.
7. Screen-reader pass: labels name targets, focus order sane, status/queue/
   delayed events announced, tables/lists semantic.
8. Time behavior identical: canonical-time event log matches across renderers
   for the scripted sequence.
9. Movement-independence: position-only playthrough changes nothing; slow vs.
   fast navigation changes nothing canonical.
10. No scoring/grading language introduced in any renderer (including
    debrief strings and empty states).
11. NPC bounds hold in all renderers: same intents, same knowledge limits,
    same delay semantics, no invented facts anywhere.
12. Failure states are equivalent: validation messages, blocked-action
    explanations, and empty states worded identically in content across
    renderers (chrome may differ).
13. Help/KB coverage: the new mechanic's procedure exists in KB/runbook text
    reachable in all renderers.
14. Handoff/debrief blindness: handoff captures the mechanic's state, and the
    debrief never references renderer-specific behavior.

## Final acceptance matrix

"Required canonical parity" states the invariant; "Accessibility acceptance
criteria" states the observable bar. Cosmetic differences are always allowed
where the invariant holds.

| Capability | 3D | Desk | Accessible | Required canonical parity | Accessibility acceptance criteria |
|---|---|---|---|---|---|
| View work queue | HUD objective + wayfinder + Desk OS queue | Queue panel | Simple list, objective as heading | Same items, order, statuses, objective | Keyboard-reachable; list semantics; status text, not color-only |
| Acknowledge work | Hotspot/Desk OS confirm | Row button | Action-list button | Same status, same follow-up eligibility, no penalty | Named button ("Acknowledge …"); confirmation announced |
| Open alerts | Walk to desk/wall, open on Desk OS | Queue → detail | Link → reading view | Identical metadata set, severity, opened flag, unlocks | Focus to detail heading; severity in text; Enter/Space operable |
| Authentication search | Desk OS record surface | Search/filter UI + table | Equivalent filters + list | Same params, matching logic, result set, IDs | Real inputs; "N results" announced; filters removable by keyboard |
| VPN search | Same record surface | Same filter UI | Same filter UI | Same as above + absence only from performed queries | Empty state announced as status with next verbs in text |
| Device lookup | Same record surface | Inventory search + record | Same, list idiom | Identical fields, examined flag, timing | Owner/enrollment labeled in text |
| Record inspection | Desk OS detail | Detail pane | Reading view, heading structure | Identical fields; two-record comparison possible everywhere | Heading + table/list semantics; focus to heading; labeled back control |
| Evidence Fact discovery | Case/evidence list gains fact + provenance | Same | Same + live-region announcement | Same triggers, content, provenance, downstream; no answer keys client-side | Discovery announced ("Evidence added: …"); list semantics kept |
| Notebook usage | Desk OS notes field | Ticket/case field, save status | Textarea + save, same content | Same content/capacity/history; same downstream reads | Labeled field; save status announced; history as list |
| Ticket updates | Desk OS ticket app | Ticket app | Form equivalent | Same fields, validation, readiness logic | Labels; required marked in text; errors linked + announced |
| Attach evidence | Attach-from-evidence control | Same control | Button per item + attached list | Same attachable set, attach/remove semantics, package | Buttons named with evidence; changes announced; no drag-only |
| Contact Morgan | Approach + canonical action | Team Chat + same action | Action list + same action ID | Same intents, responses, delays, knowledge bounds | Fully keyboard-operable; delayed replies announced + re-readable |
| Interact with Jules | Approach/break-room + intents | Lead surface + intents | Action list + intents | Same availability rules, content, escalation logic; never grades | Confirmations + follow-ups announced; nothing carried by tone/face |
| Phishing workflow | Queue + Desk OS stages | Inbox + panes | Stepped list/form, same stages | Same stage order/gating, records, dispositions, replies | All stages keyboard-completable; verdicts as text; counts as numbers |
| Scanner workflow | Summary + acknowledge | Same | Same | Same gating, reminder behavior, benign framing | Chart graphics have text equivalents; follow-up announced |
| Monitor/escalate/close | Case-surface decision controls | Same | Same, full context in labels | Same options, preconditions, reasons, consequences; no scoring | Labels carry context; reason labeled; confirm/undo; confirmation announced |
| Delayed consequences | Message/HUD/approach cue + queue entry | Inbox entry + indicator | Queue entry + announcement | Same content, canonical-time timing, read-state, effects | Announced on arrival; persistent re-readable list; unread in text |
| Return to earlier work | Queue/Desk OS restores context | Queue → case restores notes/evidence/status | Same, focus to heading | Same preserved set; resumption never resets | Predictable focus; history as list; no spatial-only references |
| End-of-shift handoff | Desk OS handoff + exit hotspot | Handoff form + end control | Same fields + control | Same fields, stored content, renderer-blind debrief | Labels; review-before-submit; submit announced |
| Movement | Avatar navigation | N/A (tool switching) | N/A (linear nav) | Movement changes nothing canonical (see Movement parity) | Keyboard movement never a skill gate; every hotspot action duplicated |
| Time | Presentation-time walking | Instant tool switches | Instant linear nav | Identical canonical-time logs for identical action sequences | Remaining time in text where applicable; never spatial urgency |
| Information access | Spatial + Desk OS surfaces | Workstation panels | Lists/forms/menus | Zero visual-only/spatial-only/pointer-only career information | Full text equivalents; semantic markup; reduced-motion safe |

---

## Interaction inventory coverage map

Task requires every career-relevant interaction class from the canonical spec to be covered. Map (required class → entry above; gaps closed by §§ below):

| Required interaction class | Covered by | Canonical state read / fired |
|---|---|---|
| Receiving/acknowledging work | §2 Acknowledging work; §15 Scanner workflow | Work Item status → acknowledged; follow-up eligibility |
| Viewing queue / work items | §1 Viewing work queue | Read of Work Item list + statuses (no mutation) |
| Opening records / artifacts | §7 Record inspection | Record → examined; discovery flags |
| Querying authentication data | §4 Authentication search | Deterministic query → result set; records opened |
| Querying VPN data | §5 VPN search | Same + absence-fact derivation only on performed query |
| Querying device data | §6 Device lookup | Inventory record read; examined flag |
| Querying alerts / scanner data | §3 Opening alerts; §15 Scanner workflow | Alert → opened; summary acknowledged |
| Phishing investigation | §14 Phishing workflow | Staged report progression + disposition + reporter reply |
| Notebook use | §9 Notebook usage | Timestamped notes appended; downstream reads identical |
| Ticket / case documentation | §10 Ticket updates (+ § Ticket parity below) | Ticket fields updated; readiness flags |
| Evidence attachment | §11 Attaching evidence | Attachment set add/remove; package contents |
| Operational decisions | §16 Monitor / escalate / close (+ § Ticket parity) | Case routing/state per decision; consequence schedule |
| Talking to Morgan | §12 Contacting Morgan (+ § NPC parity) | Intent availability; authored fact payload; pending/received flags |
| Talking to Jules | §13 Interacting with Jules (+ § NPC parity) | Same; escalation acceptance; documentation requests |
| Responding to interruptions | §17 Delayed consequence handling (+ Scenarios F–G below) | `read_update` + follow-up action of matching type |
| Resolving / waiting / monitoring work | §16; §18 Returning to earlier work | Waiting/monitoring states; resumption preserves notes/evidence |
| Delayed consequence follow-up | §17 Delayed consequence handling | Event marked read; downstream flags identical |
| Handoff / final documentation | §19 End-of-shift handoff | Handoff record stored; shift closes; renderer-blind debrief |
| KB / runbook lookup (supporting verb) | Structured query parity + Scenario H | KB article → opened/read; no truth change |

No mechanics invented: every row traces to canonical spec §§3–5, 11–12 or realism-pack verbs. Future query/ticket/NPC engine work must keep these IDs renderer-independent.

## Master parity matrix — canonical action/state view

Requested shape: canonical action/state plus explicit same-information / same-time / same-consequence columns. (Companion to interaction entries §§1–19 and final acceptance matrix above, which remain normative detail.)

| Interaction | Canonical action / state | 3D access | Desk access | Accessible access | Same information? | Same sim-time effect? | Same consequence? | Accessibility notes |
|---|---|---|---|---|---|---|---|---|
| View queue | `view_queue` reads Work Items | Desk OS queue + HUD/wayfinder | Queue panel | Simple list + heading objective | Yes — items, order, statuses, objective | Yes — read costs no sim time in any renderer | Yes — no state change anywhere | List semantics; status text not color-only |
| Acknowledge | `acknowledge_item` → acknowledged | Hotspot or Desk OS row | Row button | Action-list button | Yes — confirmation + follow-up note | Yes — same scheduling | Yes — same follow-up eligibility | Named button; confirmation announced |
| Open alert (A-1042) | `open_alert` → opened | Desk/wall hotspot → Desk OS | Queue → detail | Link → reading view | Yes — full metadata byte-identical | Yes | Yes — same unlocks (NPC, intents) | Focus to heading; severity in text |
| Auth search | `search_auth` params → results | Desk OS record surface | Filter UI + table | Equivalent filters + list | Yes — same params, logic, IDs | Yes — search costs equal | Yes — none for search; open marks examined equally | Real inputs; "N results" announced |
| VPN search | `search_vpn` params → results/absence | Same record surface | Same filter UI | Same filter UI | Yes — absence only from performed query | Yes | Yes — absence derivation identical | Empty state announced with next verbs |
| Device lookup | `lookup_device` → record | Same record surface | Inventory search | Same, list idiom | Yes — identical fields | Yes | Yes — examined flag identical | Owner/enrollment labeled text |
| Record inspect / compare | `open_record` → examined | Desk OS detail | Detail pane | Reading view | Yes — full fields; 2-record compare everywhere | Yes | Yes — same discovery unlocks | Heading + table semantics; focus management |
| Evidence discovery | Rule fires from examined/query | Case list + provenance | Same | Same + live announcement | Yes — fact + provenance identical | Yes | Yes — downstream identical | Announced "Evidence added: …" |
| Notebook | `update_notes` append/amend | Desk OS notes field | Ticket field + save status | Textarea + save | Yes — content, history | Yes | Yes — downstream reads same | Labeled field; save announced |
| Ticket update | `update_ticket` bounded fields | Desk OS ticket app | Ticket app | Form equivalent | Yes — state rendered back; identical validation | Yes | Yes — readiness identical | Labels; errors linked + announced |
| Attach evidence | `attach_evidence` add/remove | Attach-from-evidence control | Same control | Button per item + list | Yes — attached set + package preview | Yes | Yes — escalation reads same set | Buttons named with evidence; no drag-only |
| Contact Morgan | `contact_morgan` + intent | Approach + action | Team Chat + action | Action list + action ID | Yes — authored facts only | Yes — delay semantics equal | Yes — flags identical | Keyboard-operable; replies announced |
| Interact Jules | Intents (status/escalate/needed/process) | Approach/break-room + intents | Lead surface + intents | Action list + intents | Yes — content-identical, state-dependent | Yes | Yes — escalation logic identical | Confirmations announced; nothing by tone/face |
| Phishing stages | `open/inspect/check/scope/dispose/reply` | Queue + Desk OS stages | Inbox + panes | Stepped list/form | Yes — senders, chips, verdicts, counts | Yes | Yes — stage gating + effects | Keyboard stages; verdicts text; counts numeric |
| Scanner routine | `review_scan` + acknowledge + follow-up | Summary + acknowledge | Same | Same | Yes — scope, summary, framing | Yes | Yes — gating + reminder | Chart text equivalent; follow-up announced |
| Monitor/escalate/close | `decide_*` + reason + evidence precond | Case-surface controls | Same | Same, context in labels | Yes — options, preconditions, next-step text | Yes — same schedule | Yes — downstream beats identical | Context labels; confirm/undo; announced |
| Delayed event | `read_update` + typed follow-up | Cue + queue entry | Inbox + indicator | Queue + announcement | Yes — full text everywhere | Yes — canonical-time timing | Yes — read-state + effects | Announced; persistent list; unread in text |
| Resume work | `reopen_item` reads preserved case | Queue/Desk OS restore | Queue → case restore | Same, focus to heading | Yes — notes/evidence/history complete | Yes | Yes — resumption never resets | Predictable focus; no spatial references |
| Handoff / end shift | `write_handoff` + `end_shift` | Desk OS + exit hotspot | Form + control | Same fields + control | Yes — fields + rendered summary | Yes | Yes — debrief inputs identical | Labels; review before submit; announced |
| KB lookup | `open_kb` → read | Desk OS KB | KB panel + search | List + search | Yes — same bodies | Yes | Yes — no gating by renderer | Search keyboard-operable; headings semantic |
| Wait / monitor | `decide_monitor` → monitoring | Case control | Same | Same | Yes — re-surface terms in fiction | Yes | Yes — re-surface identical | Confirmation announced |

## Structured query parity

Applies to every future structured dataset (auth, VPN, device, alert, scanner, KB, phishing-headers/link where applicable). 3D may render a workstation visually but must call the same canonical query action with the same parameters — never a parallel query path.

1. **Selecting dataset.** All datasets reachable in all renderers without spatial prerequisites. Dataset picker is a real control (tab/radio/select/menu) with text labels. Acceptance: keyboard-only tester reaches every dataset in ≤ a few stops from case/queue in each renderer.
2. **Entering filters.** Same filter dimensions everywhere (user, IP, session/reference ID, device, time window, category per dataset). Filters are real inputs/selects/comboboxes; no map-click-only, slider-only, or drag-only filter. Active filters shown as removable text chips/buttons in all renderers.
3. **Changing time ranges.** Time entry accepts typed input (absolute or documented relative form) in every renderer; any visual picker is an enhancement with a text equivalent. Same normalization rules; same inclusive/exclusive semantics; invalid ranges produce identical validation text.
4. **Reviewing results.** Same deterministic result set and order for same normalized query. Results as real table (headers/scope/caption) or list — never unlabeled div grids. Stable record IDs visible in text. Count announced ("N results for …").
5. **Zero-result queries.** Empty state is a real status (announced, re-readable), suggests next verbs in text ("widen time window", "check spelling", "open runbook"), and records the same query-history entry as a non-empty query. Zero results never read as failure/grade.
6. **Sorting where supported.** If any renderer offers sort, all offer it on the same columns with the same default order; sort control is keyboard-operable; current sort exposed in text. No renderer may default-sort evidence-relevant columns differently.
7. **Viewing record detail.** Full field set identical (see §7 Record inspection). Detail reachable by keyboard in all renderers; focus moves to record heading; back-navigation returns focus to originating row.
8. **Repeating query.** Same query re-run returns same records (replay-identical). Repeat control preserves parameters visibly; no renderer silently mutates stored filters between runs.
9. **Query history.** Every performed query (including zero-result) appends the same history entry — normalized filters, dataset, result IDs, sim time — visible and re-runnable in all renderers. History is what absence-proof rules evaluate; renderer must never add or drop history entries.
10. **Accessible field completeness.** Accessible representation retains ALL career-relevant record fields — including provenance-adjacent metadata (timestamps, IDs, coverage notes, auth-result glosses). Summarized/collapsed views must offer an expand path to full fields; truncation without expansion is a parity violation.

## Evidence discovery parity

1. **Provenance, not renderer.** Every Evidence Fact fires from canonical provenance (records opened, queries performed, authored dialogue facts received, KB examined) — never from hotspot visits, camera angles, notice-order, or pointer precision.
2. **Identical observed IDs.** Equivalent action sequences in all renderers produce identical `observedArtifactIds` sets and identical discovered-fact sets. Diff test: scripted canonical log replayed per renderer → sets equal.
3. **Absence proof identical.** Absence facts ("no matching VPN session in queried interval") derive only from a stored query whose normalized filters semantically cover the authored requirement (dimensions + time ⊇ authored window) with zero qualifying records. Broader queries qualify; wrong-account/wrong-interval queries do not — in every renderer. Reading a sentence that claims absence never substitutes for performing the query.
4. **No hidden relevance indicators.** No renderer surfaces importance rank, "required" flags, clue counters, completion percentages, or precomputed related-record lists. Related records surface only inside the record/query view that legitimately surfaced them.
5. **No spatial tells.** No glow, pulse, highlight, beacon, audio sting, haptic, or prop placement may mark career-relevant records, NPCs, or hotspots beyond generic "interactive" affordance. Any persistent emphasis must be text-labeled AND available through non-spatial surfaces (e.g. "current objective" label in queue).
6. **Client blindness.** Serialized views expose discovered facts + provenance only; undiscovered definitions, consequence predicates, branch labels, and answer keys never reach any client.

## Ticket / documentation parity

1. **Opening ticket.** Same ticket(s) openable in all renderers from queue or case surface; same ticket ID, linked Work Items, status, and history shown.
2. **Structured fields.** Same editable field set everywhere (title/incident ref, status, affected account/entity, related sessions/devices, disposition/action, pending follow-up). Same required/optional marking in text; same legal-transition enforcement with identical messages.
3. **Writing notes.** Same free-text capacity, save semantics (autosave status perceivable in all renderers), amendment-not-penalty history. Free text never becomes authoritative world truth; downstream rules read notes identically.
4. **Attaching Evidence Facts.** Only discovered facts attachable (backend validates); attach/remove available per fact in all renderers via real buttons; attached set rendered back identically; escalation package preview (if any) identical.
5. **Disposition/action.** Same disposition options with same preconditions (e.g. escalation requires attached evidence) and same reason capture; decisions labeled as workplace actions, never quiz answers.
6. **Review status/history.** Full ticket state, attachment list, note history, and status transitions re-readable in all renderers as lists with timestamps. Switching renderers mid-case loses nothing.

## NPC parity

1. **Same intents, same gates.** Morgan intents (handoff, session/device/account question, prior-shift context, share finding, narrow procedural) and Jules intents (status, escalate-route, what-is-needed, process confirm, routine ack) expose identical availability predicates over canonical state in all renderers. 3D approach walks to the NPC; desk/accessible use contact surfaces — all invoke the same canonical action IDs.
2. **Same knowledge bounds.** Morgan emits only authored Morgan-known facts; Jules answers from canonical documentation state + authored process bounds. Neither invents facts, verdicts, procedures, deadlines, or hidden evidence in any renderer.
3. **Same timing.** Delayed replies arrive with equivalent canonical-time semantics and identical content everywhere; arrival never gated on 3D position. Pending state and delivery both announced + persistently listed.
4. **Phrasing ≠ meaning.** AI may vary phrasing of the selected semantic payload only (intent, factual payload, tone, linked fact IDs, required/forbidden claims). Deterministic fallback text preserves identical facts with AI disabled. Phrasing diffs across renderers must never alter canonical meaning — assert by comparing semantic payloads, not strings.
5. **No embodiment-exclusive content.** Spatial cues (avatar gesture, gaze, office location, voice tone) carry zero career information. Everything load-bearing exists as text in the dialogue/message record.

## Accessibility requirements (touch / narrow, reduced motion, color)

Keyboard and screen-reader bars are defined in §§ Keyboard accessibility / Screen-reader above and stay normative. This section closes the remaining three.

### Touch / narrow layouts

- No hover-only interactions: every tooltip, preview, or affordance carrying meaning also appears on focus/tap or in adjacent text.
- Touch targets ≥ 24×24 CSS px for all career-relevant controls (44×44 preferred for primary decisions); no overlapping hit areas in desk or 3D chrome.
- No clipped career-relevant information at 320px width or 200% zoom: record fields, ticket fields, dialogue content, validation messages reflow without horizontal scrolling of meaning (data tables may scroll with sticky headers + caption preserved).
- No drag-only, pinch-only, or multi-finger-gesture-required actions; drag-and-drop attach (if offered) always has a button equivalent.
- 3D canvas chrome (hotspot prompts, interact key hints) usable without fine pointer: adjacent DOM controls duplicate every hotspot action.

### Reduced motion

- `prefers-reduced-motion` freezes all non-essential animation in every renderer (pulse/bob/glow, wayfinder bounce, camera sway, toast slide, LED shimmer).
- No information encoded only through movement: pulsing objective also text-labeled; arrival motion paired with live-region announcement + persistent entry.
- Camera transitions (sit/stand, room change) offer instant-cut equivalents; no mandatory animated traversal before a canonical action becomes available.
- Parallax, auto-play ambient loops, and shake-on-error are disabled under reduced motion; errors use text + icon, never shake alone.

### Color

- No evidence, status, severity, verdict, availability, or validation state communicated solely by color. Every color-coded element carries a text label, icon with label, or pattern + label ("High severity", "Acknowledged", "Fail — replies go elsewhere").
- Contrast: text and meaningful iconography meet WCAG 2.2 AA (4.5:1 body, 3:1 large/graphic) in all renderers including 3D DOM chrome and Desk OS surfaces.
- Reputation/auth-result chips (pass/fail), verdict badges, energy meter, and queue status pills all expose their value as text programmatically (not `aria-hidden` color swatches).
- Focus indicators never rely on color change alone (outline + offset, visible in high-contrast modes).

## Renderer-equivalence scenarios

Run each in 3D, desk-only, and accessible; pass = identical canonical state/outcome + identical information content (presentation may differ). "Identical" verified by diffing canonical action logs, observed-ID sets, ticket/NPC/consequence state — never by eyeballing.

- **A — A-1042 auth trail.** Open A-1042 → search auth by user + window → open S-0731 and S-0741 → compare. Expect: same records, same fields, same examined flags, same derived facts in all renderers.
- **B — VPN zero-result + absence proof.** Run VPN query over authored window for (j.patel, 203.0.113.44) returning zero rows. Expect: identical empty-state meaning, identical query-history entry, identical later absence-fact eligibility; broader re-query also qualifies identically.
- **C — Morgan before/after fact.** Ask Morgan about handoff before opening device inventory, then again after discovering the enrollment fact. Expect: identical available intents at each point, identical semantic payloads, identical pending/delay timing.
- **D — Ticket attach + disposition.** Attach two discovered facts, write note, set disposition to escalate/monitor. Expect: identical ticket state, identical validation outcomes, identical downstream acknowledgement/request.
- **E — Delayed consequence blindness.** Decide monitor (or escalate), advance canonical time past follow-up due point, consume the event. Expect: same event content, same timing relative to canonical clock, same read-state and downstream flags regardless of renderer or navigation speed.
- **F — Interruption while parked.** Park A-1042 mid-investigation (notes saved), acknowledge scanner item, consume phishing-report arrival, return to A-1042. Expect: parked notes/evidence intact in all renderers; queue order/status identical; no renderer loses or resets work.
- **G — Scanner follow-up gating.** Acknowledge scanner summary in one renderer, verify follow-up arrives; fresh session ignoring it verifies reminder state. Expect: identical gating (follow-up only after acknowledgement), identical reminder wording, no numeric penalty anywhere.
- **H — KB + handoff closure.** Look up runbook/KB article, finish routine item, write end-of-shift handoff, end shift. Expect: identical handoff record, renderer-blind debrief (no movement/skill vocabulary), shift closes in all renderers including without any 3D navigation.
- **I — Phishing full path.** Triage report → sender/headers → link safety → scope count → disposition + reporter reply. Expect: same stage gating, same records, same disposition effects, same reply outcome.
- **J — Position-only null.** Walk everywhere / switch tools without invoking canonical actions. Expect: zero canonical state change in every renderer (no facts, no flags, no schedule shifts).

## Current migration hazards (read-only inspection, 2026-09-18)

Do NOT fix here. Future migration owners must resolve each before claiming parity. Unrelated worktree changes were left untouched; findings below come from committed code + specs.

| # | Hazard | Location | Risk | Migration note |
|---|---|---|---|---|
| H1 | Raw `templateId` serialized on client events | `packages/core/src/serializer.ts:106-108` | Clients can join events to pack rules; renderer could branch on authoring identity | Replace with opaque client identifier or strip (canonical §6.10 already requires) |
| H2 | `relatedArtifactIds` emitted per task view | `packages/core/src/serializer.ts:59`; `WorkTaskPanel.tsx:49`; `TaskInteraction.tsx:26-33`; `RecordComparison.tsx:19` | Pre-answers which records matter; any renderer reading it gains relevance hints | Expose related records only inside surfacing record/query view; gate task options on observed set |
| H3 | Source-quote gating exists but task chrome surrounds it | `serializer.ts:62-75`; `TaskInteraction.tsx` "Open source" buttons | Quiz-shaped UI persists around canonical reads; future renderers may copy quiz semantics instead of query semantics | Migrate workflows off `TaskRequiredError` gates per canonical §15 protocol (release/remove gate, never hide UI only) |
| H4 | Proximity/position state in 3D layer | `world/presentation.ts:set_nearby`; `socLayout.ts:BASE_HOTSPOTS/BREAK_INTERIOR_HOTSPOTS`; `RoomCanvas.tsx:onNearbyChange/onInteract`; `SpatialShell.tsx:FLAVOR/INTERACT_LABEL` | Standing near Morgan/Jules/alert wall could gate or flavor career info (e.g. `morgan_station` flavor points at Team chat — today benign, pattern risky) | Keep proximity presentation-only; assert J-null (position-only playthrough changes nothing); duplicate every hotspot action in DOM |
| H5 | Pointer-lock + interact-key path in 3D | `SpatialShell.tsx:pointerlock` listeners; `PlayerController.tsx:mode` | Career action could become reachable only via pointer/keys without DOM equivalent | Every hotspot action needs adjacent keyboard control; pointer-lock never required for canonical actions |
| H6 | Movement exertion / energy meters | `world/useMovementExertion.js`; `BreakRoomPanel.tsx:EnergyMeter`; `ExperienceShell.tsx:NonspatialResources` "Walk 5 meters" | Energy/time confusion: players may read movement cost as sim-time or career signal | Keep movement cost in presentation/energy only, zero sim minutes; never feed telemetry (distance, speed) into evidence/debrief |
| H7 | Dual Jules paths (spatial vs non-spatial) | `SpatialShell.tsx` JulesDialogue + `ExperienceShell.tsx:NonspatialResources` JulesDialogue, both via `julesDialogueFromClientView` | Paths can drift (topics, seen-state, reply timing) so availability differs by renderer | Single intent contract + shared availability predicate; diff-test both shells on same state |
| H8 | Break-room/snack interactions | `BreakRoomPanel.tsx` eat/snack/fridge/coffee; `NonspatialResources` duplicates | Ambient actions may acquire undocumented state or become renderer-specific rituals | Inventory ambient interactions; either keep all state-free or give each a canonical ID with parity in all renderers |
| H9 | Free-text `kbQuery` slot vs structured query future | `serializer.ts:189`; `GuideSearch.tsx` (also dirty in worktree — not reviewed) | Text search may behave differently per renderer or bypass normalized query history (breaks absence proof) | Route all record discovery through canonical query action + history; keep `kbQuery` text as input, not as parallel truth |
| H10 | Toast/banner-only notification risk | `NotificationBanner.tsx`; `MutationStatus.tsx`; `SpatialShell` HUD cues | Delayed events consumable only via transient chrome in one renderer | Every event lands in queue/updates list persistently; toasts auto-expire AND persist |
| H11 | Desk OS tab vs accessible-list divergence | `world/deskOs/*` (tabs, OpsConsole, DashboardHome) vs `AccessibleMode.tsx` vs `WorkSurface.tsx`/`SystemToolPanel.tsx` | New tool added to Desk OS tabs but not to list renderer (or vice versa) | Parity checklist item 1–3 gates every new tool; shared interaction tests across renderers |
| H12 | `observedArtifactIds` per-event + global split | `serializer.ts:33,116,146`; `SourceEvidence.tsx`; artifact-open tests | Per-renderer open path may set one but not both, splitting later gating | Single canonical open/record-examined write path; cross-renderer resume test (§18/F) must pass |
| H13 | Worktree caveat | Uncommitted Phase-1 files (e.g. `GuideSearch.tsx`, `CaseRail.tsx`, serializer, schema edits per `git status`) | Findings H1–H12 describe committed code + specs; dirty files not assessed | Re-run this hazard sweep after Phase-1 lands; do not treat this list as covering uncommitted work |

## Automated test recommendations

| Requirement | Best test layer | Suggested assertion |
|---|---|---|
| Same available-action set per state | Shared interaction test (all renderers, same `ClientView`) | `availableActions(view)` deep-equal across walk/desk/list adapters |
| Identical canonical log for scripted sequence | E2E (scripted walkthrough ×3, diff logs) | Action log + `observedArtifactIds` + ticket + NPC flags byte-equal |
| Identical sim-time event log | Core unit + E2E | Canonical timestamps equal, tolerance zero, across renderers |
| Query params/result/history identical | Core unit (query engine) + renderer component | Same normalized query → same result IDs + same history entry incl. zero-result |
| Absence proof coverage semantics | Core unit | Broader query qualifies; wrong-account/interval does not; unread-claim ≠ proof |
| No leaked authoring metadata in client views | Serializer test | `templateId`, full `relatedArtifactIds`, undiscovered facts, predicates absent from every client payload |
| Evidence set identical post-sequence | Core unit + shared interaction | Discovered-fact IDs + provenance equal across renderers |
| Ticket attach/validation identical | Core unit + E2E | Same inputs → same ticket state; invalid attach rejected everywhere |
| NPC intents/payloads identical | Core unit (availability) + component | Same intents per state; semantic payloads equal; fallback text fact-equal |
| Position-only null | E2E / movement-parity test | Walk-only run mutates zero canonical fields |
| Slow-vs-fast navigation null | E2E | Same canonical actions at different speeds → same end state |
| Keyboard end-to-end per renderer | Accessibility test (keyboard-only script) | Every career action reachable, operable, focus sane, no traps |
| Screen-reader semantics | Accessibility test + manual SR pass | Labels name targets; tables/lists semantic; arrivals/decisions announced |
| Touch targets / reflow | Accessibility test + manual | Targets ≥24px; 320px/200% zoom clips nothing career-relevant |
| Reduced motion | Accessibility test (media-query emulation) | Animations frozen; no motion-only information |
| Color-independence | Accessibility test + lint | No status by color alone; contrast AA; text equivalents present |
| Toast persistence | Renderer component test | Every transient event also in persistent queue/updates list |
| Handoff/debrief blindness | E2E + content lint | Handoff captures mechanic state; debrief strings contain zero movement/skill vocabulary |
| No grading language | Serializer + content lint + E2E | Banned tokens (correct/incorrect/score/stars/percent) absent from all surfaces |

## Final parity release checklist

All boxes must hold for every new mechanic, Work Item type, and interaction before acceptance (extends § Parity regression checklist with ship gates):

1. Canonical action named, renderer-independent; no renderer-specific IDs carry career effects.
2. Scripted identical sequences in 3D/desk/accessible produce identical canonical end state (diffed, not eyeballed) — scenarios A–J pass.
3. All revealed information exists as text in all renderers; § Information parity list walked per new UI element.
4. Nothing career-relevant is visual-only, spatial-only, pointer-precision, hover-only, drag-only, or motion-only.
5. No evidence path bypasses canonical actions; H4/H5 null tests pass.
6. Full keyboard path end-to-end in every renderer; focus order sane; no traps; confirm/undo on consequential decisions.
7. Screen-reader pass complete: labels, focus, announcements (queue/status/evidence/decisions/delayed events), table/list semantics.
8. Touch/narrow pass: targets, reflow at 320px/200% zoom, no clipped career content.
9. Reduced-motion + color passes complete.
10. Time behavior identical: canonical-time logs match; delays key off canonical clock, never wall-clock/dwell.
11. Serializer test green: no `templateId`, exhaustive related lists, undiscovered facts, predicates, or keys in client payloads (H1–H3 resolved or waived with issue link).
12. NPC bounds hold everywhere: same intents/gates/content/delays; fallback fact-equal; no invented facts.
13. Query parity holds: all 10 structured-query items verified for every dataset the mechanic touches.
14. Ticket parity holds: open/edit/attach/dispose/review identical; cross-renderer resume loses nothing.
15. Handoff captures the mechanic; debrief is renderer-blind (content lint green).
16. Hazard sweep re-run: H1–H13 reviewed against current code; new hazards appended, none silently dropped.
17. Flaky-free evidence: unit + serializer + shared-interaction + component + E2E + a11y layers above recorded with commit SHAs; failures adjudicated, not ignored.
