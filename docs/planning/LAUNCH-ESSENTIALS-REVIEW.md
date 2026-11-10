# Launch essentials review

Branch: `feat/launch-essentials`  
Base: `chore/repo-presentation` at `f38eec7`  
Commit: `05081e87443b5014ee7cc58305de7fa0f53b0e64`  
Status: committed, clean, unmerged; no deployment or live cloud changes.

This review and its screenshots/logs are local, ignored artifacts. The repository presentation cleanup remains intact.

## Authored dialogue only

Deleted `packages/ai`, Anthropic SDK dependency, server provider wiring, `apps/server/src/ai/npc-dialogue.ts`, the `simulation.submitFreeText` procedure, manager free-text input, paid-provider workflow, and AI evaluation configuration. Removed provider secrets/budget references from environment documentation and `.env.example`. The Render blueprint contained no provider secret entry. README, FAQ, Trust page, incident procedures, and SEO descriptions now describe authored dialogue. Desk OS login remains a real in-simulation feature and is explicitly retained in the README.

Morgan and Jules retain their authored choices, context constraints, local recap behavior, and deterministic transitions. An HTTP regression test confirms that the removed free-text endpoint returns 404. Source and compiled runtime searches find no Anthropic/provider call paths or SDK imports. Legacy schema/budget validation helpers and canonical pack fields remain unchanged for compatibility; they cannot call a provider.

## Launch analytics disabled

`render.yaml` sets `VITE_LAUNCH_ANALYTICS_ENABLED` to `"false"`; `.env.example` and Docker's existing default also disable it. Existing collection code exits before storage, identity creation, or fetch when disabled. A regression test exercises every first-party event name with the disabled flag. PostHog has no installed SDK or launch wiring. Browser checks recorded zero analytics requests.

Public Vite values are build-time inputs. Applying the updated blueprint requires rebuilding the web bundle; this work did not modify live Render configuration.

## Anonymous identity and isolation

The production browser transport already uses persistent Supabase anonymous sign-in and Bearer authentication. The reported `local-user` identity belongs to the browser-test server fixture, not production transport. The development browser fallback did share a fixed UUID; it now persists a random UUID per browser profile and fails safely when durable identity storage is unavailable.

Tests verify concurrent anonymous sign-in creates one identity, reload restores it, expiry refresh preserves it, refresh failure does not create a replacement owner, production missing configuration fails closed, and the real HttpSimulationClient sends Bearer tokens without `x-user-id`. Separate production-auth HTTP tests create two owners concurrently with the same creation request ID, verify distinct sessions and same-owner idempotent retries, resume after token refresh, and reject foreign reads, writes, reflections, and deletions. Local profile identity persistence/isolation is covered too.

No account, signup, or authentication UI was added. The in-simulation Desk OS login is unchanged. Actual Supabase/Render settings and live database behavior were not exercised. Supabase anonymous sign-in must be enabled; browser/API public configuration must identify the same project, as documented in the environment contract.

## Start acknowledgment

Homepage hero and closing Start CTAs include the supplied exact 13+ Terms/Privacy sentence. Content Start CTAs on careers/cards/detail pages carry the same notice. Links are keyboard accessible and associated with the Start control using `aria-describedby`.

Clicking a noticed content CTA acknowledges this tab's visit and proceeds directly. Header/footer links, a typed `/start` URL, modified/new-tab link activation, and legacy arrival markers cannot create a simulation before the inline Start acknowledgment. The direct-entry page uses a normal Start button and note; no dialog, age verification, birthdate collection, or under-13 branch. A versioned sessionStorage acknowledgment preserves consent within the tab; storage-blocked direct entry still uses component state for the acknowledgment. Arrival/resume behavior inside the consented simulation component is unchanged.

## Policy and terms pages

`/privacy` and `/terms` render public Markdown copies of the supplied local documents using react-markdown. The source copies are byte-for-byte identical to the originals; only rendered Markdown link destinations are mapped to working site routes. Footer navigation, route metadata, canonical URLs, and sitemap entries are wired. Theme tokens and existing page layout are preserved.

Privacy SHA-256: `6bd089e3bc4a3d3753b589392e7f27e27d7191c3a40d1fee3e8cbbc74984d9a5`  
Terms SHA-256: `85a2f66e7d5f9dd18fdab95cfb9164afceb7809516309bbf0231fc262e7825ea`

Both supplied files contain intentional Markdown hard line breaks (two trailing spaces) in the operator/contact paragraph. Those bytes were preserved; Git's whitespace checker reports those two lines.

### Owner verification before launch

The supplied policies state that saved simulation data is automatically deleted after 90 days. This branch contains no scheduled retention implementation, and no external scheduler was inspected. External retention configuration remains unverified. Verify/configure the actual deletion process before publishing that promise. Policy wording was not changed; implementing new retention infrastructure is outside this pass. A clarification was requested, with no response received during this work.

Also verify Supabase anonymous sign-in enablement and production build-time public values before the deployed playtest. These are configuration verification items, not claims that cloud deployment was tested.

## Verification

Node `24.21.0`, pnpm `11.5.3`.

- `pnpm install --frozen-lockfile`: passed.
- `pnpm lint`: passed, all 10 tasks.
- `pnpm typecheck`: passed, all 10 tasks.
- Full `pnpm test`, run 1: **1,076 passed; 13 existing skips; 158 passed / 4 skipped files (162 total)**; 57.90 seconds.
- Full `pnpm test`, run 2: **1,076 passed; 13 existing skips; 158 passed / 4 skipped files (162 total)**; 55.75 seconds.
- `pnpm build`: passed, all 9 build tasks; existing large-chunk advisory remains.
- Baseline was 1,074 passed. Removed seven AI-only tests (four package, three server); added nine launch tests. Existing deterministic, authored-dialogue, reachability, arrival, Desk OS, and other tests remain green. The 13 existing skips include live disposable-DB integrations; none were newly skipped.
- Four routes (home, privacy, terms, direct Start), desktop 1366px and mobile 390px, dark and light: 16 browser checks, no overflow, page errors, or automated WCAG A/AA violations. Keyboard Terms focus and associated Start notices verified. Zero auth/analytics requests before Start acknowledgment.
- Scoped design detector: no findings.
- No changes under `packages/core`, `packages/schemas`, `packages/evidence`, `content`, or `apps/web/src/world`; no scoring, canonical reducers, determinism, or room/flow rewrites.

Preliminary checks caught incomplete new test typings and consent storage leaking between test cases; corrected those tests. The host's Node 25 produced an assessed-entry storage failure. Final verification used the repository's documented/CI Node 24, without changing timeouts, adding retries, or skipping tests.

Logs and screenshots: `docs/qa/launch-essentials/`. Representative images: `home-1366-dark.png`, `start-390-dark.png`, `privacy-1366-light.png`, `terms-390-light.png`. Detailed browser results: `browser-review.json`.
