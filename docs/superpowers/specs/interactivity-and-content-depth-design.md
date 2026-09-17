# Career Expo — SOC Interactivity & Content-Depth Design

**Status:** Canonical beta design specification  
**Scope:** Existing Junior Cybersecurity Analyst / SOC shift only  
**Primary goal:** Replace quiz-like task completion with a deterministic, stateful simulation of doing junior SOC work  
**Implementation principle:** Depth over breadth. One deep authored shift before additional careers or cases.

---

## Source-of-Truth Intent

This document defines the target experience, interaction architecture, content model, migration path, and implementation sequence for the Career Expo cybersecurity beta.

It is intentionally a **design and implementation specification, not code**. Implementation should follow this document unless a later approved spec explicitly supersedes it.

The current simulation has useful content and presentation systems, but its work-task model is structurally quiz-like: tasks are represented as ordered steps with option selections, `requiredOptionIds`, success text, and failure coaching. The redesign must preserve the locked product constraints while changing the core player verb from **answering questions about work** to **performing work inside a deterministic simulation**.

The central design rule is:

> **Career Expo should simulate completing work, not answering questions about work.**

For this beta:

> **One deeply authored SOC shift should make computer investigation, workplace interaction, routine responsibilities, interruptions, documentation, decisions, and delayed consequences continuously feed into one another.**

---

# 1. Experience Target

The player should feel like they have temporarily stepped into a junior cybersecurity analyst shift, not like they are taking a cybersecurity assessment.

“Feels like working a shift” means the player repeatedly experiences the following:

1. Work arrives through believable workplace channels.
2. The player decides what deserves attention.
3. The player uses multiple systems to investigate.
4. Information is incomplete and distributed across records, tools, and coworkers.
5. The player forms an understanding by correlating what they found.
6. The player creates or updates a real work product such as a case note or ticket.
7. The player makes a bounded operational decision.
8. The simulation accepts the decision without immediately grading it.
9. The player resumes other work.
10. Later events reflect the state created by earlier actions.
11. The player sometimes has to leave one context to obtain another piece of information.
12. Routine work and interruptions make the workplace feel occupied and ongoing rather than staged around one puzzle.

The experience should create moments such as:

- “These two records do not line up.”
- “I should check the VPN data before deciding.”
- “That device is not what I expected.”
- “Morgan might know what happened during handoff.”
- “I need to deal with this other alert while I wait.”
- “I already acted on that case, and now something changed.”
- “I should update the ticket before I brief Jules.”

The player should learn what the work feels like through action and context rather than through explicit evaluation.

### Target rhythm

The beta should alternate among:

- focused desk investigation,
- routine work,
- communication,
- short physical or workplace interactions,
- documentation,
- decisions,
- interruptions,
- and delayed follow-up.

The shift should contain enough overlap that the player has a small queue of responsibilities, but not so much that it becomes stressful or dependent on fast reaction.

### Success criteria

The redesign succeeds when:

- a player can describe what they **did** at work rather than which questions they answered;
- the central case requires information from multiple systems;
- at least some useful information is obtained through workplace interaction rather than static text;
- player actions change later world state;
- the simulation can continue after an imperfect but legal decision;
- the interface does not reveal “correct answer” state;
- the same canonical work can be completed through 3D, desk-only, and accessible renderers;
- replaying the same action sequence produces the same simulation outcome.

---

# 2. Design Anti-Goals

The redesign MUST NOT solve the problem by adding more questions, more text, more visual chrome, or more movement.

## 2.1 No quiz loop

Do not structure the primary simulation loop as:

`prompt -> options -> required answer -> success/failure -> next prompt`

New mechanics must not rely on hidden answer keys whose primary purpose is to determine whether the player selected the author-authored “correct” choice.

## 2.2 No correct/incorrect feedback loop

The simulation must not routinely tell the player:

- Correct
- Incorrect
- Try again
- Wrong choice
- You missed a clue

Legal actions should normally execute.

Consequences, coworker responses, later records, or reopened work should communicate what happened.

## 2.3 No numeric scores or career-fit judgments

Do not add:

- points,
- stars,
- grades,
- performance percentages,
- career-fit numbers,
- skill ratings,
- hidden score meters exposed after the shift,
- or diagnosis-like conclusions.

The simulation may record canonical actions and state for replay/debrief purposes, but it must not convert them into a game score or judgment of the player.

## 2.4 No movement-as-skill

Walking speed, camera control, pointer accuracy, pathfinding, or gaming skill must not produce better career evidence.

Movement may provide embodiment and workplace context, but every canonical action and outcome must have an equivalent in desk-only and accessible modes.

## 2.5 No minigames that stand in for work

Do not add arbitrary:

- timing games,
- reaction games,
- dragging puzzles,
- memory games,
- cable-connection games,
- fake hacking games,
- or “type this exact command quickly” interactions

unless the interaction is itself a faithful and necessary representation of the work.

## 2.6 No busywork for its own sake

Mundane work is allowed only when it creates occupational texture, pacing, state, or context.

Do not force repetitive actions merely to make the shift longer.

## 2.7 No fake complexity

Do not make the simulation appear deeper by adding many windows that all contain static text.

A new tool is justified only when it supports a distinct work verb or data source.

## 2.8 No unrestricted sandbox for beta

The beta is not a full SOC emulator.

The player operates inside an authored, bounded scenario with structured data and legal actions.

Depth comes from meaningful combinations of a small number of mechanics.

---

# 3. Canonical Work Loop

The canonical loop is:

**Queue -> Investigate -> Correlate -> Interact -> Document -> Decide -> Resume -> Consequence**

This loop replaces the current WorkTask-as-question as the primary unit of simulation.

## 3.1 The Work Item

The primary gameplay unit is a **Work Item**.

A Work Item represents a piece of work that exists in the simulated workplace, such as:

- Alert A-1042
- suspicious-login investigation
- employee phishing report
- scanner monitoring item
- false-positive review
- incomplete handoff
- ticket follow-up
- teammate request

A Work Item is not a question.

**Runtime representation (Phase 0 decision, binding):** "Work Item" is the player/product abstraction. Its canonical runtime representation is an **extended `EventInstance`** — the existing event state already carries ID, type, status, creation time, linked records, resolution, scheduler integration, serialization, and replay. No separate competing WorkItem state store will be introduced. Phase 1 extends `EventInstance` with acknowledgement state/time, priority/attention metadata, linked ticket ID, waiting/monitoring states, and follow-up references (see §6, §18 Phase 1).

It contains or references:

- stable ID;
- type/category;
- current status;
- creation time;
- priority/attention metadata;
- related record IDs;
- available actions;
- prerequisite state for some actions;
- discovered facts relevant to the item;
- linked ticket/case if any;
- authored consequence rules;
- scheduled follow-ups;
- optional NPC dialogue hooks;
- resolution state.

## 3.2 Work Item lifecycle

A typical lifecycle is:

`queued -> acknowledged -> investigating -> pending/waiting -> decision made -> monitoring/escalated/closed -> follow-up/reopened -> resolved`

Not every Work Item needs every state.

The state machine must be deterministic and content-authored. The lifecycle states map onto the extended `EventStatus` enum (`pending`, `active`, `acknowledged`, `monitoring`, `waiting`, `resolved`, `escalated`, `expired`); Phase 1 adds the missing states rather than building a parallel machine.

## 3.3 Player freedom

The player may have multiple open Work Items and choose their order.

The simulation may restrict actions when they are not legal, but it should not force a single exact sequence unless the real workplace condition requires it.

Example:

The player can inspect the alert, authentication history, inventory, or handoff in different orders.

The resulting discovered evidence should be the same when the same underlying records are examined.

## 3.4 Investigation principle

Investigation should produce knowledge because the player used a tool or interacted with a source.

The backend should evaluate:

- what records were queried,
- what records were opened,
- what facts are derivable from those records,
- what facts have been discovered,
- what facts have been attached to a case,
- what decisions were made,
- and what later rules are triggered.

It should not primarily evaluate whether a selected option ID matches an answer key.

---

# 4. Full Shift Beat Sheet

The beat sheet defines **authored event availability**, not a forced click order.

Times below are relative simulated minutes. Exact pacing may be tuned after playtesting, but the dependency structure should remain.

## Phase A — Arrival and orientation

### T+00 — Shift begins

World state:

- player enters the SOC;
- Desk OS is available;
- handoff Work Item is queued;
- Morgan and Jules have their authored initial availability states;
- no central incident is yet demanding immediate action.

Player can:

- open Desk OS;
- inspect work queue;
- read messages;
- inspect handoff;
- look around the office;
- check routine systems.

Purpose:

- establish the workplace;
- introduce the queue without tutorial popups;
- make the shift feel already in progress.

### T+02 — Incomplete handoff becomes apparent

The player can discover that the handoff does not completely explain all current activity.

This is not presented as “find the missing clue.”

It is simply incomplete information.

Possible player responses:

- continue checking records;
- ask Morgan when available;
- note the uncertainty;
- ignore it temporarily.

### T+05 — Routine scanner work

A routine scanner Work Item enters the queue.

This item is intentionally lower stakes and teaches:

- acknowledging work;
- inspecting a system;
- recognizing that not every item becomes a major incident;
- moving a Work Item through a normal lifecycle.

The player can leave it temporarily without an immediate fail state.

## Phase B — Central signal enters

### T+10 — Alert A-1042 enters queue

Alert A-1042 becomes available.

Opening it reveals enough structured metadata to begin investigation, but not enough to resolve the case.

The player may now use relevant systems.

### T+11 onward — Authentication investigation available

Structured authentication records include the existing scenario entities, including:

- session S-0731;
- session S-0741;
- source IP 203.0.113.44;
- relevant account/timestamp/device context.

The player can:

- filter by user;
- filter by time;
- search by session;
- search by IP;
- open individual records;
- compare relevant records.

No query is marked “correct.”

Queries return deterministic matching records.

### T+12 onward — VPN investigation available

The VPN dataset includes the existing scenario VPN information, including V-218 and the relevant absence/presence relationships defined by canonical content.

The player may search by:

- user;
- IP;
- timestamp window;
- session/reference ID.

If a meaningful absence exists in authored data, the engine may derive a fact such as “no matching VPN session in queried interval” only when the player actually performs a query that establishes that absence.

### T+13 onward — Device inventory investigation available

The device dataset includes `unknown-laptop-17` and existing canonical ownership/enrollment information.

The player may search or open inventory records.

Discoveries are generated from the records examined, not from selected answer choices.

## Phase C — Human context and overlap

### T+17 — Morgan becomes available or responds

Morgan can provide bounded handoff context defined by authored facts.

If the player already asked Morgan a question, the response can arrive now.

If the player has not, Morgan simply becomes available.

The interaction should not hand the player the entire solution.

Morgan provides only the facts Morgan canonically knows.

### T+20 — Employee phishing report arrives

**Implementation status:** greenfield content. The current pack defines phishing action shells whose referenced artifacts do not exist and whose actions no progression offers; there is no functioning phishing workflow to re-author. The beat below describes the target, built on the Phase 2 query engine and Phase 5 decisions once they exist.

A separate employee report enters the queue.

Purpose:

- create overlap;
- require the player to manage a small amount of competing work;
- expose another normal SOC workflow;
- prevent the main case from feeling like an isolated puzzle.

The phishing item should be bounded and shorter than A-1042.

It may involve:

- opening the report;
- inspecting the message or metadata;
- searching a reference/KB entry;
- documenting or responding;
- routing or closing the report according to authored state.

### T+23 — Scanner item may update

If the earlier scanner Work Item was acknowledged, its normal follow-up may arrive.

If it was ignored, it remains in queue and may acquire a reminder state.

This should not produce a numeric penalty.

## Phase D — First operational judgment

### T+25 — Jules becomes available for status interaction

The player may brief Jules.

Jules's available dialogue intents depend on canonical state such as:

- whether A-1042 has been opened;
- what evidence has been discovered;
- whether the player has created case notes;
- whether another Work Item is pending;
- whether a decision has already been made.

Jules does not grade the player.

Jules may ask a realistic bounded follow-up such as whether a specific system has been checked if that information is absent from the case.

### T+28 onward — Decision actions become legal

Depending on current Work Item state, the player may take bounded actions such as:

- continue investigating;
- monitor;
- escalate;
- dismiss/close if legally available;
- request coworker context;
- update ticket first.

The backend does not show a “best” action.

It applies the action and updates canonical state.

### T+30–T+40 — Resume normal work

After a major decision, the simulation deliberately does not reveal the final meaning immediately.

The player returns to:

- phishing report;
- scanner item;
- ticket documentation;
- team messages;
- knowledge-base lookup;
- routine queue work.

This delay is important.

It breaks the quiz pattern where every decision is followed by immediate correctness feedback.

## Phase E — Delayed consequence

### T+40 onward — Branch-specific consequence becomes eligible

The next event depends on prior state.

Examples of allowed consequence patterns:

**If monitoring:**  
new related activity may produce a follow-up alert or new record.

**If escalated:**  
the case may enter an escalated state; Jules or another authored system may request supporting documentation or produce a follow-up message.

**If dismissed/closed:**  
later activity may reopen the case if canonical world truth warrants it, or the case may remain closed if the authored state supports that outcome.

The consequence is not labeled punishment or reward.

It is the next state of the workplace.

### T+43 — False-positive review appears (SHOULD-ship, Phase 0 decision)

A separate low-stakes review demonstrates that suspicious-looking alerts are not always malicious. It is SHOULD-ship rather than MUST: it teaches “unusual ≠ malicious” and prevents “always escalate” learning, but no content exists for it and the shift is coherent without it. If built, keep it small and reuse existing mechanics — no special discrimination system.

Purpose:

- avoid teaching “always escalate”;
- create contrast with A-1042;
- reinforce investigation over guessing;
- show that similar tools can support different outcomes.

### T+48 — Morgan/Jules follow-up opportunity

NPC interaction reflects what has happened.

Examples:

- Morgan answers an earlier pending question.
- Jules asks for a concise status.
- Jules requests the ticket be updated before handoff.
- A teammate acknowledges a completed routine item.

No dialogue may introduce new facts that are not already authored in deterministic state.

## Phase F — Closure and handoff

### T+55 — Queue begins stabilizing

No new major branch should begin after this point.

Open Work Items remain actionable.

The player should have time to:

- update documentation;
- attach relevant evidence;
- resolve routine items;
- review ticket state;
- communicate a final status.

### T+60 — End-of-shift handoff becomes available

The handoff is a work product, not a personality assessment.

It should summarize canonical state such as:

- active/open Work Items;
- actions taken;
- evidence attached to cases;
- pending follow-ups;
- current disposition;
- important unresolved uncertainty.

The player may add concise notes, but the system must not grade writing style.

### T+65 — Shift ends

The simulation closes the work period.

Any post-shift reflection/debrief remains secondary to the actual simulation and must not retroactively convert the shift into a scored test.

---

# 5. Five Mechanic Specifications

## 5.1 Queryable Records

### Player experience

The player opens a real-looking system and searches structured data rather than reading a static artifact that already contains the intended answer.

Supported beta operations should remain deliberately small:

- search by stable identifier;
- filter by one or more structured fields;
- apply a time window;
- open a record;
- inspect related references;
- clear filters.

No free-form query language is required for beta.

### Data/state required

Canonical state should include:

- structured datasets;
- query definitions;
- fields allowed for search/filter;
- player query history;
- records returned;
- records opened;
- current tool/filter state if persistence is desired.

### Deterministic backend behavior

The backend:

1. receives a canonical query action;
2. validates the query against the tool schema;
3. runs it against deterministic scenario data;
4. returns matching records in deterministic order;
5. records which records were made visible/opened;
6. evaluates whether any evidence-discovery rule became satisfied.

The backend does not choose “the correct record.”

### UI

Desk OS:

- search box or controlled filter UI;
- results table/list;
- record detail view;
- clear indication of current filters;
- stable record IDs;
- optional “attach to case” action.

Accessible renderer:

- equivalent filter controls and record list;
- no information loss.

3D:

- uses the same Desk OS work surface for record tools or canonical action wrappers.

### Acceptance criteria

- the player can discover central-case information without selecting answer options;
- the same query returns the same records on replay;
- irrelevant but plausible records may exist;
- no hidden answer-key fields reach the client;
- query order does not alter underlying truth.

**Implementation status (Phase 0):** the structured query engine is genuinely new. What exists today is the `kbQuery` free-text slot (an action effect stores the player's text; there is no query action, dataset schema, filter evaluation, result ordering, or query history) plus client-side filtering over serialized artifacts. Phase 2 builds the canonical query action, dataset schemas, deterministic filter/search, and query history.

---

## 5.2 Evidence Discovery

### Player experience

The player discovers useful facts by inspecting or correlating evidence.

Examples:

- a session has a specific source IP;
- a device is or is not associated with an expected account;
- a queried interval contains no matching VPN record;
- two records refer to the same session or timestamp;
- a coworker confirms a bounded handoff fact.

The UI may let the player save/attach a discovered fact, but should not show completion percentages.

### Data/state required

Define canonical **Evidence Facts** with:

- fact ID;
- statement or structured fact payload;
- provenance requirements;
- discovery rule;
- related Work Item IDs;
- visibility state;
- optional attachability;
- optional downstream consequence relevance.

Evidence facts are not “correct answers.”

They are deterministic propositions derivable from world data.

### Deterministic backend behavior

A discovery rule may require:

- opening one record;
- opening multiple related records;
- performing a query that proves presence or absence;
- receiving a specific authored dialogue fact;
- examining a KB/reference document.

**Absence-proof semantics (Phase 0 decision, binding for Phase 3):** an absence fact ("no matching VPN record exists") is a normal fact with a coverage provenance rule, not a special primitive and never an exact-query match. A stored query establishes the absence iff its normalized filters semantically cover the authored requirement — the required dimensions (e.g. account/user, source IP where applicable) plus a time interval ⊇ the authored window — and the result set contains zero qualifying records. Broader queries qualify; wrong-account or unrelated-interval queries do not. The runtime records normalized query, dataset, filters, result IDs, and sim time; the discovery rule evaluates coverage deterministically at most once per query.

When satisfied:

- mark fact as discovered;
- expose a player-facing phrasing of the fact;
- preserve provenance;
- make the fact attachable to the case.

### UI

Evidence may appear in a lightweight notebook or case sidebar.

Show:

- fact;
- source/provenance;
- related Work Item;
- attach/unattach control.

Do not show:

- “3/7 clues found”;
- “required clue”;
- hidden importance rank;
- “correct evidence.”

### Acceptance criteria

- discovery is caused by player interaction with canonical sources;
- facts have traceable provenance;
- evidence state is deterministic and replayable;
- absence-based facts require a query capable of establishing absence;
- the client cannot infer hidden undiscovered facts from serialized metadata.

**Implementation status (Phase 0):** no Evidence Fact or discovery-rule engine exists. The reusable provenance substrate is `observedArtifactIds` (global + per-event record-open tracking with observed-gated serialization) plus the source-quote gating pattern (submission requires opened sources; quotes withheld until observed). Assessment `EvidenceSignal` records behavioral signals per action and must NOT be confused with scenario Evidence Facts; the discovery store is a separate canonical domain (see §6.4).

---

## 5.3 Case Notebook and Ticket

### Player experience

The player maintains a working case rather than answering a summary question.

The case/ticket should support structured fields such as:

- title/incident reference;
- current status;
- affected account/entity;
- related sessions;
- related devices;
- attached evidence;
- disposition/action;
- short notes;
- pending follow-up.

The player should be able to create an imperfect but valid ticket.

### Data/state required

Canonical ticket state:

- ticket ID;
- linked Work Item IDs;
- status;
- structured entity references;
- attached evidence fact IDs;
- action/disposition;
- note text;
- timestamps;
- authoring history if needed for replay.

### Deterministic backend behavior

The backend validates only structural/legal constraints, such as:

- referenced evidence must have been discovered;
- referenced records must exist;
- status transition must be legal;
- required identifiers must be valid;
- action must be available in current Work Item state.

The backend must not grade prose semantically.

### UI

Desk OS:

- persistent ticket/case app;
- fields that accept canonical entity/evidence references;
- attach-from-evidence interaction;
- autosave or explicit save;
- clear status.

Accessible mode:

- form/list equivalent.

### Acceptance criteria

- the player can create/update the case without answering a multiple-choice summary;
- missing useful evidence does not cause a “wrong answer” screen;
- later NPC/consequence rules may react to ticket state;
- free text never becomes authoritative world truth.

**Implementation status (Phase 0):** deterministic free-text slots already exist and are canonical + replayed — `update_ticket_notes` writes per-event `ticketNotes`, `update_notebook` writes the global `notebook` string, and `build_summary` task completion synthesizes ticket text from selected option labels. These are usable foundations, not the target: no structured fields, status machine, evidence attachments, entity references, or transition legality exist. Phase 4 replaces `build_summary` synthesis with structured assembly while keeping the same canonical storage keys for replay continuity.

---

## 5.4 Stateful Decisions

### Player experience

The player makes operational decisions with incomplete but investigable information.

Possible actions include:

- continue investigating;
- monitor;
- escalate;
- dismiss/close where legal;
- request more context;
- defer while handling another Work Item.

The system executes the decision and lets the world continue.

### Data/state required

For each decision-capable Work Item:

- legal actions by state;
- preconditions;
- state transitions;
- scheduled consequences;
- conditional consequences;
- cancellation/supersession rules;
- NPC notification hooks;
- ticket updates if applicable.

### Deterministic backend behavior

An action:

1. validates legality;
2. records the action and simulated time;
3. transitions Work Item state;
4. updates any linked ticket/system state;
5. schedules consequences;
6. exposes only currently visible outcomes.

No score is calculated.

### UI

Actions should appear as workplace actions, not test answers.

Prefer labels such as:

- Escalate case
- Continue monitoring
- Close alert
- Ask Morgan
- Update ticket
- Review device inventory

Avoid labels like:

- Choose the best response
- Which action is correct?

### Acceptance criteria

- at least three central-case decision paths create different later state;
- decisions can have delayed effects;
- no immediate “correct/incorrect” response exists;
- the same decision at the same state/time yields the same consequence schedule.

**Implementation status (Phase 0):** staged decisions with workplace-style labels already exist (`escalate_alert`, `dismiss_alert`), and the delayed unconditional path works today (`dismiss_alert` reopens the case after 40 simulated minutes via `delayMinutes` + `escalateOnApply`). What is missing is conditional firing (predicates evaluated at fire time), cancellation/supersession, and typed operations beyond escalation. Phase 5 extends the existing scheduler; it does not replace it.

---

## 5.5 Workplace Interactions

### Player experience

Some information and actions occur through coworkers or physical workplace context.

Examples:

- ask Morgan about handoff;
- brief Jules;
- request clarification;
- receive a delayed reply;
- attend a short check-in;
- return from a break to a changed queue.

Physical presence should add embodiment, not exclusive evidence.

### Data/state required

For each NPC:

- canonical role;
- current availability;
- authored knowledge facts;
- conversation intents;
- intent preconditions;
- relationship to Work Items;
- pending messages;
- response timing;
- bounded phrasing templates or AI phrase slots.

### Deterministic backend behavior

The backend decides:

- which intents are available;
- what factual content the NPC may communicate;
- when a response occurs;
- whether the NPC is available;
- what state transitions result.

AI may only phrase an already-selected bounded content payload.

If AI is unavailable, deterministic fallback text must preserve identical facts.

### UI

3D:

- approach NPC and invoke canonical interaction;
- optional spatial context.

Desk-only:

- message/contact/call equivalent.

Accessible:

- list action with identical canonical action ID/outcome.

### Acceptance criteria

- no critical evidence exists only because of 3D navigation;
- NPCs never invent evidence;
- player can obtain equivalent canonical information in all renderers;
- NPC dialogue responds to world state without becoming an open-ended authority.

**Implementation status (Phase 0):** the AI phrasing boundary already holds (AI phrases bounded payloads; deterministic fallback exists; Jules is LLM-free and reads only the public client view). What does NOT exist is any NPC runtime model — no availability, intent contracts, authored fact projection into turns, or pending/delayed replies. `ask_manager` is a hardcoded effect branch, not an authored-intent pattern, and must be generalized rather than extended. NPC availability/intents are engine + schema work (Phase 6), with a schema-only intent sketch in Phase 1.

---

# 6. Scenario State Model

The backend remains the sole owner of canonical simulation state.

Canonical state follows the existing `WorldState` split: pack-derived content is snapshotted into `rules` per session (versioned with the scenario); mutable per-session truth lives in instance state. New mechanics respect that split: authored definitions (fact definitions, dataset rows, ticket defaults, consequence rules) live in content; discovery/decision/attachment state lives in instance state.

## Existing canonical state (reuse as-is)

- session identity, seed, `simClock`, pacing/session metadata;
- `events` (`EventInstance` list with per-event completion, observations, resolution);
- `rules` (pack snapshot: actions, event templates, tasks, notifications);
- `artifacts` + global `observedArtifactIds`;
- action history (sequenced action/task/notification/interaction log);
- `ticketNotes` (per-event free text), `notebook` (global free text), `kbQuery` (free text);
- `notifications` (status/snooze machine);
- consequence `ledger`;
- workplace/resource state (energy, break-room, Jules topics seen);
- hidden assessment numerics (never serialized).

## Extended state (Phase 1 / 5)

- `EventInstance` Work Item fields: acknowledgement state/time, priority/attention metadata, linked ticket ID, waiting/monitoring states, follow-up references;
- typed consequence entries (predicate, operation, cancellation refs) extending the existing ledger entry;
- safer client identity metadata replacing raw authoring keys (see §6.10).

## New state (Phases 2–4, 6)

- structured datasets + canonical query history (query action, normalized filters, result IDs, sim time);
- discovered Evidence Facts (fact IDs, discovery time, satisfied provenance, ticket attachments);
- structured tickets/cases (status machine, entity refs, evidence refs, disposition, history);
- NPC runtime (availability, authored knowledge projection, intent contracts, pending replies).

## 6.1 Session state

- scenario ID/version;
- deterministic seed if needed;
- simulated time;
- current phase;
- event/action log;
- renderer-independent session metadata.

## 6.2 Work queue state

For each Work Item:

- ID;
- type;
- status;
- createdAt;
- acknowledgedAt;
- resolvedAt;
- linked record IDs;
- linked ticket ID;
- legal actions;
- scheduled follow-up references;
- authored branch state.

## 6.3 Dataset state

- authentication records;
- VPN records;
- device records;
- alert records;
- ticket records;
- chat/messages;
- KB/reference entries;
- scanner records.

Most records are immutable scenario facts.

Records that simulate changing systems must change only through deterministic transitions.

## 6.4 Discovery state

- records queried;
- records opened;
- evidence facts discovered;
- provenance;
- evidence attached to tickets;
- authored knowledge made visible through NPC dialogue.

## 6.5 Decision state

- actions taken;
- simulated timestamp;
- Work Item transition;
- linked decision metadata;
- scheduled consequence IDs.

## 6.6 NPC state

- availability;
- current location/presence representation;
- known authored facts;
- pending responses;
- dialogue intents exposed;
- messages already delivered.

## 6.7 Documentation state

- ticket/case fields;
- evidence attachments;
- notes;
- status transitions;
- handoff state.

## 6.8 Resource/ambient state

Existing deterministic break-room or energy resources may remain if they serve atmosphere.

They must not become scores or career-fit signals.

## 6.9 Consequence scheduler state

The scheduler foundation exists: pending ledger entries with deterministic due times, evaluated once per action turn (`simClock >= dueAt` fires on the next turn — consequences may arrive late relative to their due time, never early). Phase 5 extends entries with condition predicates evaluated at fire time, cancellation/supersession refs, and typed operations; the firing loop itself is reused.

## 6.10 Derived client view

The serializer must expose only what the player is currently allowed to know. The observed-gating mechanism is the correct substrate: artifact bodies, metadata, and source quotes serialize only after the player opens the source.

Two authoring keys are explicitly NOT safe client metadata and must be resolved in Phase 1:

- `templateId` per event: strip from client events (or replace with an opaque client identifier). It lets clients join events to pack definitions.
- broad `relatedArtifactIds`: do not emit full related-record lists per artifact or task view — they pre-answer which records matter. Expose related records only in the context of the query or record view that legitimately surfaced them.

It must not serialize:

- undiscovered evidence definitions;
- consequence predicates;
- branch truth labels;
- hidden canonical outcomes;
- answer keys;
- authoring metadata that reveals what the player “should” do.

---

# 7. Structured Datasets

The shift should move from mostly static text artifacts toward small structured scenario datasets.

Every record needs a stable ID and deterministic relationships.

## 7.1 Authentication dataset

Suggested fields:

- record/session ID;
- user/account ID;
- timestamp;
- source IP;
- device ID;
- authentication method;
- result;
- location/network metadata if already supported by content;
- linked alert IDs where appropriate.

Must include existing scenario entities such as S-0731 and S-0741.

## 7.2 VPN dataset

Suggested fields:

- VPN record ID;
- user/account;
- start/end time;
- source IP;
- assigned VPN IP if applicable;
- device;
- session/reference identifiers.

Must preserve existing canonical V-218 content.

## 7.3 Device inventory dataset

Suggested fields:

- device ID;
- hostname;
- assigned user;
- managed/enrolled state;
- device class;
- last-seen metadata;
- relevant tags.

Must preserve `unknown-laptop-17` and existing canonical truth.

## 7.4 Alert dataset

Suggested fields:

- alert ID;
- created time;
- category;
- affected account/device;
- source references;
- state;
- severity/category if existing product rules permit;
- linked Work Item.

Must include A-1042.

## 7.5 Ticket/case dataset

Suggested fields:

- ticket ID;
- linked Work Items;
- status;
- owner;
- evidence references;
- entity references;
- notes;
- timestamps;
- disposition.

Player-created changes become part of canonical state.

## 7.6 Chat/message dataset

Suggested fields:

- message ID;
- sender;
- recipient/channel;
- simulated timestamp;
- authored semantic payload;
- visible text;
- linked Work Item/fact;
- read state.

AI, when used, may alter phrasing only, not semantic payload.

## 7.7 Knowledge-base dataset

Suggested fields:

- article ID;
- title;
- category;
- body/reference content;
- tags/search terms;
- procedure metadata;
- linked Work Item categories.

KB should help the player perform work, not contain a highlighted answer.

## 7.8 Scanner dataset

Suggested fields:

- scan ID;
- device/system;
- timestamp;
- finding/category;
- status;
- linked follow-up;
- related ticket/work item.

Scanner work provides routine occupational texture and interruption.

## 7.9 Data quality requirement

Datasets should contain:

- relevant records;
- benign comparison records;
- plausible but irrelevant records;
- enough surrounding context that search/filter feels real;
- no enormous synthetic corpus.

The goal is investigation texture, not scale.

---

# 8. Consequence Architecture

The consequence pipeline exists and ships delayed branches from content today: an action effect may carry an immediate description, a `resolve` transition with templated resolution text, artifact observations, and a `delayMinutes` consequence that fires deterministically once the simulated clock passes its due time (evaluated per action turn). The narrow delayed-escalation op (`escalateOnApply` + `escalateResolution`) is proven by the dismiss→reopen branch. Phase 5 extends — not replaces — this pipeline.

A **Consequence Rule** should conceptually define:

- consequence ID;
- trigger source;
- trigger time or delay;
- condition over canonical state;
- state mutations;
- emitted Work Item/event/message;
- optional cancellation condition;
- optional supersession rule.

## 8.1 Consequence types

Beta should support a small set. Of the list below, only resolve/reopen-via-escalation and message-equivalent descriptions exist today; the rest are Phase 5 typed operations on the extended ledger entry. Do not create a general-purpose scripting engine unless necessary.

1. **EnqueueWorkItem**
2. **UpdateWorkItemState**
3. **EmitRecord**
4. **SendMessage**
5. **ChangeNpcAvailability**
6. **UpdateTicketState**
7. **ReopenWorkItem**
8. **ResolveWorkItem**
9. **ExposeDialogueIntent**

Do not create a general-purpose scripting engine unless necessary.

## 8.2 Delayed consequences

A consequence may be scheduled for a later simulated time. Delayed unconditional consequences already work from content (`delayMinutes` → deterministic `dueAt`).

Example:

`decision at T+30 -> follow-up eligible at T+42`

Under the existing scheduler the follow-up fires on the first action turn whose clock reaches T+42 — possibly later than T+42, never earlier. Phases that need exact-time execution must extend the scheduler; the beta beat sheet is authored against next-turn firing.

The scheduler evaluates the authored condition at execution time. (Conditions themselves are Phase 5 scope; until then, only the due-time check exists.)

## 8.3 Conditional consequences

Phase 5 scope — no predicate evaluation exists today; the scheduler checks due time only. Once added, a consequence may depend on state such as:

- decision taken;
- evidence discovered;
- ticket updated;
- coworker contacted;
- Work Item still open;
- another event already resolved.

## 8.4 No consequence-as-grade

Consequences must be world events, not evaluation messages.

Bad:

> Incorrect. You should have escalated.

Good:

> A second related login alert enters the queue.

Bad:

> Great job. +10.

Good:

> Jules acknowledges the escalation and requests the attached evidence.

## 8.5 Replay requirement

Given:

- same scenario version;
- same initial state;
- same ordered actions with same simulated timing;

the consequence sequence must be identical.

---

# 9. Interruptions and Pacing

Interruptions are a primary tool for making the shift feel alive.

They must remain deterministic and non-reflexive.

## 9.1 Rules

- do not require fast clicking;
- do not fail the player for taking time to read;
- avoid more than approximately three meaningful unresolved items competing for attention;
- provide focused windows between interruptions;
- allow pending items to remain visible in the queue;
- use simulated time/state rather than wall-clock dexterity.

## 9.2 Interruption sources

Allowed beta sources:

- new alert;
- phishing report;
- scanner follow-up;
- Morgan response;
- Jules check-in;
- case follow-up;
- routine reminder.

## 9.3 Waiting as a mechanic

Some responses should be delayed.

The player should be able to continue other work while waiting.

Do not create literal idle waiting where the player has nothing to do.

## 9.4 Pacing target

The shift should alternate:

`focus -> interruption -> short routine item -> return to central case -> decision -> calm period -> delayed fallout`

This prevents the central case from behaving like a self-contained puzzle.

---

# 10. Mundane-Work Catalog

Mundane work creates authenticity when it changes context, state, pacing, or understanding.

Use a curated subset per shift.

## 10.1 Approved mundane interactions

- check overnight handoff;
- acknowledge a routine queue item;
- inspect a routine scanner result;
- respond to an employee report;
- check whether an alert already has an owner;
- update ticket status;
- attach a record to a case;
- search a KB article;
- send a short status update;
- wait for a coworker response while doing other work;
- close a benign routine item;
- review a false positive;
- update end-of-shift handoff;
- take a break;
- return from break to changed queue state.

## 10.2 Mundane-work rule

Every mundane action must satisfy at least one:

- reveals context;
- changes state;
- teaches a tool naturally;
- creates pacing;
- creates a later dependency;
- provides occupational texture at very low interaction cost.

If an action does none of these, remove it.

---

# 11. Morgan / Jules Interaction Model

Retain the existing canonical roles from the current content. The functions below define interaction responsibilities, not new job titles.

## 11.1 Morgan

Morgan primarily provides:

- handoff context;
- peer context;
- bounded answers about prior events;
- delayed responses;
- ordinary coworker interaction.

Morgan should not become an answer machine.

Morgan knows only authored facts assigned to Morgan.

Possible intents:

- Ask about handoff
- Ask whether Morgan saw a session/device/account issue
- Clarify prior shift context
- Share current finding
- Ask a narrow procedural question if authored

## 11.2 Jules

Jules primarily provides:

- status interaction;
- escalation contact;
- bounded guidance;
- requests for documentation;
- acknowledgement of actions.

Jules should not grade the player.

**Scope decision (Phase 0, binding):** Jules uses a narrow authored-intent model, not Morgan-depth knowledge. The beta Jules intents are exactly:

- Give status update (player briefs Jules; payload references current Work Item states);
- Escalate case (routes to the escalation decision path, never decides it);
- Ask what information is still needed (answered from canonical documentation state, e.g. missing ticket update — never a grade);
- Confirm process requirement (bounded, authored);
- Acknowledge a completed routine item.

Each intent is a canonical action ID with availability predicates over canonical state, an authored semantic payload, and deterministic fallback text. The existing deterministic peer replies become fallback/corpus text. Jules shares the generic NPC intent infrastructure with Morgan but needs no knowledge base of her own.

## 11.3 AI phrasing boundary

Canonical backend selects a semantic response object such as:

- intent;
- factual payload;
- allowed tone;
- linked fact IDs;
- required/forbidden claims.

AI may phrase that payload.

AI may not:

- add new facts;
- infer guilt/malice;
- create procedures;
- alter deadlines;
- change Work Item state;
- decide outcomes;
- reveal hidden evidence;
- assign scores.

## 11.4 Fallback

Every AI-phrasable response must have deterministic fallback wording.

The simulation must remain complete with AI disabled.

---

# 12. Desk OS Behavior

Desk OS becomes the main workstation, not a decorative shell.

## 12.1 Required beta tools

The exact app names may follow existing UI conventions, but the functions should include:

- Work Queue
- Alerts
- Authentication Records
- VPN Records
- Device Inventory
- Tickets / Case Notes
- Team Chat
- Knowledge Base
- Scanner / Monitoring

## 12.2 Persistent context

The workstation should preserve enough state that work feels continuous:

- current Work Item;
- open ticket;
- active filters where sensible;
- unread messages;
- queue state;
- case attachments.

Do not over-engineer full desktop window persistence if it does not improve the beta.

## 12.3 Cross-tool linking

Where possible, records should provide deterministic navigation such as:

- open linked session;
- search same IP;
- open linked device;
- attach record to case;
- return to Work Item.

Cross-linking should reduce UI friction without automatically performing the investigation.

## 12.4 No quiz chrome

Desk OS must not show:

- correctness indicators;
- clue counters;
- progress stars;
- answer validation;
- “try again” states.

Desk OS must also not leak authoring metadata that pre-answers investigation: no raw `templateId` values and no exhaustive related-record lists outside the record view that surfaced them (see §6.10).

## 12.5 Work queue prominence

The player should always be able to determine:

- what work exists;
- which items are open;
- which are waiting;
- which have follow-up;
- which are resolved.

This replaces linear next-question navigation.

---

# 13. Renderer Parity

The canonical simulation is renderer-independent.

The three renderers are:

1. 3D “walk the office”
2. Desk-only
3. Accessible/simple-list

## 13.1 Parity rule

Every career-relevant action must map to the same canonical action ID and backend result.

The renderer may alter presentation, not truth.

## 13.2 Examples

### Talk to Morgan

3D:
- walk to Morgan;
- choose canonical `contact_morgan` action.

Desk-only:
- choose Morgan in Team Chat/contact surface;
- invoke same canonical action.

Accessible:
- choose “Contact Morgan” from available actions;
- invoke same canonical action.

### Brief Jules

Same principle.

### Open record tool

3D may visually place the player at the workstation, but the record query itself is identical.

## 13.3 Time parity

A renderer must not grant a meaningful simulation advantage because it is faster to navigate.

If movement consumes simulated time, equivalent non-3D actions must consume the same canonical time cost or movement must be treated as presentation-only.

Stated asymmetry (accepted): 3D movement costs energy but zero simulated minutes, while investigative actions cost minutes. Movement is therefore presentation-only and can never buy time or evidence. If movement ever costs simulated time, desk/accessible equivalents must carry matching costs.

## 13.4 Evidence parity

No evidence fact may be discoverable only by:

- noticing a tiny visual prop;
- walking to a hidden area;
- camera manipulation;
- pointer precision.

All evidence must come from canonical actions.

---

# 14. Content-Authoring Model

The content pack should evolve from authored quiz steps into authored world data plus rules.

## 14.1 Primary content units

A scenario pack should be able to author:

- Work Items;
- structured records;
- evidence facts;
- discovery rules;
- NPC knowledge;
- dialogue intents;
- legal actions;
- state transitions;
- consequence rules;
- scheduled events;
- KB content;
- mundane-work items;
- handoff content.

## 14.2 Separate truth from visibility

Content must distinguish:

**World truth**  
What is canonically true.

**Player-visible records**  
What systems currently expose.

**Discovered evidence**  
What the player has actually established.

**Attached evidence**  
What the player chose to put in the case.

These are not the same thing.

## 14.3 No answer keys for new mechanics

New content should not require `requiredOptionIds` to determine success.

A record query or decision may have preconditions and effects, but should not be secretly validated as a multiple-choice answer.

## 14.4 Authoring readability

Pack authors should be able to understand a Work Item without reading engine code.

Definitions should be declarative and small enough to review.

Prefer explicit references and state transitions over embedded scripting.

## 14.5 Content validation

Build-time/runtime content validation should catch:

- duplicate IDs;
- missing references;
- impossible Work Item transitions;
- evidence facts with invalid provenance;
- consequence cycles where prohibited;
- inaccessible critical actions;
- renderer parity gaps;
- hidden-state fields accidentally marked client-visible.

The model extends the existing `CareerPackSchema.superRefine` cross-checks (event/action/artifact/task/notification references, source-quote exactness) rather than replacing them. Phase 1 adds: `observeArtifactIds` target validation, `instanceId` uniqueness, orphaned-action/undefined-artifact detection (the class of bug that left phishing dead), and trigger/deadline sanity. No generic scripting language is introduced; every new authoring construct is a declarative schema with a validator.

---

# 15. Old WorkTask Migration Strategy

Do not rewrite everything at once.

**Binding rule: migrating a workflow away from WorkTasks requires releasing/removing its canonical task gate. Merely hiding or removing its quiz UI is insufficient — `TaskRequiredError` blocks the underlying action until the bound task completes, so a hidden-but-gated action stays unreachable.**

## 15.0 Per-workflow migration protocol

For every workflow being migrated:

1. identify its legacy WorkTasks;
2. identify the canonical actions those tasks gate;
3. build the replacement interaction;
4. verify replacement state is canonical and replayed;
5. expose it in all required renderers;
6. release/remove the WorkTask requirement for the migrated actions (compatibility flag or binding removal — never a silent UI-only change);
7. maintain legacy task behavior only for still-unmigrated paths;
8. remove obsolete task definitions once no renderer or runtime path depends on them.

## 15.1 Compatibility period

Keep the existing WorkTask schema temporarily for:

- legacy pack compatibility;
- comparison during migration;
- non-primary content that has not yet moved.

## 15.2 New central path

The redesigned SOC shift should use Work Items and new mechanics for the primary experience.

Do not build new central-case content on `requiredOptionIds`.

## 15.3 Migration order

1. Inventory all current WorkTasks.
2. Classify each as:
   - convert to query/record interaction;
   - convert to evidence discovery;
   - convert to ticket/documentation;
   - convert to workplace interaction;
   - convert to stateful decision;
   - keep only as temporary legacy;
   - remove because it is redundant quiz content.
3. Re-author the central A-1042 investigation first.
4. Re-author routine scanner work (existing chain migrates to query mechanics).
5. Author phishing content greenfield on completed mechanics (no functioning workflow exists to re-author).
6. Author false-positive review only if SHOULD-ship budget allows.
7. Re-author handoff/summary as actual documentation state.
8. Delete or stop invoking superseded quiz steps.
9. Remove legacy support only after no beta path depends on it.

## 15.4 Legacy behavior

If legacy WorkTasks remain temporarily:

- they must not be expanded;
- they should not become the pattern for new work;
- they should be isolated behind compatibility code where practical.

---

# 16. Engine/Schema vs Renderer vs Content Split

| Capability | Core / Schema | Renderer UI | Content |
|---|---|---|---|
| Work Item state machine | Required | Queue/status views | Definitions, states, actions |
| Queryable records | Required | Search/filter/result UI | Dataset records |
| Evidence discovery | Required | Evidence/notebook UI | Fact definitions + provenance rules |
| Ticket/case builder | Required | Ticket UI | Initial ticket/work-item data |
| Stateful decisions | Required | Action controls/status | Preconditions + consequence rules |
| Delayed consequences | Required | Notifications/queue updates | Rule definitions |
| NPC knowledge/intents | Required | Chat/3D/list presentation | Authored facts/intents |
| AI-bounded phrasing | Required boundary | Dialogue display | Semantic payloads/fallback text |
| Interruptions | Scheduler required | Queue/notification UI | Timings/triggers |
| Mundane work | Usually existing/new Work Items | Existing tools | Mostly content |
| Renderer parity | Canonical action contracts | Required in all three | Content must reference canonical actions |
| Structured datasets | Schemas/query engine | Tool-specific UI | Majority of actual records |
| Handoff work product | State required | Handoff/ticket UI | Authored fields/rules |

## 16.1 Content-only work

Safe content-only tasks after mechanics exist include:

- adding records;
- writing KB articles;
- authoring messages;
- defining new Work Items using existing mechanics;
- authoring consequences supported by existing effect types;
- adding bounded dialogue payloads;
- tuning event timing.

## 16.2 Not content-only

The following cannot honestly be solved by YAML additions alone under the current architecture:

- true record querying (**new** engine);
- evidence discovery with provenance (**new** engine);
- structured case/ticket assembly (**new** engine + UI; free-text slots exist);
- multi-state consequences (**extension** of the existing scheduler: predicates, cancellation, typed ops — delayed unconditional scheduling already exists);
- delayed conditional branches (**extension**, same);
- renderer-independent workplace interaction contracts (**new** NPC intent contracts; AI phrasing boundary exists).

These require deterministic engine/schema support. Conversely, the following are explicitly NOT greenfield: action lifecycle, delayed unconditional scheduling, artifact observation, free-text notebook/ticket slots, notification/snooze behavior, replay, and the pack validation framework.

---

# 17. Test Strategy

Testing must prove both correctness and product guardrails.

## 17.1 Schema tests

Test:

- valid Work Items;
- invalid transitions;
- evidence provenance references;
- structured datasets;
- consequence rules;
- NPC intents;
- visibility metadata.

## 17.2 Core unit tests

Test reducers/effects for:

- Work Item transitions;
- record query results;
- discovery rules;
- ticket updates;
- decision legality;
- consequence scheduling;
- consequence cancellation/supersession;
- NPC availability;
- simulated time.

Phase-specific RED requirements build on the existing replay/serializer suites: Phase 1 must add Work Item projection shape, lifecycle + illegal-transition rejection, serializer no-leak (`templateId`, scoped related records), new pack-validation failures, gate-release on a migrated action, and replay equality; Phase 2 query determinism/ordering/invalid-filter/history/zero-result/hidden-data; Phase 3 undiscovered-initially, provenance-gated discovery, absence coverage, attach-undiscovered rejection; Phase 4 ticket transitions, attachment rules, free-text-cannot-alter-truth, `build_summary` retirement; Phase 5 conditional/cancel/supersede/typed ops plus the delayed-dismiss regression; Phase 6 availability, authored-knowledge-only, fallback, renderer equivalence.

## 17.3 Deterministic replay tests

Given a fixed scenario version and action sequence:

- replay final canonical state must match exactly;
- scheduled consequences must fire identically;
- record query results must match;
- discovered evidence must match.

This is a release-blocking invariant.

## 17.4 Hidden-state serialization tests

Assert that client views never contain:

- undiscovered fact definitions;
- branch labels;
- answer keys;
- future consequence predicates;
- hidden canonical truth;
- AI-only authoring metadata that leaks outcomes.

## 17.5 Renderer parity contract tests

For each canonical action:

- action ID exists in all required renderers;
- preconditions are identical;
- backend outcome is identical;
- required information is reachable in all renderers.

## 17.6 Scenario content tests

Validate that:

- every critical case can reach a valid completion state;
- no branch deadlocks;
- no critical evidence requires inaccessible actions;
- every scheduled branch has valid targets;
- end-of-shift handoff can be generated from canonical state.

## 17.7 End-to-end branch tests

At minimum test:

1. central case investigated deeply before decision;
2. early monitor path;
3. escalate path;
4. dismiss/close path where legal;
5. follow-up/reopen path;
6. phishing routine item;
7. false-positive review;
8. NPC interaction path;
9. accessible renderer completion.

## 17.8 Red-Green expectation

Each new mechanic phase should begin with failing tests that represent the desired state transition or invariant.

Implementation is not considered complete because UI “looks right.”

The core deterministic behavior must be proven first.

---

# 18. Phased Implementation Plan

The order matters. Do not dispatch large content/UI work before the canonical mechanics exist.

## Phase 0 — Freeze the design and audit current beta

**Owner type:** Senior reasoning/design

### Objective

Map current content and engine behavior to this spec.

### Tasks

- inventory existing WorkTasks;
- inventory canonical actions;
- inventory effect/consequence behavior;
- inventory current tools/renderers;
- identify which current artifacts become structured records;
- confirm existing Morgan/Jules roles and facts;
- identify all hidden-state serialization boundaries.

### Acceptance criteria

- migration matrix exists for every current WorkTask;
- no existing beta behavior is unclassified;
- conflicts between repo reality and this spec are documented before implementation.

---

## Phase 1 — Work Item + state foundation

**Owner type:** Senior design for schema; cheaper executor after schema is approved

### Objective

Extend the existing event model into Work Item semantics. No separate Work Item subsystem: "Work Item" is the product term, extended `EventInstance` the runtime.

### Required changes

- schemas (event status/field extensions);
- core reducer/state (compatibility, no behavior change for legacy paths);
- queue projection;
- legal action model (gate-release mechanism for migrated actions);
- client view (`WorkItem` projection; `templateId` strip; related-record scoping);
- deterministic event log (unchanged format);
- pack validation (`observeArtifactIds` targets, `instanceId` uniqueness, orphan detector);
- schema-only sketches for NPC intents, Evidence Fact definitions, datasets, ticket contracts (types only, no behavior);
- `rng.ts` wire-or-delete.

### RED tests

- Work Item lifecycle transitions;
- illegal transitions rejected;
- deterministic replay;
- hidden fields stripped.

### Acceptance criteria

- Work Items can be queued, acknowledged, updated, resolved (as extended events);
- multiple Work Items can coexist;
- client sees only legal current actions, without `templateId` or exhaustive related-record lists;
- legacy WorkTasks still function during migration;
- migrated actions demonstrably escape the legacy task gate while unmigrated ones stay gated.

---

## Phase 2 — Structured records + query engine

**Owner type:** Senior schema/API design; executor models for implementation after contract is frozen

### Objective

Enable actual investigation over scenario data.

### Required changes

- structured dataset schemas;
- canonical query action;
- deterministic filter/search engine;
- client record views;
- Desk OS query UIs;
- accessible equivalents.

### RED tests

- deterministic query results;
- invalid filters rejected;
- stable ordering;
- no hidden record fields exposed.

### Acceptance criteria

- player can investigate A-1042 using authentication/VPN/device data;
- search/filter replaces at least one current select-clues chain;
- same queries work across renderers.

---

## Phase 3 — Evidence discovery + notebook

**Owner type:** Senior design for discovery semantics; executor models after rules are explicit

### Objective

Turn investigation into persistent player knowledge with provenance.

### Required changes

- Evidence Fact schema;
- discovery rules;
- provenance tracking;
- notebook/evidence UI;
- attachability contract.

### RED tests

- fact not discovered before provenance condition;
- fact discovered after valid interaction;
- absence facts require appropriate query;
- hidden facts not serialized.

### Acceptance criteria

- central case can produce multiple evidence facts through actual investigation;
- evidence has sources;
- no clue counter/score exists.

---

## Phase 4 — Ticket/case work product

**Owner type:** Mostly executor after data contracts are approved

### Objective

Replace build-summary quiz steps with structured documentation.

### Required changes

- ticket state;
- evidence attachments;
- structured entity references;
- status/disposition;
- notes;
- Desk OS and accessible ticket UI.

### RED tests

- cannot attach undiscovered evidence;
- valid status transitions;
- notes cannot mutate world truth;
- replay preserves ticket state.

### Acceptance criteria

- player can build the A-1042 ticket from discovered evidence;
- incomplete but legal ticket can continue;
- no multiple-choice summary is required.

---

## Phase 5 — Stateful decisions + consequence scheduler

**Owner type:** Senior reasoning/design required

### Objective

Make decisions alter future world state — by extending the proven scheduler, not replacing it. First quick win after spec corrections: un-gate the existing staged decisions from quiz completion so the dismiss/escalate paths run on the new loop before deeper branches land.

### Required changes

- expanded deterministic effect model;
- conditional/delayed consequence scheduler;
- Work Item branch state;
- follow-up event emission.

### RED tests

- delayed event fires at authored simulated time;
- branch condition selects correct transition;
- same action history replays identically;
- canceled consequences do not fire.

### Acceptance criteria

- monitor/escalate/dismiss paths produce distinct later state;
- the simulation resumes before consequences appear;
- no score or correctness message is generated.

---

## Phase 6 — Workplace interactions + bounded dialogue

**Owner type:** Senior boundary design; executor models for renderer/content work

### Objective

Make Morgan/Jules part of the work loop without giving AI authority. Generalize the hardcoded `ask_manager` branch into authored intent contracts; Morgan first with availability + pending replies. Jules ships the narrow intent set decided in Phase 0 (status, escalate routing, process clarification, documentation request, acknowledgement) on the same infrastructure.

### Required changes

- NPC availability/state;
- authored knowledge;
- intent/action contracts;
- pending replies;
- deterministic fallback phrasing;
- 3D/desk/accessibility entry points.

### RED tests

- unavailable NPC cannot expose unavailable intent;
- NPC cannot return unauthored fact;
- AI-disabled fallback preserves semantic payload;
- same canonical interaction outcome in all renderers.

### Acceptance criteria

- at least one central-case fact/context exchange with Morgan;
- at least one status/escalation interaction with Jules;
- no critical information is 3D-only.

---

## Phase 7 — Re-author the full shift

**Owner type:** Senior content design for beat structure; cheaper executor models for well-specified content entry

### Objective

Convert current SOC content into the new loop.

### Order

1. handoff;
2. routine scanner item;
3. A-1042 central investigation;
4. authentication/VPN/device data;
5. Morgan interaction;
6. phishing report (**greenfield** content on completed mechanics, not re-author);
7. Jules interaction (narrow intent set);
8. central decision;
9. delayed branch consequence;
10. false-positive review (**only if SHOULD-ship budget allows**);
11. end-of-shift handoff (structured work product; `complete_shift` evolves into the handoff builder in Phase 4).

### Acceptance criteria

- primary shift path no longer depends on requiredOptionIds;
- central investigation uses multiple tools;
- at least one meaningful interruption occurs during investigation;
- at least one decision has delayed fallout;
- queue remains understandable throughout.

---

## Phase 8 — Renderer parity and UX polish

**Owner type:** Executor models with strict parity checklist; senior review

### Objective

Parity architecture already exists (shared derivation + canonical action IDs across all three renderers). This phase writes the missing per-action parity **contract tests** for every new mechanic, completes Desk OS usability, and removes quiz remnants — it does not build parity infrastructure.

### Tasks

- action parity audit;
- Desk OS usability;
- 3D interaction wrappers;
- accessible mode completion;
- notification/pacing polish;
- remove quiz remnants.

### Acceptance criteria

- full shift completable in all three modes;
- canonical event log equivalent for equivalent actions;
- no evidence or outcome depends on pointer/movement skill.

---

## Phase 9 — Beta hardening

**Owner type:** Independent review/audit

### Objective

Prove the new shift is deterministic, coherent, and within scope.

### Tasks

- branch E2E tests;
- hidden-state audit;
- replay audit;
- content validation;
- AI-off test;
- accessibility pass;
- playtest for pacing;
- remove dead legacy paths.

### Acceptance criteria

- no release-blocking determinism failures;
- no answer-key leaks;
- no central quiz steps;
- no unreachable critical content;
- beta cut line respected.

---

# 19. Beta Cut Line

The beta must be deep enough to prove the new interaction model without becoming a full SOC product.

## 19.1 MUST ship

- one deeply authored Junior Cybersecurity Analyst shift;
- Work Item queue/state;
- structured authentication records;
- structured VPN records;
- structured device inventory;
- alert records;
- query/filter tools;
- evidence discovery with provenance;
- case notebook/ticket;
- monitor/escalate/dismiss-or-close stateful actions where authored;
- delayed conditional consequences;
- Morgan bounded interaction (generalized intent contracts; hardcoded branch retired);
- Jules bounded interaction (narrow intent set: status, escalate routing, process clarification, documentation request, acknowledgement);
- phishing routine Work Item (**greenfield** content — no functioning workflow exists; action shells reusable as naming scaffolding);
- scanner routine Work Item;
- false-positive review (**SHOULD-ship**: include only if budget allows after core stabilizes);
- end-of-shift handoff work product;
- 3D/desk/accessibility parity;
- deterministic replay;
- hidden-state protection;
- AI-off fallback.

## 19.2 SHOULD ship if inexpensive after core is stable

- convenient cross-tool linking;
- richer message timing;
- minor ambient office interactions;
- small break-room state tie-ins;
- additional benign records for realism;
- a few optional dialogue intents.

## 19.3 Explicitly defer

- second career;
- multiple large incident scenarios;
- unrestricted SOC sandbox;
- natural-language query engine;
- semantic AI grading of tickets;
- autonomous AI NPCs;
- procedural generation of incidents;
- multiplayer;
- school-managed deployment;
- numeric scoring;
- career recommendations/rankings;
- movement-based performance;
- elaborate 3D authority expansion;
- large-scale record corpora;
- generalized workflow scripting language;
- voice acting/voice AI unless separately approved.

## 19.4 Scope rule

If a proposed feature does not materially improve:

- investigation,
- correlation,
- workplace interaction,
- documentation,
- decision consequence,
- or shift authenticity,

it should not block beta.

---

# 20. Guardrail Check Against Locked Rules

| Guardrail | Design response |
|---|---|
| Deterministic backend owns truth | All records, facts, Work Items, actions, time, consequences, NPC knowledge, and outcomes remain canonical backend state |
| AI only phrases bounded dialogue | AI receives preselected semantic payloads; fallback text always exists; AI cannot create facts or state |
| Renderer parity | All career-relevant actions map to canonical action IDs and outcomes across 3D, desk-only, and accessible modes |
| No movement-as-skill | Navigation cannot create unique evidence or better outcomes |
| No hidden-state leak | Serializer excludes undiscovered facts, branch rules, future consequences, answer keys, and canonical hidden truth |
| No scores | No points, ratings, grades, stars, skill scores, or career-fit values |
| No diagnosis/judgment | Simulation records actions/state without converting them into judgments about the player |
| Privacy | Existing reflection/privacy rules remain; free text is treated as user-authored content and not world truth |
| Replayability | Same scenario + same ordered actions/time => same canonical result |
| Age-appropriate | Content remains bounded to professional SOC activity without graphic or inappropriate material |
| Beta scope | One deep SOC shift; no second career, multiplayer, recommendation system, or large sandbox |
| Accessible equivalence | Critical work, evidence, and outcomes are available without 3D navigation |
| No AI-authored procedures | KB/process facts remain authored content |
| No AI-authored deadlines/outcomes | Timing and consequence scheduling remain deterministic |
| No answer-key gameplay | New primary mechanics use records, state, evidence, documentation, and consequences instead of requiredOptionIds |

---

# Canonical Implementation Principle

When implementation decisions are ambiguous, prefer the option that strengthens this loop:

**Work arrives -> player investigates real structured information -> player correlates evidence -> player interacts with the workplace -> player documents what they found -> player makes a bounded decision -> player returns to other work -> the world later changes because of that decision.**

Reject implementations that collapse back into:

**read text -> select intended answer -> receive correctness feedback -> advance.**

---

# Definition of Done for the Redesign

The redesign is complete enough for beta when a player can finish the SOC shift and the following statement is true:

> The player spent most of the shift using workplace tools, investigating structured records, managing overlapping work, talking to coworkers, building a case, making operational decisions, and responding to consequences — not selecting authored correct answers.

At that point the project has crossed the important threshold from a career-themed quiz into a bounded career simulation.

---

# Appendix R. Reconciliation Decision Registry (Phase 0, binding)

Recorded so future workers do not reopen settled architecture. Source: Phase 0 audit synthesis, verified against runtime.

- **R1 Work Item representation:** product term only; runtime is extended `EventInstance`. No parallel WorkItem store.
- **R2 Task-gate migration:** hiding quiz UI is not migration; each migrated action must release its `TaskRequiredError` gate (§15.0).
- **R3 Scheduler reuse:** delayed unconditional consequences exist; Phase 5 extends the firing loop with predicates/cancel/typed ops.
- **R4 Evidence Fact ownership:** definitions + provenance rules in pack content (`rules` snapshot); discovery state (IDs, time, provenance, attachments) in instance state. Never in assessment `EvidenceSignal`.
- **R5 False-positive:** SHOULD-ship, not MUST.
- **R6 Jules:** narrow authored intents on shared NPC infrastructure; no Morgan-depth knowledge; never a grader.
- **R7 VPN absence:** coverage-based provenance rule (account + IP + interval ⊇ authored window, zero rows), never exact-query match.
- **R8 Hidden metadata:** `templateId` stripped from client; `relatedArtifactIds` scoped per surfacing view, never exhaustive.
- **R9 Assessment ≠ scenario evidence:** `EvidenceSignal` stays behavioral; discovery is a separate domain.
- **R10 Phishing:** unimplemented; greenfield content, not re-author.
- **R11 Time asymmetry:** movement costs energy, zero minutes; accepted as presentation-only.

## Phase 1 Boundary (exact, for the implementation-plan author)

**Objective:** Work Item semantics on extended events, with legacy quiz coexisting but escapable.

**Included:** `EventStatus`/field extensions (`acknowledgedAt`, priority, `linkedTicketId`, follow-ups, `acknowledged/monitoring/waiting`); `WorkItem` serializer projection; `templateId` strip + related-record scoping; validation (`observeArtifactIds` targets, `instanceId` uniqueness, orphan detector, trigger/deadline sanity); `rng.ts` wire-or-delete; schema-only sketches (NPC intent, Evidence Fact definition, dataset, ticket); per-action gate-release mechanism.

**Excluded:** query engine, discovery runtime, ticket restructure, consequence predicates, NPC behavior, content re-author, quiz deletion.

**Runtime responsibilities:** additive event extension; unchanged legacy paths; preserved replay.

**Client responsibilities:** `WorkItem` projection; metadata cleanup; no new tools.

**Migration responsibilities:** compatibility flag/binding mechanism letting migrated actions escape `TaskRequiredError` while unmigrated actions stay gated.

**Validation responsibilities:** all Phase 1 pack checks above, failing loudly at load.

**Likely areas:** `packages/schemas/{world,events,client-view,tasks,career-pack}.ts`, `packages/core/{serializer,world,availability}.ts`, `packages/core/test/*`.

**RED tests:** projection shape; lifecycle + illegal-transition rejection; no-leak serializer; validation failures; gate-release on a migrated action; replay equality.

**GREEN acceptance:** RED green, full suite green, no guarantee weakened, legacy shift fully playable.

**Compatibility:** legacy shift functional until workflows migrate, one workflow at a time.

**Phase 2 handoff:** frozen sketch types + `WorkItem` projection shape + cleaned visibility contract.
