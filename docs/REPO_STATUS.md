# Career Expo — repository status (public handoff)

Last reconciliation: **2026-09-22** (post–12:53 PM preservation checkpoint).

This file is the public-safe map of what is on GitHub, what is draft, and what must stay local. It does **not** document private developer-infrastructure internals.

## Current public `main`

| Ref | SHA | Notes |
| --- | --- | --- |
| `main` / `origin/main` | `8bf7111` | Untouched by product consolidation. Desk OS audit docs, structured-ticket substrate notes, v2 benign triage schema/worksurface updates. **Not** the best playable product tip. |

Do **not** merge product draft branches into `main` without an explicit release decision.

## Best Career Expo product baseline

| Branch | Authoritative product-code tip | Role |
| --- | --- | --- |
| **`zaidkan/product-consolidation-baseline`** | **`45ff32d`** | **Authoritative green product tip** for application code. Public cleanup, Desk OS login lock screen, golden-path/test repairs, RED-lane separation, lock-screen cleanup, source-bound alert records (Task 7), privacy fix (manager-only context out of guidance). Verified green at preservation. Later commits on this branch are public handoff/documentation updates only — do not treat those SHAs as the product-code tip. |

Prefer this branch for product work, review, and “what should ship next” discussions.

## Review-only / policy-blocked product branch

| Branch | SHA | Role |
| --- | --- | --- |
| `zaidkan/chore-product-consolidation` | `8a846dd` | Baseline **plus** completed Task 8 structured ticket composer and Team Chat flow. **Implemented and complete** on this tip (`285eccc` is an ancestor). **Review-only** for promotion into the release baseline until the ticket-gate **policy** decision is made. Not unfinished work — not yet included in the release baseline. |

Related schema draft (supporting material; not a second Task 8 implementation lane):

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
| `zaidkan/blocked-spray-deskos-draft` | `0233530` | **WIP.** Recovers stash work: `blocked_spray_review` / A-1159 pack content, HUD context prompts, Desk OS chrome polish. V2 benign-triage RED suite goes green on this tip, but normal suite still has 12 Jules/golden-path failures until tests adapt to the fourth event. Needs content approval and Desk OS overhaul decisions. **Not** a release candidate. |

## Task 7 status

**COMPLETE.**

Accepted source-bound alert/email workflow lands via `e94c68a`, an ancestor of the authoritative product-code tip `45ff32d` on `zaidkan/product-consolidation-baseline`. That workflow is preserved on the release baseline.

Older audit prose that still says Task 7 is partial is historical and superseded by this implementation history. Separate Desk OS overhaul / entry-mode questions are **not** unfinished Task 7 work.

Authoritative Desk OS audit reading order (architecture context, not Task 7 status): `docs/planning/desk-os-audit/DESK_OS_AUDIT.md` → architecture map → gap matrix → `DESK_OS_AUDIT_HANDOFF.md`.

## Task 8 status

**COMPLETE on `zaidkan/chore-product-consolidation` @ `8a846dd`.**

Structured ticket composer and Team Chat flow are implemented there; `285eccc` is an ancestor of that tip. The open ticket-gate question is a **product/promotion policy** decision about whether to include that completed work in the release baseline — **not** unfinished Task 8 implementation.

Distinguish carefully:

| Meaning | Status |
| --- | --- |
| Task 8 implemented | Yes — on `zaidkan/chore-product-consolidation` @ `8a846dd` |
| Included in release baseline (`45ff32d`) yet | No — held for ticket-gate policy |
| Unfinished Task 8 coding | No |

Keep `zaidkan/chore-product-consolidation` **review-only** until that policy decision. Do not merge it to `main` or fast-forward the release baseline without an explicit promotion decision.

## Expected-RED / future contracts

- CI gates on the normal suite; `*.red.test.ts` is the expected-RED lane (`pnpm test:red`).
- Notable RED contracts: SOC career vertical-slice depth, V3 interruption/context-switch, V2 benign triage (`blocked_spray` / A-1159) — **content approval still required** before those go green.
- `zaidkan/blocked-spray-deskos-draft` authors pack content aimed at the V2 RED suite; approval + test turn-green is a separate decision.
- `zaidkan/shift-depth-contract-draft` holds additional future depth contracts.

## Outstanding Desk OS overhaul work

Unresolved product questions remain in `DESK_OS_AUDIT_HANDOFF.md` (Desk-only vs full OS, window model, leave-desk lock/logout, canonical vs cosmetic files, intranet scope, Morgan intro timing, performance/a11y bar).

In-flight chrome/content on `zaidkan/blocked-spray-deskos-draft` must not be mistaken for an approved overhaul.

## Known unresolved product decisions

1. **Ticket-gate promotion policy** — whether completed Task 8 on `zaidkan/chore-product-consolidation` @ `8a846dd` is included in the release baseline (implementation is done; promotion is not).
2. **Landing / marketing copy** — website draft vs frontend-experience draft.
3. **Simulation entry** — assessed-first proposal on `zaidkan/simulation-entry-draft`.
4. **V2 blocked-spray content approval** — whether A-1159 / `blocked_spray_review` enters the beta queue.
5. **Desk OS overhaul scope** — see audit handoff questions (separate from completed Task 7/8).
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
