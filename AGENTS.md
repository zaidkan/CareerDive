# Career Expo agent routing

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
