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

## Test IDs and result-recording convention (for Phase 7-9 reuse)

- Every scenario keeps its stable ID (`CE-1`, `PT-FULL`, `PT-BRANCH-A/D/V/M`,
  `PT-QUIZ`, `PT-MUNDANE`, `PT-PACE-1..4`, `PT-MORGAN`, `PT-JULES`,
  `PT-ABSENCE`, `PT-FP`, `PT-DOC`, `PT-CONS`, `PT-PARITY`, `PT-A11Y`).
- Tag each run with renderer (`3D` / `Desk` / `Accessible`) and build under test.
  Section 1 scenarios must pass in all three unless the scenario says otherwise.
- Record one line per run: `ID | renderer | PASS/FAIL/PENDING | observed vs
  Expected | Forbidden hits (surface + exact text) | notes`.
- Mark `PENDING SUPPORTING CONTENT` when the build lacks rows the fixtures doc
  still flags PROPOSED (currently: A-1204 cluster, phishing bodies, handoff
  fields). Do not invent stand-in facts; log the gap in Appendix A instead.
- Mark `CONTENT GAP: ...` inside Appendix A only. Never edit the content pack
  or fixtures to satisfy a test.
- Fixture cross-reference: `soc-structured-record-fixtures.md` owns row IDs
  (`AUTH-*`, `V-*`, `D*`, `AL-*`, `PH-*`, `SC-*`, `MORGAN-CTX-01`); this pack
  only names them as test inputs. Pack `pack.yaml` owns truth; fixtures own
  rows; this doc owns pass/fail.

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

**Preconditions**
- Central case investigated to the point where monitor, escalate, and close/dismiss are all legal options (beat-sheet T+28 onward).

**Player actions**
1. In one session, take a thin escalation: escalate with minimal attached evidence.
2. In a fresh session, choose monitor with a stated re-surface condition instead.
3. In a third session, close/dismiss with a recorded reason.
4. In each session, continue working routine items afterward.

**Expected observable behavior**
- Every legal decision executes and routes the case (monitoring/waiting, escalated, closed states visible in queue/ticket).
- Thin escalation is accepted and later returned with specific evidence requests (auth history, device record, VPN check), phrased as workplace follow-up.
- Monitor produces a visible waiting state with its re-surface condition; later related activity, if authored, re-surfaces the case with history intact.
- Close records the reason; the case stays closed unless authored follow-up activity reopens it with history preserved.

**Forbidden behavior**
- Any decision ending the shift, locking the queue, or showing "wrong answer, try again".
- Thin work punished with tone, scores, or blocked progress instead of a concrete professional request.

**Pass criteria**
- All three sessions continue to handoff; handoff reflects each session's actual states and open questions.
- No correctness language appeared for any decision.

---

# 2. Full-shift manual playtest (PT-FULL)

One complete session proving the shift feels like work. Order below is the default walkthrough; §3 proves alternate orders are equally valid. Do not require exact click order except where a precondition genuinely exists (e.g. attach requires discovery first).

| Beat | Starting state | Player can do | Expected canonical result | What must NOT happen |
|---|---|---|---|---|
| 1. Arrival / handoff | Fresh shift, T+00 | Open handoff note, read night analyst gaps (open login thread, unfinished device check, missing scanner ref) | Gaps understood; no verdict offered | No tutorial popup gating queue; no answer required to proceed |
| 2. Queue review | Handoff read | Open queue, name open items and statuses, note severity/age order | Queue legible; priorities visible | Queue as quiz options; hidden items appearing only after a prompt |
| 3. Routine scanner work | Scanner context reachable (T+05) | Open A-1180 + run RUN-FIN-031 + window SCAN-FIN-MON + delay memo; compare event time vs delivery, scope, coverage cap; attach refs; note; close `routine-alert-1` | Routine closes as authorized scan with reason; ~5–10 min sim cost | Forced escalation path; numeric penalty for deferring |
| 4. A-1042 arrival | T+10, alert in queue | Open A-1042, read structured metadata (account, window, source, session refs) without full answer | Enough to start searching; nothing resolved | Highlighted "important evidence"; clue counter increment |
| 5. Auth investigation | A-1042 opened | Filter auth by user/time/session/IP; open S-0731 vs S-0741, fail burst, refresh row; compare baseline rows | Sequence + baseline + password/MFA distinction + refresh limit established | Single screen resolving case; "correct query" steering |
| 6. VPN / device correlation | Auth rows examined | Device exact-label lookup (D3 vs D1/D2, D6 near-miss, D7 unrelated); VPN catalogue + covering query (user, window ⊇ 07:25–07:45, source); employee report + HR coverage limit read | Enrollment state, route match for S-0731, absence subject for S-0741, report-not-proof + coverage limits | Morgan supplying enrollment/absence as own finding; absence claimed without query |
| 7. Morgan interaction | Partial evidence (≥1 record beyond alert) | Ask about handoff or specific mismatch; receive at most one bounded detail or procedural pointer per exchange | Context or verb pointer; player still verifies in records | Morgan verdict, decision recommendation, hidden evidence, required gate before progress |
| 8. Interruption | Mid-investigation, T+20 phishing arrival | Acknowledge report, park A-1042 with notes, triage phishing sub-step or defer | Both items preserved; no focus steal; deferred item waits unchanged | Forced switch; lost notes; repeated nudges; fake urgency |
| 9. Jules interaction | A-1042 open, T+25 | Brief status; receive acknowledgement or ticket-currency request | Status recorded; documentation request if thin; no grade | Correctness check; hidden-evidence hint; "you should escalate" |
| 10. Documentation | Evidence discovered | Write timestamped notes (facts, record IDs, gap, next check); attach discovered refs only; amend earlier note if revised | Ticket assembles visibly; history shows corrections without penalty | Semantic prose grading; undiscovered refs attachable; free text altering world truth |
| 11. Operational decision | T+28, decision legal | Monitor with condition, escalate with package, or close with reason | State routes; what-happens-next text; no best-action label | "Correct/incorrect" screen; score change |
| 12. Return to routine work | Decision recorded, T+30–T+40 | Queue re-check, finish scanner/phishing sub-step, KB skim, monitoring state visible | Calm housekeeping stretch; no immediate reveal | Instant final meaning; dramatic beat stacked on decision |
| 13. Delayed consequence | Past decision, T+40+ | Consume follow-up: clean ack, returned evidence requests, re-surfaced activity, or quiet monitor | World event with workplace language; history intact | "You chose correctly/wrongly" screen; points |
| 14. False-positive review | T+43, if shipped | Open A-1204, check enrolled + MFA-complete + route-matched rows, close expected/verified with reason | Benign close via same verbs; smaller than A-1042 | Field saying "false positive"; forced escalation; scoring |
| 15. Final handoff | T+60 | Review opens, update tickets, write handoff fields (holders, actions, evidence, follow-ups, disposition, uncertainty), end shift | Next shift could continue from note alone; shift ends mid-story if items open | Prose grading; renderer-specific debrief; score summary |

Pass = every beat's Expected holds and no Must-NOT observed, in the renderer under test.

# 3. Branch-path acceptance tests (PT-BRANCH)

Each path starts at A-1042 arrival with all tools reachable. Each must reach the same underlying scenario truth (facts 1–12 subject to Section 12 coverage rules in the content pack) without the same order. Test information availability, state progression, documentation, decision availability, and no hidden-answer dependency.

## PT-BRANCH-A — Auth-first

Player: A-1042 → auth filter (user/time/session/IP) → S-0731/S-0741/fail-burst/refresh + baseline → device lookup → VPN covering query → employee report + HR limit → ticket → decision. Expect: sequence/baseline/MFA distinction first; device/VPN/travel close the gaps; decisions unlock on ticket + state, never on path identity. Fail if device or VPN tools refuse before auth, or if auth alone resolves the case.

## PT-BRANCH-D — Device-first

Player: A-1042 → device pivot (unknown-laptop-17 → D3; D1/D2 compare; D6 retired excluded; D7 unrelated) → auth history → VPN query → reports → ticket → decision. Expect: enrollment-absent + coverage limit + exact-label discipline first; burst/route/travel still require their own opens. Fail if enrollment result auto-fills auth/VPN findings or pre-answers the case.

## PT-BRANCH-V — VPN-first

Player: A-1042 → VPN catalogue (V-218 for S-0731; V-219/V-217/V-214 neighbors) → covering query for (j.patel, window ⊇ 07:25–07:45, 203.0.113.44) → zero-row absence subject → auth + device + reports → ticket → decision. Expect: route-matched vs absence-subject distinction first; catalogue alone never identifies who, what device trust means, or what was accessed. Fail if absence fact appears before the query, or if catalogue names a verdict.

## PT-BRANCH-M — Morgan-after-partial-evidence

Player: A-1042 + ≥1 record → Morgan handoff/mismatch question → at most one bounded detail or pointer per exchange (prior-shift observation, unfinished check, procedural pointer) → open the pointed-at records → ticket → decision. Expect: Morgan reframes without resolving; enrollment/absence/travel findings still require player record opens; Section 14 fallback payloads fact-equal with AI disabled. Fail if Morgan supplies unenrolled state, asserts VPN absence, reveals travel truth, recommends a decision, or gates any query.

Branch pass criteria (all four): same discovered-fact set for same sources regardless of order; same decision options available at same ticket/state; documentation accepts the same refs; no path-exclusive information, clock advantage, or hidden flag.

# 4. Anti-quiz tests (PT-QUIZ — failure criteria)

Run continuously across every other scenario. The playtest FAILS if any of these appear for a work action:

1. Required-option answer sets: any interaction whose legality depends on matching a hidden `requiredOptionIds`-style key rather than visible workplace preconditions (record exists, fact discovered, status legal).
2. "Correct / incorrect" feedback: Correct, Incorrect, Try again, Wrong choice, You missed a clue, or equivalents in UI text, notifications, NPC replies, or handoff/debrief.
3. Clue counters: "N/M clues found", completion percentages, progress stars/meters over the case, "required clue" markers, hidden importance ranks.
4. Highlighted "important evidence": visual/typographic marking that pre-identifies which records matter before the player investigates (exhaustive related-record lists, answer-colored rows, beacon/pulse on the key record).
5. Secret required investigation ordering: a tool refusing with no visible workplace reason until another tool is used first; success possible in only one order.
6. Forced NPC hint before progress: any query/decision disabled until Morgan/Jules dialogue is consumed.
7. Arbitrary hacking minigames: timing/reaction/drag/memory/cable/fake-terminal/typing-speed interactions standing in for search, compare, attach, document, decide.
8. Movement/pointer skill affecting outcome: evidence, verdicts, timing, or debrief changing with navigation speed, path, camera, hover precision, or hotspot visit order.
9. Numeric performance score during the shift: points, grades, percentages, ratings, hidden meters exposed later, career-fit numbers.

Each check: name the surface checked (queue, record tool, ticket, NPC reply, notification, handoff, debrief). Any single hit fails the build under test.

# 5. Mundane-work acceptance (PT-MUNDANE)

Each item must contribute context, pacing, state, or a later payoff — otherwise it is busywork and must be cut.

| Check | Player does | Value contributed |
|---|---|---|
| Read handoff | Open predecessor notes | Context + dependency: two named threads recur later |
| Acknowledge queue item | Mark routine seen/owned | State: gates follow-up scheduling; pacing |
| Inspect scanner run/window | Compare event/delivery time, scope, coverage | Learning: event-vs-delivery + scope-bound closure habit |
| Update ticket notes | Timestamped note with record IDs + gap + next check | State: escalation package + handoff readability; correction history |
| Answer reporter | Bounded no-blame reply, confirm receipt | Realism + context: reporter anxiety handled; security workflow still waits its turn |
| Check KB/process guidance | Search runbook for alert type | Learning: checking procedure is professionalism; points at verbs not answers |
| Return to queue after investigation | Re-sort severity-then-age | Pacing + skill: prioritization visible; parked work resumed |
| Monitor while doing other work | Set watch with re-surface condition; work routine items | Decision texture: restraint under uncertainty; waiting worked around |
| Produce handoff notes | Fields per §15/§22 of this pack | State: next shift continues without re-work |

Pass = tester performed each reachable item at least once per shift and can state what it changed or taught.

# 6. Interruption / pacing tests (PT-PACE)

## PT-PACE-1 — Interruption arrives during A-1042

Setup: A-1042 mid-investigation with partial notes. Trigger: phishing report (T+20 shape) or scanner follow-up (T+23 shape). Player may acknowledge, defer, switch, or return later — all legal. Verify: original notes/evidence/filters intact on return; queue shows both items with correct states; at most one reminder per deferred item; no input-focus theft; no forced switch. Fail on lost state, repeated nudges, or fake urgency.

## PT-PACE-2 — Jules asks for status

Setup: T+25 with A-1042 open. Verify: status describable honestly at any completeness level ("opened", "comparing sessions", "ready to decide"); Jules acknowledges and at most requests ticket currency; Jules reveals no hidden evidence, names no unopened record findings, recommends no decision, assigns no grade. Fail on grading language, hints, or decision-making for the player.

## PT-PACE-3 — Scanner follow-up arrives

Setup: A-1180 acknowledged in one session, ignored in another. Verify: follow-up arrives only in the acknowledged session; ignored session shows at most one visible reminder state; neither session shows numeric penalty; follow-up never steals focus (queue entry + announcement, never modal lock). Fail on focus steal, repeated reminders, or gating differences.

## PT-PACE-4 — Delayed consequence becomes due

Setup: post-decision, player handling another Work Item when due time passes. Verify: consequence arrives as world state (queue entry, message, record, NPC follow-up with workplace language); consumable from queue/updates list; original decision context (ticket history) referenced, not graded. Fail on "you chose correctly/wrongly" screens, scores, or toast-only delivery with no persistent entry.

# 7. Morgan interaction tests (PT-MORGAN)

Uses authored Section 14 content in the content pack. Morgan knows `alert-visible` + handoff + runbook pointers only; never private travel, verdicts, hidden evidence, or future phases.

| Case | Canonical state | Probe | Must hold |
|---|---|---|---|
| Too early | Before opening A-1042 records | Ask about case | No S-0741/IP/device detail beyond handoff; redirect to alert + history; fallbacks M-EARLY-1/2 fact shapes |
| After auth | Fail burst + S-0741 opened | Ask about pattern | Bounded prior-shift observation ("checked time only"), partial-memory qualifier; no who/verdict/decision; M-AUTH shapes |
| After device/VPN | Inventory + catalogue/covering query opened | Ask about device/route | Coverage/procedure pointers only (exact label; compare ID + address; city ≠ route); enrollment/absence results NOT supplied as Morgan findings; M-CORR shapes |
| After action | Ticket/escalate/monitor/close taken | Notify of action | Operational acknowledgement (readability, receipt, restraint-blessing, close-recorded); never correct/wrong/praise/blame; M-ACT shapes |

Deterministic fallback: with AI phrasing disabled, every response above must still deliver the same facts with the same forbidden claims absent. Fail on invented facts, procedures, deadlines, verdicts, hidden reveals, grading, or multi-turn trees (more than one fact or two exchanges to payload).

# 8. Jules tests (PT-JULES)

Jules intents only: status update, process clarification, escalation request, documentation reminder, routine acknowledgement, end-of-shift handoff. Jules defers case decisions to Morgan/senior review.

| Case | Setup | Verify |
|---|---|---|
| Status update | A-1042 opened | Acknowledges stated status + queue reminder (J-STATUS-1 shape); no grade |
| Process clarification | Any | Points at requirement ("which records are you attaching?"), lets player satisfy it; no answer supplied |
| Escalation request | Ticket with refs (and thin-path variant with ~none) | Complete → clean receipt; thin → specific evidence requests (device? route? history?); routes to escalation path, never decides case |
| Documentation reminder | Decision/escalation pending, notes thin | Process enforcement as care for next shift (J-DOC-1); no block on investigation |
| End-of-shift handoff | Handoff available | Confirms receipt + names remaining opens from state (J-HAND-1); updates handoff product |

Jules must never act as correctness checker, answer source, evidence oracle, or career evaluator. Fail on scores, "correct", hidden reveals ("you'll want to look at…"), decisions made for the player, invented procedure/deadlines, or disappointed/praising tone — consequence is always a concrete professional request.

# 9. VPN absence test cases (PT-ABSENCE)

Canonical absence semantics: a stored query establishes absence iff normalized filters semantically cover the authored requirement — required dimensions (account/user, source IP where applicable) plus a time interval ⊇ the authored window — with zero qualifying records. No secret exact query string.

| Case | Query | Must hold |
|---|---|---|
| Valid broad query | Covers (user=j.patel, source=203.0.113.44, window ⊇ 07:25–07:45), checks ID + address | Eligible as absence provenance later (engine decision); empty state suggests next verbs, never reads as failure |
| Too-narrow query | Window ⊂ required (e.g. 07:39–07:40 only) | Must NOT establish absence, even with zero rows |
| Wrong-account query | Same window/IP, different user | Must NOT establish absence |
| Broader valid interval | Window ⊃ required (e.g. whole morning) with same dimensions, zero qualifying rows | Still counts (broader queries qualify) |

Also verify: reading the A-1042 sentence claiming "no prior successes from this ASN" restates the claim without establishing it — player must run/open the history-wide filter. Fail if absence appears without a query, if exact-string matching is required, or if personal-VPN out-of-scope caveat is missing where the conclusion is shown.

# 10. False-positive playtest (PT-FP)

Compact case around proposed A-1204 (c.okonkwo, unseen residential IP, "Chicago" estimate vs Toronto) if content/fixtures support it. Fixture cluster (fixtures §4a, all PROPOSED SUPPORTING RECORD): `AL-3 A-1204` + `AUTH-0915-OKONKWO-CHI` (S-0915, V-217, enrolled device, extra check done, zero prior fails) + `V-215` (prior-week precedent, same user/connection/exit) + catalogue `V-217` + `D4 corp-macbook-okonkwo` + `MORGAN-CTX-01` (one delayed coworker fact, report not proof). If the build under test lacks any of those rows, mark this section `PENDING SUPPORTING CONTENT` and do not invent canonical facts.

When supported, verify: initially unusual (unseen IP + surprising city); at least two datasets consulted (auth `AUTH-0915` + VPN catalogue `V-217` and/or inventory `D4`, plus precedent `V-215`); correlation produces benign explanation (enrolled device + extra check completed + V-217 exit matched + zero prior fails + prior-week precedent + coworker context; city estimate alone insufficient); player can document/close as expected/verified with reason citing those agreements; no field literally says "false positive"; no scoring; no forced escalation. Noise/boundary rows added since (`AUTH-0745-PATEL-HQ`, `AUTH-0835-OKONKWO-VPN`, `AUTH-0722-GARCIA-FAIL`, `V-221`, `V-216`, `D9`, `D10`, `AL-8`, `AL-9`) must not change this read and must never join the A-1204 keys. Fail if the item resolves from one screen, if any signal is pre-labeled benign/malicious, or if closing requires escalation.

# 11. Documentation / ticket acceptance (PT-DOC)

| Check | Setup | Verify |
|---|---|---|
| Partial notes during investigation | Mid-A-1042, ≥1 record opened | Timestamped note saved with facts + record IDs + gap + next check; re-readable; amendable |
| Evidence attachment only when discovered | Before/after opening key records | Undiscovered refs rejected or unavailable; discovered refs attachable; attached set rendered back identically |
| Final disposition | Pre-handoff | Disposition + reason recorded (monitor with condition / escalate with package / close with reason); preconditions enforced as process messages, never quiz gates |
| Unresolved questions | Pre-handoff | Gaps named plainly (who controlled S-0741; access unverified past 07:45; travel-register limits); report-not-proof + coverage qualifiers preserved |
| Handoff notes | T+60 | Fields complete per §15 of this pack; next analyst could continue without re-reading everything |

Free-text notes must not alter canonical truth (no note text becomes a world fact, unlocks records, or changes NPC knowledge). No semantic prose grading — readability acknowledgement at most.

# 12. Delayed-consequence acceptance (PT-CONS)

| Case | Setup | Verify world feedback |
|---|---|---|
| Well-supported action | Evidence-backed ticket + monitor/escalate | Clean acknowledgement naming session IDs + open question + holder ("senior review has it" / "monitoring through end of shift"); handoff references notes |
| Thin escalation | Escalate with ~no refs or single-source double-count | Accepted + returned with specific evidence requests; resubmission with refs earns clean ack; history shows correction; never "wrong" |
| Monitor / wait | Monitor with re-surface condition | Waiting state visible; re-surface on authored activity with history intact, citing the condition; quiet stretch otherwise valid |
| Delayed response | Consequence due while player works another item | Arrives via queue/updates + announcement; consumable without abandoning current work; no focus lock |

All feedback occupational/world feedback. Fail on grades, scores, correctness screens, or consequences requiring twitch timing.

# 13. Renderer parity playtests (PT-PARITY)

For each key action, complete it in 3D, Desk, and Accessible and diff canonical results (action logs, observed-ID sets, ticket/NPC/consequence state) — never eyeball. Minimum matrix (full interaction entries live in the parity matrix doc):

Open Work Item · query record set · inspect record · talk to Morgan/Jules · update documentation · make decision · respond to consequence.

Same canonical action → same canonical state in all three. Movement (walk speed, path, camera, hover) changes nothing; sim-time logs match with tolerance zero for identical sequences; delayed events key off canonical time; position-only playthrough mutates zero canonical fields. Fail on any renderer-exclusive evidence, metadata truncation, divergent validation, or renderer-referencing debrief language.

# 14. Accessibility acceptance (PT-A11Y — manual)

Keyboard-only completion: every career action reachable and operable by keyboard end-to-end in every renderer; visible focus; no traps; dialogs/confirmations keyboard-safe; delayed events consumable without pointer. Screen-reader pass: controls named with targets ("Open alert A-1042"); queue/record/evidence/ticket tables or lists semantic; severity/status/validation in text; arrivals, discoveries, saves, decisions, handoff announced via live regions; focus moves to new-view headings and returns on close. No color-only evidence (severity, auth chips, statuses all text-labeled; AA contrast). No hover-only action (tooltips/previews also on focus/tap). No drag-only interaction (attach always has button equivalent). Reduced-motion compatibility: `prefers-reduced-motion` freezes non-essential animation; nothing motion-only. Narrow-layout usability: 320px width / 200% zoom clips nothing career-relevant; tables scroll with headers preserved.

# 15. Final "Feels Like Work" checklist (release gate)

The shift passes only if ALL hold:

1. Majority of active time is investigation, correlation, documentation, communication, monitoring, deciding, and resuming routine work — describable as "five judgment calls", not fifty clicks.
2. Player regularly transitions between work types (records ↔ people ↔ tickets ↔ queue) with information distributed across ≥2 systems per item.
3. Not every event is dramatic: routine scanner close, quiet housekeeping stretch, and benign contrast case all present.
4. Different investigation orders valid: §3 branch tests pass; no mandated sequence.
5. Coworkers provide context, not answers: §7/§8 tests pass; Morgan one-detail-per-exchange; Jules never grades.
6. Consequences occur in-world: §12 tests pass; feedback as queue/messages/records, never grade screens.
7. Routine work exists and matters: §5 checks pass; each item teaches, changes state, or pays off later.
8. Documentation matters: §11 tests pass; escalation quality and handoff visibly depend on notes/attachments.
9. No quiz UX dominates: §4 anti-quiz checks pass with zero hits across a full session.
10. No renderer changes career-relevant capability: §13 + parity-matrix scenarios pass; debrief renderer-blind.

# Appendix A. Content gaps (do NOT fix other workers' files)

Write `CONTENT GAP: …` here when a test needs content that does not exist yet. Current known gaps (read-only observations, no edits made):

- CONTENT GAP: Phishing artifacts (`phishing-email-1`, `phishing-headers-1`, `phishing-link-1` referenced by pack actions) have no canonical bodies — phishing playtests run against PROPOSED Section 6 content until pack authors add them. Pack actions for phishing are additionally DEAD/INCOMPLETE per fixtures §0 C17 (never offered by any progression); PT-PACE-1 phishing trigger and PT-PARITY phishing row are target-behavior tests that may legitimately fail today.
- CONTENT GAP: False-positive A-1204 cluster rows (`AL-3`, `AUTH-0915-OKONKWO-CHI`, `V-215`, `MORGAN-CTX-01` plus reuse `V-217`/`D4`) are PROPOSED/SHOULD-ship (content pack §5.2, fixtures §4a) — PT-FP stays `PENDING SUPPORTING CONTENT` in builds without those rows.
- CONTENT GAP: End-of-shift handoff has no canonical fields yet — handoff playtests run against PROPOSED field content.
- CONTENT GAP: Structured query/evidence/discovery/delayed-conditional machinery is future implementation — absence, discovery, and conditional-consequence playtests define target behavior that may legitimately fail today.
- CONTENT GAP: Fixture noise/boundary expansion (`AUTH-0745-PATEL-HQ`, `AUTH-0835-OKONKWO-VPN`, `AUTH-0722-GARCIA-FAIL`, `V-221`, `V-216`, `D9`, `D10`, `AL-8`, `AL-9`) exists in fixtures only; if the build under test serves fewer rows, branch/absence/FP tests still pass on the smaller set provided no remaining row joins the wrong keys and no verdict is pre-labeled.



