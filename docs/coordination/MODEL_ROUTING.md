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

## External execution capacity — OpenCode FREE workers (VERIFIED + WIRED 2026-09-17)

Separate usage pool from Codex Plus (zk/hamza): **`usagePool = opencode-free`**. OpenCode CLI
`v1.18.31` is the ephemeral/headless runner (`opencode run --auto -m provider/model`), one clean
context per task, no persistent TUI. Dispatch via **`scripts/oc-worker`** (allow-list enforced;
route telemetry in `.orca-opencode/route.log`).

### Approved $0 model slots (probed & cost-verified; NO paid fallback)

| Slot | Model ID | Context / Output | Image | Reasoning variants |
|---|---|---|---|---|
| `muse1` (PRIMARY) | `opencode/muse-spark-1.3-contributor-free` | 1,048,576 / 131,072 | text+image+video+pdf+audio | effort: minimal·low·medium·high·**xhigh** |
| `union1` (2nd executor) | `opencode/union-alpha` | 262,144 / 131,072 | text+image | none (reasoning on, no tiers) |
| `nemotron1` (3rd / long-text) | `opencode/nemotron-3-ultra-free` | 1,000,000 / 128,000 | **text only** | none (reasoning on, no tiers) |

All three confirmed `input=0 output=0 cache_read=0` in `~/.cache/opencode/models.json`. All support
tool_call (MCP). No stored OpenCode credentials are required for the `opencode/*` free provider.

**Reasoning-variant policy:** `muse1` uses `--variant xhigh` for substantial/important
implementation, `--variant high` for ordinary implementation; do NOT waste xhigh on trivial
mechanical work. `union1`/`nemotron1` expose NO discrete effort tiers — never invent `high`/`xhigh`
for them (`scripts/oc-worker` suppresses `--variant` for those slots).

**Preferred free execution order:** `muse1 → union1 → nemotron1`. This is NOT mandatory
retry-through-all: if the task itself is conceptually stuck, do NOT re-send the same broken task
through every free model — return to **Sol High** for diagnosis/replanning, then hand the revised
implementation packet back to a free executor.

**HARD COST RULE — no paid fallback.** Kiro may ONLY dispatch these three $0 IDs through OpenCode.
If a free model disappears, becomes paid, is rate-limited, or fails resolution: **STOP.** Do NOT
substitute Sol/GLM/Kimi/paid-Muse/any Zen model through OpenCode. `scripts/oc-worker` refuses any
non-allow-listed model and flags a `PAID_MODEL_LEAK` if a non-free header ever appears. On
`throttled`, it stops and asks Kiro to route to another APPROVED free slot or tell the user.

### Shared brain (project-memory) on OpenCode

`/opt/homebrew/bin/uvx neo4j-agent-memory[mcp,sentence-transformers]` is wired into OpenCode via
project-local `opencode.json` (`mcp.project-memory`, `type:local`, `{env:NEO4J_PASSWORD}` only, no
hardcoded secret, same `--user-id career-expo` namespace as Kiro's `.kiro/settings/mcp.json`).
Cross-agent read/write verified (Kiro↔OpenCode, same Neo4j graph). **Cold-start gotcha:** the first
MCP tool call in a fresh `opencode run` can fail once with `-32000 Connection closed` while `uvx`
resolves the package + loads the embedding model; mitigations = `timeout:60000` in `opencode.json`,
`scripts/oc-worker warm` before relying on it, or retry once. Keep the MCP tool surface focused;
query only relevant memories (MCP tools add to model context).

### Dispatch adapter (`scripts/oc-worker`)

`worker-start --agent opencode` does NOT reliably deliver the Orca preamble. Use the ephemeral
adapter instead: Kiro mints the task packet → `scripts/oc-worker run --slot <muse1|union1|nemotron1>
--task <id> --class <...> --reason "<why>" --dir <worktree> [--effort <tier>] (--prompt|--spec)`
→ the worker edits/tests/commits under `--auto` → Kiro Git/test verifies → integration. Every
dispatch appends a ROUTE record (worker, model, task, class, cost_class=free, result,
success/throttled/failure, duration, throttled, retries) to `.orca-opencode/route.log` so we can
empirically rank Muse/Union/Nemotron on THIS repo rather than trusting internet benchmarks.

**Routing role:** faithful execution of a STRONG specification (conceptual problem already solved by
Sol). Multi-file is fine — the boundary is "conceptual problem solved," NOT "one file." ESCALATE
BACK TO SOL if an executor redesigns architecture, discovers major undocumented invariants, fails
across subsystems, hits a hard race/state issue, needs cross-system reasoning not in the packet,
contradicts the packet, or thrashes unrelated code to pass tests. Track Union's reliability
separately (new/stealth model — do not assume its hidden identity).

**Review by blast radius, not model prejudice:** well-specified low-risk external work that passes
tests + acceptance = DONE (no mandatory Sol review). High-blast-radius external work → independent
Sol review; medium-risk → Terra may be a sufficient independent reviewer.

**Concurrency = usage-pool + dependency safety, NOT total terminal count.** One root task per Codex
ACCOUNT still holds (zk pool, hamza pool). The `opencode-free` pool is independent, so
`terrazk` + `solhamza` + one `opencode-free` root job may run concurrently IF the DAG tasks are
genuinely independent and worktrees don't conflict. **Start conservatively: one active
`opencode-free` root job** (Muse/Union/Nemotron may share OpenCode provider rate limits until
measured). Increase only if telemetry shows independent/high enough capacity.
