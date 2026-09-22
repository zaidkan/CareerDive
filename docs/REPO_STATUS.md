# Career Expo — repository status (public handoff)

Last reconciliation: **2026-09-22** (post–12:53 PM preservation checkpoint).

This file is the public-safe map of what is on GitHub, what is draft, and what must stay local. It does **not** document private developer-infrastructure internals.

## Current public `main`

| Ref | SHA | Notes |
| --- | --- | --- |
| `main` / `origin/main` | `8bf7111` | Untouched by product consolidation. Desk OS audit docs, structured-ticket substrate notes, v2 benign triage schema/worksurface updates. **Not** the best playable product tip. |

Do **not** merge product draft branches into `main` without an explicit release decision.

## Best Career Expo product baseline

| Branch | SHA | Role |
| --- | --- | --- |
| **`zaidkan/product-consolidation-baseline`** | **`45ff32d`** | **Authoritative green product tip.** Public cleanup, Desk OS login lock screen, golden-path/test repairs, RED-lane separation, lock-screen cleanup, source-bound alert records, privacy fix (manager-only context out of guidance). Verified green at preservation. |

Prefer this branch for product work, review, and “what should ship next” discussions.

## Review-only / policy-blocked product branch

| Branch | SHA | Role |
| --- | --- | --- |
| `zaidkan/chore-product-consolidation` | `8a846dd` | Baseline **plus** structured ticket composer and Team Chat flow. **Review-only** until ticket-gate / composer policy is resolved. Do not treat as release candidate. |

Related schema WIP:

| Branch | SHA |
| --- | --- |
| `zaidkan/ticket-chat-schema-draft` | `94289f7` |

## Website / onboarding / experience drafts

| Branch | SHA | Role |
| --- | --- | --- |
| `zaidkan/public-website-draft` | `21885ae` | Marketing site shell, public assets, site entry tests. Landing still uses “Inside the shift” + ready CTA. |
| `zaidkan/frontend-experience-draft` | `d2bc35c` | Frontend experience support + landing polish (**“How the 10 minutes move”**, ready-CTA removed). Supersedes `worker/frontend-experience` landing commits for GitHub visibility. |
| `zaidkan/simulation-entry-draft` | `47f52a2` | Assessed-first / simulation entry proposal. Incomplete; not a release candidate. |
| `zaidkan/shift-depth-contract-draft` | `9436ec7` | Shift-depth contract + related privacy fix. Expected future/RED contracts live here and on baseline RED lanes. |

These drafts intentionally diverge (especially landing copy). Do not auto-merge them into each other or into the baseline without a product decision.

## Post-checkpoint addition (2026-09-22 reconciliation)

| Branch | SHA | Role |
| --- | --- | --- |
| `zaidkan/blocked-spray-deskos-draft` | `d123ea5` | **WIP.** Recovers stash work: `blocked_spray_review` / A-1159 pack content, HUD context prompts, Desk OS chrome polish. Incomplete; needs content approval and Desk OS overhaul decisions. **Not** a release candidate. |

## Task 7 status

**Partial / unfinished relative to the original overhaul promise.**

Shipped on the product baseline (and earlier Task branches absorbed into it): Email/Alert tooling, artifact observation paths, source-bound alert records, guide/inventory lookup surfaces, Desk OS lock-screen login.

Still open vs historical Task 7 intent (`docs/2026-09-06-workspace-audit.md` and Desk OS audit set):

- Sentence/row-level source interactions and tests that prove real record selection (not only structured-task wrappers).
- Clearing remaining “legacy gate / missing initial task” mismatches called out in the Desk OS audit handoff.
- Mode-selection / App-entry consistency where drafts disagree (assessed-first vs tutorial-first).

Authoritative audit reading order: `docs/planning/desk-os-audit/DESK_OS_AUDIT.md` → architecture map → gap matrix → `DESK_OS_AUDIT_HANDOFF.md`.

## Task 8 status

**Partially present on baseline; composer/chat policy still unresolved.**

On **`zaidkan/product-consolidation-baseline`**: Guide search, inventory lookup, Team Chat tool surface, and related workstation tooling from the Task 8 line are in tree (Task 8 tip `e2de9de` is an ancestor of the baseline).

On **`zaidkan/chore-product-consolidation`** (review-only): stronger structured **ticket composer** + Team Chat flow wiring. Blocked on product policy for ticket gates / canonical documentation path.

Do not merge the ticket-composer branch to `main` or treat it as baseline until that policy is decided.

## Expected-RED / future contracts

- CI gates on the normal suite; `*.red.test.ts` is the expected-RED lane (`pnpm test:red`).
- Notable RED contracts: SOC career vertical-slice depth, V3 interruption/context-switch, V2 benign triage (`blocked_spray` / A-1159) — **content approval still required** before those go green.
- `zaidkan/blocked-spray-deskos-draft` authors pack content aimed at the V2 RED suite; approval + test turn-green is a separate decision.
- `zaidkan/shift-depth-contract-draft` holds additional future depth contracts.

## Outstanding Desk OS overhaul work

Unresolved product questions remain in `DESK_OS_AUDIT_HANDOFF.md` (Desk-only vs full OS, window model, leave-desk lock/logout, canonical vs cosmetic files, intranet scope, Morgan intro timing, performance/a11y bar).

In-flight chrome/content on `zaidkan/blocked-spray-deskos-draft` must not be mistaken for an approved overhaul.

## Known unresolved product decisions

1. **Ticket composer / ticket-gate policy** — blocks promoting `zaidkan/chore-product-consolidation`.
2. **Landing / marketing copy** — website draft vs frontend-experience draft.
3. **Simulation entry** — assessed-first proposal on `zaidkan/simulation-entry-draft`.
4. **V2 blocked-spray content approval** — whether A-1159 / `blocked_spray_review` enters the beta queue.
5. **Desk OS overhaul scope** — see audit handoff questions.
6. **When/whether to fast-forward `main`** to the product baseline.

## What is intentionally private / local (do not put on public product branches)

Keep these out of Career Expo product commits and pushes:

- BrainV2 and `worker/brainv2-*` worktrees/branches
- `scripts/brain`, `scripts/oc-*`, private orchestration config
- `.codex`, `.kiro`, `.agents`, `.claude`, Impeccable/agent skill installs under `.github/skills` / `.github/agents` when they are local tooling
- Neo4j dumps/backups (e.g. `neo4j-backup/`)
- Credentials/secrets
- Dirty root checkout leftovers that only mirror already-pushed tips
- Personal stashes (left intact; not dropped)

Private developer-infrastructure work is a **separate** effort from Career Expo product branches.

## What must NOT be merged (without explicit decision)

- Any BrainV2 / orchestration / Neo4j private tooling into public product tips or `main`
- `zaidkan/chore-product-consolidation` → `main` (ticket policy)
- Website / simulation-entry / shift-depth / blocked-spray **drafts** → `main` or baseline as “done”
- Force-pushes, stash drops, or cleaning other agents’ dirty worktrees as part of routine handoff

## Local checkout note (shared machine)

The shared root worktree may sit on an older branch (e.g. `chore/public-cleanup-minimal-ai`) with a dirty tree that **mostly duplicates** already-pushed tips, plus private tooling and a few weakened test edits that should **not** be recommitted. Prefer the worktrees/branches listed above for authoritative product state.

Two local stashes remain by design: one privacy/guidance stash is already absorbed into the baseline; the blocked-spray/Desk OS stash tip was preserved onto `zaidkan/blocked-spray-deskos-draft` without dropping the stash.
