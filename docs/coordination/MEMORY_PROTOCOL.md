# Career Expo Shared Memory Protocol

This document defines how Career Expo agents use `project-memory`, backed by Neo4j Agent Memory.

It supplements `AGENTS.md`.

Read this document when:

- retrieving durable project context
- writing durable project knowledge
- recording decisions
- recording bugs or root causes
- recording blockers
- handing work between agents
- recording task completion
- recording or adjudicating audit findings
- resolving stale or conflicting memory
- resuming work started by another worker

The purpose of shared memory is durable continuity between agents and sessions.

It must not replace Git, authoritative specifications, or Orca.

---

## 1. Authority model

Use each system for its intended purpose.

### Specifications

Authoritative product, architecture, governance, privacy, safety, accessibility, and approved implementation specifications define what the product should do.

Specifications are product truth.

### Git

The current repository and Git history define what has actually been implemented.

Git is implementation truth.

### Orca

Orca defines live operational state, including:

- active worktree
- workers
- tasks
- dispatches
- dependencies
- blockers
- questions
- handoffs
- completion state

Orca is live coordination truth.

### project-memory

`project-memory` contains durable shared knowledge such as:

- decisions
- findings
- task outcomes
- blockers
- root causes
- audit findings
- important dependencies
- historical context
- handoffs

Memory is persistent context.

Memory is not automatically authoritative.

### Individual conversations

Individual Kiro, Codex, Cursor, or Gemini conversations are temporary working context only.

Important knowledge must not exist only in one conversation.

---

## 2. Conflict hierarchy

When sources disagree, use this reasoning:

1. current explicit user decisions
2. authoritative specifications for required behavior
3. current Git for implementation facts
4. current Orca state for live work
5. current verified project-memory
6. historical memory/plans
7. individual conversation context

The hierarchy is contextual.

For example:

- Specifications determine what SHOULD exist.
- Git determines what DOES exist.
- Orca determines what is happening NOW.
- Memory explains what the team LEARNED or DECIDED.

Never allow stale memory to override current Git or an authoritative requirement.

---

## 3. Shared namespace

All Career Expo agents use the same project-memory namespace:

`career-expo`

Current stable agent identities:

- `KIRO-LEAD`
- `CODEX-1`
- `CODEX-2`
- `CODEX-3`

Future examples:

- `CODEX-4-CODE`
- `CURSOR-1-CODE`
- `CURSOR-2-CODE`
- `GEMINI-1-CODE`
- `GEMINI-2-AUDIT`

Use stable explicit identities.

Do not store important work under ambiguous identities such as:

- agent
- assistant
- worker
- codex
- reviewer

---

## 4. Retrieval before substantial work

Before substantial implementation, investigation, integration, or review, retrieve project-memory relevant to the task.

Useful retrieval targets include:

- task ID or task name
- feature
- requirement
- component
- architecture decision
- known bug
- blocker
- audit finding
- affected API
- affected database entity
- previous implementation attempt
- prior task completion
- compatibility constraint

Retrieve targeted information rather than dumping the entire graph into context.

Memory should orient the worker.

It does not replace inspection of current code.

---

## 5. Recommended retrieval sequence

For substantial implementation, prefer this order:

1. current task context
2. related requirements
3. active architecture decisions
4. affected component history
5. unresolved blockers
6. unresolved audit findings
7. recent related task outcomes
8. relevant failed approaches

After retrieval, inspect current Git and affected code.

When implementation-sensitive facts matter, verify memory against the repository.

---

## 6. Semantic search vs graph query

Use semantic memory search for conceptual questions such as:

- What did we previously learn about replay?
- Was there a bug related to NPC knowledge?
- What decisions relate to renderer parity?
- What previous work affected this feature?

Use structured graph queries for relationship or exact-state questions such as:

- Which ACTIVE decisions affect this component?
- Which tasks implement this requirement?
- Which unresolved audit findings affect this feature?
- Which decision superseded DEC-011?
- Which worker completed TASK-42?
- Which blocker currently blocks this task?

If semantic search returns nothing and the information may exist as structured graph data, use a graph query before concluding that the information is absent.

---

## 7. What belongs in project-memory

Store information when losing it would cause a future worker to:

- repeat meaningful investigation
- misunderstand an important constraint
- repeat a failed approach
- violate a requirement
- miss an important dependency
- misunderstand why architecture changed
- lose task continuity
- miss an unresolved blocker
- miss an important audit finding
- incorrectly resume work

Good memory candidates include:

### Decisions

Important technical decisions and their rationale.

### Findings

Non-obvious facts discovered through investigation.

### Bugs

Confirmed meaningful defects and root causes.

### Blockers

Conditions preventing work from progressing.

### Task outcomes

What substantial work completed and what was verified.

### Audit findings

Independent review findings and their lifecycle.

### Handoffs

Information necessary for another worker to continue safely.

### Verification

Important evidence associated with completed work.

### Failed approaches

Significant approaches that were tried and rejected, when future workers could otherwise repeat them.

---

## 8. What does NOT belong in project-memory

Do not store:

- routine terminal commands
- ordinary progress narration
- raw `git status`
- huge build logs
- giant stack traces
- complete source files
- complete diffs
- entire conversations
- every commit
- trivial observations
- temporary debugging guesses
- brainstorming that was never adopted
- duplicate current facts
- embedding vectors
- passwords
- API keys
- authentication tokens
- cookies
- credentials
- secret environment-variable values

Git stores source code and diffs.

Memory stores reusable understanding about the project.

---

## 9. Core graph concepts

Prefer consistent concepts when structured memory is useful.

### Project

Represents Career Expo.

Preferred identity:

`Career-Expo`

### Requirement

A product, architecture, privacy, governance, accessibility, safety, or technical requirement.

Preferred identifier:

`REQ-<stable-id>`

### Feature

A substantial user-facing or system capability.

### Component

A meaningful subsystem, package, service, renderer, or architectural unit.

### File

A source or documentation file when linking it materially improves reasoning.

Do not automatically create graph entries for every file.

### API

A meaningful internal or external contract.

### DatabaseEntity

A meaningful persistent entity/schema concept.

### Task

A bounded unit of implementation, investigation, remediation, or integration.

Prefer the Orca task ID when one exists.

### Agent

A stable worker identity.

### Decision

A durable technical decision.

Preferred identifier:

`DEC-<stable-id>`

### Bug

A confirmed defect.

Preferred identifier:

`BUG-<stable-id>`

### Blocker

A condition preventing progress.

Preferred identifier:

`BLOCK-<stable-id>`

### Verification

Evidence that work was checked.

### Test

A meaningful test or test group when linking it provides reasoning value.

### Commit

A meaningful Git commit associated with a task or checkpoint.

### Audit

An independent review event.

### AuditFinding

A specific finding produced by an audit.

Preferred identifier:

`AUD-<audit-id>-F<number>`

### Handoff

A durable transfer of context or responsibility between workers.

### IntegrationCheckpoint

A meaningful combined project milestone.

---

## 10. Preferred relationships

Use relationships when they improve future reasoning.

Examples:

`Project HAS_REQUIREMENT Requirement`

`Task IMPLEMENTS Requirement`

`Task AFFECTS Feature`

`Task MODIFIES Component`

`Task PRODUCES Commit`

`Agent WORKED_ON Task`

`Task DEPENDS_ON Task`

`Feature DEPENDS_ON Feature`

`Component DEPENDS_ON Component`

`Decision AFFECTS Component`

`Decision AFFECTS Feature`

`Decision SUPERSEDES Decision`

`Bug AFFECTS Component`

`Bug FIXED_BY Task`

`Blocker BLOCKS Task`

`Verification VERIFIES Task`

`Test VALIDATES Requirement`

`Audit PRODUCES AuditFinding`

`AuditFinding AFFECTS Requirement`

`AuditFinding AFFECTS Component`

`AuditFinding RESOLVED_BY Task`

`Handoff FROM Agent`

`Handoff TO Agent`

Do not create relationships solely to make the Neo4j visualization look complex.

Every relationship should provide future reasoning value.

---

## 11. Memory lifecycle

Where applicable, records should clearly distinguish current information from historical information.

Recommended lifecycle states:

### ACTIVE

Currently valid and operationally relevant.

### SUPERSEDED

Previously valid but replaced by newer information.

### RESOLVED

A bug, blocker, or finding has been addressed and verified.

### INVALIDATED

The information was discovered to be incorrect.

### HISTORICAL

Preserved for context but no longer operationally current.

Do not delete useful history simply because newer information exists.

Prefer:

`DEC-022 SUPERSEDES DEC-011`

and:

`DEC-011.status = SUPERSEDED`

rather than deleting DEC-011.

---

## 12. Provenance

Important memory should contain enough provenance to verify it later.

Use relevant metadata such as:

- `project_id`
- `task_id`
- `orca_run_id`
- `orca_dispatch_id`
- `agent_id`
- `agent_role`
- `requirement_id`
- `feature`
- `component`
- `branch`
- `commit_sha`
- `source_file`
- `source_section`
- `created_at`
- `status`
- `confidence`
- `verified`
- `superseded_by`

Not every record requires every property.

Use only metadata that provides real value.

---

## 13. Confidence and verification

Do not represent uncertain information as established truth.

Suggested confidence interpretation:

### 1.0

Directly verified against an authoritative source or current implementation.

### 0.8–0.9

Strong evidence but not fully validated.

### 0.5–0.7

Investigation finding or hypothesis requiring confirmation.

Below 0.5:

Normally do not preserve it as durable project knowledge unless the hypothesis itself is important to ongoing investigation.

Prefer explicit wording such as:

- VERIFIED
- OBSERVED
- INFERRED
- SUSPECTED

when that communicates uncertainty more clearly than a number.

---

## 14. Decision records

Important decisions should preserve:

```text
Decision ID:
Status:
Title:
Decision:
Rationale:
Alternatives considered:
Affected requirements:
Affected features/components:
Task:
Agent:
Source:
Commit:
Supersedes:
Verification:
```

Keep actual stored records concise.

---

## 15. Bug and root-cause records

For meaningful confirmed bugs, preserve:

```text
Bug ID:
Status:
Symptom:
Root cause:
Affected component:
Reproduction:
Fix task:
Regression protection:
Agent:
Commit:
```

Do not store a guessed root cause as confirmed.

If investigation is incomplete, label it as a hypothesis or finding.

---

## 16. Blocker records

Use:

```text
Blocker ID:
Status:
Blocked task:
Description:
Evidence:
What was attempted:
Required dependency/decision:
Owner:
Created by:
```

When resolved:

- mark the blocker `RESOLVED`
- link the resolving task or decision
- preserve the original blocker history

---

## 17. Audit finding records

Use:

```text
Finding ID:
Status:
Severity:
Title:
Affected requirement:
Affected component:
Evidence:
Why it matters:
Recommended response:
Confidence:
Audit ID:
Auditor:
```

Suggested severity:

- CRITICAL
- HIGH
- MEDIUM
- LOW

Suggested lifecycle/adjudication states:

- OPEN
- VALID
- INVALID
- SPECULATIVE
- ALREADY_RESOLVED
- NEEDS_MORE_EVIDENCE
- REQUIRES_USER_DECISION
- RESOLVED

The auditor creates findings.

Kiro adjudicates them.

An auditor must not independently turn a disputed finding into accepted project truth.

---

## 18. Completion memory

Every substantial implementation task should create a durable completion checkpoint.

Recommended format:

```text
Task:
Worker:
Role:
Status:
Outcome:

Requirements addressed:
Components changed:
Major files changed:
Important decisions:
Dependencies discovered:
Bugs/root causes:
Verification performed:
Verification result:
Known limitations:
Unresolved issues:
Follow-up:
Branch:
Commit:
```

Do not store every modified line.

Git contains the implementation.

The completion record explains what happened and what future workers need to know.

---

## 19. Handoff protocol

Create durable handoff state when work changes agents because of:

- task completion
- usage limit
- context pressure
- worker failure
- reassignment
- audit remediation
- integration change

The next worker should be able to reconstruct the task using:

1. Orca task/dispatch
2. project-memory
3. Git
4. authoritative specifications

A useful handoff answers:

- What was the goal?
- What is already complete?
- What remains?
- What decisions were made?
- What failed?
- What files/components matter?
- What verification has run?
- What unresolved risks exist?
- What should the next worker inspect first?

Do not require access to the previous worker's conversation.

---

## 20. Usage-limit handoff

If a worker reaches a provider usage limit during a task:

1. preserve important findings already known
2. preserve actual implementation in Git/worktree
3. update Orca task state where possible
4. preserve unresolved state in project-memory when useful
5. let Kiro determine whether reassignment is safe
6. have the replacement worker retrieve relevant memory
7. have the replacement worker inspect Git before continuing

Do not manually recreate the previous conversation.

The continuity system is:

Orca
+ project-memory
+ Git
+ specifications

---

## 21. Memory conflict handling

If memory conflicts with current code:

1. inspect current Git
2. inspect the relevant requirement
3. inspect the related decision/history when useful
4. determine which information is stale
5. notify Kiro when the discrepancy matters
6. supersede or invalidate stale memory
7. preserve useful historical context

If memory conflicts with an authoritative product requirement:

the authoritative requirement wins unless the user explicitly approved a change.

Do not silently change requirements to match memory.

---

## 22. Duplicate-memory prevention

Avoid multiple unrelated records claiming to represent the same current truth.

Before writing an important decision or finding:

1. search for an existing related record
2. determine whether it should be updated
3. determine whether the new record supersedes it
4. create a separate record only when it represents a genuinely new event, decision, or finding

Historical task completions may reference the same requirement repeatedly.

That is acceptable.

Duplicate conflicting ACTIVE decisions are not.

---

## 23. Memory and Git commits

Do not create a memory record for every commit.

Associate commits with memory when they represent:

- a completed Orca task
- an important bug fix
- an architecture change
- an audit remediation
- a significant integration checkpoint

Git remains the complete commit history.

Memory provides semantic meaning around important commits.

---

## 24. Memory and specifications

Do not copy entire specifications into Neo4j.

Store:

- requirement references
- source-document references
- important interpretations
- implementation decisions
- relationships to tasks/features/components

The source specification remains authoritative.

When practical, retain:

- requirement ID
- source file
- source section

so future workers can verify the original requirement.

---

## 25. Secret-handling rules

Never persist secret values in project-memory.

Forbidden examples:

```text
API_KEY=<secret>
PASSWORD=<secret>
TOKEN=<secret>
COOKIE=<secret>
```

Acceptable:

```text
The local Neo4j MCP requires the NEO4J_PASSWORD environment variable.
```

The existence or name of a required secret may be documented.

Its value must never be stored.

---

## 26. End-of-task sequence

For substantial implementation, use this sequence:

```text
finish implementation
↓
run focused verification
↓
run broader verification when warranted
↓
inspect resulting diff
↓
write/update durable project-memory
↓
report worker completion through Orca
↓
Kiro verifies and adjudicates
```

Do not create a successful completion record before verification succeeds.

If verification fails, the task remains incomplete or blocked.

---

## 27. Kiro memory responsibilities

Kiro should maintain overall memory quality.

Kiro should:

- retrieve prior decisions before major planning
- ensure important worker findings survive handoffs
- detect contradictory current memory
- adjudicate audit findings
- supersede stale decisions
- preserve major integration checkpoints
- preserve important coordination-level decisions
- avoid storing routine managerial chatter
- keep the graph useful for future workers

Kiro should not manually duplicate every worker completion.

Workers should preserve their own meaningful task outcomes whenever possible.

Kiro stores project-wide coordination knowledge that workers do not own.

---

## 28. Implementation worker memory responsibilities

Implementation workers should:

- retrieve relevant memory before substantial work
- verify implementation-sensitive facts against Git
- preserve important discoveries
- preserve meaningful root causes
- preserve important constraints
- preserve important task outcomes
- preserve unresolved blockers
- identify themselves consistently
- avoid memory noise
- never expose secrets

Workers must not independently rewrite project-wide memory governance.

---

## 29. Auditor memory responsibilities

Auditors may preserve:

- audit event information
- actionable findings
- evidence references
- affected requirements
- affected components
- confidence

Auditors should not mark disputed findings as accepted truth.

Kiro adjudicates findings.

After adjudication, durable memory should reflect the resulting status.

---

## 30. Graph visualization principles

The Neo4j visualization represents actual project knowledge.

Do not optimize memory creation merely to make the graph look impressive.

Useful graph paths include:

```text
Requirement
→ Task
→ Component
→ Commit
→ Verification
```

and:

```text
Audit
→ AuditFinding
→ Requirement
→ Corrective Task
→ Resolution
```

and:

```text
Decision
→ SUPERSEDES
→ Previous Decision
```

Graph quality comes from meaningful relationships, not node count.

---

## 31. Memory efficiency

The purpose of shared memory is to reduce repeated context, not reproduce whole conversations.

When retrieving:

- search narrowly
- retrieve relevant relationships
- avoid unnecessary graph dumps
- summarize large history when appropriate

When writing:

- preserve durable knowledge
- deduplicate
- use meaningful structure
- supersede stale information
- avoid narration

A future worker should be able to understand the project without loading years of irrelevant history.

---

## 32. Final shared-memory principle

A qualified future worker should be able to determine:

- Why is the system built this way?
- Which requirements matter to this feature?
- Which important decisions are currently active?
- Which decisions were superseded?
- What was tried before?
- What important bugs/root causes were found?
- What blockers remain?
- What work recently completed?
- What verification was performed?
- What audit findings remain unresolved?
- What should happen next?

without needing access to the original Kiro, Codex, Cursor, or Gemini conversations.

If project-memory enables that while remaining concise, structured, and verifiable, it is serving its purpose.