# SOC Shift Realism & Content Reference Pack

**Status:** Supporting product/content research. Not an architecture audit, not an
implementation plan, not code, and not a replacement for the canonical design spec.

**Canonical product direction:**
`docs/superpowers/specs/interactivity-and-content-depth-design.md`
That document wins every disagreement. Nothing here changes canonical truth,
scenario entities, state machines, or the Morgan/Jules interaction model.

**Audience:** Future content authors writing Junior Cybersecurity Analyst shift
content for Career Expo. The player is likely a student exploring careers, so
authenticity must stay balanced with understandability: real enough to feel like
work, simple enough to learn in one shift.

**How this document labels its sources.** Each section marks its material as one
of two kinds:

- **[RESEARCH]** — Summaries of published practitioner/SOC descriptions found
  through web research (2026). These describe the real world, not Career Expo.
- **[SUGGESTION]** — Product-design suggestions for Career Expo content authors,
  derived from the research but adapted to a bounded educational shift.

Research never dictates implementation. Suggestions never rewrite canonical truth.

---

## 1. What a Junior SOC Analyst Actually Does

### [RESEARCH] Common Tier-1 / entry-level responsibilities

Across published SOC operations guides, practitioner accounts, and Tier-1 role
descriptions (Exaforce Tier-1 triage guide; MyCyberSecurityPath SOC playbook;
EpicDetect hour-by-hour Tier-1 shift; SOCSimulator tier breakdown; Cover6 SOC
analyst breakdown; TryHackMe SOC L1 triage room; WyzSec phishing triage playbook;
2026 practitioner blogs), the Tier-1 / junior analyst job converges on the same
core loop:

1. **Monitor the alert queue.** Detection tooling (SIEM, EDR, email gateway,
   firewall) produces alerts constantly. The junior analyst works the queue,
   usually severity-first, oldest-first within a severity.
2. **Triage each alert.** Read what fired, identify the user/host/indicator,
   and render a verdict: true positive (real threat), false positive (rule fired,
   no threat), or benign true positive (detection correct, activity authorized —
   e.g. a scheduled vulnerability scan tripping IDS). Ambiguous cases escalate.
3. **Enrich with context.** Pivot across a handful of systems for every alert:
   identity directory (role, authentication history), asset inventory (owner,
   criticality, normal behavior), and threat-intel lookups (IP, domain, hash
   reputation). Practitioners describe this as four or five tabs per alert.
4. **Work user-reported incidents.** Employees report suspected phishing, odd
   login notices, and strange computer behavior. These get triaged like any
   other alert: check headers, review login activity, look at endpoint data.
5. **Follow runbooks/playbooks.** Documented procedures exist for common alert
   types (phishing, malware, failed logins, suspicious processes). Juniors
   execute the procedure; they do not invent it.
6. **Update tickets and document everything.** Every alert gets investigation
   notes: what was checked, what was found, the verdict and its reasoning.
   Escalations must include timeline, evidence, assessment, and what Tier 2
   still needs to determine. Documentation quality is repeatedly cited as the
   trait that separates promotable analysts from the rest.
7. **Escalate with evidence.** Escalation is a structured handoff, not "please
   check." Good escalations carry the raw alert, the enrichment gathered, the
   reason for escalation, and an initial impact/scope read.
8. **Do shift handoff.** Read the outgoing analyst's notes at shift start
   (open cases, overnight escalations, noisy detections to expect); write
   handoff notes at shift end so the next analyst continues without re-work.
9. **Maintain the queue.** Close resolved alerts, acknowledge routine items,
   flag noisy rules as tuning candidates, contribute KB notes on recurring
   false-positive patterns.
10. **Communicate.** Written verdicts, escalation notes, handoff docs, replies
    to reporters, standup updates, questions to teammates and leads.

Volume reality from the sources: roughly dozens to low-hundreds of queue items
per shift depending on tuning; a large majority (often cited 70–90%) resolve as
false positives. Standard alerts take on the order of 5–15 minutes; complex
ones stretch to an hour. The defining skill is staying methodical on the
hundredth alert, not heroics on one.

### [SUGGESTION] What maps onto Career Expo

Almost all of the above fits the existing Work Item vocabulary (alerts, phishing
reports, scanner items, handoffs, ticket follow-ups, teammate requests). The
highest-value borrowings for content authors:

- The **verdict-with-reasoning** habit (TP / FP / authorized-benign / escalate)
  as the shape of every alert Work Item.
- **Enrichment pivots** (user → history, IP → reputation/context, device →
  inventory) as the standard investigation verbs.
- **Documentation as work**, not paperwork: notes and handoff as first-class
  actions with visible later payoff (a teammate references them).
- **Handoff framing** at both ends of the shift: yesterday's notes shape today;
  today's notes matter tomorrow.

What does NOT map: 24/7 shift-work realism (nights/weekends), performance
metrics (MTTD/MTTR), promotion politics, and tool-specific query languages.
Keep the verbs, drop the career-ladder machinery.

---

## 2. What the Job Feels Like

### [RESEARCH] The experiential rhythm

Practitioner "day in the life" accounts agree on texture more than on any
specific schedule:

- **Systems-switching is the job.** No single screen answers anything. An
  alert sends the analyst to identity, asset, intel, and ticket systems in
  rotation, holding a half-formed picture in memory across tabs.
- **Partial information is normal.** Most alerts arrive under-specified. The
  analyst decides what to pull next, and when the picture is complete enough
  to call.
- **Routine dominates; suspicion punctuates.** Long stretches of familiar
  patterns (known-good scanners, expected travel logins, duplicate reports),
  broken by occasional items that do not fit — and the skill is noticing the
  misfit without either ignoring it or overreacting.
- **Waiting is part of the work.** Replies from users, teammates, and Tier 2
  take time. Analysts queue up the next item rather than staring at the inbox.
- **Interruptions reset priorities.** A high-severity alert or a user report
  lands mid-investigation; the analyst parks current work (with notes, so it
  can be resumed) and re-sorts.
- **Documentation happens alongside investigation**, not after it. Notes grow
  as evidence arrives, because a cold trail is hard to reconstruct.
- **Procedures get checked, not memorized.** Even experienced analysts open
  the runbook for unfamiliar alert types. Checking the procedure is
  professionalism, not weakness.
- **Escalation is a relief valve with a cost.** Escalating too early wastes
  Tier 2's time; escalating too late risks missing something. Juniors feel
  this tension on every ambiguous case.
- **False positives are the weather.** Nobody celebrates closing one, but
  each carries a small judgment (is it REALLY benign?) and occasionally a
  tuning suggestion.
- **Queue maintenance is ambient pressure.** Unacknowledged items age, senders
  nudge, reminders arrive. The queue is never "done," only "under control."

### [SUGGESTION] Small details that make the workplace believable

Prefer these over cinematic drama:

- An alert that turns out to be the same noisy rule as yesterday, closed
  faster because the analyst recognizes it — competence feels good.
- A user report written in confused non-technical language that still
  contains one useful detail (a timestamp, a sender name).
- A teammate message that arrives while the player is mid-investigation and
  only becomes relevant ten minutes later.
- A ticket the player half-documented coming back as "can you add what you
  checked?" — documentation has consequences.
- A quiet stretch where nothing new arrives and the right move is housekeeping:
  notes, KB, queue review. Calm is part of the rhythm, not dead air.
- The end-of-shift feeling that two things are still open, both documented,
  both handed off — the shift ends mid-story, like real shifts do.

---

## 3. Mundane Work Catalog

### [SUGGESTION] Believable small interactions

Each entry: activity → why it happens → approximate player interaction →
what it adds: **context / pacing / state / realism / dependency / learning**.

1. **Acknowledge a routine scanner item.** Scanner finished, nothing
   anomalous. → Open item, skim summary, mark acknowledged. →
   pacing, realism, state (acknowledgement gates the later follow-up).
2. **Check device ownership in inventory.** Alert references an unfamiliar
   hostname. → Search inventory, read owner/enrollment fields. →
   context, learning, dependency (ownership changes what the alert means).
3. **Look up a KB article for an unfamiliar alert type.** Procedure unknown.
   → Search KB, skim two-paragraph article, return to alert. → learning,
   realism, context (checking procedure is normal, not failure).
4. **Update ticket notes mid-investigation.** Evidence gathered, page
   half-written. → Add timestamped note from a small set of note actions
   or short free text. → state, realism (notes pay off at handoff/escalation).
5. **Reply to the employee who reported phishing.** Reporter anxious, wants
   to know if they did something bad. → Send one of 2–3 bounded replies
   (reassure + confirm receipt; request forward of original; confirm safe).
   → realism, context, learning (reporters are people).
6. **Read a teammate's queue message.** Morgan flags something seen earlier.
   → Open message, one detail becomes relevant later. → context, pacing,
   dependency (lightweight, no reply required).
7. **Review a routine scan summary.** Scheduled scan completed overnight. →
   Open, confirm scope matches expectation, close or file. → pacing,
   realism (the familiar-pattern muscle).
8. **Return from break to new arrivals.** Break ends, queue changed. → Skim
   what's new, re-prioritize. → pacing, realism (absence has consequences,
   none punishing).
9. **Confirm an alert is a duplicate of one already owned.** Same rule, same
   host, already assigned. → Link/mark duplicate, move on. → realism,
   pacing, learning (dedupe before work).
10. **Check whether an IP is the corporate VPN exit.** Unfamiliar geography
    on a login. → Compare against known VPN ranges / note. → context,
    learning, dependency (single most common benign explanation).
11. **Verify MFA status on a flagged account.** Login alert without
    MFA detail. → Open account record, confirm MFA enrolled/active. →
    context, dependency (changes severity read immediately).
12. **File a closed false positive with a reason.** Benign verdict reached.
    → Select reason (authorized scan / expected travel / known-good
    automation) + one-line note. → state, realism, learning (closure is a
    decision with a record, not a shrug).
13. **Nudge a pending reply.** Asked a question, no answer yet. → Send or
    schedule a polite follow-up; meanwhile work something else. → pacing,
    realism (waiting is worked around, not waited through).
14. **Review handoff notes from the previous shift.** Shift start. → Read
    3–5 short notes; two name things that appear later. → context,
    dependency, learning (handover is a game mechanic wearing work clothes).
15. **Write handoff notes at shift end.** Open items remain. → Summarize
    status in a few short fields. → state, realism (the shift's work
    outlives the shift).
16. **Correct an early note after new evidence.** Earlier assumption now
    looks wrong. → Amend note; the record shows the correction, not a
    penalty. → realism, learning (good analysts revise in writing).
17. **Check alert age and re-sort the queue.** New items arrived while
    investigating. → Re-triage order: severity, then age. → pacing,
    learning (prioritization is a visible skill).
18. **Confirm scope before acting.** "How many users got this email?" →
    Run the count query, get a number, decide. → context, dependency
    (scope determines response scale).

**Rule for authors:** every mundane item must either teach something, change
state, or set up a later payoff. If it does none of the three, cut it — that
is the line between texture and busywork.

---

## 4. Investigation Behaviors

### [SUGGESTION] Realistic verbs, represented simply

For each verb: what the player does in Career Expo terms, and what makes it
feel like work instead of a quiz.

- **Search.** Type/select a value (user, IP, session, hostname) into a
  system; deterministic matching records return. Feels like work because the
  player chooses WHAT to search and must interpret mixed results, including
  empty ones.
- **Filter.** Narrow a record list by user, time window, or type. Feels like
  work because filtering is iterative — first pass too broad, second pass
  too narrow, third pass just right — and the player controls the iteration.
- **Compare.** Place two records side by side (e.g. two sessions, login vs.
  VPN window). Feels like work because contradiction-hunting is active:
  same user, different device; same IP, different account.
- **Pivot from an IP.** From an alert's source IP, ask "what else touched
  this IP?" Feels like work because it follows evidence outward rather than
  answering a prompted question.
- **Pivot from a username.** From an account, ask "what else did this
  account do today?" Feels like work because baselines emerge from the
  account's own history, not from a hint.
- **Inspect device association.** Which account normally uses this device?
  Is the pairing expected? Feels like work because device↔user mismatch is
  the kind of quiet anomaly real juniors catch.
- **Check VPN context.** Was there a matching VPN session? Is the IP a
  known exit? Feels like work because absence of a record is itself a
  finding — but only when the player actually runs the query.
- **Check recent activity.** Pull the last N actions for a user/host before
  the alert. Feels like work because recency reframes severity (burst of
  failures vs. one odd success).
- **Look up procedure.** Open the runbook/KB for the alert type. Feels like
  work because knowing when you need the procedure IS the skill being taught.
- **Ask teammate.** Send a bounded question; the answer may be delayed,
  partial, or "haven't seen it." Feels like work because human sources are
  lossy and asynchronous, unlike databases.
- **Attach evidence.** Link specific records to the case/ticket. Feels like
  work because the case file becomes a visible artifact of thoroughness —
  and escalation quality visibly depends on it.
- **Document uncertainty.** Write "cannot confirm X because Y" explicitly.
  Feels like work because naming the gap is a professional act, and it
  legitimately shapes what happens next (monitor vs. escalate).
- **Monitor.** Decide to watch rather than act: set the item to re-surface
  later. Feels like work because restraint under uncertainty is a real
  analyst decision, not passivity.
- **Escalate.** Package timeline + evidence + assessment + open questions
  upward. Feels like work because the package's quality is visible in what
  comes back (a clean escalation earns a clean acknowledgement; a thin one
  earns a follow-up question).

**What makes each feel like work rather than a quiz:** the player initiates
the verb, chooses its parameters, interprets underdetermined results, and
lives with the record of having done it. No verb is ever marked "correct";
verbs produce information, and information produces judgment.

---

## 5. Plausible Wrong Paths Without "Wrong Answers"

### [SUGGESTION] Believable junior assumptions and world responses

No scoring, no "Incorrect." Each assumption is reasonable for a beginner; the
world responds the way a workplace would — with later consequences, extra
work, or a colleague's gentle correction.

1. **Assuming a device is known before checking inventory.**
   The analyst treats `unknown-laptop-17`-style hostnames as "probably
   someone's laptop" without opening inventory.
   → *World response:* the inventory record, when eventually opened, shows
   unenrolled/unknown ownership — and the case notes now visibly lack the
   check. A follow-up (Jules or ticket review) asks for the missing
   inventory detail. Lesson lands as process, not punishment.
2. **Treating an unfamiliar IP as automatically malicious.**
   An odd-looking source IP (e.g. `203.0.113.44`-style unfamiliar address)
   is read as hostile on sight.
   → *World response:* the IP resolves to explainable context (VPN exit,
   travel, known service) once checked — time spent, nothing lost except
   time. If escalated on IP alone, the escalation comes back asking for
   the corroborating evidence that was never gathered.
3. **Escalating before gathering useful context.**
   Ambiguity feels uncomfortable, so the case goes up with one alert and
   no enrichment.
   → *World response:* the escalation is accepted but returned with
   specific evidence requests (auth history? device record? VPN check?).
   The player does the enrichment late — discovering it was always
   available. Thin escalations cost a round-trip; they never cost points.
4. **Closing something because one signal appears benign.**
   MFA is active, so the login must be fine — auth history unexamined.
   → *World response:* a correlated item or follow-up surfaces the
   unexamined signal later (a second session, an odd timestamp). The case
   reopens with its history intact; the player learns single-signal closure
   the way analysts do — by meeting the signal they skipped.
5. **Over-focusing on one alert while routine items wait.**
   A fascinating case eats the shift; the queue ages.
   → *World response:* reminders arrive, a routine item acquires an
   "awaiting review" state, a teammate nudges. Nothing explodes; the
   player practices the real skill of parking work with notes and
   re-sorting. The cost is mild time pressure, never failure.
6. **Trusting the tool's severity at face value.**
   "High severity" is read as "definitely bad"; "low" as "ignorable."
   → *World response:* a high-severity item resolves to authorized
   activity (scanner, admin tooling); a low-severity item correlates with
   something real. Severity labels are shown to be automated opinions.
   The takeaway is authored into KB/runbook content, not lectured.
7. **Answering the reporter's question instead of triaging the report.**
   A confused employee email pulls the analyst into helpdesk mode.
   → *World response:* the underlying report still needs its workflow
   (headers, scope, disposition). A bounded reply template exists for the
   human part; the security part waits. Both matter, in order.

**Authoring principle:** every wrong path must have a designed world response
that teaches. An assumption with no downstream response is not a learning
moment — it is a dead end. Design the response first, the assumption second.

---

## 6. Routine vs Suspicious Signal Contrast

### [SUGGESTION] Teaching "investigate and correlate, don't guess"

The product principle: **investigate and correlate rather than guess what the
game wants.** These paired examples give authors the contrast grammar to
support it. (Entities below are illustrative patterns, not canonical claims.)

**Benign unusual activity (looks odd, resolves clean):**

- Login from a new country → user on approved travel; VPN exit matches;
  auth history shows the same device; single session, no failures before it.
- After-hours bulk file access → backup/automation service account on its
  normal schedule; authorized change record exists.
- Security tool flagged as malware → IT admin utility with known hash;
  documented in asset management; matches known-good automation pattern.
- Spike of failed logins → user with a new phone misconfigured mail client;
  failures stop after password sync; no success from unknown source.
- Employee visiting a "suspicious" domain → typo-squat lookalike that is
  actually the company's own staging environment; proxy category recent.

**Actually suspicious combinations (no single signal proves it):**

- Successful login from unusual location AND no matching VPN session AND
  device never seen for this user AND failures preceded the success.
- Phishing link clicked AND authentication within the hour from a new IP
  AND a mailbox rule created shortly after.
- "Known" device communicating with a fresh external domain at odd hours
  AND the owning user has no activity in that window.
- Repeated low-severity alerts on one host across days that individually
  close as noise — correlated, they describe a pattern.

**Insufficient evidence (the honest middle):**

- One odd login, no history yet pulled, device record unopened. The correct
  content stance: the item stays open, notes record the gap, and the player
  is offered monitor-vs-escalate as a genuine decision — both defensible,
  both with consequences (a re-surface later vs. a returned evidence
  request).

**False-positive patterns (recurring, learnable):**

- Scheduled scanner tripping IDS at the same hour (benign true positive).
- Developer tooling (scripting, GitHub fetches) flagged by generic rules.
- Duplicate user reports of the same mass email already dispositioned.
- Test-environment hosts alerting with production severity tags.

**Legitimate but uncommon behavior (the trap for guessers):**

- Executive's assistant logging in as the executive (delegated access,
  documented).
- First-ever VPN use by a new hire whose start date was last week.
- Security team itself running a phishing simulation that looks exactly
  like the real thing (the report button still worked; the reporter still
  did right).

**Authoring rule:** never ship an unusual event without authoring its
context trail. If the player cannot, in principle, resolve it through
correlation, it is not a teaching item — it is a guessing item. And every
"guessable" item needs at least one benign twin so pattern-matching the
game's intentions never works.

---

## 7. Realistic Phishing Workflow Reference

### [RESEARCH] Practitioner workflow, condensed

Published phishing playbooks (WyzSec, SOCSimulator, LogHunter/Hashnode SOC
guide, TryHackMe SOC L1 room, L1 responsibility guides) agree on a stable
sequence:

1. **Intake.** Report arrives via report button, forwarded mail, or ticket.
   First questions: who reported, how many others got it, did anyone click?
2. **Quick filter.** Display name vs. actual address, urgency/gift language,
   known-simulation platform markers. Obvious-benign (newsletters, internal
   comms) and known simulations dispose fast.
3. **Header/context review.** Sender infrastructure, authentication results
   (SPF/DKIM/DMARC in plain terms: "did this really come from who it claims"),
   Reply-To mismatches, recipient scope (one person vs. campaign).
4. **Link/attachment safety check.** Never interact directly; reputation
   lookups, sandbox verdicts, red flags (fresh domains, shorteners,
   lookalike spellings, unexpected attachments).
5. **Interaction check.** Did anyone click, open, or submit credentials?
   Proxy/endpoint/auth logs answer this — the fulcrum of the whole case.
6. **Scope.** Same sender elsewhere? Same link elsewhere? Count recipients.
7. **Containment where appropriate.** Block sender/URL, pull mail from
   inboxes, reset passwords if credentials went in, isolate endpoint if
   malware ran. Scope determines scale.
8. **Reporter communication.** Tell the reporter what happened and what to
   do. Anxious reporters who hear nothing stop reporting.
9. **Documentation and disposition.** Benign / simulation / malicious-then-
   contained; IOCs recorded; ticket closed with reasoning. Targeted or
   credential-loss cases escalate with the interaction evidence attached.

Time-boxes in the sources: ~15 minutes for no-interaction triage; hours if
credentials or malware are involved.

### [SUGGESTION] Accessible Career Expo adaptation

Keep every stage, shrink every stage:

- One report, one sender, one link, at most one attachment. Scope questions
  have small countable answers (three recipients, one clicker).
- Headers shown as labeled fields with plain-language glosses, not raw
  header blobs. "Return path differs from sender" beats `Return-Path:`.
- Authentication results as three pass/fail chips with one-line meanings.
- The link check as a reputation lookup returning a short verdict card.
- The interaction question as the dramatic center: exactly one record
  answers it, and the player must go pull it.
- Reporter reply as 2–3 bounded options; the reporter thanks the player
  later (small human payoff, zero systems).
- Disposition as reason + note, never a quiz option. A benign-twin report
  (e.g. a real newsletter, or the company's own simulation) should exist
  nearby so "everything is phishing" never becomes the winning strategy.

---

## 8. Realistic Suspicious-Login Workflow Reference

### [RESEARCH] Practitioner workflow, condensed

L1 suspicious-login guides converge on: identify account → source IP and
geo → device → login time vs. baseline → MFA status → failures before
success → previous login pattern → travel/VPN explanation → threat-intel
on the IP → post-login activity (mailbox rules, privilege changes, new
sessions) → decision (expected-travel/VPN close, monitor, or escalate
with evidence). Escalation triggers most cited: success after failures
from an odd location, impossible travel, privileged/executive accounts,
no MFA, post-login persistence signs.

### [SUGGESTION] Mapping onto the canonical scenario

This section maps workflow stages to existing canonical entities. It adds no
facts; all scenario truth lives in the canonical spec and content packs.

- **Alert.** A-1042 enters the queue with enough metadata to start but not
  to resolve — the canonical "central signal." Author content around the
  alert's face: what it shows (rule, account, time, source) and what it
  deliberately withholds (device trust, VPN match, history).
- **User/account.** The alerted account gets an authentication history the
  player can filter by user and time. Baseline-building is the player's
  job: same account, normal hours, normal device — until the record that
  isn't.
- **Authentication history.** Sessions S-0731 and S-0741 are the comparison
  pair the workflow needs: search by session, open individual records,
  compare. Authors should ensure the two sessions differ along at least
  one human-readable axis (device, IP, time) so comparison feels productive.
- **Session.** Individual session records openable from search results.
  Each record should be self-explanatory at student reading level: who,
  when, from where, on what, success or failure.
- **IP.** Source IP 203.0.113.44 supports the pivot verb: search by IP,
  see what else it touched, check reputation/context. The content must
  supply whatever makes this IP interpretable (VPN-exit? travel-plausible?
  unknown?) — an IP with no context trail is a guessing item (see §6).
- **VPN.** Dataset with V-218 and authored absence/presence relationships.
  The "no matching VPN session in queried interval" derived fact is the
  textbook absence-as-evidence beat — but only fires on an actually
  performed query, per canonical design. Authors: make the query that
  establishes absence easy to think of (runbook hints it) but still the
  player's action.
- **Device inventory.** `unknown-laptop-17` plus canonical ownership/
  enrollment data. The name itself teaches the verb: unknown until looked
  up, and lookup returns enrollment truth, not a riddle. Pair device
  association both ways (account→devices, device→accounts).
- **Context from teammate.** Morgan's bounded handoff facts slot in here:
  what the prior shift saw, not what it means. Delayed arrival is a
  feature — the player investigates without it first.
- **Case notes.** Notes accumulate per stage; the escalation package visibly
  assembles itself from attached evidence. Authors: show the package
  growing (evidence count, open gaps listed) so documentation feels like
  building, not filing.
- **Monitor/escalate/close decision.** All three legal at the decision
  point with designed downstream responses (§5): close-with-reason sticks
  only if the evidence supports it; monitor re-surfaces; thin escalation
  returns evidence requests. The decision is the climax the whole workflow
  earns.
- **Follow-up.** Post-decision beats: acknowledgement of a good escalation,
  returned questions on a thin one, a next-shift note referencing the
  player's documentation. The case ends; the record remains.

---

## 9. Morgan Interaction Ideas

Bounds recap (canonical, §11.1): handoff context, peer context, bounded
answers about prior events, delayed responses, ordinary coworker interaction.
Morgan knows only authored facts. Not an answer machine.

### [SUGGESTION] Catalog of bounded interactions

- **Handoff clarification.** "Overnight had two of these; both were the
  scanner. This one's timing looks different though." Prior-shift pattern
  + one honest uncertainty.
- **Prior context, narrowly scoped.** "S-0741 came up yesterday too — I
  only checked the login time, didn't get further." Names a thread without
  pulling it.
- **"I saw that earlier" information.** "That IP rang a bell — I think it
  was on the VPN thread last week, not sure." Partial memory, flagged as
  partial; the player still verifies.
- **Delayed replies.** Player asks; Morgan answers one phase later
  ("sorry, was in the queue"). The delay is stated in-fiction, and the
  answer arrives mid-investigation where it reframes, not solves.
- **Limited knowledge, stated plainly.** "Haven't touched the device
  inventory today — you'd know more than me after you look." Models
  checking over guessing.
- **Asking what the player is looking at.** "What've you got?" Player
  shares current finding (a state-visible action); Morgan reacts with one
  relevant detail or a useful question ("did you check VPN for that
  window?") — a nudge toward a verb, never the answer.
- **Sharing one relevant detail.** Exactly one fact per exchange, drawn
  from authored Morgan-known facts. The discipline of "one detail" is what
  keeps Morgan a peer rather than a hint dispenser.
- **Procedural pointer.** "Runbook for that is under phishing intake, I
  think section 2." Points at process, not conclusions.
- **End-of-shift overlap.** "I'm heading out — your notes on A-1042 read
  clear, by the way." Documentation payoff delivered by a human voice.

### [SUGGESTION] What Morgan must NOT know or do

- Must not know verdicts (malicious/benign), hidden evidence, future phases,
  or anything outside authored Morgan-known facts.
- Must not interpret evidence ("that means compromise") — Morgan reports
  observations, never conclusions about the player's case.
- Must not perform actions for the player (no "I checked inventory for
  you" with a full result; at most "I didn't get to it").
- Must not be always available or instant; availability windows and delays
  are part of the realism.
- Must not repeat the runbook verbatim at length; pointers, not recitations.
- Must not comment on player performance ("good job" / "you're wrong") —
  peers don't grade.

---

## 10. Jules Interaction Ideas

Bounds recap (canonical, §11.2 + §11.3/11.4): status interaction, escalation
contact, bounded guidance, documentation requests, acknowledgement. Never
grades. Every AI-phrasable response needs a deterministic fallback.

### [SUGGESTION] Catalog of lead interactions

- **Asking for status.** "Where's A-1042 at?" Player gives a short status
  (opened / investigating / ready to decide); Jules acknowledges and, if
  notes are thin, asks for the ticket to be updated first.
- **Receiving escalation.** Accepts the packaged case; acknowledgement
  quality reflects package quality — a complete package earns a clean
  "got it, Tier 2 has it"; a thin one earns specific evidence requests.
  Both are professional, neither is a grade.
- **Asking what evidence supports the escalation.** "What ties the session
  to the account?" — the single most realistic lead question. It targets
  the gap, not the person.
- **Requesting a ticket update.** "Get your notes current before handoff."
  Process enforcement as care for the next shift, framed that way.
- **Clarifying process.** "Escalations need attached evidence — which
  records are you attaching?" Points at the requirement, lets the player
  satisfy it.
- **Acknowledging next step.** "Monitoring through end of shift works —
  flag me if a second session appears." Blesses a defensible decision
  (including monitor, not just escalate), which teaches that restraint can
  be correct.
- **Asking the absent-system question.** If the case lacks a check the
  runbook expects (e.g. no device lookup performed), Jules asks whether
  that system was checked — phrased as a question, resolved by the player
  doing the check, never by Jules supplying its result.

### [SUGGESTION] What Jules must NOT do

- Never grade, score, or rank the player — no "correct," no stars, no
  performance language of any kind.
- Never reveal hidden evidence or future content ("you'll want to look at
 …").
- Never make the decision for the player (no "you should escalate this").
- Never invent procedure, deadlines, or policy on the spot; everything
  Jules cites must exist in authored runbook/KB content.
- Never punish thin work with tone; the consequence is always a concrete
  professional request (evidence, notes, a check), never disappointment.

---

## 11. Workplace Texture

### [SUGGESTION] Environmental moments, classified

**Useful** (teach or advance something; safe to author as designed beats):

- Handoff notes naming two things that recur later.
- A teammate message containing one detail that becomes relevant.
- Queue refresh delivering the phase's next Work Item with in-fiction
  framing ("overnight scanner summary posted").
- A monitor-wall change the player can notice and optionally open (alert
  wall reflects queue state).
- A coworker reply arriving with the delayed answer the player is waiting
  on — waiting visibly ends.

**Optional** (atmosphere; include sparingly, never load-bearing):

- Someone goes on break / returns with coffee; small break-room beat.
- A quiet period with nothing new — an invitation to do housekeeping.
- A routine reminder (standup in 15, KB article of the week).
- A teammate walks over and says one line of color, no request attached.
- Ambient office life: keyboard murmur, a printer, a plant being watered
  (visual/cosmetic layer only, never interactive obligations).

**Likely annoying if repeated** (use once per shift at most, or not at all):

- Repeated "just checking in!" nudges with no new information.
- Multiple reminders for the same unacknowledged item (one reminder state
  is enough; after that, let it sit visibly aging).
- Notifications that interrupt input or pull focus mid-investigation.
- Fake urgency ("URGENT" on routine items) — destroys trust in real
  urgency cues.
- Any texture that blocks progress until clicked/acknowledged. Texture
  must never gate work.

---

## 12. Anti-Patterns

### [SUGGESTION] Realistic-sounding ideas that would make Career Expo worse

- **Fake terminal commands.** Typing `grep`/`splunk` syntax into a pretend
  shell feels hacker-authentic but teaches nothing (the commands aren't
  real) and punishes typo-free students. *Instead:* search/filter controls
  with visible parameters and deterministic results.
- **Requiring exact syntax.** Any interaction that fails on formatting
  rather than judgment (exact IP typing, case-sensitive session IDs).
  *Instead:* selection-based queries; forgiving search.
- **Huge raw log dumps.** Scrolling thousands of lines looks real and reads
  as homework. Real juniors filter before reading. *Instead:* pre-scoped
  record sets with filter tools; volume implied, not inflicted.
- **Realistic waiting times.** Real replies take hours; real scans take all
  night. *Instead:* compressed, phase-driven delays measured in minutes of
  play, with other work available meanwhile.
- **Excessive ticket fields.** Fifteen required fields mimics bad enterprise
  software, not good security work. *Instead:* 3–5 meaningful fields
  (summary, evidence links, verdict reason, open questions).
- **Dozens of alerts.** Volume realism collapses into click-fatigue within
  minutes at student scale. *Instead:* a handful of items where each one is
  authored to teach (see §13 density).
- **Jargon overload.** Unexplained acronyms (EDR, DMARC, C2, LOLBins) as a
  comprehension gate. *Instead:* every term glossed on first contact; KB
  entries written for students, jargon introduced then translated.
- **Arbitrary clicking.** "Click all 14 hosts to continue" with no decision
  per click. *Instead:* every required interaction answers a question the
  player actually has.
- **Hidden pixel hunting.** Critical clues discoverable only by hovering
  the right screen region. *Instead:* all interactables labeled; discovery
  comes from reasoning about systems, never from cursor coverage.
- **Copying IDs manually between apps.** Transcribing session IDs across
  screens mimics tedium, not skill. *Instead:* click-to-pivot (select a
  value, search it in the next system directly).
- **Grading disguised as feedback.** Scores, stars, "correct!" — instantly
  converts investigation into test-taking and kills the core principle.
  *Instead:* world responses (§5): consequences, follow-ups, and human
  replies that teach without ranking.

---

## 13. Suggested Content Density

### [SUGGESTION] Beta-range guidance for content authors

Ranges, not requirements. Tune per playtest; the lower end is safer.

- **Major investigations:** 1 per shift (the A-1042-class case). A second
  major case splits attention past what a bounded shift supports.
- **Routine Work Items:** 3–5 per shift (scanner summary, duplicate report,
  false-positive review, ticket follow-up, handoff read/write). Enough for
  queue-feel, few enough that each is authored, not filler.
- **Interruptions:** 2–4 per shift (user report arrival, priority alert,
  teammate message, reminder). Spaced across phases; never stacked.
- **Coworker interactions:** 2–4 Morgan exchanges, 2–3 Jules exchanges per
  shift. Each exchange carries at most one new fact (Morgan) or one
  request/question (Jules).
- **Record count:** investigation systems return single-digit to low-teens
  record sets per query. Enough to filter/compare; never a wall.
- **Evidence discoveries:** 5–9 attachable findings across the whole shift
  for the major case; 1–3 for the phishing item. Each discovery maps to a
  player-initiated verb (§4).
- **Meaningful decisions:** 3–5 per shift (prioritization order, scope
  check, monitor-vs-escalate, disposition reasons, handoff content). The
  shift should be describable as "five judgment calls," not fifty clicks.
- **Delayed consequences:** 2–4 beats where earlier work visibly returns
  (Morgan's delayed answer, scanner follow-up, escalation acknowledgement,
  handoff referencing the player's notes). This is the highest-value
  density knob: consequences are what convert actions into a shift.

**Pacing shape:** routine-heavy opening (queue, handoff, scanner) →
central signal with enrichment middle (A-1042 + overlap item) → judgment
and documentation close (decision, escalation, handoff). Texture (§11)
thins as judgment load rises; never interrupt the decision beat with a
reminder.

---

## 14. "Feels Like Work" Checklist

### [SUGGESTION] Content-author review checklist

For every new SOC Work Item, the author must be able to answer yes to each:

1. Does the player actually **perform an action** (search, compare, attach,
   document, decide) — not just read and confirm?
2. Is information **distributed** across at least two systems or sources,
   so no single screen resolves the item?
3. Is there something genuine to **investigate** — an underdetermined
   question with a context trail, not a hidden correct button?
4. Can the player act **without being instantly graded** — no score, no
   "correct/incorrect," only world responses?
5. Does the item **affect state** — notes, evidence, queue, escalation
   package, handoff, or a colleague's later behavior?
6. Does it resemble something a junior analyst **genuinely does**
   (per §1 research), recognizable to a practitioner?
7. Is the interaction **understandable to a student** on first contact —
   glossed terms, labeled controls, plain-language runbook?
8. Is any complexity here **real complexity** (correlation, ambiguity,
   prioritization) rather than fake complexity (syntax, transcription,
   pixel-hunting, jargon gates)?
9. Does the item have a **designed downstream response** for the plausible
   wrong paths (§5) — so mistakes teach instead of dead-ending?
10. Does it **end cleanly** — disposition with a reason, documented and
    handed off, even when the answer is "monitor and see"?

If any answer is no, revise the item before it ships. A Work Item that
passes all ten will feel like a morning in a SOC — which is the entire
point of this pack.
