# Career Expo Independent Audit Protocol

This document defines how independent audit/review agents evaluate Career Expo work.

It supplements:

- `AGENTS.md`
- `docs/coordination/MEMORY_PROTOCOL.md`
- `docs/coordination/ORCA_WORKFLOW.md`

The current primary audit worker is:

`CODEX-1`

Future dedicated audit workers may include Gemini or other agents, but the authority model remains the same.

The auditor provides independent findings.

Kiro remains the technical coordinator and adjudicates findings.

---

## 1. Audit purpose

Audits exist to independently challenge implementation quality.

The auditor should look for problems that an implementation worker or Kiro may have missed.

Audit goals include detecting:

- functional defects
- regressions
- missing requirements
- specification drift
- architecture drift
- deterministic/replay failures
- renderer parity violations
- privacy violations
- security weaknesses
- safety violations
- accessibility regressions
- persistence/migration issues
- weak or missing tests
- incorrect assumptions
- unnecessary complexity
- stale project-memory
- unresolved technical debt introduced by recent work

Auditing is not routine implementation.

---

## 2. Auditor authority

The auditor is advisory.

The auditor may:

- inspect code
- inspect Git history/diffs
- inspect tests
- inspect specifications
- query project-memory
- inspect Orca task context
- run read-only analysis
- run verification/tests when safe
- create audit findings
- report findings to Kiro

The auditor must not, by default:

- modify application code
- command implementation workers
- redefine project scope
- change product requirements
- accept its own disputed findings as project truth
- merge implementation work
- silently fix findings

Kiro adjudicates audit output.

---

## 3. Read-only default

Audit work should be read-only by default.

The auditor may run commands that do not alter project implementation, such as:

- Git diff/history inspection
- searches
- tests
- type checking
- lint
- build verification
- static analysis
- read-only database/schema inspection when safe

If a proposed audit action may modify:

- source files
- generated tracked files
- migrations
- persistent data
- configuration
- project state

the auditor should avoid it unless Kiro explicitly authorizes the action.

---

## 4. Audit independence

Do not allow the implementation worker to self-audit meaningful high-risk work as the only review.

For important checkpoints:

Implementation worker
→ produces work

Independent auditor
→ challenges work

Kiro
→ adjudicates findings

The auditor should form its own conclusions from evidence rather than merely repeating the implementation worker's summary.

---

## 5. When to trigger an audit

Kiro should request audits at meaningful checkpoints.

Good audit triggers include:

- major feature group completed
- architecture changed
- public/shared contract changed
- deterministic simulation logic changed
- renderer parity logic changed
- privacy/security/safety behavior changed
- authentication changed
- persistence changed
- migration created or modified
- major integration completed
- repeated implementation failure
- substantial bug remediation
- release candidate reached

Do not spend audit capacity reviewing every trivial formatting or text-only change.

---

## 6. Audit scope

Every audit should define scope.

Examples:

### Task audit

Review one completed task.

### Feature audit

Review a coherent feature and its supporting implementation.

### Integration audit

Review the interaction of several completed tasks.

### Architecture audit

Review system boundaries, dependencies, authority, determinism, and contracts.

### High-risk audit

Review security, privacy, safety, migrations, personal data, hidden state, or other high-consequence areas.

### Release audit

Review the combined current branch against release requirements.

The auditor should stay within the requested scope while reporting critical out-of-scope issues if discovered incidentally.

---

## 7. Required audit context

Before meaningful review, the auditor should inspect:

1. audit task/scope
2. relevant authoritative specifications
3. relevant acceptance criteria
4. current repository/worktree
5. relevant Git diff or commits
6. relevant project-memory
7. relevant implementation task completion
8. verification already performed
9. previous related audit findings when applicable

Do not audit solely from another agent's summary.

---

## 8. Source authority

The auditor should use:

Specifications
= required behavior

Git
= actual implementation

Orca
= task/dispatch state

project-memory
= historical context, decisions, findings, and handoffs

Individual conversations
= temporary context only

If memory conflicts with Git or an authoritative specification, report the discrepancy rather than blindly following memory.

---

## 9. Product-boundary review

Audit against the non-negotiable Career Expo boundaries defined in `AGENTS.md` and authoritative specifications.

Pay particular attention to:

- deterministic backend authority
- action legality
- canonical state
- simulated time
- resources
- consequences
- NPC knowledge
- evidence generation
- safety decisions
- AI dialogue limitations
- hidden-state protection
- privacy
- reflection-sharing rules
- cautious debrief language
- age-appropriate content
- renderer/action parity
- no evidence from navigation speed or gaming skill
- excluded beta scope

A technically functional implementation is still incorrect if it violates a hard product boundary.

---

## 10. Determinism review

When simulation behavior is in scope, inspect for:

- client-authoritative state
- unseeded randomness
- time-dependent nondeterminism
- hidden mutable state
- inconsistent replay behavior
- renderer-specific outcomes
- order-dependent results
- race conditions
- state transitions that bypass canonical backend logic

Verify that equivalent canonical actions produce equivalent outcomes regardless of presentation mode.

---

## 11. AI boundary review

When AI behavior is in scope, verify AI remains bounded.

AI must not independently create:

- canonical facts
- procedures
- deadlines
- evidence
- outcomes
- hidden state
- action legality
- safety decisions

AI may phrase bounded dialogue only where permitted.

Report any path that allows model output to become authoritative world state without deterministic validation.

---

## 12. Privacy and hidden-state review

When relevant, inspect whether implementation may expose:

- hidden world state
- private reflection
- information an NPC should not know
- internal scoring not intended for users
- sensitive personal data
- cross-user data
- privileged administrative state

Review both direct exposure and indirect inference paths.

---

## 13. Renderer parity review

When UI/renderers are affected, verify that visual, desk-only, and structured modes preserve canonical behavior.

Check:

- same canonical action IDs
- same legality
- same consequences
- same evidence
- same relevant state transitions
- no advantage from pointer speed
- no advantage from navigation speed
- no gaming-skill-derived career evidence

Presentation may differ.

Canonical simulation outcomes must not.

---

## 14. Architecture review

For architecture-sensitive work, examine:

- ownership boundaries
- dependency direction
- API contracts
- schema coupling
- persistence boundaries
- deterministic authority
- renderer separation
- error handling
- unnecessary duplication
- hidden cross-module dependencies

Prefer findings supported by concrete consequences rather than stylistic preference.

---

## 15. Test review

Evaluate whether tests protect the actual requirement.

Look for:

- missing regression tests
- tests asserting implementation details rather than behavior
- weak assertions
- missing failure-path coverage
- deterministic/replay gaps
- missing parity coverage
- privacy/safety gaps
- tests that pass without exercising the claimed behavior
- flaky tests
- meaningless tests created solely to increase count

Do not demand tests for trivial behavior where they provide little value.

---

## 16. Verification review

Do not assume verification succeeded because a worker says it did.

When appropriate, independently run or inspect:

- focused tests
- broader test suite
- type checking
- lint
- build
- integration tests
- replay/determinism checks
- schema validation
- accessibility checks
- migration validation
- privacy/security checks

Record what was actually verified.

---

## 17. Evidence standard

Every meaningful finding should include concrete evidence.

Good evidence includes:

- file and symbol
- relevant code behavior
- failing test
- reproducible scenario
- specification reference
- Git diff/commit
- inconsistent state transition
- missing guard
- contradictory project-memory
- observable behavior

Avoid unsupported findings such as:

"This seems risky."

Prefer:

"`packages/simulation/...` allows the client-provided field X to determine canonical state Y, conflicting with requirement Z."

---

## 18. Finding format

Use:

```text
Finding ID:
Severity:
Status:
Title:

Affected requirement:
Affected component:

Evidence:

Expected behavior:

Observed behavior:

Why it matters:

Recommended response:

Confidence:
```

Optional fields:

```text
Related task:
Related commit:
Related decision:
Related finding:
```

---

## 19. Severity

Use severity based on impact, not presentation.

### CRITICAL

Likely release-blocking issue involving severe security/privacy/safety failure, major data corruption, or fundamental violation of a core product authority boundary.

### HIGH

Serious functional, architectural, deterministic, privacy, safety, persistence, or requirement defect that should be corrected before the affected milestone is accepted.

### MEDIUM

Meaningful defect or regression with limited blast radius or reasonable workaround.

### LOW

Small correctness, maintainability, test-quality, documentation, or edge-case issue with limited impact.

Do not inflate severity merely to increase attention.

---

## 20. Confidence

Use confidence honestly.

Suggested interpretation:

### 1.0

Directly verified.

### 0.8–0.9

Strong evidence with minor uncertainty.

### 0.5–0.7

Plausible finding that needs additional confirmation.

Speculation should be clearly labeled.

A low-confidence concern should not be presented as a confirmed defect.

---

## 21. Finding status

Initial auditor statuses may include:

- OPEN
- NEEDS_MORE_EVIDENCE
- SPECULATIVE

Kiro may adjudicate as:

- VALID
- INVALID
- SPECULATIVE
- ALREADY_RESOLVED
- NEEDS_MORE_EVIDENCE
- REQUIRES_USER_DECISION
- RESOLVED

The auditor should not independently mark disputed findings VALID as final project truth.

---

## 22. project-memory use

Auditors should query shared memory for:

- relevant active decisions
- prior bugs
- previous audit findings
- requirement interpretations
- recent task outcomes
- known blockers

Auditors may write durable audit findings when they are meaningful.

Use `MEMORY_PROTOCOL.md`.

Do not store every minor observation.

Do not store secrets.

---

## 23. Stale-memory audit

Audits may identify stale project-memory.

Examples:

- ACTIVE decision no longer matches implementation
- resolved bug still appears open
- old architecture recorded as current
- duplicate conflicting decisions
- audit finding fixed in Git but not updated in memory

Report meaningful discrepancies to Kiro.

Do not silently rewrite project-wide history without adjudication.

---

## 24. False-positive discipline

Auditors should actively avoid false positives.

Before raising a finding:

1. inspect the relevant implementation
2. inspect the applicable requirement
3. determine whether behavior is intentional
4. inspect related tests
5. inspect relevant decision history when useful
6. distinguish preference from correctness

Do not report personal style preferences as architectural defects unless they create measurable risk.

---

## 25. No automatic fixes

Default flow:

```text
Auditor discovers finding
↓
Auditor records/reports finding
↓
Kiro adjudicates
↓
Kiro creates corrective task if valid
↓
Implementation worker fixes
↓
verification
↓
Kiro or auditor confirms resolution when warranted
```

This preserves reviewer independence.

---

## 26. Kiro adjudication

Kiro reviews each meaningful finding.

Kiro should consider:

- specification
- evidence
- actual code
- architecture
- project-memory
- risk
- current milestone

Kiro should not reject a finding merely because implementation work is expensive.

Kiro should not accept a finding merely because the auditor is confident.

Evidence controls the decision.

---

## 27. Corrective work

When Kiro accepts a finding, corrective work should identify:

- finding ID
- affected requirement
- expected outcome
- acceptance criteria
- verification required

The implementation worker should retrieve the finding from project-memory rather than relying on a manually copied auditor conversation.

---

## 28. Resolution

A finding should be considered RESOLVED only after:

1. corrective implementation exists
2. relevant verification passes
3. Kiro accepts the correction
4. durable finding state is updated when appropriate

Do not mark findings resolved merely because a fix was attempted.

---

## 29. Release audit

A release-level audit should review the integrated system rather than only individual task diffs.

Consider:

- authoritative beta scope
- integration correctness
- unresolved findings
- unresolved blockers
- deterministic behavior
- privacy/security/safety
- renderer parity
- persistence
- verification state
- known limitations
- deployment readiness where in scope

Release audit findings remain advisory to Kiro/user decision-making.

---

## 30. Auditor usage limits

Audit capacity is limited.

Use it where independent review creates meaningful value.

Do not waste the audit account on:

- formatting
- simple renames
- obvious one-line changes
- routine setup
- repeated review of unchanged code

When `CODEX-1` is unavailable due to usage limits, Kiro may defer non-urgent audits until capacity returns.

Do not silently eliminate required high-risk review solely because the preferred auditor is unavailable.

---

## 31. Audit completion report

A completed audit should report:

```text
AUDIT:
AUDITOR:
SCOPE:
STATUS:

REQUIREMENTS REVIEWED:
COMMITS/DIFF REVIEWED:
VERIFICATION PERFORMED:

FINDINGS:
- finding IDs + severity + short title

NO-FINDING AREAS:
- important areas explicitly checked with no issue found

LIMITATIONS:
- areas not verified or evidence unavailable

RECOMMENDED NEXT STEP:
```

Do not fill the report with low-value narration.

---

## 32. Final audit principle

An audit is successful when it gives Kiro an independent, evidence-based answer to:

- Does the implementation satisfy the applicable requirements?
- What meaningful risks or defects remain?
- Is the evidence strong enough to act on?
- What requires correction?
- What requires more investigation?
- What requires a user decision?
- What was explicitly checked and found acceptable?

The auditor challenges the work.

Kiro adjudicates.

Implementation workers correct accepted findings.

The user remains the final authority for genuine product-level decisions.