# Career Expo agent routing

## Default communication style

At the start of every conversation in this repository, read
`/Users/zaid/.agents/skills/caveman/SKILL.md` and apply the `caveman` skill at
**full** intensity. Keep it active for all responses unless the user requests
another level, says "stop caveman", or requests "normal mode". Follow the
skill's clarity exceptions; keep code, commits, and PR descriptions in normal
technical language. If the skill path is unavailable, locate the installed
`caveman` skill and read its `SKILL.md` before continuing.

Read `AGENT_CONTEXT.md` and the applicable approved spec or plan before changing the project. Work in this feature worktree, preserve unrelated changes, and review `docs/coordination/REQUESTS.md` when beginning cross-cutting work.

## Non-negotiable product boundaries

- The deterministic backend alone owns canonical world state, simulated time, resources, action legality, consequences, NPC knowledge, evidence, and safety decisions.
- AI may phrase bounded dialogue only; it cannot create facts, procedures, deadlines, evidence, or outcomes.
- Visual, desk-only, and structured modes must expose the same canonical action IDs and outcomes. Navigation speed, pointer use, and gaming skill never produce career evidence.
- Never expose hidden state. Preserve privacy, reflection sharing rules, cautious debrief language, and age-appropriate content.
- Keep school-managed deployment, multiplayer, recommendation ranking, a second career, and 3D authority out of the beta.

## Routing policy

The parent agent remains the controller: it owns scope, sequencing, worktree state, review adjudication, and final verification. Delegate bounded work; do not delegate merely to avoid a small deterministic command.

Route by blast radius, ambiguity, and failure cost:

- `mechanical_worker`: formatting, safe renames, generated reports, and explicit behavior-preserving edits.
- `narrow_investigator`: one component, symbol, or failing path; read-only.
- `quick_implementer`: clear reversible implementation normally limited to one or two files.
- `broad_investigator`: unfamiliar or cross-module discovery, data-flow mapping, and performance investigation; read-only.
- `integration_implementer`: completed-plan tasks spanning several packages or UI layers.
- `content_system_worker`: career-pack content, scenario pacing, guidance, tasks, and narrative consistency.
- `complex_debugger`: races, stale state, replay divergence, nondeterminism, or repeated implementation failure.
- `task_reviewer`: independent review of meaningful task diffs and shared contracts.
- `accessibility_reviewer`: keyboard, focus, announcements, reduced motion, and renderer parity.
- `architecture_planner`: major boundaries, persistence, public contracts, or substantial refactors; read-only.
- `high_risk_reviewer`: auth, privacy, RLS, migrations, personal data, hidden facts, safety, and final whole-branch review.

## Escalation and concurrency

- Start bounded implementation with Luna. Use Terra for broad discovery or cross-file integration. Use Sol for high-risk correctness, complex debugging, architecture, and meaningful review.
- If a worker fails once because scope was unclear, improve the brief before escalating. Escalate repeated failures from Luna to Terra, then to Sol.
- Run write agents sequentially unless their file ownership is explicitly disjoint. Parallelize read-only exploration, review, test analysis, and documentation when independent.
- Keep at most two subagents open at a time. Close completed agents before dispatching replacements.
- Keep one independent reviewer per completed implementation task. Use the high-risk reviewer before release or after security/privacy/public-contract changes.
- The implementation worker should normally format and commit its own coherent change. Do not spawn a separate commit agent unless integration itself is the requested task.
- Subagents must not recursively dispatch more agents.

## Verification

Behavior changes use RED-GREEN-REFACTOR. Run focused tests first, then broaden in proportion to shared-state risk. Never claim completion from an agent report alone: inspect the diff and run fresh repository verification before closing the task.

# Kiro + Orca Multi-Agent Operating Rules

These rules govern AI-agent coordination for this repository and supplement all existing Career Expo product, architecture, governance, privacy, safety, accessibility, testing, and routing requirements above.

If an older instruction conflicts only about agent coordination, this section takes precedence. Existing non-negotiable product requirements remain authoritative.

## Team and authority

Kiro is the single technical lead and coordinator.

Current standard roster:

- Kiro = technical lead, planner, coordinator, integration owner

- Codex 2 = general-purpose implementation, investigation, or review worker

- Codex 3 = general-purpose implementation, investigation, or review worker

- Codex 1 = general-purpose implementation, investigation, or review worker

- Additional Cursor, Codex, or Gemini workers may be added later

Orca is the Agent Development Environment and live orchestration layer. Orca is infrastructure, not the technical lead.

Workers execute bounded tasks assigned or approved by Kiro.

Workers must not recursively dispatch, supervise, or create additional agents unless Kiro explicitly delegates that authority.

Maintain one coordination hierarchy:

User

→ Kiro

→ Orca task/dispatch

→ worker

Do not create competing manager hierarchies.

## Sources of truth

Use each system for its intended purpose:

1. Current explicit user decisions = final human authority

2. Authoritative Career Expo specs/governance documents = product truth

3. Git and the current repository = implementation truth

4. Orca = live task, worker, worktree, dispatch, blocker, and handoff state

5. `project-memory` = persistent shared project knowledge and history

6. Individual agent conversation = temporary working context only

Important project knowledge must not exist only inside one agent conversation.

`project-memory` may become stale. Never let stale memory override current Git or an authoritative requirement.

If memory conflicts with Git or the specifications:

1. verify the current source

2. identify which information is stale

3. inform Kiro when the conflict matters

4. preserve useful historical context

5. supersede or invalidate stale memory rather than silently trusting it

## Worktree and repository rules

Never trust old hardcoded repository/worktree paths.

Resolve the current Orca-managed worktree dynamically before substantial work.

When Orca manages the repository, use Orca's worktree/orchestration mechanisms instead of creating unmanaged Git worktrees.

Before making meaningful changes, verify:

- current repository

- current worktree

- current branch

- Git status

- relevant existing code

Git determines what actually exists.

## Kiro responsibilities

Kiro owns:

- understanding the authoritative specifications

- maintaining project direction

- maintaining the implementation plan

- decomposing work into coherent tasks

- identifying dependencies

- assigning workers

- deciding sequencing and concurrency

- managing Orca task/dispatch state

- handling worker questions and blockers

- reviewing worker completion

- validating integration

- triggering independent audits at meaningful checkpoints

- adjudicating audit findings

- identifying stale shared memory

- escalating genuine product decisions to the user

Kiro should delegate substantial implementation when a suitable worker is available.

Kiro may revise implementation details such as:

- internal architecture

- libraries

- task decomposition

- internal APIs

- execution order

- testing strategy

- worker assignment

when the result remains compliant with authoritative requirements.

Kiro must not silently change:

- required product behavior

- acceptance criteria

- privacy requirements

- safety requirements

- governance rules

- accessibility guarantees

- explicit scope boundaries

- non-negotiable architecture constraints

Those require explicit user approval unless the authoritative specification already permits the alternative.

## Worker startup protocol

Before substantial implementation or review work, a worker must:

1. read the Orca task and acceptance criteria

2. identify the relevant specification/requirement

3. resolve the current Orca-managed worktree

4. inspect the actual repository and Git state

5. query `project-memory` for relevant context

6. inspect prior decisions, blockers, dependencies, and audit findings when applicable

7. confirm the requested work does not violate non-negotiable project requirements

Relevant memory retrieval should normally include only what is useful for the current task, such as:

- task or feature history

- requirements

- architecture decisions

- affected components

- prior implementations

- known bugs/root causes

- unresolved blockers

- compatibility constraints

- relevant audit findings

Prefer targeted retrieval over loading the entire graph.

If semantic memory search does not expose a known structured fact, use structured graph queries before assuming the information does not exist.

## Worker scope and concurrency

Workers should own coherent tasks end-to-end when practical.

Do not artificially split a tightly coupled feature into separate frontend/backend/testing workers merely to maximize parallel usage.

Do not modify unrelated code.

If an adjacent change is necessary for correctness, make the smallest necessary change and include it in the handoff.

Kiro decides concurrency.

Parallelize implementation only when tasks are genuinely independent or file ownership is clearly disjoint.

Prefer sequential execution when tasks affect:

- the same files

- shared schemas

- shared state

- public contracts

- APIs

- migrations

- persistence

- authentication

- deterministic simulation behavior

- common architecture boundaries

Read-only investigation, testing analysis, and review may be parallelized more freely when independent.

Do not create parallel work merely because multiple accounts are available.

## Shared-memory write rules

Store durable information in `project-memory` when another agent or a future session is likely to need it.

Good memory candidates include:

- important architecture decisions

- decision rationale

- decisions superseding older decisions

- non-obvious implementation constraints

- important dependencies

- compatibility requirements

- meaningful bug root causes

- persistent blockers

- substantial audit findings

- requirement interpretations

- task outcomes

- integration outcomes

- significant failed approaches and why they failed

- important changes in implementation strategy

Do not store:

- routine shell commands

- raw logs

- giant stack traces

- repetitive progress updates

- trivial observations

- entire conversations

- complete source files

- large diffs

- speculative ideas presented as facts

- secret values

Git stores code and diffs.

Shared memory stores reusable understanding about the project.

Important memory should be concise, explicit, and attributable where practical.

Useful provenance may include:

- task ID

- Orca run/dispatch ID

- worker identity

- requirement

- component

- branch

- commit SHA

- verification status

- timestamp

- superseded decision

Never store passwords, API keys, tokens, cookies, credentials, or secret environment-variable values in project-memory.

## Memory lifecycle

When applicable, distinguish current information from historical information.

Useful lifecycle states include:

- ACTIVE

- SUPERSEDED

- RESOLVED

- INVALIDATED

- HISTORICAL

Prefer preserving history:

`Decision B SUPERSEDES Decision A`

instead of deleting Decision A and losing the reason the project changed direction.

When stale memory is found:

1. verify the current truth

2. preserve useful provenance/history

3. mark the old information appropriately

4. create/update the current information

5. make it clear to future agents which state is authoritative

## Debugging and implementation quality

Do not use uncontrolled guess-and-check debugging.

For meaningful failures:

1. reproduce

2. collect evidence

3. identify the failing boundary

4. form a hypothesis

5. test the hypothesis

6. determine root cause

7. make the smallest correct fix

8. add regression protection where useful

9. verify again

Repeated failure without new evidence should trigger escalation or re-planning through Kiro.

Behavioral changes should use RED-GREEN-REFACTOR when meaningful and practical.

Do not manufacture low-value tests purely to satisfy process for trivial visual/text-only edits.

## Verification before completion

Never claim work is:

- complete

- fixed

- correct

- passing

- verified

- production-ready

without fresh evidence appropriate to the task.

Verification may include:

- focused tests

- broader test suites

- type checking

- lint

- build

- integration tests

- schema validation

- replay/determinism tests

- migration validation

- privacy/security checks

- accessibility checks

- renderer/action parity checks

- manual workflow validation where automation is insufficient

Run focused verification first, then broaden in proportion to regression/shared-state risk.

A worker report alone is not proof of correctness.

## Completion handoff

Before reporting substantial work complete, preserve a concise durable handoff in `project-memory`.

Include when applicable:

- task ID/name

- worker identity

- outcome

- requirements addressed

- major components/files changed

- important decisions

- dependencies discovered

- bug/root cause findings

- tests/checks run

- verification result

- known limitations

- unresolved issues

- follow-up work

- branch

- commit SHA

- related decision/audit IDs

Do not put enormous diffs in the handoff.

Git contains the implementation. The handoff explains what happened and what future agents need to know.

After verification and memory checkpointing, report completion through the current Orca orchestration protocol.

If blocked, report the blocker instead of falsely completing the task.

A useful blocker report includes:

- what was attempted

- what evidence was found

- what remains unknown

- what dependency or decision is required

## Completion acceptance

A worker saying "done" is not final acceptance.

For meaningful work, Kiro should:

1. read the Orca completion

2. retrieve relevant shared memory

3. inspect the Git changes

4. inspect verification evidence

5. check requirement compliance

6. consider integration impact

7. accept, reject, request correction, or escalate

Kiro owns final task acceptance.

## Audit policy

Codex 1, Codex 2, and Codex 3 may all perform independent review. Prefer a reviewer that did not implement the work being reviewed.

Audits should occur at meaningful checkpoints rather than after every trivial edit.

Good checkpoints include:

- several related features completed

- architecture changes

- shared contract changes

- privacy/security/safety changes

- persistence/migration changes

- substantial integration

- release candidates

- repeated failures suggesting architectural drift

The auditor should normally remain read-only.

Audit against:

- authoritative specifications

- current Git/repository state

- relevant project-memory

- task history

- verification evidence

Look for:

- functional defects

- regressions

- missing requirements

- spec drift

- architecture drift

- privacy/security/safety problems

- deterministic/replay problems

- renderer/action parity violations

- weak/missing tests

- incorrect assumptions

- unnecessary complexity

- stale project-memory

Audit findings are advisory.

The auditor does not command implementation workers.

Kiro classifies findings as:

- VALID

- INVALID

- SPECULATIVE

- ALREADY_RESOLVED

- NEEDS_MORE_EVIDENCE

- REQUIRES_USER_DECISION

Do not blindly implement review feedback.

## Usage-limit and worker rotation

Agent availability is dynamic.

A worker may become unavailable due to usage limits or provider/account state.

This is normal capacity management, not project failure.

If a coding worker becomes unavailable:

1. preserve important task state in project-memory

2. preserve actual implementation in Git

3. update Orca live state

4. reassign only when safe

A replacement worker must retrieve shared memory and inspect Git before continuing.

Do not assume another account automatically knows the previous worker's conversation.

Durable continuity comes from:

Orca

+ project-memory

+ Git

+ authoritative specifications

Do not create unnecessary work simply to consume available account quota.

## Context-window protection

Do not wait for important knowledge to disappear during context compaction.

For long tasks, preserve durable knowledge before context pressure becomes severe.

Especially preserve:

- changed assumptions

- important decisions

- blockers

- unresolved work

- discovered dependencies

- meaningful root causes

- handoff state

Conversation summaries are not a replacement for durable project-memory.

## Human interaction

The user should normally communicate with Kiro for coordinated work.

Do not ask the user to manually:

- copy one worker's response into another

- summarize another worker's conversation

- explain what another worker changed

- transfer architecture decisions

- reconstruct lost context

when the information can be obtained from Orca, Git, project-memory, or authoritative specifications.

Ask the user when a genuine human decision is needed, such as:

- ambiguous product direction

- scope change

- acceptance-criteria change

- privacy/safety/governance decision

- irreversible destructive action

- business/UX choice with multiple valid alternatives

## Final operating principle

The goal is not maximum agent count or maximum parallel activity.

The goal is reliable engineering continuity and quality.

Always preserve this mental model:

Specifications

= what should exist

Git

= what actually exists

project-memory

= what the team has learned and decided

Orca

= what is happening right now

Kiro

= technical coordination and final task adjudication

Implementation workers

= bounded execution

Auditor

= independent challenge

User

= final authority for genuine product-level decisions

Every agent should work so that another qualified agent can continue later without needing access to the originating conversation.
