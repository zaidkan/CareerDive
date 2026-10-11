# Public career content packet

Status: approved copy source for public career data
Last reviewed: 2026-09-25
Applies to: `apps/web/src/careers/types.ts`, `apps/web/src/careers/careers.ts`
Not rendered by: `apps/web/src/site/pages/CareerDetailPage.tsx` (pathway, misconceptions, and reality notes are stored data only in this change)

## Scope and rules

- This file is the durable source for public career copy. If `careers.ts` and this packet disagree, this packet wins.
- Only the careers in the locked set below are public. `Film & Video Editor` is removed and must not be reintroduced.
- No `[VERIFY]` marker may reach `careers.ts` or any rendered UI string. Unverified items are recorded only in "Unverified items" below and are excluded from public data.
- Workshop careers stay previews: `detailPublished: false`, `requestable: true`, no `simulationRoute`, no standalone detail page.
- No career fit score, hiring assessment, or "recommended for you" language anywhere in the packet.
- Wages and employment figures below come from the U.S. Bureau of Labor Statistics Occupational Outlook Handbook (OOH). Figures are context for reviewers; they are deliberately not embedded in public UI strings, which age badly.

## Locked career set

| #   | Title                 | slug                    | availability  | detailPublished | requestable | simulationRoute |
| --- | --------------------- | ----------------------- | ------------- | --------------- | ----------- | --------------- |
| 0   | Cybersecurity Analyst | `cybersecurity-analyst` | `ready_now`   | `true`          | `false`     | `/start`        |
| 1   | Registered Nurse      | `registered-nurse`      | `in_workshop` | `false`         | `true`      | none            |
| 2   | Mechanical Engineer   | `mechanical-engineer`   | `in_workshop` | `false`         | `true`      | none            |
| 3   | Electrician           | `electrician`           | `in_workshop` | `false`         | `true`      | none            |
| 4   | Lawyer / Attorney     | `lawyer-attorney`       | `coming_soon` | `false`         | `true`      | none            |

Index order is load-bearing: tests read `careerAt(0)` as Cybersecurity Analyst and `careerAt(1)` as Registered Nurse, and `workshopCareers()` returns every non-`ready_now` career in array order, so Lawyer / Attorney appears in the Workshop shelf even though its availability literal is `coming_soon`. Do not reorder or change availability values without updating the ordering tests.

## Content by career

### 0. Cybersecurity Analyst — Ready Now

- shortSummary: Triage an alert, check the evidence, and hand off the shift.
- workplaceSummary: Spend a first day in Verdaly Technologies' security operations center. Read the handoff, inspect a suspicious login, and document what you can support.
- skills: Evidence review · Prioritization · Clear handoffs
- plannedTasks: Find what the last analyst left open · Read the alert signal · Match the device to inventory
- artifacts/media concepts: Handoff email · Alert record · Investigation ticket
- caveats: A short simulation of selected tasks, not a complete account of the occupation. · No career fit score or hiring assessment.
- pathway: A bachelor's degree in a computer science field is the usual entry, with related work experience. Some people enter with a high school diploma plus industry training and certifications, and many employers value professional certification. BLS median for information security analysts: $129,180 (May 2025); projected growth 21% (2025–35).
- misconceptions:
  - claim: The job is mostly hacking back at attackers. correction: A first shift is triage, evidence checking, and documentation inside approval boundaries; offensive work is a separate, separately authorized role.
  - claim: An alert means something is confirmed compromised. correction: An alert is a signal to verify. The analyst records what the evidence supports and what is still open.
- reality notes: Alert work arrives in bursts with quiet stretches between them. Unfinished work is written down and handed to the next shift rather than closed out by guesswork.
- content caveats: none for this career (published detail page renders `caveats` only).
- provenance: `content/packs/cybersecurity-analyst/pack.yaml` (reviewStatus `approved`, sources BLS OOH Information Security Analysts and the NIST NICE Workforce Framework).

### 1. Registered Nurse — Workshop

- shortSummary: Help care for patients by noticing changes, organizing information, communicating with a healthcare team, and keeping accurate records.
- workplaceSummary: Hospital / care setting
- skills: Observation · Communication · Prioritization · Documentation
- plannedTasks: Review synthetic patient information · Recognize and communicate a meaningful change · Organize a handoff
- artifacts/media concepts: Synthetic patient record · Observation note · Handoff sheet · Escalation message
- caveats: Workshop preview only. No simulation is available.
- content caveats: Synthetic information only; no real clinical procedure, dosing, or diagnosis instruction.
- pathway: Three usual routes — a bachelor's degree in nursing (BSN), an associate degree in nursing (ADN/ASN), or a diploma from an approved nursing program; all include supervised clinical experience. Graduates then pass a qualifying exam for a state license. Employers, particularly hospitals, often prefer or require a bachelor's, and ADN/diploma nurses can later complete an RN-to-BSN program. BLS median: $93,600 (May 2024); projected growth 5% (2024–34); typical entry-level education listed as bachelor's degree.
- misconceptions:
  - claim: Nurses carry out a doctor's orders and nothing else. correction: Nursing includes independent assessment, prioritization of what changes first, escalation, and continuous documentation — the preview is built around noticing and communicating a change, not prescribing one.
  - claim: The job is bedside tasks only. correction: A large share of the work is recording information accurately and handing it to the next person cleanly, which is why documentation and handoff are first-class tasks here.
- reality notes: Schedules commonly include nights, weekends, and holidays. Everything in the Workshop preview is synthetic; completing it confers no clinical competence, credential, or license.
- provenance: Approved Workshop preview copy; BLS OOH Registered Nurses.

### 2. Mechanical Engineer — Workshop

- shortSummary: Turn a design problem into something that can be tested, measured, improved, and built.
- workplaceSummary: Engineering office / prototype lab
- skills: Systems thinking · Spatial reasoning · Quantitative reasoning · Technical communication
- plannedTasks: Read a technical drawing · Review test results · Investigate a failure and recommend a design change
- artifacts/media concepts: Technical drawing · Test report · Failure analysis note · Proposed design change
- caveats: Workshop preview only. No simulation is available.
- content caveats: Preserve authentic design and testing reasoning; avoid generic math puzzles.
- pathway: A bachelor's degree in mechanical engineering or mechanical engineering technology, usually from an accredited program (accreditation is usually required for later licensure). Licensure is not required for entry-level work; a Professional Engineering (PE) license is earned later with an accredited degree, the Fundamentals of Engineering exam, typically about four years of experience, and the Professional Engineering exam. Selling engineering services to the public requires licensure in every state and the District of Columbia. BLS median: $102,320 (May 2024); projected growth 9% (2024–34).
- misconceptions:
  - claim: Engineering is solving equations until the number comes out right. correction: The work is framing a problem that can be tested, choosing constraints, reading imperfect results, and recommending a change someone can build.
  - claim: A design is finished when it looks right on paper. correction: Most of the cycle is revision after test data or a failure contradicts the first idea — which is why "investigate a failure" is a planned task here.
- reality notes: Expect iteration rather than a single breakthrough. Simulation results are instructional only; simulated work is not reviewed, sealed, or certified by a licensed professional engineer.
- provenance: Approved Workshop preview copy; BLS OOH Mechanical Engineers.

### 3. Electrician — Workshop

- shortSummary: Read plans, inspect electrical systems, spot problems, and make safety-focused decisions about how work should proceed.
- workplaceSummary: Construction / commercial maintenance
- skills: Troubleshooting · Spatial reasoning · Safety awareness · Planning
- plannedTasks: Interpret a simplified blueprint · Identify a simulated safety concern · Review conceptual diagnostics and report the result
- artifacts/media concepts: Simplified blueprint · Safety concern report · Conceptual diagnostic result · Work plan note
- caveats: Workshop preview only. No simulation is available.
- content caveats: Abstract, de-energized simulated diagnostics; no live-work procedural instruction.
- pathway: Most electricians learn through an apprenticeship — typically four or five years, with about 2,000 hours of paid on-the-job training plus technical instruction each year; some start at a technical school. A high school diploma or equivalent is the usual entry education. Most states require electricians to pass a test and be licensed, and requirements vary by state. BLS median: $62,350 (May 2024); projected growth 9% (2024–34); 818,700 jobs in 2024.
- misconceptions:
  - claim: The job is tracing a wire diagram. correction: Plans are the starting point; the actual work is inspecting an installed system, comparing it to what should be there, and deciding what happens next safely.
  - claim: Apprentices begin by doing live work on their own. correction: Apprenticeship is supervised hours plus classroom instruction; independent, licensed work comes after the program and the state test.
- reality notes: Work happens in unfinished spaces, outdoors, and inside finished buildings, often against a schedule. Safety procedure is part of the task itself. The Workshop preview reasons about abstract, de-energized situations only and is not a substitute for supervised training.
- provenance: Approved Workshop preview copy; BLS OOH Electricians.

### 4. Lawyer / Attorney — Workshop

- shortSummary: Sort facts, sources, and open questions before a legal team decides what to do next.
- workplaceSummary: Law firm / in-house legal team
- skills: Source evaluation · Issue spotting · Case organization · Clear writing
- plannedTasks: Compare client notes, a timeline, and a contract to find missing facts and escalation flags · Organize public docket records, evidence, and witness notes into a cited chronology · Match facts to statutes or case references and draft a neutral, source-linked issue brief
- artifacts/media concepts: Client fact summary · Case chronology · Contract review notes · Issue brief
- caveats: Workshop preview only. No simulation is available.
- content caveats: A simplified preview of legal analysis and case organization; not legal advice, a courtroom simulation, or unsupervised professional practice.
- pathway: Most states and jurisdictions require a Juris Doctor from an accredited law school, followed by the bar exam and admission by the state's admitting board. Some candidates enter through other routes that the bar accepts, and bar scores transfer only between jurisdictions that recognize them. BLS median: $151,160 (May 2024); projected growth 4% (2024–34); 864,800 jobs in 2024; typical entry-level education is a doctoral or professional degree.
- misconceptions:
  - claim: Lawyers spend the day in a courtroom. correction: Most of the work is reading, comparing, and writing — organizing facts and sources so a team can decide. That is exactly what these three preview tasks practice.
  - claim: If it is on the internet, it is usable law. correction: What applies depends on jurisdiction and date, and nothing here is advice for a real situation.
- reality notes: The substance is reading and writing under real deadlines, not drama. Jurisdiction and year matter, so a fact can be right and still not apply. The preview is a simulated analysis exercise only; it creates no attorney-client relationship and is not legal advice.
- provenance: Approved Lawyer / Attorney preview copy; BLS OOH Lawyers.

## Removed career

- `Film & Video Editor` (previously `film-video-editor`) is removed from the public set. No copy, route, selector result, or test fixture may reference it as a live public career. `getCareerBySlug("film-video-editor")` must return `undefined`.

## Unverified items (excluded from public data)

These were marked `[VERIFY]` during drafting and are recorded here only so the decision is durable. None of them may appear in `careers.ts` or in any rendered string.

1. `[VERIFY]` Whether the product title "Cybersecurity Analyst" maps one-to-one onto OOH's published occupation title "Information security analysts" (SOC 15-1212). The titles are not identical; we do not claim equivalence in public data.
2. `[VERIFY]` Attribution of OOH wage and outlook figures to the product title "Cybersecurity Analyst". Figures are published for "Information security analysts"; we cite them in reviewer-facing material only and keep them out of UI strings.

## Field mapping

| Packet section           | `PublicCareer` field      | Rendered today?                          |
| ------------------------ | ------------------------- | ---------------------------------------- |
| shortSummary             | `shortSummary`            | yes (cards, detail lede)                 |
| workplaceSummary         | `workplaceSummary`        | yes (Ready Now card, detail header)      |
| skills                   | `skills`                  | yes (Ready Now card, detail, preview)    |
| plannedTasks             | `plannedTasks`            | yes (card, detail, preview)              |
| artifacts/media concepts | `artifactOrMediaConcepts` | detail page only, when `detailPublished` |
| caveats                  | `caveats`                 | detail page, preview fallback            |
| content caveats          | `contentCaveats`          | detail page, preview primary             |
| pathway                  | `pathway`                 | no — stored data                         |
| misconceptions           | `misconceptions`          | no — stored data                         |
| reality notes            | `realityNotes`            | no — stored data                         |
| provenance               | `sources`                 | no — stored data                         |

`pathway` is `readonly string[]`. `misconceptions` is `readonly { claim, correction }[]`. `realityNotes` is `readonly string[]`. All three are optional and backward compatible: existing consumers compile and render unchanged.

## Sources

- BLS OOH, Information Security Analysts: https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm
- BLS OOH, Registered Nurses: https://www.bls.gov/ooh/healthcare/registered-nurses.htm
- BLS OOH, Mechanical Engineers: https://www.bls.gov/ooh/architecture-and-engineering/mechanical-engineers.htm
- BLS OOH, Electricians: https://www.bls.gov/ooh/construction-and-extraction/electricians.htm
- BLS OOH, Lawyers: https://www.bls.gov/ooh/legal/lawyers.htm
- NIST NICE Workforce Framework for Cybersecurity: https://www.nist.gov/itl/applied-cybersecurity/nice/nice-framework-source-center
- `content/packs/cybersecurity-analyst/pack.yaml`
