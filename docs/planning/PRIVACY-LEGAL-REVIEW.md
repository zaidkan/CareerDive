# CareerDive — Privacy / Legal Launch Review (external, ChatGPT-researched)

> Not legal advice. A launch privacy/legal review + drafting package, as of 2026-09-27.
> Reviewed against the repo state + locked analytics/support specs. Use with `P0A-LAUNCH-DECISIONS.md`.

## Launch assessment
Privacy architecture is directionally strong (no persistent analytics identity, no replay/heatmaps/keystroke/cursor
surveillance, no ad profiles, no broad autocapture; ephemeral visit/journey IDs, allowlisted events). But do NOT publish
the current Trust page or call the package final. Five P0 issues:

1. **Launch identity model unresolved.** Server expects Supabase Bearer auth; public client sends dev `x-user-id: local-user`;
   no login UI. Privacy copy can't describe accounts/anonymous use until reconciled.
2. **Trust-page promises exceed implementation** — "that's it," "only you," "single expiring sharing link,"
   "delete your account — that's everything," and "RLS proves nobody else can access."
3. **No automatic simulation-data retention** in code (analytics/support retention designed; sim/action/reflection not).
4. **PostHog planned, not implemented** — its defaults collect more than allowed; must be deliberately constrained.
5. **13+ policy needs a real decision + COPPA review** — an age statement alone doesn't prove a service isn't child-directed.

## Requirement classification (summary)
- Truthful privacy notice: publish before collecting launch data (CalOPPA can require it without CCPA thresholds).
- COPPA parental consent: required IF COPPA-covered and collecting under-13 PII outside an exception — not automatic just because minors use it.
- FERPA/PPRA: not for ordinary DTC launch; relevant only in covered school programs.
- CCPA/CPRA, GPC: threshold/processing-dependent; CareerDive's doctrine prohibits sale/share/targeted-ad uses.
- Cookie banner: not inherently required for a genuinely cookieless US architecture (EEA/UK separate).
- Analytics disclosure: strongly recommended / possibly required.
- 13+ minimum age: product/risk decision; recommended for initial beta, counsel to confirm COPPA classification.
- School DPA/education-law review: required before institutional rollout; keep school deployment disabled now.
- WCAG/accessibility: strongly recommended now; important before public-school deployment.

## P0 — resolve before public launch
1. Choose identity architecture (anonymous vs accounts); reconcile client/server auth mismatch.
2. Counsel COPPA audience determination + approve 13+ policy.
3. Enforceable simulation retention rule (none verified today).
4. Replace inaccurate Trust/FAQ/footer claims (accurate copy drafted in review Output 10).
5. Publish /privacy + /terms with real operator/legal/contact info (drafts in Outputs 3 & 4).
6. Verify deletion end-to-end (incl. Supabase Auth identity + backup caveats).
7. Verify RLS using the actual production DB role (migration RLS alone is not proof).
8. Implement or remove user-facing export/delete/sharing claims.
9. Decide reflections/free text; add "don't include sensitive info" microcopy.
10. Confirm Anthropic on/off; if on, disclose + minimize prompt context + commercial DPA settings.
11. If PostHog launches: first-party allowlist + server-side forwarding, ephemeral IDs, no identify/person/replay/heatmaps/autocapture, discard IP/GeoIP, no sensitive query/referrer, no AI-training use.
12. Confirm PostHog data center + retention.
13. Confirm Render region/plan/logs + Supabase region/plan/backups/logs.
14. Choose support-email provider if email support launches.
15. /support, /feedback only to the locked minimized schema; no screenshot upload at P0.
16. Do not enable school/institutional deployment.
17. Accessibility launch QA + usable accessibility-reporting channel.
18. Privacy-request mailbox/process that can receive access/deletion/parent inquiries.
19. Production network audit: storage, cookies, request destinations, headers, query strings, third-party scripts, PostHog/Anthropic payloads, logs.
20. Counsel reviews final privacy/terms AFTER the technical decisions.

## Retention defaults proposed
Raw analytics ≤90d · error rows ≤30d · raw optional feedback/support ≤180d · closed-ended feedback ≤12mo ·
de-identified aggregates longer. Simulation/session retention: OWNER TO SET (see decisions doc).

## Third-party processors
Render (hosting; logs 7/14/30d by plan) · Supabase (DB + auth; backups 7/14/30d by plan) ·
Anthropic (optional NPC dialogue; API I/O auto-deleted ~30d; US default) · PostHog (planned, not implemented; must be constrained) ·
support-email provider (not selected).

## Claims NOT to make until proven
"COPPA/FERPA/GDPR compliant" · "anonymous/only you/no IP/no cookies" · "RLS guarantees nobody else can see it" ·
"delete account deletes everything immediately" · "we never store what you type" · "AI never sees PII" ·
"PostHog anonymous by default" · "all code open-source" (unless repo public) · "legally reviewed" (until an attorney actually did).

## Drafts available in the full review (to wire in during P0-B)
- Output 3: Privacy Policy draft · Output 4: Terms draft · Output 5: AI disclosure ·
  Output 6: analytics/cookie disclosure · Output 7: youth-privacy review · Output 8: Trust-page fact-check table ·
  Output 10: final replacement copy set (Trust page, footer, microcopy for reflections/feedback/support/age/workshop).

> NOTE: This file is a condensed index of the external review. The full drafted Privacy Policy / Terms / replacement
> copy text should be pasted below or kept alongside for the P0-B build to reference verbatim.
