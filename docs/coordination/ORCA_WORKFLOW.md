# Career Expo Orca Orchestration Workflow

This document defines how Kiro and project workers coordinate work through Orca.

It supplements `AGENTS.md` and `docs/coordination/MEMORY_PROTOCOL.md`.

Use this document for:

- task creation
- worker selection
- task dispatch
- worktree coordination
- worker communication
- blocker escalation
- completion reporting
- integration
- reassignment
- audit triggering
- recovery after worker or provider failure

The goal is to let Kiro coordinate the engineering team without requiring the user to manually copy information between agent conversations.

---

## 1. Coordination authority

Kiro is the single technical coordinator.

Orca is the live orchestration system Kiro uses to coordinate workers.

The standard control flow is:

```text
User
→ Kiro
→ Orca task/dispatch
→ Worker
→ Git + project-memory
→ Orca completion/blocker
→ Kiro
```

Workers do not independently redefine project sequencing or assign other workers unless Kiro explicitly delegates that authority.

Orca state should represent what the team is doing now.

`project-memory` should preserve what the team needs to remember later.

Git should preserve what was actually implemented.

---

## 2. Use current Orca state, not assumptions

Before substantial planning or dispatch, Kiro should inspect the current Orca environment.

Confirm when relevant:

- active repository
- active Orca-managed worktree
- branch
- current tasks
- active runs
- existing dispatches
- worker sessions
- worker availability
- blockers
- unresolved questions
- completed-but-unreviewed work

Never assume a worker is available merely because an old terminal or memory entry says it exists.

Never assume an old worktree path is current.

Resolve live state through Orca.

---

## 3. Use the installed Orca skills as command authority

The exact Orca CLI command surface may evolve.

When performing orchestration operations, Kiro should use the installed:

- `orca-cli`
- `orchestration`

skills as the operational command reference.

Do not rely on stale hardcoded CLI syntax from an old conversation when the current skill documentation or Orca runtime provides current instructions.

This document defines workflow and authority.

The installed Orca skills define the current mechanics for carrying it out.

---

## 4. Standard worker roster

Current intended roster:

### KIRO-LEAD

Role:
- planning
- coordination
- task decomposition
- assignment
- integration oversight
- verification adjudication
- audit adjudication

### CODEX-2

Role:
- primary implementation

### CODEX-3

Role:
- primary implementation

### CODEX-1

Role:
- independent audit/review when available

Additional workers may be added later.

Worker identity should remain stable even when the underlying provider account changes.

---

## 5. Worker availability

Worker availability is dynamic.

A worker may be:

- AVAILABLE
- WORKING
- WAITING
- BLOCKED
- COMPLETED
- UNAVAILABLE
- USAGE_LIMITED

Kiro should inspect actual current state before assigning work.

A provider usage limit is normal capacity loss, not a project failure.

If a worker is unavailable, Kiro may assign another suitable worker when doing so is safe.

Do not force continuation through an unsuitable worker merely to keep work moving.

---

## 6. Task creation standard

A substantial Orca task should be independently understandable.

Include when applicable:

### Objective

What concrete outcome is required?

### Why

What requirement, bug, finding, or project goal motivates the task?

### Acceptance criteria

What must be true before the task can be considered complete?

### Relevant requirements

Which authoritative requirements/specifications govern the work?

### Scope

Which feature, component, package, API, or workflow is in scope?

### Out of scope

What should not be changed?

### Dependencies

What other tasks, decisions, APIs, migrations, or components must already exist?

### Relevant prior context

Reference useful project-memory instead of pasting entire historical conversations.

### Risks

Identify important risk areas such as:

- deterministic behavior
- privacy
- safety
- renderer parity
- persistence
- public contracts
- accessibility
- migrations

### Verification expectations

State the minimum verification appropriate to the task.

---

## 7. Task size

Prefer cohesive engineering tasks.

A good task normally has:

- one clear goal
- coherent implementation ownership
- understandable acceptance criteria
- a bounded integration surface

Do not split work only to maximize the number of active workers.

Avoid both extremes:

### Too small

Examples:

- change one obvious variable
- run one deterministic command
- rename one safe symbol

Delegation overhead may exceed the work.

### Too large

Examples:

- implement an entire subsystem with several unresolved architecture decisions
- rewrite multiple major packages without checkpoints

Large work should be decomposed when independent validation points exist.

---

## 8. Worker selection

Kiro chooses workers based on:

- task complexity
- current availability
- current usage capacity
- context already held by a worker
- overlap with other active tasks
- failure cost
- review independence requirements

Current default:

```text
normal implementation
→ CODEX-2 or CODEX-3

second independent implementation task
→ other available CODE worker

independent audit
→ CODEX-1
```

Do not assign the auditor as the normal implementation worker merely because coding capacity is exhausted unless Kiro explicitly decides the role change is worth losing audit independence.

---

## 9. Model/reasoning selection

Use reasoning effort proportional to task difficulty.

Suggested defaults:

### Low

- status checks
- environment inspection
- tiny deterministic edits
- straightforward setup

### Medium

- ordinary implementation
- normal debugging
- routine tests
- common integration work

### High

- architecture
- complex debugging
- deterministic/replay failures
- privacy/security
- safety-sensitive behavior
- high-risk integration
- independent audit

Do not spend high reasoning capacity on trivial work merely because it is available.

---

## 10. Worktree strategy

Orca should remain the authority for Orca-managed worktrees.

Before dispatching write work, Kiro should decide whether:

- the current worktree is appropriate
- an isolated Orca-managed worktree is required
- concurrent workers require separate worktrees
- sequential work is safer

Do not create unmanaged Git worktrees when Orca should manage them.

Do not let two write workers modify overlapping files in the same worktree concurrently.

---

## 11. Concurrency decision

Parallelize only when independence is real.

Before dispatching two implementation workers concurrently, Kiro should consider:

- file overlap
- component overlap
- schema overlap
- shared APIs
- migrations
- state models
- shared tests
- dependency ordering
- architecture decisions still being resolved

Parallel work is usually safe when:

- ownership is clearly disjoint
- one task does not require the other's output
- public contracts are stable

Sequential work is preferred when changes affect common contracts or shared state.

Read-only investigation and audit can often run concurrently with unrelated work.

---

## 12. Dispatch preparation

Before dispatching a substantial task, Kiro should:

1. verify the task is ready
2. verify dependencies
3. verify worker availability
4. resolve the intended worktree
5. provide clear acceptance criteria
6. reference applicable specifications
7. identify important project-memory context
8. state verification expectations
9. ensure the dispatch does not duplicate already-active work

Do not knowingly dispatch the same implementation task to multiple workers unless comparison or redundancy is explicitly intended.

---

## 13. Dispatch contents

A worker dispatch should be concise but sufficient.

Recommended structure:

```text
TASK:
<stable task ID and title>

OBJECTIVE:
<required outcome>

REQUIREMENTS:
<relevant spec/requirement references>

ACCEPTANCE CRITERIA:
- ...
- ...

SCOPE:
<allowed areas>

OUT OF SCOPE:
<areas not to change>

DEPENDENCIES:
<required prior state>

MEMORY CONTEXT:
<topics/IDs the worker should retrieve>

VERIFICATION:
<minimum expected checks>

REPORTING:
Follow AGENTS.md, MEMORY_PROTOCOL.md, and ORCA_WORKFLOW.md.
Write durable completion memory when substantial.
Report completion/blocker through Orca.
```

Do not paste enormous specifications into every dispatch.

Point the worker to authoritative sources and relevant memory.

---

## 14. Worker startup after dispatch

When a worker receives an Orca dispatch, it should:

1. identify its assigned task and dispatch
2. read `AGENTS.md`
3. read this workflow when orchestration behavior is relevant
4. read `MEMORY_PROTOCOL.md` when using shared memory
5. read the applicable authoritative specification/plan
6. resolve/confirm the correct worktree
7. inspect Git state
8. retrieve targeted project-memory
9. inspect affected code
10. begin implementation only after understanding the task boundary

The user should not need to repeat context that already exists in these systems.

---

## 15. Existing worker sessions

When appropriate, Orca may reuse already-running worker sessions rather than creating unnecessary new sessions.

Before reusing a worker, verify:

- correct worker identity
- correct provider/account
- worker is not currently committed to another conflicting task
- expected MCP/project-memory connection is available
- correct repository/worktree can be accessed

Do not assume every visible terminal is an orchestration worker.

A normal terminal/session and an actively supervised Orca dispatch are different states.

---

## 16. Worker communication

Workers should communicate task-relevant questions through Orca whenever the orchestration workflow supports it.

Questions should be specific.

Good:

```text
TASK-42 requires changing the canonical ActionResult schema.
This affects renderer parity and TASK-45.
Should the schema change be included here or split into a prerequisite task?
```

Poor:

```text
What should I do?
```

Kiro should answer based on:

- specifications
- Git
- project-memory
- dependency state
- project plan

Important decisions resulting from these questions should be preserved in project-memory when future workers may need them.

---

## 17. No user-as-message-bus rule

The user must not become the routine transport mechanism between workers.

Do not ask the user to:

- paste Codex output into Kiro
- paste Kiro output into Codex
- summarize another worker
- recreate another worker's context
- manually communicate ordinary blockers

when Orca, Git, or project-memory can provide the information.

Escalate to the user only when genuine human authority is required.

---

## 18. Genuine user decision gates

Kiro should request a user decision when the issue materially changes:

- product scope
- acceptance criteria
- business behavior
- explicit UX direction
- privacy policy
- safety/governance requirements
- non-negotiable architecture requirements
- irreversible/destructive behavior

Do not escalate routine engineering decisions that fall within Kiro's technical authority.

When requesting a decision, explain:

- what decision is required
- why it cannot be resolved technically
- relevant options
- important tradeoffs
- Kiro's recommended option when appropriate

---

## 19. Worker progress

Workers do not need to persist every progress update.

Orca live state is sufficient for ordinary progress.

Use project-memory only when progress reveals durable knowledge such as:

- discovered dependency
- architectural constraint
- meaningful root cause
- blocker
- changed assumption
- failed approach that future workers should avoid

Avoid memory pollution from routine narration.

---

## 20. Blocker protocol

If a worker cannot continue safely, it should report a blocker rather than improvising around a hard requirement.

A useful blocker includes:

```text
TASK:
BLOCKER:
EVIDENCE:
ATTEMPTS:
IMPACT:
REQUIRED DECISION OR DEPENDENCY:
RECOMMENDED NEXT STEP:
```

When durable, also preserve the blocker in project-memory according to `MEMORY_PROTOCOL.md`.

Kiro should classify the blocker as one of:

- worker can resolve
- prerequisite task required
- another worker should investigate
- architecture decision required
- user decision required
- external/provider/environment issue
- task should be re-planned

---

## 21. Failed implementation protocol

A worker should not repeatedly retry essentially the same failed approach.

After meaningful failure:

1. preserve evidence
2. determine likely failure class
3. report through Orca when assistance is needed
4. store reusable root-cause/failure knowledge when appropriate
5. let Kiro re-plan if necessary

Failure classes may include:

- incorrect assumption
- unclear task
- architecture mismatch
- dependency failure
- environment failure
- test failure
- implementation defect
- provider usage limit

Repeated failure without new evidence should trigger re-planning.

---

## 22. Usage-limit interruption

If a worker reaches a provider usage limit:

1. do not treat the task as successfully complete
2. preserve actual changes in the worktree/Git
3. preserve important partial findings in project-memory when possible
4. report current state through Orca when possible
5. mark the worker unavailable/usage-limited
6. let Kiro decide whether reassignment is safe

A replacement worker must:

1. read the task
2. retrieve project-memory
3. inspect Git/worktree state
4. identify incomplete work
5. verify previous assumptions
6. continue only after reconstructing current state

The previous conversation is not required for continuity.

---

## 23. Verification before completion

Before reporting success, the implementation worker must perform verification required by:

- the task
- `AGENTS.md`
- authoritative specifications
- project risk

A completion report must distinguish:

```text
IMPLEMENTED
```

from:

```text
IMPLEMENTED AND VERIFIED
```

Do not claim the latter without fresh successful checks.

---

## 24. Completion sequence

For substantial work, the worker should use this sequence:

```text
finish implementation
↓
run focused verification
↓
run broader verification when warranted
↓
inspect the resulting diff
↓
write/update project-memory completion state
↓
report worker completion through Orca
```

Do not report completion before verification merely to free the worker.

---

## 25. Completion report

A useful Orca completion should include:

```text
TASK:
STATUS:
SUMMARY:

REQUIREMENTS ADDRESSED:
COMPONENTS CHANGED:
IMPORTANT DECISIONS:
VERIFICATION:
KNOWN LIMITATIONS:
UNRESOLVED ISSUES:
FOLLOW-UP:
MEMORY/HANDOFF:
BRANCH/COMMIT:
```

Keep the Orca report concise.

Detailed implementation remains in Git.

Durable reusable knowledge belongs in project-memory.

---

## 26. Completion exactly once

A worker should send the required completion signal for a dispatch exactly once unless Orca's current orchestration protocol explicitly specifies otherwise.

Do not send multiple competing completion reports for the same dispatch.

If a correction is requested after completion, Kiro should create or reopen the appropriate tracked work according to current Orca capabilities rather than pretending the original completion never happened.

---

## 27. Kiro completion review

A worker completion is not automatically accepted.

For meaningful tasks, Kiro should:

1. receive/read the Orca completion
2. retrieve the task's relevant project-memory
3. inspect the actual Git diff or commit
4. inspect verification evidence
5. compare the outcome against acceptance criteria
6. compare against authoritative requirements
7. inspect integration impact
8. decide whether to accept

Kiro may classify the result:

- ACCEPTED
- CORRECTION_REQUIRED
- BLOCKED
- NEEDS_INTEGRATION
- NEEDS_AUDIT
- NEEDS_USER_DECISION

---

## 28. Correction loop

If correction is required:

```text
Kiro identifies concrete issue
↓
Kiro creates/updates corrective task
↓
appropriate implementation worker fixes it
↓
fresh verification
↓
updated memory/handoff
↓
Orca completion
↓
Kiro re-evaluates
```

Avoid vague prompts such as:

```text
make it better
```

Correction tasks should identify the failed acceptance criterion or verified issue.

---

## 29. Integration

Independently successful tasks may still conflict during integration.

Before integration, Kiro should consider:

- overlapping files
- shared contracts
- schema changes
- dependency versions
- migrations
- API assumptions
- deterministic state behavior
- renderer parity
- test interactions

Use Orca-managed worktree/Git workflows.

After integration, run verification appropriate to the combined risk.

Do not assume passing worker-level tests prove combined integration correctness.

---

## 30. Commit ownership

A worker should normally commit its own coherent completed task when the current repository workflow expects task-level commits.

Do not create separate agents merely to commit already-completed work.

Commit messages should make task purpose understandable.

Project-memory may associate important task completions with the resulting commit SHA.

Git remains the authoritative commit history.

---

## 31. Audit trigger

Kiro should request an independent audit when the checkpoint warrants it.

Common triggers:

- major feature group completed
- architecture changed
- public/shared contract changed
- privacy/security/safety changed
- persistence or migration changed
- large integration completed
- repeated failures suggest design drift
- release candidate reached

Do not burn audit capacity reviewing trivial edits individually.

---

## 32. Auditor dispatch

Audit tasks should clearly state:

- audit scope
- authoritative requirements
- relevant commits/diff
- relevant project-memory
- known risk areas
- expected finding format

Auditor is read-only by default.

Auditor reports findings to Kiro.

Auditor does not command implementation workers.

---

## 33. Audit adjudication

Kiro should evaluate each meaningful audit finding.

Allowed classifications:

- VALID
- INVALID
- SPECULATIVE
- ALREADY_RESOLVED
- NEEDS_MORE_EVIDENCE
- REQUIRES_USER_DECISION

Valid findings may become corrective Orca tasks.

Important adjudication should be reflected in project-memory.

Do not automatically implement every auditor suggestion.

---

## 34. Worker reassignment

Reassignment is appropriate when:

- usage capacity is exhausted
- worker fails
- worker is unavailable
- task complexity changes
- another worker is materially better suited
- concurrency plan changes

Before reassignment, Kiro should ensure enough durable state exists for another worker to reconstruct progress.

The replacement worker must not assume the outgoing worker's hidden conversation context.

---

## 35. Task dependencies

Represent real dependencies explicitly when Orca supports them.

If TASK-B requires TASK-A:

```text
TASK-A
↓
TASK-B
```

Do not dispatch TASK-B merely because a worker is idle.

Dependencies should reflect actual technical ordering.

Avoid unnecessary dependency chains that prevent safe parallelism.

---

## 36. Decision gates

Use Orca decision gates when execution depends on a genuine unresolved choice that should not be silently decided by a worker.

Good uses include:

- user product decision
- risky architecture fork
- destructive operation approval
- specification conflict

Do not create gates for ordinary technical decisions Kiro already has authority to make.

---

## 37. Recovery after Orca interruption

If Orca or an agent session restarts:

Kiro should reconstruct current state from:

1. current Orca runtime
2. current worktrees
3. Git
4. project-memory
5. task/dependency records

Do not assume the previous conversation is the only source of coordination truth.

If Orca live state and durable project state disagree, investigate before resuming writes.

---

## 38. Recovery after Kiro restart

When Kiro starts a fresh lead session during active development, it should orient itself before dispatching new work.

Recommended sequence:

```text
resolve current Orca runtime/worktree
↓
inspect active tasks/workers/dispatches
↓
inspect Git status and recent relevant commits
↓
retrieve current project-memory decisions/blockers/completions
↓
read applicable authoritative plan/spec
↓
resume coordination
```

Do not immediately create duplicate tasks after restart.

---

## 39. No duplicate work rule

Before creating a new task, Kiro should check whether the same work is already:

- active
- dispatched
- completed but awaiting review
- implemented in Git
- recorded as resolved

Duplicate work wastes subscription capacity and creates integration risk.

---

## 40. User interaction model

For normal coordinated development, the intended workflow is:

```text
User gives goal to Kiro
↓
Kiro determines plan
↓
Kiro coordinates workers through Orca
↓
workers use Git + project-memory
↓
Kiro reviews results
↓
Kiro reports meaningful outcome to user
```

The user should not have to operate as the project manager between individual agents.

---

## 41. Final orchestration principle

Orca should make the current team state inspectable.

At any meaningful point, Kiro should be able to determine:

- What are we trying to accomplish?
- What task is active?
- Who owns it?
- Which worktree contains it?
- What does it depend on?
- Is the worker active, blocked, completed, or unavailable?
- What durable knowledge has been discovered?
- What code actually changed?
- What verification has run?
- What remains before acceptance?
- Does the result require audit?
- What should happen next?

If those questions can be answered from Orca, Git, project-memory, and authoritative specifications without reconstructing individual conversations, the orchestration system is working correctly.