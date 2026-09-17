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
