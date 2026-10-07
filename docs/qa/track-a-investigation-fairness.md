# Track A: investigation fairness and guidance audit

Base: `d235cce`, isolated branch `fix/investigation-fairness-zk`.

Scope: source review of the Cybersecurity Analyst simulation pack, action/task progression, consequences and callbacks, Morgan/Jules guidance, decision review, recovery workstation, native Desk OS, case rail, tool forms, and handoff rendering. Regression tests exercise saved-state provenance and rendered UI. This is not a new live spatial playthrough or target-age user study.

## Fix 1

- Expose the exact session timeline (S-0741 / S-0731) and VPN catalogue NET-VPN-04 comparison without opening a disclosure. Show disabled prerequisites and saved/not-recorded status.
- Explain beside the ticket that attachments alone do not save the comparison. Preserve explicit recording and truthful partial assessment.
- Name missing comparison, unopened required sources, and missing attachments in reviewer feedback and decision review. Name absent ticket documentation separately.
- Replace fallback `city-led` with `not-recorded`; update it when the actual route comparison is later recorded. Preserve `city-led` for an explicitly selected city explanation.

## Fix 2

- Use the canonical handoff disposition helper in preview, case history, and both workstation case details. Show escalated/review pending, routed/approval pending, bounded scanner closure, unauthorized approval/review pending, and rejection/business need unresolved.
- Rename Closed history to Recorded outcomes so routing and escalation are not presented as closed investigations.
- Include all recorded case dispositions and continuation obligations in the handoff preview, as the sent handoff does.
- Label global guidance Queue objective; show the selected case's next step and a case-specific link to its tool. Preserve the selected case when switching recovery-workstation tools.
- Remove the false No pending actions message from the shared action renderer; separate forms still present their controls and prerequisites.
- Display recorded resolution instead of the original unfinished summary after disposition. Remove unconditional return-to-login instructions from scanner decisions/consequences and Jules interruption advice.
- Make Jules recognize no active case decision and the shift-handoff stage. Make Morgan's completed-case replies use recorded outcomes instead of the original investigation instructions.

Additional findings fixed:

- Terminal case details and escalated queue entries displayed old action deadlines. Hide those deadlines after disposition; an escalation's original analyst deadline is not a senior-review deadline.
- Morgan's generic uncertainty reply could say supporting records were still needed after completed checks. Completed-case replies now retain the actual recorded outcome.
- Optional record searches and manager questions could become the global next-step objective. Exclude them from mandatory queue guidance while keeping them available in their tools.
- Preview previously omitted Finance and Rivera even though the sent handoff included them. Both now use the same complete case list.
- Debrief implied the user omitted an optional reflection despite having no input. It now identifies the private thinking prompt and explicitly says no response is collected; later suggestions are labeled Ideas for later.
- Preview inferred “no final decision” solely from absent resolution text. It now refers to the recorded disposition instead.

## Intentional assertion updates

- `apps/server/test/cyber-usability.test.ts`: replace generic missing-comparison wording with the exact missing pair and add no-invented-city and all-sources-attached regressions.
- `apps/web/test/desk-os.test.tsx`: expect Recorded outcomes instead of Closed history, and no old deadline for a selected escalated item.

Assessment support rules, core event-status storage, and progression remain unchanged. User-facing dispositions distinguish finished analyst work from pending external review. No branch merge or push.

## Product media provenance

Changing the pack copy invalidated the strict media pack-hash check. All 27 product images and their provenance were recaptured from this isolated worktree on port 5284 using the existing capture script. The provenance test was kept unchanged.

## Final validation

Node 24.21.0 / pnpm 11.5.3: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` passed. Full suite: 126 passing files, 2 skipped files; 845 passing tests, 9 existing skipped tests. Build completed with its large-chunk advisory. Targeted UI, completeness, provenance, coworker, handoff, and replay regressions also passed. The debrief mobile image and Desk OS desktop image were visually inspected after recapture.
