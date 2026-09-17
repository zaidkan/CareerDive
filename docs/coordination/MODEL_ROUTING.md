# Career Expo — Codex Model Routing & Usage Policy

**Objective:** maximum correctly-completed, production-quality work per ChatGPT-Plus/Codex
allowance. Priority: correctness > task completion > quality > no regressions > allowance
efficiency > speed. **Speed is not a target.** Use the cheapest model likely to finish the
task correctly in one serious attempt; escalate only on evidence.

## Accounts and model terminals

Two accounts (usage pools): **zk**, **hamza**. Each runs up to three persistent model
terminals, named by the manual Orca tab title as `<model><account>`:

| Tab name | Account | Model tier |
|---|---|---|
| `terrazk` / `terrahamza` | zk / hamza | Terra High |
| `solzk` / `solhamza` | zk / hamza | Sol High |
| `astrazk` / `astrahamza` | zk / hamza | Astra **Low** (default) |

Resolve with `scripts/slot`:
- `scripts/slot list` — all six terminals
- `scripts/slot resolve <terra|sol|astra> <zk|hamza>` — one handle
- `scripts/slot account-status` — per-account BUSY/free (set `CAREER_EXPO_RUN=<run_id>`)
- `scripts/slot capacity` — accounts live and not busy

Identity is the manual tab title only (never flat/process title, marker, scrollback, or
persisted handle). Switch model per task by **dispatching to the terminal already running
that model** — no `/model` menu, no tab renames.

## Account-level concurrency

**One root task per ACCOUNT**, not per terminal. The three terminals of an account share one
usage pool. If `terrazk` runs a root task, do not dispatch to `solzk`/`astrazk`. Group by
account suffix (`*zk`, `*hamza`). Subtasks of the same root task are fine; never use multiple
model terminals to double-spend one account.

## Roles

- **Luna** — cheap investigation/search/recon/mechanical: find files, locate implementations,
  collect evidence, simple/repetitive edits, formatting. Hand findings to Terra/Sol. Not for
  architecture, hard debugging, or security.
- **Terra High** — DEFAULT implementation workhorse (~60–75%): features, UI, endpoints, CRUD,
  validation, tests, clearly-reproduced bug fixes, refactors of known subsystems, implementing
  an existing plan. Self inspect→implement→test→fix→verify→STOP.
- **Sol High** — advanced engineering (~15–30%): architecture, difficult/ambiguous plans,
  cross-cutting changes, simulation/state-sync logic, concurrency/race debugging, auth/security,
  schema/migrations, unclear-root-cause bugs, high-risk/large-blast-radius work, meaningful and
  independent audits.
- **Astra Low** — RARE escalation (~0–5%): only after a serious Sol attempt is genuinely blocked,
  or a clearly Astra-class unfamiliar/long-horizon problem. Not for ordinary features/CRUD/polish/
  search/simple refactors.

**Astra Medium/High:** not permanent terminals. Only for genuinely exceptional problems, with
explicit justification; Kiro asks the user to raise the astra terminal's reasoning for that one
task, then it returns to Low.

## Escalation ladder

`Terra High → Sol High → Astra Low`. Never skip straight to Astra. On escalation, pass a concise
failure handoff (objective, acceptance, files, what was tried, test results, observed failure,
suspected cause, open questions) — don't restart repo exploration. When Astra solves the hard
reasoning/diagnosis, hand the now-straightforward implementation back to Terra.

**Substantive failure** (justifies escalation): can't find the architecture, loops, same bug
persists through real attempts, design contradicts constraints, repeated regressions,
misunderstands task despite context. **Not** escalation-worthy: one syntax error, a single test
fail, one wrong file — let the model self-correct.

## Planning, parallelism, audits

- Simple task: no separate planner; Terra inspects+implements. Complex/architectural: Sol
  designs → Terra implements chunks → Sol verifies only where risk justifies.
- One implementation worker per task by default. Parallelize only genuinely independent work
  (disjoint files/subsystems); parallelism multiplies context cost.
- Don't audit every task. Independent Sol audit only for architecture, security, major state/
  schema/migration, milestone completion, hard bug fixes, foundational or high-blast-radius code.
  Prefer a different account for independent review when justified.

## Usage-conservation priority (when allowance drains too fast)

1. Astra used unnecessarily? 2. Sol on routine impl? 3. duplicate context across workers?
4. whole-repo re-exploration? 5. long stale histories? 6. looping instead of escalating?
7. redundant reviews? 8. poor scope? 9. reasoning effort? 10. verbosity (last).

## Target distribution (sanity check, not a quota)

Terra ~60–75% of substantive coding · Sol ~15–30% · Astra ~0–5% · Luna many cheap interactions.

## Core philosophy

Not "which model is strongest?" but "which model is strong enough to finish this task correctly
without unnecessarily consuming allowance?" — **Luna finds. Terra builds. Sol designs, diagnoses,
and verifies difficult work. Astra rescues exceptional problems.** Optimize for best completed
project per allowance, not best response per invocation.

## Refined division (2026-09-17) — expensive intelligence at decision points, cheap capacity during execution

**Sol defines. Terra/external cheap workers execute. Sol owns hard implementation. Astra handles exceptional complexity.**

- **Sol High = definition/architecture** — decide what the task means, success criteria, which
  constraints matter, files/subsystems involved, and how to decompose. Sol ALSO owns **heavy
  implementation** when the coding itself needs extensive cross-file reasoning, a major refactor,
  or unclear state — don't repeatedly retry a cheaper model on conceptually hard work.
- **Terra High (and external cheap executors) = faithful execution of a well-specified plan** —
  used AFTER Sol defines; the model must not need to rediscover the architecture.
- **Astra = exceptional difficulty** — huge unfamiliar systems, long-horizon, complex tool
  workflows, or when even Sol struggles.

**Implementation-packet rule (mandatory when Sol hands off to a cheaper executor):** Sol must
produce a packet good enough that the executor does NOT re-read the whole repo and recreate the
plan. A good packet contains: exact objective; acceptance criteria; files/subsystems likely
involved; constraints/invariants; implementation steps; tests required; things NOT to change;
escalation conditions. Otherwise you get the worst case — pay Sol to understand the project, then
hand vague instructions to Terra/DeepSeek, which re-discovers everything. That defeats the purpose.

## External execution capacity (PLANNED — wire up only after install + probe)

Two additional CHEAP runners, separate usage pools from Codex Plus (zk/hamza):

**Path A — OpenCode + DeepSeek.** OpenCode CLI = runner/agent harness; DeepSeek V4 (e.g. Pro/Flash)
= model behind it (`opencode run -m provider/model`). Model as `agentIdentity=opencode, model=deepseek-v4-*`
(lifecycle belongs to the runner OpenCode; capability/usage to the model DeepSeek). Slot e.g.
`deepseek1` (runner opencode, usagePool opencode-deepseek). Known: `worker-start --agent opencode`
does NOT reliably deliver the Orca preamble — use an adapter: open plain terminal → mint Orca
dispatch/tracking ID → write preamble → `opencode run --auto "<preamble>"` (`--auto` avoids
permission blocks) → Git/test verify → completion/integration. OpenCode supports MCP
(`opencode mcp add/list`) so project-memory is architecturally supported (probe our exact config).

**Path B — Freebuff.** Own CLI runner (`npm i -g freebuff`), own bundled free model pool
(DeepSeek V4.1 Flash, GLM, Luna, etc., no API key). Slot e.g. `freebuff1` (runner freebuff,
usagePool freebuff). Orca is actively adding native `freebuff` TuiAgent support — probe whether
OUR installed Orca recognizes it: if yes use native path, if no run as plain-terminal worker
(don't over-engineer around a feature Orca is landing).

**Routing role of external cheap executors:** default = cheap execution of a STRONG specification
(the conceptual problem is already solved by Sol). Multi-file is fine — the boundary is
"conceptual problem solved," NOT "one file." ESCALATE BACK TO SOL if the executor starts:
redesigning architecture, discovering major undocumented invariants, failing across subsystems,
hitting a hard race/state issue, needing cross-system reasoning not in the packet, contradicting
the packet, or thrashing unrelated code to pass tests. Don't burn cheap tokens forever just
because they're cheap.

**Review by blast radius, not model prejudice:** well-specified low-risk external work that passes
tests + acceptance = DONE (no mandatory Sol review). High-blast-radius external work → independent
Sol review; medium-risk → Terra may be a sufficient independent reviewer.

**Concurrency = usage-pool + dependency safety, NOT total terminal count.** One root task per
Codex ACCOUNT still holds (zk pool, hamza pool). But independent pools can run concurrently:
`terrazk` + `solhamza` + `deepseek1` + `freebuff1` may each run a root task simultaneously IF the
DAG tasks are genuinely independent and worktrees don't conflict.

**Probe-before-trust (both runners):** binary/version, available models, non-interactive run,
autonomy flag, MCP/project-memory visibility, Git edit/commit, Orca adapter/native behavior,
completion detection. Harmless/disposable probe first. Record design now; implement after install.
