# SOC Structured Record Fixtures (Content Design Only)

**Status:** Proposed fixtures for future Phase 2/7 implementation. Content authoring / data design only — no schema, no runtime, no query-engine decisions.
**Canonical design spec (wins all disagreements):** `docs/superpowers/specs/interactivity-and-content-depth-design.md`
**Content-design parent:** `docs/superpowers/specs/soc-structured-content-pack.md`
**Realism reference:** `docs/superpowers/specs/soc-shift-realism-reference.md`
**Source pack verified:** `content/packs/cybersecurity-analyst/pack.yaml` (packVersion 1.0.0, reviewed 2026-06-01)
**Phishing implementation status:** DEAD / INCOMPLETE — pack actions `open_phishing_report`, `inspect_email_headers`, `check_link_destination` reference artifacts `phishing-email-1`, `phishing-headers-1`, `phishing-link-1`, none of which exist in `pack.yaml` artifacts. Section 6 below designs supporting data only. It does not claim existing phishing gameplay works.

## Classification rule (binding for this document)

Every record/fact below carries exactly one label:

- `EXISTING CANONICAL FACT` — already in `pack.yaml`, quoted or faithfully restated. Never silently changed.
- `PROPOSED SUPPORTING RECORD` — new row needed so future query/correlation mechanics have something to operate on. Consistent with canon, adds no new verdict about the central case.
- `OPTIONAL REALISM FILLER` — benign background rows. Safe to cut. Never load-bearing; never resolves the central case.

Filler never identifies who used S-0741, never confirms compromise, never clears the account. Only authored canonical sources speak, and they speak cautiously, as today. No `requiredOptionIds`, no answer keys, no "correct query" strings. Relationships are natural joins (account, IP, device, session, time, alert, ticket), never "correct clues." Times are office-local on the current shift date.

## 0. Provenance notes — every canonical fact used by these fixtures

Verified against `pack.yaml` before use. Quote = pack wording; restatement = same meaning, flagged.

| # | Canonical fact | Pack source | Provenance note |
|---|---|---|---|
| C1 | Alert A-1042: 07:38–07:40 six failed MFA challenges from 203.0.113.44; 07:41 one successful password login for j.patel from same source; device unknown-laptop-17, Chrome/Windows, residential ISP, Montreal-metro geo hint (estimate only) | `suspicious-login-alert` body; `login-session-timeline` body | **EXISTING CANONICAL FACT.** Fixtures A2-group/A3, D3, V-absence-1 restate this. Geo kept as hint, never proof. |
| C2 | Session S-0731: 07:31 success through V-218, exit 198.51.100.20, corp-macbook-patel, password + extra check completed, managed-device certificate matched inventory, displayed city Montreal (network estimate) | `prior-session-1` body; `login-session-timeline` 07:31 line | **EXISTING CANONICAL FACT.** Fixture A1/V1 restate. City = exit estimate, not employee location. |
| C3 | Session S-0741: 07:41:09 password accepted, session created; source 203.0.113.44; VPN connection ID absent; device unknown-laptop-17; extra-check result not present in export; 07:43 portal refresh continues session, verifies nothing | `login-session-timeline` body | **EXISTING CANONICAL FACT.** Fixtures A3/A4 restate. "Password success ≠ MFA success" preserved. |
| C4 | IP 203.0.113.44: source of 6 failed extra checks + S-0741; residential ISP; not an approved VPN exit in snapshot; no prior successful sessions from this ASN in 90 days (login-context lookback scope) | `suspicious-login-alert`; `login-context-1`; `vpn-context-1` ("203.0.113.44 is not an approved exit") | **EXISTING CANONICAL FACT.** 90-day claim scoped to successful sessions in login-context record, not all account uses. |
| C5 | IP 198.51.100.20: approved VPN exit for V-218; source/exit of S-0731 | `prior-session-1`; `vpn-context-1` | **EXISTING CANONICAL FACT.** Shared-exit fixtures (V4/V5) do not change this mapping. |
| C6 | Device unknown-laptop-17: exact flagged-session label; not enrolled, never checked into MDM; browser/platform self-report is not ownership proof | `device-inventory-1` body; `login-context-1` | **EXISTING CANONICAL FACT.** Fixture D3 restates; near-miss D6/D7 are different labels by design. |
| C7 | Devices corp-macbook-patel (active, last check-in 07:30, S-0731 cert match) + corp-phone-patel (active) for J. Patel; inventory covers registered work devices only; snapshot 07:45 | `device-inventory-1` body | **EXISTING CANONICAL FACT.** Fixtures D1/D2 restate including coverage limit. |
| C8 | VPN V-218 → exit 198.51.100.20; office's only approved VPN exit in NET-VPN-04 snapshot 07:45; exit hosting Montreal, assigned office Toronto; S-0731 carries V-218; catalogue covers org-provided VPN only | `vpn-context-1` body | **EXISTING CANONICAL FACT.** Fixture V1/V2 restate. Absence ≠ route identification. |
| C9 | Account baseline j.patel: HQ Wi-Fi + enrolled MacBook typical; two VPN sessions last week from Toronto office; no password resets in 30 days | `account-history-1` body | **EXISTING CANONICAL FACT.** Fixtures A5–A8 instantiate (each row is PROPOSED form of this canonical pattern). |
| C10 | Employee report (08:05): "No. I am not traveling, and I did not use a Windows laptop this morning. My work MacBook and phone are both with me." Report, not proof | `employee-login-reply` body | **EXISTING CANONICAL FACT.** Quoted verbatim in fixtures. |
| C11 | HR travel register HR-TR-08: approved work trips only; no entry for account on shift date; does not record personal travel, live location, pending requests; extract 08:00; assigned office Toronto | `travel-status-1` body | **EXISTING CANONICAL FACT.** Fixtures preserve coverage limit; no-entry ≠ no-travel. |
| C12 | Single-source rule: "A-1042 and login-context-1 summarize the same source; counting them separately does not create independent corroboration" | `login-session-timeline` body | **EXISTING CANONICAL FACT.** Quoted; blocks double-counting discovery. |
| C13 | Collection limit: "Collection ends at 07:45. This export has no file-access or mailbox activity and cannot establish what was accessed." | `login-session-timeline` body | **EXISTING CANONICAL FACT.** Quoted; only licensed conclusion is "access unverified." |
| C14 | Handoff: still watching unfamiliar login thread; device inventory check unfinished; scanner schedule reference missing; "Ping Morgan if the login expands" | `handoff-email` body | **EXISTING CANONICAL FACT.** Not duplicated as fixture rows; referenced as queue context. |
| C15 | A-1180 / RUN-FIN-031 / SCAN-FIN-MON: vuln-scan-03, finance VLAN, recorded activity Monday 10:18 within run 10:05–10:32, window approved Mondays 10:00–12:00, owner infrastructure operations, delivery delayed, coverage discovery-connections-only | `scanner-alert`; `scanner-run-log`; `scanner-window` | **EXISTING CANONICAL FACT.** Routine-cluster fixtures restate; delivery time ≠ event time. |
| C16 | Private travel disclosure ("planned travel to Montreal", knownBy employee only) | `facts: employee-private-travel`, visibility private | **EXISTING CANONICAL FACT (restricted).** Must never appear in any fixture row, query result, NPC line, or fallback text. Listed here only to forbid its use. |
| C17 | Phishing artifacts do not exist | actions `open_phishing_report` → `phishing-email-1`, `inspect_email_headers` → `phishing-headers-1`, `check_link_destination` → `phishing-link-1`; artifacts list has no such IDs | **EXISTING CANONICAL FACT (gap).** All Section 6 rows are PROPOSED greenfield. |

Nothing above changes scenario truth. Where a scope/date assumption was needed (shift-date Monday, snapshot coverage, reporter identity), it is labeled PROPOSED in place.

---

## 1. Authentication fixtures (14 rows, grouped-failure form)

Conceptual fields: record ID · user · time (office-local) · source IP / network · device label · method/step · result · session link · classification · note.

### 1a. Central rows (restate canon)

| ID | User | Time | Source | Device | Method | Result | Session | Class | Note |
|---|---|---|---|---|---|---|---|---|---|
| AUTH-0731-PATEL | j.patel@example.com | 07:31 | 198.51.100.20 (VPN exit) | corp-macbook-patel | password + extra check completed | success | S-0731, VPN V-218 | **EXISTING CANONICAL FACT** | Restates C2. Cert matched inventory; city Montreal = exit estimate. |
| AUTH-0738-GROUP (6 fails, grouped) | j.patel@example.com | 07:38:02–07:40:51 | 203.0.113.44 | — (no session) | extra identity check | fail ×6 | none | **EXISTING CANONICAL FACT** | Restates C1/C4. Grouped row with `attempt_count: 6` + expandable attempt list. Groups by account+source; identifies no person. Per-attempt F1..F6 rows NOT recommended for beta (19-row variant, noisier, content-identical). |
| AUTH-0741-PATEL | j.patel@example.com | 07:41:09 | 203.0.113.44 | unknown-laptop-17 | password accepted; extra-check result not present | success | S-0741, no VPN ID | **EXISTING CANONICAL FACT** | Restates C3. Never render as "MFA success." |
| AUTH-0743-REFRESH | j.patel@example.com | 07:43 | — (portal) | — | session refresh | n/a (continuation) | S-0741 | **EXISTING CANONICAL FACT** | Restates C3. Continuation, not verification of control. |

### 1b. Benign neighbors (same account, ordinary pattern — instantiate C9)

| ID | Row | Class | Why it exists |
|---|---|---|---|
| AUTH-0715-PATEL-HQ | j.patel · 07:15 · HQ Wi-Fi 10.20.4.18 · corp-macbook-patel · password+extra check · success · S-0722 (closed 07:25) | **PROPOSED SUPPORTING RECORD** | Second baseline row so history is not a single anecdote; corroborates HQ+MacBook pattern. |
| AUTH-0658-PATEL-PHONE | j.patel · 06:58 · HQ Wi-Fi · corp-phone-patel · mobile SSO, extra check done · success · S-0719 (mail sync) | **PROPOSED SUPPORTING RECORD** | Ordinary phone check-in; explains second enrolled device. |
| AUTH-LASTWK-VPN-1 | j.patel · last week weekday 09:12 · VPN V-218 (exit 198.51.100.20) · corp-macbook-patel · success · S-0690 | **PROPOSED SUPPORTING RECORD** | First of canonical "two VPN sessions last week." |
| AUTH-LASTWK-VPN-2 | j.patel · last week weekday 14:40 · VPN V-218 (exit 198.51.100.20) · corp-macbook-patel · success · S-0697 | **PROPOSED SUPPORTING RECORD** | Second of the two. Both carry V-218 → route-not-city logic when compared with S-0741's absent ID. |
| AUTH-0612-PATEL-TYPO | j.patel · 06:12 · HQ Wi-Fi · corp-macbook-patel · one failed password, success 06:13 same row | **PROPOSED SUPPORTING RECORD** | Boundary row: ordinary typo inside lookback. Sharpens "one HQ typo ≠ six unknown-source MFA fails." |

### 1c. Irrelevant but plausible (other users, filter noise)

| ID | Row | Class | Why plausible / why safe |
|---|---|---|---|
| AUTH-0733-OKONKWO | c.okonkwo · 07:33 · HQ Wi-Fi · corp-macbook-okonkwo · success · S-0735 | **OPTIONAL REALISM FILLER** | Morning rush; same HQ pattern, different person. Tests user filter. Never joins Patel keys. |
| AUTH-0740-GARCIA-FAIL-THEN-OK | m.garcia · 07:40 one failed password (1/5 lockout) then 07:41 success, HQ Wi-Fi, enrolled device | **OPTIONAL REALISM FILLER** | Calibration distractor: single-fail-then-success is daily life. Exactly one failure, usual device/network — similar glance, different inspection. Teaches sequence+context over pattern-match. |
| AUTH-0802-RIVERA-VPN | a.rivera · 08:02 · VPN V-219 (exit 198.51.100.21) · corp-macbook-rivera · success | **OPTIONAL REALISM FILLER** | Second VPN user, different connection. V-IDs are per-connection. Rivera doubles as phishing reporter — ordinary day, two unrelated touchpoints. |
| AUTH-0755-SVC-BACKUP | svc-backup · 07:55 · internal scheduler host · API token · success (scheduled job) | **OPTIONAL REALISM FILLER** | Service principals appear in exports. Labeled non-interactive; teaches scope, wastes only a glance. |
| AUTH-0901-NGUYEN-RESET | d.nguyen · 09:01 · HQ Wi-Fi · password expired → reset required, no session | **OPTIONAL REALISM FILLER** | Resets happen — for others. Matches "no Patel resets in 30 days" by contrast. Tests user-field reading. |

Cut order: NGUYEN-RESET, SVC-BACKUP, OKONKWO first. Never cut GARCIA-FAIL-THEN-OK (calibration) or 0612-TYPO (boundary).

---

## 2. VPN fixtures (5 rows + 1 absence statement — catalogue, not haystack)

Conceptual fields: VPN ID · user · window · client/ingress · exit IP · device · session ref · class · note.

| ID | Row | Class | Note |
|---|---|---|---|
| V-218 | j.patel · 07:29–08:05 · ingress not enumerated in snapshot · exit 198.51.100.20 · corp-macbook-patel · S-0731. Only approved exit in NET-VPN-04 snapshot 07:45. Exit hosting Montreal; assigned office Toronto. | **EXISTING CANONICAL FACT** | Restates C8. Do not invent client source. |
| VPN-ABSENCE-0741 | No row for (j.patel, 203.0.113.44, 07:38–07:41) in NET-VPN-04 snapshot. "203.0.113.44 is not an approved exit." | **EXISTING CANONICAL FACT** (absence) | Absence statement, not a row. Coverage: snapshot 07:45, org-provided VPN only. See §8. |
| V-219 | a.rivera · 08:02–open · exit 198.51.100.21 (same Montreal facility, different exit IP) · corp-macbook-rivera | **PROPOSED SUPPORTING RECORD** | Bounds "Montreal means V-218" error. Shared city ≠ shared route. |
| V-217 | c.okonkwo · 07:20–07:50 · exit 198.51.100.20 (shared exit IP with V-218) · corp-macbook-okonkwo | **PROPOSED SUPPORTING RECORD** | Exits can be shared; connection ID (not exit IP alone) links session to route. Matches ticket wording "compare both the identifier and address." Also supports false-positive AL-3. |
| V-214 | m.garcia · last week, closed · exit 198.51.100.20 · ordinary row | **PROPOSED SUPPORTING RECORD** | Gives time-window filter something to exclude. |
| V-220 | d.nguyen · 09:00 · status `provisioning`, not active | **PROPOSED SUPPORTING RECORD** | Teaches status reading. Explicitly not a route for any session under review. |

Player must query/correlate: VPN screen alone shows a catalogue; meaning comes only from joining session connection-ID + source against this catalogue. Zero-result absence (VPN-ABSENCE-0741) is meaningful only after a covering query (§8).

---

## 3. Device inventory fixtures (8 rows)

Conceptual fields: label · assigned user · class · enrolled/managed · assignment · last check-in · class · note.

| ID | Row | Class | Note |
|---|---|---|---|
| D1 corp-macbook-patel | J. Patel · corporate MacBook · enrolled/active · last check-in 07:30 · S-0731 cert match | **EXISTING CANONICAL FACT** | Restates C7. |
| D2 corp-phone-patel | J. Patel · corporate phone · enrolled/active | **EXISTING CANONICAL FACT** | Restates C7. |
| D3 unknown-laptop-17 | No enrollment, never checked into MDM. Exact-label match required. Snapshot 07:45. | **EXISTING CANONICAL FACT** | Restates C6. Inventory covers registered work devices only — absence ≠ owner ID. |
| D4 corp-macbook-okonkwo | C. Okonkwo · enrolled/active | **PROPOSED SUPPORTING RECORD** | Org-spanning inventory; supports AL-3 contrast. |
| D5a/D5b corp-macbook-rivera + corp-phone-rivera | A. Rivera · enrolled/active ×2 | **PROPOSED SUPPORTING RECORD** | Reporter on managed devices; gives Rivera rows in two datasets. |
| D6 corp-macbook-patel-old | J. Patel · RETIRED 2025, unenrolled on retirement, no check-ins | **OPTIONAL REALISM FILLER** | Deliberate near-miss: "patel macbook" search returns two rows; only active exact label counts. Tagged RETIRED. Never cut without replacing exact-label discipline elsewhere. |
| D7 unknown-laptop-04 | Unassigned · seen once on guest network last month · never enrolled | **OPTIONAL REALISM FILLER** | "Unknown-* labels exist and are usually nothing." Explicit note: unrelated to S-0741, different label/date. Unknown ≠ malicious. |
| D8 loaner-pool-02 | IT loaner pool · enrolled · checked out to M. Garcia last week, returned | **OPTIONAL REALISM FILLER** | Lifecycle texture; teaches status reading. First cut if budget binds. |

---

## 4. Alert fixtures (queue)

| ID | Row | Class | Note |
|---|---|---|---|
| AL-1 A-1042 | High · sign-in monitoring · 07:38–07:41 sequence · j.patel · S-0741 · unknown-laptop-17 · 203.0.113.44 · links ticket `suspicious-login-1` | **EXISTING CANONICAL FACT** | Restates C1. Body = pack `suspicious-login-alert` prose as detail view. |
| AL-2 A-1180 | Low · connection monitoring · delayed delivery · recorded Mon 10:18 · vuln-scan-03 · finance VLAN · links RUN-FIN-031, SCAN-FIN-MON, ticket `routine-alert-1` | **EXISTING CANONICAL FACT** | Restates C15. Self-contained routine cluster; explicitly unrelated to login cluster. |
| AL-3 A-1204 "impossible-travel estimate" (benign) | c.okonkwo · single success from unseen residential IP, geo "Chicago" vs Toronto, BUT enrolled device + extra check completed + VPN V-217 exit matched + zero prior failures. Verdict: close as expected/verified with note. | **PROPOSED SUPPORTING RECORD** | Bounded contrast case for target T+43. Shares A-1042 surface (unseen IP + surprising city), inverts every load-bearing signal. Cost: this row + 1 auth row + reuse V4/D4. **Do not build until target confirms T+43 stays in beta.** |
| AL-4 A-1191 duplicate phishing report | Second employee forwards same lure ~20 min after PH-RPT-01. Same Message-ID + URL host. | **OPTIONAL REALISM FILLER** | Links queue to phishing item; teaches dedup (quarantine once, link both). Never cut while phishing item ships. |
| AL-5 A-1174 backup-job spike (storage VLAN) | Low · matches nightly backup window doc (KB-BACKUP-01 stub) | **OPTIONAL REALISM FILLER** | Second routine-benign shape; KB-match muscle memory. Cut with SC-RUN-03/KB-BACKUP-01 as a group. |
| AL-6 A-1159 password-spray burst, blocked, zero successes | Medium · 40 fails / 12 accounts · source already blocklisted | **OPTIONAL REALISM FILLER** | Real-threat shape needing no action beyond confirming blocks. "Failed ≠ incident when controls held." |
| AL-7 A-1210 new-device first-seen (enrolled, MFA ok) | Informational · auto-resolves on enrollment verify | **OPTIONAL REALISM FILLER** | Device-lifecycle texture; contrasts unknown-laptop-17. |

Recommended queue: 5 rows (AL-1, AL-2, AL-3 if confirmed, AL-4, AL-5). Minimum 4, maximum 8.

---

## 5. Scanner fixtures

| ID | Row | Class | Note |
|---|---|---|---|
| SC-RUN-01 RUN-FIN-031 | vuln-scan-03 · finance VLAN · Mon 10:05–10:32 · A-1180 activity 10:18 within run · completed · discovery connections only · change SCAN-FIN-MON | **EXISTING CANONICAL FACT** | Restates C15. |
| SC-WIN-01 SCAN-FIN-MON | vuln-scan-03 approved Mondays 10:00–12:00 finance VLAN discovery · owner infrastructure operations · in/out scope rules · "compare recorded event time even when monitoring delivers later" | **EXISTING CANONICAL FACT** | Restates C15. |
| Shift-date assumption | Current shift is the Monday following the recorded run; monitoring forwarded the saved alert after queue delay. | **PROPOSED SUPPORTING RECORD** (flagged) | No canonical absolute date exists. Use "most recent completed Monday" relative dating; derive absolute date at pack-build time if schema needs it. Never invent silently. |
| SC-RUN-02 RUN-FIN-030 | Same scanner/scope, prior Monday 10:06–10:31, completed | **PROPOSED SUPPORTING RECORD** | Recurrence texture; "weekly" is real. |
| SC-NOTE-01 queue-delay memo | "Forwarded after queue delay; event time unchanged." | **PROPOSED SUPPORTING RECORD** | Makes delivery-vs-event a record, not just prose. |
| SC-RUN-03 RUN-STOR-014 | Different scanner/scope/window (storage VLAN, backup night) | **OPTIONAL REALISM FILLER** | AL-5's match target; proves windows are per-scope. |

---

## 6. Phishing fixtures (all PROPOSED — greenfield, separate from dead implementation)

Lure: fake IT "mailbox quota" notice. Universally recognizable, no malware-analysis depth, safe to show, accessible at 13+.

| ID | Record | Class | Content |
|---|---|---|---|
| PH-RPT-01 | Employee report (Work Item opener) | **PROPOSED SUPPORTING RECORD** | Reporter A. Rivera (Finance), a.rivera@example.com · received 09:12 · channel: forwarded mail · status open/unreviewed. Words: "Hi, got this about my mailbox being full. I didn't click the link because the sender looked odd, but I use my mailbox all day and wanted to check. The message below is the original — I didn't change anything." System note: "Reporter did not click. Original preserved." Rivera is new, confined to phishing item, no login-case link. |
| PH-MSG-01 | Message as reporter saw it | **PROPOSED SUPPORTING RECORD** | Subject "Action required: mailbox almost full" · displayed sender "IT Helpdesk <it-helpdesk@example.com>" (display name spoofed; envelope differs). Body: "Your mailbox has reached 98% of its limit. Send and receive will stop within 24 hours. Verify your account now to keep your mailbox active: [Review mailbox usage]." Link text "Review mailbox usage", href `http://mailbox-check.example.net/verify?u=a.rivera` (documentation-style domain; never clickable in UI, shown only via inspection). No attachment. |
| PH-HDR-01 | Headers + one-line glosses | **PROPOSED SUPPORTING RECORD** | From vs Envelope-From `bounce@mailbox-check.example.net` ("displayed name vs actual sender"); Reply-To `support@mailbox-check.example.net` ("replies go elsewhere"); SPF fail / DKIM none / DMARC fail-quarantine (one line each); Received chain = external relay, not org mail; Message-ID present; Date 09:04 (8 min before report). |
| PH-LINK-01 | Destination record (safe inspection tool) | **PROPOSED SUPPORTING RECORD** | Displayed vs actual (`http://mailbox-check.example.net/verify?u=a.rivera`); scheme http not https; host off-org; recipient query = targeting signal, not compromise proof. Authored note: "Destination does not belong to the organization. Do not open in a browser; inspection record is sufficient." First-seen 09:04; no other recipient reports at item open (AL-4 arrives later). |
| PH status/lifecycle | Report states + affordances (content side; engine owns legality) | **PROPOSED SUPPORTING RECORD** | States: open → triaged → quarantined → reporter-notified → closed. Quarantine scope: matching copies by Message-ID + URL host (AL-4 covered by one action → dedup lesson). Reporter-reply template: thanks + don't-click/delete-if-copy-remains + no password/code needed + next step; no blame. KB links: PH-RUNBOOK-01 + EXTERNAL-SENDER-01. |

---

## 7. Intended query paths (no "correct query" strings)

- **Auth:** filter by user (j.patel → central+baseline mix by design); filter by time window (morning cluster vs last-week rows); search session ID (S-0731 vs S-0741 side-by-side); search IP (203.0.113.44 → fail-group + success; 198.51.100.20 → baseline + V rows); open individual rows (grouped fail row expands to attempts). Every path returns mixed benign+central results; none resolves alone.
- **VPN:** search by user; by IP (203.0.113.44 → zero rows = absence subject; 198.51.100.20 → V-218/V-217/V-214 = shared-exit lesson); by time window; by session/connection ID (S-0741 → no row; S-0731 → V-218). Catalogue must be joined with session records — the UI may offer click-to-pivot (select value → search next system) but never auto-performs the join.
- **Device:** exact-label search (unknown-laptop-17 → D3 only; "patel macbook" → D1 + retired D6 = exactness lesson); account→devices and device→accounts pivots; status/tag reading (RETIRED, loaner, provisioning).
- **Alerts:** queue filter by severity/category/state; open A-1042 detail (metadata to start, not to resolve); open A-1180 + run log + window side-by-side; duplicate recognition (AL-4 vs PH cluster).
- **Phishing:** report → message → headers → destination → scope-count → quarantine → notify → close. Shorter than A-1042 by design.

## 8. Likely player discoveries (content only; engine-agnostic)

Login case: (1) six fails preceded S-0741 from 203.0.113.44 [presence, grouped row]; (2) S-0741 password-ok, extra-check absent [mixed presence+absence]; (3) S-0741 = unknown-laptop-17 + 203.0.113.44 + no VPN ID [2-record correlation]; (4) unknown-laptop-17 unenrolled, never MDM [presence of negative inventory state]; (5) baseline = HQ Wi-Fi + enrolled MacBook + 2 prior V-218 sessions [≥3-record correlation]; (6) S-0731 route does not explain S-0741 [3+ records incl. absence]; (7) shared Montreal estimate links nothing [fact about limits]; (8) owner reports no travel/no Windows laptop [report, not proof]; (9) HR register covers approved trips only [coverage fact]; (10) A-1042 + login-context-1 are one source [non-independence]; (11) export ends 07:45, no file/mailbox activity → access unverified; (12) 07:43 refresh continues S-0741, verifies nothing. Routine: (13) A-1180 ↔ RUN-FIN-031 ↔ SCAN-FIN-MON 3-way match; (14) delivery time ≠ event time; (15) discovery-connections-only coverage cap. Phishing: (16) report open, no click, original preserved; (17) displayed vs envelope sender + Reply-To mismatch; (18) SPF/DKIM/DMARC fail; (19) off-org http destination with recipient query; (20) quarantine by Message-ID+host covers AL-4. False-positive if confirmed: (21) A-1204 enrolled+MFA+route-matched, city estimate alone.

## 9. Plausible distractors (why each earns its place, why each is safe)

Garcia 1-fail-then-success (daily typo vs six-fail burst); other-user morning rows (rush/resets, never join Patel keys); service account (labeled job, no user semantics); V-219 second exit (per-connection logic); V-217 shared exit (sharing is normal, ID still required); D6 retired namesake (exact-active-label rule excludes it); D7 other unknown label (different label/date, explicit unrelated note); AL-5/AL-6/AL-7 (benign-true / held-threat / lifecycle-informational, each with own KB match, none joins A-1042); AL-4 duplicate (same campaign keys, one quarantine); 0612 Patel typo (HQ+usual device; single-known vs six-unknown contrast). See content-pack §10 for cut order: A14/A12/D8/SC-RUN-03 group/A9/D7 first; never cut A10-calibration, D6-exactness, V3/V4-route-logic, AL-4-dedup.

## 10. Absence-proof scenarios (coverage-gated; no exact-query match)

Per canonical absence semantics: a stored query establishes absence iff normalized filters semantically cover the authored requirement (required dimensions + time interval ⊇ authored window) with zero qualifying results. Broader queries qualify; wrong-account or unrelated-interval queries do not.

1. "No matching VPN session explains S-0741." Coverage: NET-VPN-04 snapshot 07:45, org VPN only, (user=j.patel, window ⊇ 07:25–07:45, source=203.0.113.44), ID + address checked. Caveat: personal VPNs out of scope.
2. "No prior successes from 203.0.113.44's ASN in 90 days." Coverage: login-context successful-session lookback. Reading the A-1042 sentence restates the claim without establishing it — player must run/open the history-wide filter.
3. "unknown-laptop-17 has no enrollment/check-in." Coverage: registered-device inventory 07:45, exact-label match (D6 excluded). Caveat: personal devices out of scope.
4. "No file-access/mailbox activity through 07:45." Coverage: export scope. Licensed: "access unverified" — never "nothing accessed."
5. "No approved work trip on shift date." Coverage: HR-TR-08 approved-only extract 08:00. Licensed: coverage limit itself, not a travel finding.
6. "No other recipient reports at 09:12." Coverage: report store at 09:12; AL-4 arrival visibly updates this state.

## 11. Data-density recommendations (bounded beta budgets)

| System | Rows | Composition | Rationale |
|---|---|---|---|
| Authentication | 14 (grouped) | 4 central + 5 baseline/boundary + 5 filler | History + timeline + typo contrast + rush; 19-row per-attempt variant only if UI needs row-level fails |
| VPN | 5 rows + 1 absence | 1 canonical + 4 neighbors | Catalogue not haystack; needs 2+ exits + 1 shared-exit case |
| Device | 8 | 3 canonical + 2 supporting + 3 filler | Exact-label (D6) + unknown-is-normal (D7) + lifecycle (D8); D4–D5 stay, D6–D8 cuttable |
| Alerts | 5 (4 min / 8 max) | A-1042 + A-1180 + AL-3 if confirmed + 2 neighbors | Central + routine + contrast + texture; >8 = triage fatigue |
| Phishing | 4 records + 1 report | Report + message + headers + link (+ AL-4 shared) | Bounded by design; shorter than A-1042 |
| Scanner | 2–3 | RUN-FIN-031 + prior-week + optional storage run | Recurrence without corpus |
| KB | 9–12 | 3 canonical bodies + 6–9 proposed (reading-sign-in, VPN-route, device-coverage, triage-basics, phishing-runbook, sender-auth, scan-closure, case-note, backup stub) | One per tool verb; no article names central verdict except labeled format examples |
| Tickets | 2 keys | `suspicious-login-1`, `routine-alert-1` (+ phishing status in report) | No new ticket types for beta |
| People | ≤6 named | Patel, Morgan, Jules, Rivera, Okonkwo, Garcia (+ unlabeled service/system senders) | Every name in ≥2 datasets or cut |

Total queryable beta corpus: ~40–48 rows + ~12 KB bodies + 16 existing prose artifacts. Fits 20–25-minute shift with one interruption and one optional duplicate.

## 12. What must NOT be exposed directly to the player

- Restricted fact C16 (private Montreal travel) in any form — rows, results, dialogue, fallback, globs, logs.
- Verdict fields ("malicious"/"benign"/"attacker"/"compromised"), importance ranks, clue counters, "required" flags, correct-query strings, answer keys.
- `templateId`-style authoring joins and exhaustive related-record lists outside the record view that surfaced them (pre-answers which records matter).
- Undiscovered evidence definitions, consequence predicates, branch labels, hidden outcomes, future-phase content (e.g. AL-3 before T+43 confirmation).
- Exact personal data beyond authored fictional accounts; real-world domains in phishing URLs (use `.example.net` documentation domain).
- Raw auth material (passwords, codes, tokens) anywhere including notes/replies; reporter-reply template must state none needed.
- Full per-attempt fail expansion as default (noise + fatigue); grouped row is the beta default.
- Absolute shift dates invented silently — relative "most recent completed Monday" only, derivation at build time.

## 13. Handoff to implementers

Translate each row into the approved structured schema when it exists, keeping ID prefixes stable (`AUTH-`, `V-`, `D-`, `AL-`, `PH-`, `SC-`, `KB-`), preserving `pack.yaml` body prose as the detail view, enforcing §10 coverage before any absence fact becomes representable, and keeping every classification label above intact through translation. Canonical truth changes nowhere; PROPOSED/OPTIONAL rows are confined as marked.
