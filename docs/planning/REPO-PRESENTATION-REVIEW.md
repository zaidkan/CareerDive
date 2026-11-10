# Repository presentation review

Branch: `chore/repo-presentation`
Base: `worker/blind-audit-remediation-final` at `5675404`.
Commit: `f38eec7`; unmerged. Working tree clean.

This is a local review record, ignored by Git. It is not part of the public repository.

## Files removed from tracking

All 49 files below remain on disk, match their pre-cleanup SHA-256 hashes, and are ignored. The original hashes are in `preserved-files.json` beside this record. Historical task reports, review evidence, and tool-orchestration scaffolding were removed from tracking. Durable product content, interface documentation, environment contracts, incident procedures, validation criteria, and reference PDFs remain tracked.

- `career-sim-build-spec.md`
- `docs/2026-09-06-workspace-audit.md`
- `docs/2026-09-07-evidence-and-modes.md`
- `docs/2026-09-08-comparison-search-and-room-polish.md`
- `docs/2026-09-08-movement-comfort.md`
- `docs/REPO_STATUS.md`
- `docs/future-arrival-concept.md`
- `docs/ops/offline-verification.md`
- `docs/ops/production-preparation-plan.md`
- `docs/ops/production-preparation-results.md`
- `docs/ops/supabase-render-activation.md`
- `docs/planning/PRELAUNCH-CLEANUP.md`
- `docs/planning/SOC-ROOM-REBUILD-SPEC.md`
- `docs/planning/TEST-FLAKE-FINAL.md`
- `docs/planning/V1_GOLDEN_PATH_VERIFICATION.md`
- `docs/planning/chromebook-lightweight-pass.md`
- `docs/qa/cyber-shift-final-v3.md`
- `docs/qa/cyber-shift-usability-final.md`
- `docs/qa/desk-os-cleanup-final.md`
- `docs/qa/desk-os-simplicity-final.md`
- `docs/qa/desk-os-visual-polish-final.md`
- `docs/qa/final-ui-review-v2.md`
- `docs/qa/runtime-performance-final.md`
- `docs/qa/runtime-performance/baseline-entry.json`
- `docs/qa/runtime-performance/bundles.json`
- `docs/qa/runtime-performance/coworkers.json`
- `docs/qa/runtime-performance/full-shift-desktop.json`
- `docs/qa/runtime-performance/full-shift-tablet.json`
- `docs/qa/runtime-performance/public-after.json`
- `docs/qa/runtime-performance/public-base.json`
- `docs/qa/runtime-performance/public-layouts.json`
- `docs/qa/runtime-performance/scene-metal.json`
- `docs/qa/runtime-performance/scene-software.json`
- `docs/qa/soc-door-texture/README.md`
- `docs/qa/soc-door-texture/capture-metadata.json`
- `docs/qa/soc-door-texture/entry.png`
- `docs/qa/soc-door-texture/oblique.png`
- `docs/qa/soc-door-texture/seal-check.json`
- `docs/qa/start-recovery-support.md`
- `docs/qa/test-flake-final/baseline-runs.json`
- `docs/qa/test-flake-final/final-runs.json`
- `docs/qa/test-flake-final/slow-import-after.json`
- `docs/qa/test-flake-final/slow-import-after.log`
- `docs/qa/test-flake-final/slow-import-before.json`
- `docs/qa/test-flake-final/slow-import-before.log`
- `docs/qa/track-a-investigation-fairness.md`
- `docs/qa/trust-claim-audit.md`
- `docs/qa/ui3-cyber-media.md`
- `scripts/tests/classifier.test.sh`

## Files with comment-only edits

TypeScript ASTs with comments removed and CSS with comments removed match the base. The career pack remains byte-for-byte unchanged. Test definitions, titles, assertions, skips, exclusions, and configuration values are unchanged.

- `apps/web/src/site/site.css`
- `apps/web/src/foundation.css`
- `apps/web/test/workplace-golden-path.test.tsx`
- `packages/core/test/soc-query-scenarios.test.ts`
- `packages/testing/test/query-accessibility.test.ts`
- `packages/testing/test/query-parity.test.ts`
- `packages/career-packs/test/pack-dataset-validation.test.ts`
- `packages/career-packs/test/soc-career-experience-vertical-slice.red.test.ts`
- `packages/career-packs/test/soc-career-experience-vertical-slice.test.ts`
- `packages/career-packs/test/soc-dataset-coverage.test.ts`
- `packages/core/test/evidence-fact-discovery.red.test.ts`
- `packages/core/test/structured-ticket-documentation.red.test.ts`
- `packages/core/test/v2-benign-triage.red.test.ts`
- `packages/schemas/test/query-schema.test.ts`
- `packages/schemas/src/extension-points.ts`
- `vitest.config.ts`

## Documentation and ignore rules updated

- `README.md`: product scope, local development, architecture, scripts, operations, documentation links, and license. The three existing privacy statements were preserved verbatim. Stale scenario walkthroughs and obsolete manual migration instructions were replaced with the current migration-plan command.
- `docs/content/public-career-content-packet.md`: five internal provenance labels replaced with neutral descriptions. Occupational copy, caveats, and legal limitations are unchanged.
- `packages/video/README.md`: heading describes composition conventions rather than the originating skill.
- `.gitignore`: neutral comments and explicit patterns for the untracked artifacts; existing local tool patterns retained.

## Standard files added

- `LICENSE`: MIT, as requested; no existing project license was found.
- `CONTRIBUTING.md`: development setup, conventions, and required checks.

## Remaining references constrained by scope

The requested exact grep is **not empty**. Its remaining matches are operational identifiers rather than developer attribution:

```text
.gitignore:24:.codex/
.gitignore:43:CLAUDE.md
packages/ai/src/index.ts:11:  classifier: "claude-haiku-4-5",
packages/ai/src/index.ts:12:  primary: "claude-sonnet-4-6",
packages/ai/src/index.ts:13:  deepValidation: "claude-opus-4-8",
packages/ai/test/ai.test.ts:27:      classifier: "claude-haiku-4-5",
packages/ai/test/ai.test.ts:28:      primary: "claude-sonnet-4-6",
packages/ai/test/ai.test.ts:29:      deepValidation: "claude-opus-4-8",
packages/ai/test/ai.test.ts:92:        model: "claude-sonnet-4-6",

```

Removing or disguising provider model IDs would change product configuration and test assertions. Removing tool ignore patterns would allow local tool state/instructions to be accidentally added again. Those files/entries remain intact. An asynchronous clarification was requested about accepting these exceptions; there was no approval to change product configuration or assertions at the time of this record.

A broader audit also found internal provenance strings in `apps/web/src/careers/careers.ts` (five data values) and `CHAT 04` in the title of `apps/web/test/public-tokens.test.ts`. They are data/test strings, not comments. They remain unchanged under the no-product-code/no-test-changes constraint. The documentary provenance labels were cleaned separately. These strings do not match the requested exact expression.

Product disclosures about AI-constrained dialogue, browser user-agent fields, and the architecture PDF's metric for generated interactions are genuine product/technical references and remain. No privacy, legal, COPPA, environment-file, deployment-config, or simulation behavior changes were made. Existing Git history is unchanged; untracking removes files from this branch's current tree, not historical commits.

The pack comment referring to `docs/superpowers/specs/soc-structured-record-fixtures.md` remains: public product-media provenance validates the raw pack SHA-256, including comments. A comment-only cleanup changed that hash and caused the provenance assertion to fail. The complete pack was restored byte-for-byte; no provenance records or assertions were changed.

## Verification

Baseline `pnpm test`: **1,074 passed; 13 existing skips; 159 files (155 passed, 4 skipped)**.

First verification: lint and typecheck passed; the raw-pack provenance assertion failed after the initial YAML comment edit. Restored the pack bytes rather than updating data or tests. Corrected verification: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` completed successfully (exit 0). Final suite: **1,074 passed; 13 existing skips; 159 files (155 passed, 4 skipped)**, identical to baseline. Test duration 61.26 seconds. Build succeeded for all 10 build tasks; the existing large-chunk advisory remains. No generated artifacts were committed. The README migration-plan command was also verified offline and lists the nine current migrations without connecting to a database.
