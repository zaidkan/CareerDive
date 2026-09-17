# SOC Interactivity Playtest and Acceptance Pack

Status: Manual playtest + acceptance-test pack derived from the canonical design target `interactivity-and-content-depth-design.md`.

## Purpose and ground rules

This pack turns the canonical design target into concrete scenarios that humans can
run manually and later automated E2E tests can encode. It is deliberately
implementation-agnostic.

- It describes the target experience only. It makes no claim about what is
  currently implemented, and scenarios may legitimately fail today.
- It assumes no Phase 0 audit result, no existing schema, and no existing UI.
- When a scenario names a concrete artifact (A-1042, S-0731, S-0741,
  203.0.113.44, V-218, unknown-laptop-17, Morgan, Jules), it uses the canonical
  spec's own entities, not current code.
- Each scenario carries its own Preconditions, Player actions, Expected observable
  behavior, Forbidden behavior, and Pass criteria.
- "Observable" always means something a tester can see in the UI, a queue, a
  record view, a message, or a post-shift summary. Hidden state is never the
  oracle; the tester never inspects internals.
- Where the spec permits alternate orders, this pack marks ordering as flexible
  rather than inventing a mandatory sequence.

## How to run a scenario

1. Start a fresh session of the SOC shift from the beta entry point.
2. Note the renderer used (3D "walk the office", Desk-only, or Accessible
   simple list). Every scenario in section 1 must pass in all three unless the
   scenario says otherwise.
3. Execute the player actions in the listed order unless the scenario marks the
   order as flexible.
4. Record observed behavior against Expected and Forbidden lists.
5. A scenario passes only when every Pass criterion holds and no Forbidden
   behavior was observed.

## Terminology

- **Work Item**: a piece of simulated work with a stable identity and status
  (spec section 3.1). A queue entry, alert, report, or routine task.
- **Queue**: whatever surface the renderer exposes for seeing current Work Items
  (Work Queue app, alert list, accessible action list).
- **Record tool**: any searchable structured system (authentication records, VPN
  records, device inventory, scanner records).
- **Case/ticket**: the player-maintained work product for the central case.
- **Evidence/fact**: a discovered statement with provenance, shown in a
  notebook/sidebar/attachment list.
- **Decision**: a bounded stateful action on a Work Item (monitor, escalate,
  close/dismiss, request context).
- **Consequence**: any later world change (new item, record, message, state
  change) caused by an earlier action. Consequences arrive as world events, never
  as grade feedback.

---

# 1. Core Experience Acceptance Tests

Each scenario below proves one slice of the canonical work loop
(Queue -> Investigate -> Correlate -> Interact -> Document -> Decide -> Resume ->
Consequence). Unless stated otherwise, run each scenario in all three renderers
and expect the same canonical behavior.

## CE-1 Work arrives through a queue

**Preconditions**
- Fresh shift session, Phase A (around shift start, before the central alert is
  due).
- No prior actions taken.

**Player actions**
1. Enter the shift and reach the workstation (or its desk-only/accessible
   equivalent).
2. Open the queue surface.
3. Observe the initial set of Work Items.

**Expected observable behavior**
- At least one Work Item is present at shift start (the handoff item, per the
  beat sheet T+00) and is visible in the queue.
- Each visible item shows enough to identify it: a stable name/ID and a status
  or state.
- The queue distinguishes items that are open/waiting/resolved in some visible
  way.
- Work that arrives later in the shift (scanner item at T+05, alert A-1042 at
  T+10, phishing report at T+20) appears in the queue without the player
  refreshing or restarting anything.

**Forbidden behavior**
- The queue presenting items as questions with correct/incorrect options.
- Items appearing only after a quiz-style prompt is answered.
- A tutorial popup gating access to the queue.

**Pass criteria**
- The tester can name every open Work Item and its rough status from the queue
  alone.
- At least one item arrived during the shift without player action (evidence
  the world produces work, not a static list).

## CE-2 Investigation crosses multiple systems

**Preconditions**
- Alert A-1042 is available in the queue (beat sheet T+10 onward).
- Authentication, VPN, and device record tools are reachable.

**Player actions**
1. Open A-1042 from the queue and read its visible metadata.
2. Open the authentication records tool and look up the sessions referenced by
   the alert (S-0731, S-0741, IP 203.0.113.44).
3. Open the VPN records tool and search the relevant interval/user.
4. Open the device inventory tool and look up the referenced device
   (unknown-laptop-17).

**Expected observable behavior**
- A-1042 exposes structured metadata (account/session/time references) that
  gives the player something to search for; it does not contain the full answer.
- Each record tool accepts search/filter by identifier or field (for example by
  session ID, IP, user, or time window) and returns matching records in a
  deterministic list.
- Opening a record shows its fields; the player can correlate fields across
  tools (same session/IP/device appearing in different tools).
- Information needed for the central case is distributed: no single tool shows
  everything.

**Forbidden behavior**
- Any tool returning a "correct" record highlighted as the answer.
- A record tool that is just static text with the conclusion already written.
- A counter such as "3/7 clues found" or any completion percentage.

**Pass criteria**
- The tester obtained central-case-relevant information from at least three
  different tools (authentication, VPN, device) without ever selecting an
  authored answer option.
- Repeating the same search returns the same results (spot-check by repeating
  one query).

## CE-3 Player chooses investigation order

**Preconditions**
- A-1042 is available; authentication, VPN, device, and handoff sources are
  all reachable (T+10 onward; Morgan becomes available around T+17).

**Player actions**
1. Run the investigation in this deliberately awkward order: device inventory
   first, then VPN, then authentication records, then ask Morgan about the
   handoff.
2. Start a second fresh session and invert the order: Morgan first, then
   authentication, then VPN, then device.

**Expected observable behavior**
- Every source works regardless of when it is consulted; no tool refuses
  because another tool was not used first.
- Examining the same underlying record in either session yields the same
  content (for example, the same session record, the same VPN presence/absence
  result, the same device enrollment state, the same Morgan facts).
- Discovered facts from the first session and the second session match when the
  same sources were examined.

**Forbidden behavior**
- A tool or action being locked behind an invisible "you must first do X"
  state that is not itself a visible workplace condition.
- Discovered facts differing between the two orders for the same sources.
- The simulation steering the player back to one mandated order with
  "try another choice" style feedback.

**Pass criteria**
- Both orderings reach the same set of discovered facts for the same sources.
- The tester never encountered a dead end that forced one exact order.

## CE-4 No correct/incorrect feedback anywhere

**Preconditions**
- Any session state; this scenario runs continuously during every other
  scenario.

**Player actions**
1. Perform a mix of strong and weak work: open many records, run a useless
   search, attach a partially relevant fact, decide to monitor early, decide
   to escalate later.
2. Throughout, watch every response surface: queue entries, record results,
   ticket saves, NPC replies, notifications.

**Expected observable behavior**
- Legal actions execute and simply change state (item status, ticket content,
  new messages, later records).
- Consequences are phrased as workplace events, for example "a second related
  login alert enters the queue" or "Jules acknowledges the escalation and
  requests the attached evidence".
- The false-positive review item (T+43) demonstrates that a suspicious-looking
  alert may be benign through the same tools, without ever labeling the
  player's earlier suspicion wrong.

**Forbidden behavior**
- Any UI text or state named or behaving like: Correct, Incorrect, Try again,
  Wrong choice, You missed a clue, or an equivalent.
- Points, stars, grades, percentages, ratings, progress meters over the case,
  or any numeric score.
- Any surface implying a specific action was the "intended" one.

**Pass criteria**
- The tester completed an entire session without ever seeing correctness
  language for a work action.
- Consequences arrived as workplace events with workplace language.

## CE-5 Imperfect but legal decision lets the shift continue



