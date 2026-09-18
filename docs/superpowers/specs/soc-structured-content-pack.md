# SOC Structured Content Pack (Content Design Only)

**Status:** Content design. Not schema, not code, not DB architecture, not query-engine design.
**Canonical design spec:** `docs/superpowers/specs/interactivity-and-content-depth-design.md` (wins all disagreements)
**Source pack:** `content/packs/cybersecurity-analyst/pack.yaml`
**Supporting research:** `docs/superpowers/specs/soc-shift-realism-reference.md`
**Prior audit:** `docs/superpowers/specs/phase0-content-renderer-audit.md`

## How to read this document

Every item carries exactly one provenance label:

- **EXISTING CANONICAL FACT** — already in `pack.yaml`, quoted or faithfully restated. Preserved verbatim in meaning. Future workers must not alter without explicit re-approval.
- **PROPOSED SUPPORTING RECORD** — new record needed so future query/investigation mechanics have something to operate on. Consistent with canonical truth, adds no new verdict about the central case.
- **OPTIONAL REALISM FILLER** — benign background rows that make search feel real. Safe to cut if dataset-size budget requires. Never load-bearing.

Rule enforced throughout: **filler never resolves the central case.** No invented record identifies who used S-0741, confirms compromise, or clears the account. Only authored canonical sources speak, and they speak cautiously, as today.

No `requiredOptionIds`, no answer keys, no "correct query" strings appear in this document. Relationships are listed as natural joins (account, IP, device, session, time, alert, ticket), never as "correct clues."

Times are office-local on the current shift date unless noted. The existing pack uses "most recent completed Monday" language for scanner records; this pack preserves that phrasing and adds a shift-date assumption in one place (Section 7) flagged as proposed.

---

## 1. Canonical entity inventory

### 1.1 Identity and people

| Entity | Provenance | What is established |
|---|---|---|
| `j.patel@example.com` / J. Patel, account owner | **EXISTING CANONICAL FACT** | Account under review in A-1042. Assigned office Toronto. Typical pattern: HQ Wi-Fi + enrolled MacBook; two VPN sessions last week from Toronto office; no password resets in 30 days. (`account-history-1`, `travel-status-1`) |
| J. Patel employee report | **EXISTING CANONICAL FACT** | "No. I am not traveling, and I did not use a Windows laptop this morning. My work MacBook and phone are both with me." Framed as report, not proof. (`employee-login-reply`, 08:05) |
| Night analyst (unnamed predecessor) | **EXISTING CANONICAL FACT** | Wrote incomplete handoff: still watching unfamiliar login thread; did not finish device inventory check; forgot scanner schedule reference; "Ping Morgan if the login expands." (`handoff-email`, 07:55) |
| Morgan, Security Operations Manager | **EXISTING CANONICAL FACT** | Sole pack NPC (`npcs: [manager]`). Knows `alert-visible` fact. Provides per-template `managerGuidance`. Does not know employee private travel. |
| Jules, peer | **EXISTING CANONICAL FACT** (as peer-dialogue system; no pack NPC entry) | Deterministic state-derived peer replies (`packages/core/src/jules.ts`). Defers decisions to Morgan. Topics: first_day, current_work, break_room, team_context. |
| Employee private travel disclosure | **EXISTING CANONICAL FACT** (restricted) | "The employee privately disclosed planned travel to Montreal." `visibility: private`, `knownBy: [employee]`, `notKnownBy: [manager, user]`. Must never surface in query results, NPC dialogue, or fallback text. |
| HR travel register HR-TR-08 | **EXISTING CANONICAL FACT** | Covers approved work trips only; no entry for account on shift date; does not record personal travel, live location, or pending requests. Extract 08:00. (`travel-status-1`) |
| Infrastructure operations (schedule owner) | **EXISTING CANONICAL FACT** | Owns scanner schedule SCAN-FIN-MON. (`scanner-window`) |
| Finance VLAN users (unnamed) | **PROPOSED SUPPORTING RECORD** | No named individuals needed. Scanner run log references systems, not people. Avoid inventing finance staff. |
| Phishing reporter (see Section 6) | **PROPOSED SUPPORTING RECORD** | One named reporter required for phishing Work Item. Proposed: **A. Rivera, Finance** (`a.rivera@example.com`). New person, confined to phishing item, no link to login case. |

### 1.2 Central case entities

| Entity | Provenance | Canonical truth |
|---|---|---|
| Alert A-1042 | **EXISTING CANONICAL FACT** | High priority, sign-in monitoring. 07:38–07:40 six failed MFA challenges from 203.0.113.44; 07:41 one successful password login for j.patel from same source. Device label unknown-laptop-17, Chrome/Windows, residential ISP, Montreal-metro geo hint (estimate only). |
| Session S-0731 | **EXISTING CANONICAL FACT** | 07:31 successful sign-in through V-218; source 198.51.100.20; corp-macbook-patel; password + extra identity check completed; managed-device certificate matched inventory. Displayed city Montreal (network estimate). Baseline comparison session. |
| Session S-0741 | **EXISTING CANONICAL FACT** | 07:41:09 password accepted, session created; source 203.0.113.44; VPN connection ID absent; device label unknown-laptop-17. 07:43 account portal session refresh (continuation, not verification). Extra-check result not present in export. |
| IP 203.0.113.44 | **EXISTING CANONICAL FACT** | Source of 6 failed extra identity checks + S-0741. Residential ISP. Not an approved VPN exit in snapshot. No prior successful sessions from this ASN in 90 days (per `login-context-1` lookback scope). |
| IP 198.51.100.20 | **EXISTING CANONICAL FACT** | Approved VPN exit for V-218; source of S-0731. |
| Device unknown-laptop-17 | **EXISTING CANONICAL FACT** | Exact flagged-session label. Not enrolled, never checked into MDM. Self-reported browser/platform Chrome/Windows is not ownership proof. |
| Device corp-macbook-patel | **EXISTING CANONICAL FACT** | Enrolled corporate MacBook, active, last check-in 07:30; certificate used by S-0731 matches inventory. |
| Device corp-phone-patel | **EXISTING CANONICAL FACT** | Enrolled corporate phone, active assignment. |
| VPN connection V-218 | **EXISTING CANONICAL FACT** | Maps to exit 198.51.100.20; office's only approved VPN exit in NET-VPN-04 snapshot (07:45). Exit hosting location Montreal; assigned office Toronto. Carried by S-0731 only. |
| Ticket: unfamiliar-login investigation | **EXISTING CANONICAL FACT** | `ticket-suspicious-login` guidance text; canonical `ticketNotes` key `suspicious-login-1`. No structured fields yet. |
| A-1042 source-identity rule | **EXISTING CANONICAL FACT** | "A-1042 and login-context-1 summarize the same source; counting them separately does not create independent corroboration." (`login-session-timeline`) |
| Collection limit | **EXISTING CANONICAL FACT** | "Collection ends at 07:45. This export has no file-access or mailbox activity and cannot establish what was accessed." |

### 1.3 Routine / scanner entities

| Entity | Provenance | Canonical truth |
|---|---|---|
| Alert A-1180 | **EXISTING CANONICAL FACT** | Low priority, connection monitoring, delayed delivery. Recorded activity Monday 10:18 (event time, not arrival). vuln-scan-03 connections across finance VLAN in published window. |
| Scanner vuln-scan-03 | **EXISTING CANONICAL FACT** | Approved Mondays 10:00–12:00, finance VLAN discovery. |
| Run RUN-FIN-031 | **EXISTING CANONICAL FACT** | Recorded interval Monday 10:05–10:32; target finance VLAN; change ref SCAN-FIN-MON; status completed; coverage: discovery connections only. |
| Change ref SCAN-FIN-MON | **EXISTING CANONICAL FACT** | Recurring maintenance entry, owner infrastructure operations. |
| Routine ticket key `routine-alert-1` | **EXISTING CANONICAL FACT** | Canonical ticket key for scanner closure. |

### 1.4 Items with no canonical content yet (explicit gaps)

- Phishing report, message, headers, link destination: **no canonical artifacts** (orphaned actions reference `phishing-email-1`, `phishing-headers-1`, `phishing-link-1`, none exist). All Section 6 content is PROPOSED.
- False-positive review item: **no canonical records**. Section 5 proposes a bounded contrast case (flagged below as requiring target-design confirmation).
- End-of-shift handoff work product: **no canonical fields**. Notes only.
- Authentication/VPN/device structured rows: **no canonical rows** beyond prose artifacts. Sections 2–4 propose rows that restate artifact prose in record form.

---

## 2. Authentication record set

Design intent: player can filter by user, time window, session ID, IP, device, result — and must open individual rows. Central rows restate canonical prose; neighbors make the filter meaningful. Proposed beta size: **14 rows** (see Section 13).

Conceptual fields per row: record ID · user · timestamp (office-local) · source IP · device label · auth method / step · result · session link · note (provenance + scope caveat).

### 2.1 Central relevant records (restate canonical truth)

**A1 — AUTH-0731-PATEL — EXISTING CANONICAL FACT** (restates `prior-session-1` + timeline)
- user: j.patel@example.com · time: 07:31 · IP: 198.51.100.20 · device: corp-macbook-patel · method: password + extra identity check (completed) · result: success · session: S-0731 · VPN: V-218.
- Note: managed-device certificate matched inventory at sign-in. Displayed city Montreal (network estimate of exit, not employee location).

**A2 — AUTH-0738-F1..F6-grouped (six failed extra checks) — EXISTING CANONICAL FACT** (restates timeline 07:38:02–07:40:51)
- Represent as **one grouped row** with `attempt_count: 6` + expandable attempt list (proposed presentation; underlying truth unchanged): user j.patel · window 07:38:02–07:40:51 · IP 203.0.113.44 · method: extra identity check · result: fail (×6) · session: none created.
- Note: summary groups by account+source; does not identify a person. Per-attempt rows (F1..F6, 6 rows) are PROPOSED SUPPORTING RECORD form of the same fact — content-identical, offered only if the query UI needs row-level results. Recommend grouped row for beta (smaller, less noise).

**A3 — AUTH-0741-PATEL — EXISTING CANONICAL FACT** (restates timeline 07:41:09 + S-0741)
- user j.patel · time 07:41:09 · IP 203.0.113.44 · device unknown-laptop-17 · method: password (accepted); extra-check result not present in export · result: success · session S-0741 · VPN connection ID absent.
- Note: do not translate password success into MFA success.

**A4 — AUTH-0743-REFRESH — EXISTING CANONICAL FACT**
- user j.patel · time 07:43 · session S-0741 · event: account portal session refresh · result: n/a (continuation).
- Note: refresh continues session; does not verify who controls it.

### 2.2 Benign neighboring records (same account, ordinary pattern)

**A5 — AUTH-0715-PATEL-HQ — PROPOSED SUPPORTING RECORD**
- j.patel · 07:15 · HQ Wi-Fi (10.20.4.18) · corp-macbook-patel · password + extra check · success · session S-0722 (closed 07:25).
- Why: corroborates "typical weekday logins from HQ Wi-Fi and enrolled MacBook" without adding new claims. Gives the baseline a second row so history is not a single anecdote.

**A6 — AUTH-0658-PATEL-PHONE — PROPOSED SUPPORTING RECORD**
- j.patel · 06:58 · HQ Wi-Fi · corp-phone-patel · mobile SSO (extra check completed) · success · session S-0719 (mail sync).
- Why: ordinary phone check-in; explains second enrolled device; plausible 90-day-history member.

**A7 — AUTH-LASTWK-VPN-1 — PROPOSED SUPPORTING RECORD**
- j.patel · last week, weekday 09:12 · VPN V-218 (exit 198.51.100.20) · corp-macbook-patel · success · session S-0690.
- Why: instantiates "two VPN sessions last week from Toronto office" (one of two; see A8).

**A8 — AUTH-LASTWK-VPN-2 — PROPOSED SUPPORTING RECORD**
- j.patel · last week, weekday 14:40 · VPN V-218 (exit 198.51.100.20) · corp-macbook-patel · success · session S-0697.
- Why: second of the two canonical VPN sessions. Both carry V-218, reinforcing route-not-city logic when compared with S-0741's absent ID.

### 2.3 Irrelevant but plausible records (other users; filter noise)

**A9 — AUTH-0733-OKONKWO — OPTIONAL REALISM FILLER**
- c.okonkwo@example.com · 07:33 · HQ Wi-Fi · corp-macbook-okonkwo · success · S-0735.
- Why plausible: morning sign-in rush; same HQ pattern, different person. Tests user filter.

**A10 — AUTH-0740-GARCIA-FAIL-THEN-SUCCESS — OPTIONAL REALISM FILLER (careful distractor)**
- m.garcia@example.com · 07:40 one failed password (typo lockout counter 1/5) then 07:41 success from HQ Wi-Fi, enrolled device.
- Why plausible: single-fail-then-success is common and benign. *Safety note:* exactly one failure (not six), same device/network as usual — visually similar to A-1042 at a glance, clearly different on inspection. Teaches "sequence + context, not pattern-matching."

**A11 — AUTH-0802-RIVERA-VPN — OPTIONAL REALISM FILLER (also phishing-reporter tie)**
- a.rivera@example.com · 08:02 · VPN V-219 (exit 198.51.100.21, see Section 3) · corp-macbook-rivera · success.
- Why plausible: second VPN user on a different connection; reinforces that V-IDs are per-connection, not per-office. Rivera doubles as phishing reporter (Section 6) — ordinary day, two unrelated touchpoints.

**A12 — AUTH-0755-SERVICE-BACKUP — OPTIONAL REALISM FILLER**
- svc-backup · 07:55 · internal scheduler host · API token · success (scheduled job).
- Why plausible: service accounts appear in auth exports; looking at it wastes a glance but teaches scope (service ≠ user session). Clearly labeled non-interactive.

**A13 — AUTH-0612-PATEL-PWD-FAIL — PROPOSED SUPPORTING RECORD (boundary)**
- j.patel · 06:12 · HQ Wi-Fi · corp-macbook-patel · one failed password, then immediate success 06:13 (same row, note).
- Why: instantiates ordinary morning typo inside the 90-day lookback; sharpens "six陌生-source MFA fails ≠ one HQ typo" contrast. Alternatively fold into history prose — row form preferred for filter texture.

**A14 — AUTH-0901-UNKNOWN-PROBE — OPTIONAL REALISM FILLER (decoy, no session)**
- unknown account `no-reply-spoof@example.net`? No — keep auth export to real accounts. Instead: `d.nguyen@example.com` · 09:01 · HQ Wi-Fi · password expired → reset required, no session.
- Why plausible: password-reset events occur; matches "no password resets in 30 days" for Patel by showing resets happen for *others*. Tests that player reads the user field.

Count: 14 rows (grouped-failures form). If per-attempt rows chosen, 19 rows — still within beta budget but noisier; grouped form recommended.

---

## 3. VPN records

Canonical constraint (EXISTING): V-218 → exit 198.51.100.20; only approved VPN exit in NET-VPN-04 snapshot (07:45); 203.0.113.44 is not an approved exit; S-0731 carries V-218; S-0741 has no connection ID. Catalogue covers organization-provided VPN only; does not enumerate personal connections or prove physical location.

Conceptual fields: VPN record ID · user · start/end · source (client) IP · assigned VPN/exit IP · device · session ref · exit location note.

### 3.1 Canonical rows

**V1 — V-218 / j.patel / S-0731 — EXISTING CANONICAL FACT**
- V-218 · j.patel · 07:29–08:05 (session window) · client: HQ-adjacent residential? No — canonical body gives exit only; client source for S-0731 is the VPN ingress, not specified. Record as: ingress not enumerated in snapshot; exit 198.51.100.20 · device corp-macbook-patel · session S-0731. Exit hosting location Montreal.
- Preserve: "only approved VPN exit in this snapshot."

**V2 — Absence statement — EXISTING CANONICAL FACT (absence, see Section 12)**
- No row for (j.patel, 203.0.113.44, 07:38–07:41) exists in NET-VPN-04 snapshot. "203.0.113.44 is not an approved exit."
- Coverage required: snapshot 07:45, catalogue NET-VPN-04, org-provided VPN only.

### 3.2 Benign neighbors — PROPOSED SUPPORTING RECORDS

**V3 — V-219 / a.rivera / 08:02** — second active connection, exit 198.51.100.21 (same Montreal hosting facility, different exit IP). Shows exits are per-connection; shared city ≠ shared route. Bounds the "Montreal means V-218" error.

**V4 — V-217 / c.okonkwo / 07:20–07:50** — exit 198.51.100.20 (shared exit IP with V-218 — proposed: exits can be shared across connections; connection ID, not exit IP alone, links session to route). Teaches identifier + address comparison (matches ticket wording "compare both the identifier and address").

**V5 — V-214 / m.garcia / last week** — closed connection, exit 198.51.100.20, ordinary week-ago row. Gives time-window filter something to exclude.

**V6 — V-220 / d.nguyen / 09:00 (pending approval)** — proposed state `provisioning`; not yet active. Teaches status reading; irrelevant to case. Mark clearly: not a route for any session under review.

Beta VPN dataset: **6 entries (5 rows + 1 absence statement)**. Small on purpose — VPN is a catalogue to check, not a haystack.

---

## 4. Device inventory

Canonical constraint (EXISTING): enrolled corp-macbook-patel (active) + corp-phone-patel (active) for J. Patel; unknown-laptop-17 not enrolled, never checked into MDM; snapshot 07:45; corp-macbook-patel last check-in 07:30 with S-0731 certificate match; inventory covers registered work devices only.

Conceptual fields: device ID/label · assigned user · class · enrolled/managed state · assignment state · last check-in · tags.

### 4.1 Relevant rows

**D1 — corp-macbook-patel — EXISTING CANONICAL FACT**: J. Patel · corporate MacBook · enrolled/active · last check-in 07:30 · cert match S-0731.
**D2 — corp-phone-patel — EXISTING CANONICAL FACT**: J. Patel · corporate phone · enrolled/active.
**D3 — unknown-laptop-17 — EXISTING CANONICAL FACT**: no enrollment, no MDM check-in, exact-label match required. Include `lookupKeys: [unknown-laptop-17]` behavior already in pack.

### 4.2 Supporting + filler rows

**D4 — corp-macbook-okonkwo — PROPOSED SUPPORTING RECORD**: C. Okonkwo · enrolled/active. Needed so "match exact device name, not employee name" has a same-surname? No — different surname; purpose is showing inventory spans the org, and name-similarity trap uses D6 instead.
**D5 — corp-macbook-rivera + corp-phone-rivera — PROPOSED SUPPORTING RECORD**: A. Rivera's two enrolled devices. Supports phishing-reporter realism (reporter on managed device) + gives Rivera rows in two datasets.
**D6 — corp-macbook-patel-old — OPTIONAL REALISM FILLER (deliberate near-miss)**: J. Patel · **retired** 2025, unenrolled on retirement. Purpose: exact-identifier discipline — "patel macbook" search returns two rows; only the active exact label counts. Clearly tagged RETIRED.
**D7 — unknown-laptop-04 — OPTIONAL REALISM FILLER**: unassigned, seen once on guest network last month, never enrolled. Purpose: "unknown-* labels exist and are usually nothing" — unknown ≠ malicious. Must carry explicit note: unrelated to S-0741, different label, different date.
**D8 — loaner-pool-02 — OPTIONAL REALISM FILLER**: IT loaner pool, enrolled, checked out to M. Garcia last week, returned. Purpose: inventory has lifecycles; teaches status reading.

Beta device dataset: **8 rows** (3 canonical + 2 supporting + 3 filler). Keep D6–D8 deletable if budget tightens; D4–D5 stay.

---

## 5. Alert records

### 5.1 Canonical alerts

**AL-1 — A-1042 — EXISTING CANONICAL FACT**: high, sign-in monitoring, office-local times, full body per `suspicious-login-alert`. Links: S-0741, unknown-laptop-17, 203.0.113.44, ticket `suspicious-login-1`.

**AL-2 — A-1180 — EXISTING CANONICAL FACT**: low, connection monitoring, delayed delivery, recorded activity Monday 10:18, vuln-scan-03 across finance VLAN. Links: RUN-FIN-031, SCAN-FIN-MON, ticket `routine-alert-1`.

### 5.2 False-positive review — PROPOSED, needs target-design confirmation

Target T+43 wants a benign contrast case proving "similar tools, different outcome." No canonical records exist. Proposed bounded item (all PROPOSED SUPPORTING RECORD, discardable if T+43 cut):

**AL-3 — A-1204 "Impossible-travel estimate" (benign) — PROPOSED SUPPORTING RECORD**
- Medium-low rule severity, auto-note attached: single successful login for `c.okonkwo@example.com` from previously unseen residential IP, geo estimate "Chicago" vs assigned Toronto, **but**: enrolled device (corp-macbook-okonkwo), extra identity check completed, VPN V-217 exit matched (see V4), no prior failures.
- Intended verdict: close as expected/verified with note (enrolled + MFA + route all agree; geo estimate alone is not suspicion).
- Why good contrast: shares A-1042's surface (unseen IP + surprising city) but inverts every load-bearing signal (enrolled vs unenrolled, MFA done vs absent, route matched vs absent, no failure burst). Teaches investigation over escalation reflex.
- Cost: 1 alert row + 1 auth row + reuse of V4/D4. Flagged: **do not build until target confirms T+43 stays in beta MUST.**

### 5.3 Neighboring queue rows (filter texture, all OPTIONAL REALISM FILLER)

**AL-4 — A-1191 "Duplicate phishing report (same campaign as Section 6)"** — second employee forwards same lure 20 min later. Purpose: links alert queue to phishing item; teaches dedup (quarantine once, link both).
**AL-5 — A-1174 "Backup job spike (storage VLAN)"** — low, matches nightly backup window doc (KB stub, Section 8). Purpose: second routine-benign shape; KB-match muscle memory.
**AL-6 — A-1159 "Password-spray burst (blocked, no successes)"** — medium, 40 fails across 12 accounts, zero successes, source already on blocklist. Purpose: real-threat-shape that needs no action beyond confirming blocks; teaches "failed ≠ incident when controls held."
**AL-7 — A-1210 "New-device first-seen (enrolled, MFA ok)"** — informational, auto-resolves on enrollment verify. Purpose: device-lifecycle texture; contrasts unknown-laptop-17.

Beta alert queue: **4 rows minimum** (A-1042, A-1180, + 2 of AL-4..AL-7); **8 rows max** with false-positive item included. Recommend 5: AL-1, AL-2, AL-3 (if confirmed), AL-4, AL-5.

---

## 6. Phishing-report content (all PROPOSED — no canonical artifacts exist)

Design goals from target T+20: bounded, shorter than A-1042, accessible to a 13+ student, not excessively technical. Lure theme: **fake IT "mailbox quota" notice** — universally recognizable, no malware-analysis depth needed, safe to show.

### 6.1 Employee report (the Work Item opener)

**PH-RPT-01 — PROPOSED SUPPORTING RECORD**
- Reporter: A. Rivera (Finance), `a.rivera@example.com` · received 09:12 office-local · channel: Email → "Report suspicious message" forward · status: `open / unreviewed`.
- Reporter words (plain, non-technical): "Hi, got this about my mailbox being full. I didn't click the link because the sender looked odd, but I use my mailbox all day and wanted to check. The message below is the original — I didn't change anything."
- Handling note attached by system: "Reporter did not click. Original preserved."

### 6.2 The message (as reporter saw it)

**PH-MSG-01 — PROPOSED SUPPORTING RECORD**
- Subject: "Action required: mailbox almost full" · displayed sender: "IT Helpdesk <it-helpdesk@example.com>" (display name spoofed; actual envelope sender differs — see headers).
- Body (short, slightly off, no real branding): "Your mailbox has reached 98% of its limit. Send and receive will stop within 24 hours. Verify your account now to keep your mailbox active: [Review mailbox usage]."
- Link display text: "Review mailbox usage" · underlying href (never clickable in UI; shown only via inspection action): `http://mailbox-check.example.net/verify?u=a.rivera` — uses `.example.net` documentation-style domain so no real-world domain is implicated.
- Attachment: none. (Keeps itemheaders/link/destination focused.)

### 6.3 Headers (revealed via inspection, plain-language annotated)

**PH-HDR-01 — PROPOSED SUPPORTING RECORD** — fields with one-line student glosses:
- `From: it-helpdesk@example.com` vs `Envelope-From (actual sender): bounce@mailbox-check.example.net` → gloss: "displayed name vs actual sender."
- `Reply-To: support@mailbox-check.example.net` → gloss: "replies go elsewhere — mismatch signal."
- Authentication: `SPF: fail`, `DKIM: none`, `DMARC: fail (quarantine policy)` → gloss each in one line ("mailbox test the message failed").
- `Received:` chain shows external relay, not org mail system.
- `Message-ID` present; `Date` 09:04 (8 min before report — fresh, not stale).

### 6.4 Destination / link record (via safe inspection tool)

**PH-LINK-01 — PROPOSED SUPPORTING RECORD**
- Displayed: "Review mailbox usage" · actual: `http://mailbox-check.example.net/verify?u=a.rivera` · scheme `http` (not `https`) · host unrelated to org domain · query carries recipient address (targeting signal, not proof of compromise).
- Inspection verdict text (authored, not computed): "Destination does not belong to the organization. Do not open in a browser; inspection record is sufficient."
- Metadata: first-seen 09:04; no other recipient reports yet at item open (AL-4 duplicate arrives later as follow-up).

### 6.5 Report status + action affordances (content side; engine defines legality)

- Status lifecycle (proposed states, engine to own): `open → triaged → quarantined → reporter-notified → closed`.
- Proposed quarantine scope note: "matching copies by Message-ID + URL host" — so AL-4's duplicate is covered by one action, teaching dedup.
- Proposed reporter-reply template (bounded, non-technical): thanks + "don't click/delete if copy remains" + "no password/code needed" + what happens next. No blame language.
- KB links (Section 8): PH-RUNBOOK-01 + EXTERNAL-SENDER-01.

---

## 7. Scanner records

Canonical core restated; shift-date assumption flagged.

**SC-RUN-01 — RUN-FIN-031 — EXISTING CANONICAL FACT**: vuln-scan-03 · finance VLAN · Monday 10:05–10:32 · A-1180 activity at 10:18 within run · completed · discovery connections only · change ref SCAN-FIN-MON.
**SC-WIN-01 — SCAN-FIN-MON — EXISTING CANONICAL FACT**: vuln-scan-03 approved Mondays 10:00–12:00 finance VLAN discovery · owner infrastructure operations · in/out scope rules · "compare recorded event time even when monitoring delivers later."

**Shift-date assumption — PROPOSED SUPPORTING RECORD (flagged):** current shift date is the Monday following the recorded run; monitoring forwarded the saved alert after a queue delay. If the approved schema needs absolute dates, use "most recent completed Monday" relative dating as canonical and derive absolute date at pack-build time. No canonical absolute date exists — do not invent one silently.

Supporting rows (all PROPOSED / OPTIONAL as marked):
- **SC-RUN-02 — RUN-FIN-030 (prior week) — PROPOSED SUPPORTING RECORD**: same scanner/scope, prior Monday 10:06–10:31, completed. Purpose: recurrence texture; shows "weekly" is real.
- **SC-RUN-03 — RUN-STOR-014 (storage VLAN, backup-night) — OPTIONAL REALISM FILLER**: different scanner/scope/window. Purpose: AL-5's match target; proves windows are per-scope.
- **SC-NOTE-01 queue-delay memo — PROPOSED SUPPORTING RECORD**: one-line monitoring note "forwarded after queue delay; event time unchanged." Purpose: makes delivery-vs-event distinction a record, not just prose.

---

## 8. KB / runbook content (minimum useful, never answer-revealing)

Existing canonical KB bodies stay: `login-follow-up-guide` (uncertain sign-in procedure), `scanner-window` (change calendar), `vpn-context-1` (route catalogue). Add the minimum below (all PROPOSED SUPPORTING RECORD drafts; final wording at authoring time):

1. **KB-AUTH-01 "Reading a sign-in record"** — field glosses (session ID, source IP, device label, user agent, ASN/ISP, MFA step). No case references. Purpose: 13+ accessibility for Section 2 rows.
2. **KB-VPN-01 "Checking VPN route use"** — how to compare session connection ID + source against route catalogue; "shared city ≠ shared route"; what absence of a connection ID does and does not mean. Mirrors `login-follow-up-guide` without repeating its case wording.
3. **KB-DEVICE-01 "Device inventory coverage"** — enrolled vs seen vs unknown; exact-label discipline; retired/loaner states (D6/D8). No verdicts.
4. **KB-ALERT-01 "Alert triage basics"** — severity vs finding; sequence-first reading; single-source vs corroboration; when to monitor/escalate/close (pointers, not thresholds). Must not name A-1042's correct path.
5. **KB-PH-01 "Phishing triage (PH-RUNBOOK-01)"** — report → headers → destination → quarantine → notify → close; "reporter did not click" handling; no-blame reply guidance.
6. **KB-SENDER-01 "External sender and authentication (SPF/DKIM/DMARC in one paragraph each)"** — supports PH-HDR-01 glosses.
7. **KB-SCAN-01 "Routine scan closure"** — event-time vs delivery-time; run-log corroboration; coverage-cap language ("discovery connections only"); scope-bound closure (A-1180 wording as example of *form*, not as answer).
8. **KB-NOTE-01 "Writing a case note"** — evidence vs uncertainty vs next step; cite record IDs; no passwords/codes; handoff checklist (A-1042 refs as format example).
9. **KB-BACKUP-01 stub "Nightly backup window"** — two lines supporting AL-5. Optional; cut first if budget binds.

Anti-answer rule: no article names a session, device, or verdict from the central case except KB-SCAN-01/KB-NOTE-01 format examples, which are explicitly labeled as such.

---

## 9. Cross-record relationship map (natural joins, not clues)

| Join key | Records sharing it | Notes (no verdict) |
|---|---|---|
| Account `j.patel@example.com` | A1, A2-group, A3, A4, A5, A6, A7, A8, A13, V1, D1, D2, D6, AL-1, HR-TR-08 extract, employee reply | Central account; benign + central rows mix here by design |
| IP `203.0.113.44` | A2-group, A3, AL-1 body, login-context-1 | Flagged-session source; also the VPN-absence subject |
| IP `198.51.100.20` | A1, A7, A8, V1, V4, V5 | Approved exit shared by several connections; connection ID disambiguates |
| Device `unknown-laptop-17` | A3, D3, AL-1, login-context-1 | Exact-label joins; D7 is a different `unknown-*` label (non-join) |
| Device `corp-macbook-patel` | A1, A5, A13, D1, V1 | Baseline device; D6 retired namesake is a non-join (different row, RETIRED tag) |
| Session `S-0731` | A1, V1, prior-session-1 | Route-carrying session |
| Session `S-0741` | A3, A4, AL-1, timeline | sessions under review; no VPN row joins it (absence) |
| Connection `V-218` | A1, A7, A8, V1 | Per-connection ID; V-219/V-217/V-214 are non-joins |
| Time window 07:31–07:45 | A1–A6, V1, D1 check-in 07:30, collection-end 07:45 | Morning cluster; scanner records are Monday-10:xx (non-join, different window) |
| Alert `A-1042` | AL-1, A3 (via session), timeline, ticket `suspicious-login-1` | Single-source cluster with login-context-1 (non-independence noted) |
| Alert `A-1180` | AL-2, SC-RUN-01, SC-WIN-01, ticket `routine-alert-1` | Self-contained routine cluster; explicitly unrelated to login cluster |
| Ticket `suspicious-login-1` | AL-1 cluster + employee reply + HR extract + follow-up guide | Documentation target for central case |
| Ticket `routine-alert-1` | AL-2 cluster + SC rows | Documentation target for routine close |
| Account `a.rivera@example.com` | A11, D5, PH-RPT-01, V3 | Reporter has ordinary texture in two datasets before reporting |
| Campaign `(Message-ID + URL host)` | PH-MSG-01, PH-HDR-01, PH-LINK-01, AL-4 | Phishing cluster; quarantine scope key |
| Change `SCAN-FIN-MON` | SC-WIN-01, SC-RUN-01, SC-RUN-02, AL-2 | Routine-approval cluster |

---

## 10. Plausible distractors (why each earns its place)

| Distractor | Why plausible | Why safe (cannot resolve central case) |
|---|---|---|
| A10 Garcia 1-fail-then-success | Single-typo logins are daily life | One HQ fail, usual device/network — no burst, no unknown device, no foreign ASN |
| A9/A14 other-user morning rows | Shifts start with sign-in rush; resets happen | Different accounts; never join Patel IP/device/session keys |
| A12 service account | Exports include non-interactive principals | Labeled scheduled job; no user session semantics |
| V3 Rivera V-219 second exit | Offices run parallel VPN connections | Different connection ID + different exit IP; reinforces per-connection logic |
| V4 shared exit IP (V-217) | Exit IPs are shared infrastructure | Shows exit-sharing is normal; connection ID still required |
| D6 retired namesake | Hardware lifecycles leave retired rows | RETIRED tag + no check-ins; exact-active-label rule excludes it |
| D7 other unknown label | Guest/unknown labels recur | Different label, different date, explicit unrelated note |
| AL-5 backup spike / AL-6 spray-blocked / AL-7 first-seen-enrolled | Real queue texture: benign-true, held-threat, lifecycle-informational | Different VLANs/accounts/scopes; each carries its own KB match, none joins A-1042 keys |
| PH duplicate AL-4 | Users forward the same lure twice | Same campaign keys; covered by one quarantine — teaches dedup, not new threat |
| A13 Patel 06:12 typo | Morning typos precede real mornings | HQ + usual device; contrasts single-known fail vs six-unknown fails |

Cut order if budget binds (first cut first): A14, A12, D8, SC-RUN-03/KB-BACKUP-01/AL-5 as a group, A9, D7. Never cut: A10 (calibration), D6 (exact-label discipline), V3/V4 (route logic), AL-4 (dedup).

---

## 11. Candidate discoverable facts (content only; engine-agnostic)

Each entry: human-readable fact · source records · single-source vs correlation · presence vs absence.

**Login case:**
1. "Six failed extra identity checks preceded S-0741 from 203.0.113.44." · A2-group/timeline · single-source (grouped row) · presence.
2. "S-0741 authenticated by password; no extra-check result in export." · A3/timeline · single-source · presence (of password success) + absence (of extra-check result) — mixed; see Section 12.
3. "S-0741 used unknown-laptop-17 from 203.0.113.44 with no VPN connection ID." · A3 + login-context-1 · correlation (2 records) · presence + absence.
4. "unknown-laptop-17 is not enrolled and never checked into MDM." · D3 · single-source · presence (of negative inventory state; absence-backed — see Section 12).
5. "Account baseline is HQ Wi-Fi + enrolled MacBook (+2 prior V-218 VPN sessions)." · A5–A8 + account-history-1 · correlation (≥3 records) · presence.
6. "S-0731 route (V-218 → 198.51.100.20) does not explain S-0741 (203.0.113.44, no connection ID)." · A1 + V1 + A3 + V2-absence · correlation (3+ records, incl. absence) · presence + absence.
7. "Shared Montreal estimate does not link S-0731 and S-0741 to one route." · A1 + V1 + A3 · correlation · presence (of two city labels) framed as non-evidence — fact *about limits*.
8. "Account owner reports no travel and no Windows-laptop use." · employee reply · single-source · presence, with report-not-proof qualifier.
9. "Travel register covers approved work trips only; no entry is not proof of no travel." · HR-TR-08 · single-source · presence (of coverage statement) + absence (of entry).
10. "A-1042 and login-context-1 are one source, not corroboration." · timeline · single-source · presence (of shared-source statement).
11. "Export ends 07:45 with no file/mailbox activity; access unverified." · timeline · single-source · absence-backed (see Section 12).
12. "07:43 portal refresh continues S-0741; verifies nothing about control." · A4 · single-source · presence framed as non-evidence.

**Routine case:**
13. "A-1180 recorded activity (Mon 10:18, vuln-scan-03, finance VLAN) matches RUN-FIN-031 within SCAN-FIN-MON window." · AL-2 + SC-RUN-01 + SC-WIN-01 · correlation (3) · presence.
14. "Delivery/queue-arrival time is not event time." · SC-NOTE-01 + AL-2 body · correlation (2) · presence.
15. "RUN-FIN-031 covers discovery connections only." · SC-RUN-01 · single-source · presence (coverage cap).

**Phishing case:**
16. "Report PH-RPT-01 is open, reporter did not click, original preserved." · PH-RPT-01 · single-source · presence.
17. "Displayed sender differs from envelope sender; reply-to mismatched." · PH-HDR-01 · single-source · presence.
18. "Mail authentication fails (SPF/DKIM/DMARC)." · PH-HDR-01 · single-source · presence.
19. "Link destination is off-org domain over http with recipient query." · PH-LINK-01 · single-source · presence.
20. "Matching copies quarantined by Message-ID + URL host (covers AL-4 duplicate)." · quarantine record + PH cluster · correlation · presence.

**False-positive (if confirmed):**
21. "A-1204 login is enrolled-device + MFA-complete + route-matched; city estimate alone." · AL-3 + V4 + D4 · correlation (3) · presence.

---

## 12. Absence-evidence candidates (what "not existing" must mean)

No absence fact is valid without stated coverage. Each entry: conclusion · required coverage · why it matters.

1. **"No matching VPN session explains S-0741."** Coverage: NET-VPN-04 snapshot at 07:45; org-provided VPN only; queried by (user=j.patel, window 07:25–07:45, source=203.0.113.44); both connection-ID and exit-address checked. Caveat (canonical): personal VPNs out of scope; absence ≠ route identification. Do not define a required query string — any query spanning that coverage qualifies (engine decision).
2. **"No prior successful sessions from 203.0.113.44's ASN in 90 days."** Coverage: successful-session lookback in login-context scope (not all account uses). Player must actually run/ open the history-wide filter; reading the A-1042 sentence alone restates the claim without establishing it. Engine must distinguish quote from query (flagged for Ph2/3).
3. **"unknown-laptop-17 has no enrollment or check-in record."** Coverage: registered-work-device inventory snapshot 07:45, exact-label match (near-miss D6 excluded by RETIRED/exactness rule). Caveat (canonical): inventory excludes personal devices; absence ≠ owner identification.
4. **"No file-access or mailbox activity is available through 07:45."** Coverage: export scope statement in timeline. Conclusion licensed: "access unverified" — never "nothing accessed."
5. **"No approved work trip for account on shift date."** Coverage: HR-TR-08 approved-trips-only extract at 08:00. Licensed conclusion: coverage limit itself (fact 9), not a travel finding.
6. **"No other recipient reports at phishing item open."** Coverage: report store at 09:12. Later AL-4 arrival must update this state visibly (supports dedup + quarantine-scope teaching). Coverage timestamp matters — state, not eternal truth.

---

## 13. Dataset-size recommendation (bounded beta budgets)

Principle: enough rows that filters/joins do work; few enough that a student finishes in a 20–25-minute shift with reading time intact. Rows below exclude prose artifacts (which remain the detail view).

| System | Recommended rows | Composition | Rationale |
|---|---|---|---|
| Authentication | **14** (grouped-failure form) | 4 central + 4 benign-neighbor + 6 filler/boundary | History + timeline + one typo-contrast + morning rush; per-attempt expansion (19) only if UI needs row-level fails |
| VPN | **5 rows + 1 absence statement** | 1 canonical + 4 neighbors | Catalogue, not haystack; per-connection logic needs exactly 2+ exits + 1 shared-exit case |
| Device inventory | **8** | 3 canonical + 2 supporting + 3 filler | Exact-label discipline (D6) + unknown-is-normal (D7) + lifecycle (D8) |
| Alert queue | **5** (4 min / 8 max) | A-1042 + A-1180 + false-positive (if confirmed) + 2 neighbors | One central, one routine, one contrast, two texture; more than 8 becomes triage fatigue |
| Phishing | **4 records + 1 report** | Report + message + headers + link + (duplicate alert AL-4 shared with queue) | Bounded item by design; shorter than A-1042 |
| Scanner runs | **2–3** | RUN-FIN-031 + prior-week + (optional storage run) | Recurrence without corpus |
| KB articles | **9–12** | 3 canonical bodies + 6–9 proposed (Section 8) | One per tool verb + coverage stub; more invites skimming, not searching |
| Tickets | **2 canonical keys** | `suspicious-login-1`, `routine-alert-1` (+ phishing status inside report record) | No new ticket types for beta |
| Messages/people | **≤6 named** | Patel, Morgan, Jules, Rivera, Okonkwo, Garcia (+ service/system senders unlabeled) | Every name must appear in ≥2 datasets or be cut |

Total queryable beta corpus: **~40–48 rows + 12 KB bodies + 16 existing prose artifacts.** Fits a 20–25-minute shift at student reading pace with one interruption (A-1180 at +25m) and one optional duplicate (AL-4).

---

## Complete content inventory (for future schema translators)

| ID | System | Provenance | Depends on | Translates to |
|---|---|---|---|---|
| A1–A4 | auth | EXISTING (prose→rows) | timeline, prior-session-1 | Auth rows (central) |
| A5–A8, A13 | auth | PROPOSED | account-history-1 scope | Auth rows (baseline) |
| A9–A12, A14 | auth | OPTIONAL | — | Auth rows (filler) |
| V1–V2 | vpn | EXISTING | vpn-context-1 | VPN rows + absence statement |
| V3–V6 | vpn | PROPOSED | NET-VPN-04 snapshot | VPN rows |
| D1–D3 | device | EXISTING | device-inventory-1 | Inventory rows |
| D4–D5 | device | PROPOSED | org roster assumption | Inventory rows |
| D6–D8 | device | OPTIONAL | lifecycle assumption | Inventory rows |
| AL-1, AL-2 | alert | EXISTING | alert artifacts | Alert rows |
| AL-3 | alert | PROPOSED (confirm T+43) | V4, D4 | Alert + linked auth row |
| AL-4–AL-7 | alert | OPTIONAL | PH campaign / KB stubs | Alert rows |
| PH-RPT-01, PH-MSG-01, PH-HDR-01, PH-LINK-01 | email/phishing | PROPOSED (greenfield) | KB-PH-01, KB-SENDER-01 | Report + message + headers + link records |
| SC-RUN-01, SC-WIN-01 | scanner | EXISTING | scanner artifacts | Run + window records |
| SC-RUN-02, SC-NOTE-01 | scanner | PROPOSED | weekly recurrence | Run + memo records |
| SC-RUN-03 | scanner | OPTIONAL | AL-5 | Run record |
| KB-AUTH-01…KB-NOTE-01, KB-BACKUP-01 | kb | PROPOSED (KB-BACKUP OPTIONAL) | datasets above | KB articles |
| Facts 1–21; Absences 1–6 | evidence-candidate | Derived (no engine) | rows above | Future Evidence Fact candidates |
| Relationship map (Sec 9) | cross-cutting | Derived | all rows | Join-key documentation for query UI |

**Explicit non-goals honored:** no schema, no query-engine semantics, no required-query strings, no verdict changes. Canonical scenario truth altered nowhere; where a date/scope assumption was needed (Section 7 shift-date; Section 3 snapshot coverage; Section 6 reporter identity), it is labeled PROPOSED and confined to its item.

**Handoff to implementers:** translate each row into whatever structured schema is approved, keeping IDs stable (`A-`, `V-`, `D-`, `AL-`, `PH-`, `SC-`, `KB-` prefixes proposed), preserving body prose from `pack.yaml` as the detail view, and enforcing Section 12 coverage requirements before any absence fact becomes representable.

---

## 14. Morgan / Jules / workplace interaction content (bounded, state-dependent)

**Status:** PROPOSED interaction content. No new canonical truth. All payloads restate EXISTING CANONICAL FACTS or PROPOSED SUPPORTING RECORDS already defined above, within speaker knowledge bounds.

**Speaker bounds (EXISTING CANONICAL FACT):**

- Morgan (`npcs: [manager]`, Security Operations Manager) knows `alert-visible` fact only (`memoryFactIds: [alert-visible]`), plus `handoff-email` text, `chat-morgan` guidance lines, and per-template `managerGuidance`. Morgan does NOT know `employee-private-travel` (`notKnownBy: [manager, user]`), does NOT know who controlled S-0741, does NOT confirm compromise or clear the account.
- Jules (peer-dialogue system, no pack NPC entry; defers decisions to Morgan) knows only public client-visible state already shown to the player plus deterministic peer topics (`first_day`, `current_work`, `break_room`, `team_context`). Jules holds no independent knowledge base.
- Neither speaker invents procedure, deadlines, evidence, or verdicts. AI wording optional; deterministic fallback text below is authoritative for facts.

**Global rules for this section:**

- Morgan provides only facts Morgan plausibly knows; never tells player the answer.
- Redirects point to a verb/record already in the pack (Alerts, account history, device inventory, VPN catalogue, runbook, ticket), never to hidden content.
- No interaction gates investigation: all Morgan/Jules/texture exchanges are optional, never prerequisites for a canonical action.
- One new fact-equivalent per exchange maximum. No multi-turn RPG trees.
- Free text from player never becomes world truth.

### 14.1 Morgan — early / insufficient context

Player asks before opening A-1042 records. Morgan must not summarize unopened records, must not name S-0741 / 203.0.113.44 / unknown-laptop-17 detail beyond what `alert-visible` + handoff already state, and must redirect to useful context naturally.

Deterministic fallback shape: acknowledge + state own limit + point at next record/procedure.

- Fallback M-EARLY-1: "Still the unfamiliar login thread from handoff — I didn't finish the device check last night either. Start with the alert sequence, then compare account history. Tell me what record you are looking at and what doesn't line up."
- Fallback M-EARLY-2: "Location estimate is only a lead, not an answer. I haven't confirmed who signed in. Open the alert and the login context first, then ask me about a specific mismatch."
- Forbidden here: naming VPN absence, enrollment state of unknown-laptop-17, employee-report contents before player opened `employee-login-reply`, HR coverage limits before player opened `travel-status-1`.

### 14.2 Morgan — after auth evidence

Minimum state: player opened A-1042 / `login-context-1` / auth rows A1–A4 (at least the failure burst + S-0741). Morgan may contextualize whether pattern sounds familiar from prior shift, what Morgan personally observed, without interpreting guilt.

- May say: prior shift saw unfamiliar login thread, only checked login time, did not get further; overnight had similar scanner noise but this timing looks different; does not recognize pattern as routine from own experience.
- Must say with qualifier: observations are partial memory, player still verifies in records.
- Must NOT say: who did it, whether it is compromise, whether account is safe, what decision to take.
- Fallback M-AUTH-1: "Six fails then a success from the same source is not our usual morning pattern from what I saw. I only checked the time last night — I didn't pull history or inventory. Compare S-0731 and S-0741 side by side and note what differs."
- Fallback M-AUTH-2: "I can't tell you who was behind that session from what I know. Keep sequence, source, and session IDs separate in your note."

### 14.3 Morgan — after device / VPN correlation

Minimum state: player opened device inventory (`device-inventory-1` / D1–D3) and/or VPN catalogue (`vpn-context-1` / V1 + absence coverage). Morgan may add human context only if canonically appropriate: inventory coverage limits, route-vs-city distinction as procedure, own unfinished check.

- May restate: inventory covers registered work devices only; `chat-morgan` line "your tools and records remain the basis for the decision."
- May restate as procedure pointer: compare both connection identifier and address; shared city estimate does not link routes.
- Must NOT supply enrollment result ("unenrolled") as Morgan's own finding — player must have opened D3; Morgan can only confirm where to look and that night shift did not finish the check.
- Must NOT assert "no VPN session exists" as Morgan knowledge — absence facts require player query coverage per Section 12; Morgan can suggest the query verb.
- Fallback M-CORR-1: "I never finished the device check — you'd know more than me after you open inventory. Match the exact label, not just the owner name."
- Fallback M-CORR-2: "For VPN, compare the session's connection ID and source against the route catalogue. Shared city label alone doesn't link two sessions to one route. Run the query for that user and window and see what comes back."

### 14.4 Morgan — after incident action

Minimum state: player took `document_ticket` / `escalate_alert` / `dismiss_alert` / `monitor` equivalent. Morgan reacts to operational consequences only, never grades.

- After ticket update: acknowledge readability, not correctness. Fallback M-ACT-1: "Notes read clear — facts, uncertainty, and next step are separate. That helps whoever picks this up."
- After escalation: acknowledge handoff, not verdict. Fallback M-ACT-2: "Got it, senior review has the session IDs and the open question. Keep the queue current while it is with them."
- After monitor/defer: bless restraint as defensible without promising outcome. Fallback M-ACT-3: "Monitoring through end of shift works — flag me if a second session appears."
- After close/dismiss: no praise/blame; state world fact only if scheduled follow-up exists. Fallback M-ACT-4: "Closed for now with your reason recorded. If related activity arrives the case reopens with history intact."
- Forbidden: "correct," "wrong," "good job," stars, scores, "you should have escalated."

### 14.5 Morgan semantic intents (state-gated payloads)

| NPC | Player intent | Minimum canonical state | NPC knowledge | Semantic response | State effect if any |
|---|---|---|---|---|---|
| Morgan | Ask about recent activity | None (shift start) | `handoff-email`, `alert-visible` | Payload: night shift watched unfamiliar login thread, left device check unfinished; no interpretation. Fallback M-EARLY-1. | None; optionally marks handoff discussed |
| Morgan | Ask whether user/device is expected | Opened A-1042 + account history rows (A5–A8 baseline) | Baseline pattern (HQ Wi-Fi + enrolled MacBook) as authored in `account-history-1`; no private facts | Payload: usual pattern Morgan has seen is HQ + enrolled MacBook; this session's pairing differs on face of records — player verifies in inventory. No verdict. | None |
| Morgan | Ask whether they were traveling/remote | Opened `employee-login-reply` and `travel-status-1` | Employee report text + HR coverage limit only; private travel unknown | Payload: owner reports no travel / no Windows laptop use (report, not proof); register covers approved work trips only with no entry — neither proves travel. Suggest documenting gap. | None |
| Morgan | Request clarification (procedure) | Any; best after opening runbook | `login-follow-up-guide`, `chat-morgan` pointers | Payload: procedural pointer only (which system holds which field; cite record IDs). No evidence supplied. | None |
| Morgan | Notify of protective action (escalate/monitor/close/note) | Action already taken by player | Ticket/queue state visible to Morgan | Payload: operational acknowledgement per 14.4; restates open question + next holder. No grade. | None; consequence scheduler owns follow-ups |
| Morgan | Share current finding | Player names record + mismatch | Same record if Morgan-known, else unknown | Payload: at most one relevant detail if Morgan-known, else "haven't looked at that — check [system]" + question toward a verb ("did you check VPN for that window?"). | None |

AI phrasing may vary tone; payload facts and forbidden claims above are fixed.

### 14.6 Jules — bounded lead/peer interactions

Jules uses narrow authored intents only. Each is a canonical action with availability predicate over public state, authored semantic payload, deterministic fallback. Jules NEVER functions as grader, answer checker, hint system, or correct-decision oracle. Jules defers case decisions to Morgan / senior review per existing peer behavior.

| NPC | Player intent | Minimum canonical state | NPC knowledge | Semantic response | State effect if any |
|---|---|---|---|---|---|
| Jules | Status update (player briefs Jules) | A-1042 opened | Work Item states visible in client view (open/investigating/decided) | Payload: acknowledgement of stated status + queue reminder. Fallback J-STATUS-1: "Got it — A-1042 still open and with you. Keep the ticket current so handoff reads clean." | None; may mark topic seen |
| Jules | Process clarification | Any | Runbook/KB procedure titles only, never contents as answer | Payload: points at requirement, lets player satisfy it. Fallback J-PROC-1: "Escalations need attached evidence — which records are you attaching?" | None |
| Jules | Escalation request | Ticket exists with ≥1 attached/discovered record ref (or explicit "thin" path) | Ticket attachment state + case status | Payload: accepts package; complete package → clean acknowledgement; thin package → specific evidence requests (auth history? device record? VPN check?). Fallback J-ESC-THIN-1: "Accepted — can you add what you checked for device and route before Tier 2 picks up?" | Routes to escalation decision path; never decides case |
| Jules | Acknowledgement (routine item done) | Routine item (A-1180 / phishing / scanner) resolved with note | Closure note existence only, not quality grade | Payload: brief thanks + next-queue pointer. Fallback J-ACK-1: "Thanks, routine close recorded. Queue has [next item] if you want it." | None |
| Jules | Documentation reminder | Ticket missing update while decision/escalation pending | Documentation state (notes present/absent, attachments present/absent) | Payload: process enforcement as care for next shift. Fallback J-DOC-1: "Get your notes current before handoff — facts, gap, next check." | None; no block on investigation |
| Jules | End-of-shift handoff | Handoff available (T+60 shape) | Canonical handoff fields (open items, actions, attached evidence, follow-ups, disposition, uncertainty) | Payload: confirms receipt + names remaining opens from state. Fallback J-HAND-1: "Handoff captured — [N] items still open with notes attached. Next shift continues from there." | Handoff work product updated |

Forbidden Jules behaviors (must never ship): numeric scores, "correct/incorrect," revealing hidden evidence or future content ("you'll want to look at…"), making the decision for the player ("you should escalate"), inventing procedure/deadlines/policy, disappointment/praise tone. Consequence of thin work is always a concrete professional request, never a grade.

### 14.7 Coworker / workplace texture (non-evidence, optional, never gating)

All PROPOSED, OPTIONAL REALISM FILLER. No canonical evidence, no Work Item state change except read/unread where noted. At most once per shift each. Never blocks progress; dismissible without action.

| # | Moment | Trigger (public state only) | Text shape (fallback) | Why safe |
|---|---|---|---|---|
| T-1 | Hallway check-in | Shift start / first queue open | "Morning — queue's already moving. Holler if handoff reads thin." | No facts; availability color only |
| T-2 | Queue-load mention | Second Work Item (A-1180 or phishing) arrives | "Two in the queue now. No rush — oldest-highest first is how we do it." | Prioritization habit, not answer |
| T-3 | Teammate returns from break | After break-room / pause action | "Back — anything new land while I was out?" | Presence; player may brief or not |
| T-4 | Routine scanner noise | A-1180 open | "That scanner one fires every Monday. Still worth the window check though." | Points at verb (check window), supplies no match result |
| T-5 | Operational reminder | Pre-handoff, no ticket update yet | "Standup notes in 15 — tickets current helps everyone." | Process nudge; no content |
| T-6 | Quiet-stretch invitation | No new items for a phase | "Quiet minute — good time for notes or KB skim." | Housekeeping invitation, optional |
| T-7 | Duplicate-report color (if AL-4 ships) | AL-4 arrival | "Looks like the same lure twice — quarantine once, link both." | Dedup habit; scope key already in PH record |

Rules: texture never names S-0741, 203.0.113.44, unknown-laptop-17 findings, travel, or verdicts. T-4 must not pre-close A-1180 ("it's just the scanner" forbidden — requires window+run match by player).

### 14.8 Anti-pattern check (reject list)

Reject any interaction that: reveals hidden evidence (`employee-private-travel`, undiscovered rows, future consequences, branch labels); tells player which action is correct; exposes authoring metadata (`templateId`, related-record spoilers, answer keys, clue counts); forces dialogue before investigation (no required Morgan/Jules gate on any query action); creates facts through AI (new IPs, devices, procedures, deadlines, verdicts); becomes a lengthy RPG tree (more than one fact or two exchanges to reach payload); grades performance; or duplicates canonical decision logic in dialogue. Texture that gates work fails review even if wording is good.

### 14.9 Canonical-fact conflict audit (this section)

No conflicts introduced. Checked against `pack.yaml`: Morgan sole NPC with `memoryFactIds: [alert-visible]` preserved; private travel stays `notKnownBy: [manager, user]` — Section 14.5 travel intent cites only employee report + HR coverage limit; Jules stays peer who defers to Morgan, no new NPC entry, no manager-title reassignment; handoff incompleteness (device check unfinished, scanner ref forgotten, "Ping Morgan") preserved as Morgan's stated limit; location-estimate-only-lead, single-source rule (A-1042 = login-context-1), collection-ends-07:45, and report-not-proof qualifier all restated as limits, never as verdicts. Reporter identity A. Rivera confined to phishing texture (T-7) with no link to login keys.

---

## 15. Arrival / handoff beat (shift-flow content)

**Status:** PROPOSED shift-flow content. No new canonical truth. Restates `handoff-email` (07:55), queue state, and scanner context already defined in Sections 1–7. Morgan/Jules dialogue payloads live in Section 14 and are referenced, not duplicated, here.

### 15.1 What the player walks into — PROPOSED SUPPORTING RECORD

Shift starts mid-story. Queue already has texture before A-1042 arrives:

- **Handoff note (EXISTING CANONICAL FACT, `handoff-email`):** night analyst still watching unfamiliar login thread; device inventory check unfinished; scanner schedule reference forgotten; "Ping Morgan if the login expands."
- **Queue state at T+00–T+02 (PROPOSED):** handoff Work Item queued; routine scanner context reachable (A-1180 arrives per beat sheet at T+05; run/window records SC-RUN-01/SC-WIN-01 exist to check); no central incident demanding immediate action yet.
- **Prior-shift status context (PROPOSED SUPPORTING RECORD, consistent with handoff):** overnight saw two scanner-noise alerts that closed as authorized; one unfamiliar login thread left open with login time only checked. This gives the "two things named that recur later" shape: (1) scanner noise as familiar pattern, (2) login thread as open question. Neither names S-0741, 203.0.113.44, or unknown-laptop-17 before the player opens A-1042.

### 15.2 Concrete workplace activity (player verbs)

Arrival is work, not exposition. Player may in any order:

1. **Read handoff** — open `handoff-email`; note three gaps: unfinished device check, missing scanner ref, open login thread.
2. **Check queue** — open work queue; see handoff + routine context; observe severity/age ordering (high-severity first, oldest-first within severity per realism reference).
3. **Skim routine outstanding work** — open scanner window SC-WIN-01 and prior run SC-RUN-02 to confirm "Mondays 10:00–12:00 finance VLAN" is a real weekly pattern before today's items land.
4. **Decide what to inspect first** — no forced order. Natural first moves: re-read handoff gap, check inventory coverage (KB-DEVICE-01), or skim KB triage basics (KB-ALERT-01). All are legal; none is marked correct.

### 15.3 What stays uncertain after arrival

- Whether the open login thread is the same scanner noise or something different (timing looks different — stated as observation, not verdict).
- Whether the device check the night shift skipped matters (unknown until inventory opened).
- What today's queue will add (A-1042 has not arrived yet; phishing has not arrived yet).

Morgan/Jules hooks: if the player asks Morgan about handoff now, use Section 14.1 M-EARLY payloads. Jules status intent is not yet meaningful (no A-1042 state to brief); texture T-1/T-2 may fire once each at most.

---

## 16. Routine scanner work depth (low-intensity SOC work)

**Status:** PROPOSED shift-flow content built on EXISTING CANONICAL FACTS (AL-2, SC-RUN-01, SC-WIN-01, ticket key `routine-alert-1`) plus PROPOSED supporting rows (SC-RUN-02, SC-NOTE-01). No new verdicts.

### 16.1 What appears on screen

- Alert row AL-2 (A-1180): low severity, connection monitoring, delayed delivery, recorded activity Monday 10:18, vuln-scan-03 across finance VLAN.
- Run record SC-RUN-01 (RUN-FIN-031): 10:05–10:32, finance VLAN, completed, discovery connections only, change ref SCAN-FIN-MON.
- Window record SC-WIN-01 (SCAN-FIN-MON): approved Mondays 10:00–12:00, finance VLAN discovery, owner infrastructure operations, in/out scope rules.
- Queue-delay memo SC-NOTE-01: "forwarded after queue delay; event time unchanged."
- Optional recurrence row SC-RUN-02 (prior Monday 10:06–10:31) for "weekly is real" texture.

### 16.2 What the analyst actually checks

1. **Event time vs delivery time:** recorded 10:18 within run 10:05–10:32 within window 10:00–12:00. Arrival time in queue is later; compare recorded event time even when monitoring delivers late (canonical window wording).
2. **Scope match:** vuln-scan-03 + finance VLAN in all three records (alert, run, window). No scope drift.
3. **Coverage cap:** discovery connections only — licensed close reason cites this cap, never broader safety.
4. **Change ref:** SCAN-FIN-MON present in run and window; owner infrastructure operations.

KB support: KB-SCAN-01 (routine scan closure) + KB-ALERT-01 (severity vs finding). Neither names A-1042's path.

### 16.3 Benign findings and closure

- Finding: authorized scheduled scan; alert fired correctly on real connections; no threat. This is the benign-true-positive shape (detection correct, activity authorized).
- Closure action: acknowledge → attach run + window record refs → short note citing event time, scope, coverage cap → close `routine-alert-1` with reason "authorized scan."
- Simulated work cost: approximately 5–10 minutes. Deliberately low intensity: skim, match three fields, document, close.

### 16.4 What does not happen

- No escalation path authored for the routine match. If scope/finding diverged (not authored in beta), the licensed response would be monitor + note, never a forced incident.
- If ignored, the item sits visibly aging and may acquire one reminder state (see Section 18). No numeric penalty, no fail state.

---

## 17. A-1042 multi-path investigation (no secret correct path)

**Status:** PROPOSED shift-flow content. All facts referenced already exist in Sections 2–4, 11–12. No new records. No path is marked correct. Every path returns mixed benign + central results and leaves genuine uncertainty.

Convention per path: **player does → information becomes available → remains uncertain → sensible next actions.**

### 17.1 Path A — auth first

- **Does:** opens A-1042, filters auth by user j.patel, opens A1 (S-0731 baseline), A2-group (six fails 07:38–07:40), A3 (S-0741 07:41 password, extra-check absent), A4 (07:43 refresh continuation). Optionally opens A5–A8 baseline rows and A13 typo boundary.
- **Becomes available:** sequence (fails precede success from same source); S-0741 password-ok ≠ MFA-ok; refresh verifies nothing; baseline HQ Wi-Fi + enrolled MacBook + two prior V-218 sessions (facts 1, 2, 5, 12).
- **Remains uncertain:** who controlled S-0741; whether source 203.0.113.44 has any approved route; whether unknown-laptop-17 is enrolled; what was accessed (collection ends 07:45, fact 11).
- **Next actions:** check device inventory for exact label; run VPN covering query for user + window + source; read employee report + HR coverage limit; update ticket with sequence + open questions.

### 17.2 Path B — device first

- **Does:** opens A-1042, pivots on device label unknown-laptop-17, opens D3, compares D1 (active MacBook, 07:30 check-in, cert match) and D2 (active phone); encounters near-miss D6 (retired namesake) and unrelated D7 (different unknown label).
- **Becomes available:** D3 not enrolled, never MDM check-in; inventory covers registered work devices only; exact-active-label discipline (D6 excluded); unknown ≠ malicious in general (D7), but this label's state is enrollment-absent (facts 3, 4).
- **Remains uncertain:** who used the device; whether the session rode an approved route; whether the failure burst + password sequence matters; travel question untouched.
- **Next actions:** pull auth history for the account to see burst + baseline; run VPN covering query; read employee report; note exact label + coverage caveat in ticket.

### 17.3 Path C — VPN first

- **Does:** opens A-1042, pivots on source IP / session connection ID, opens V1 (V-218 → 198.51.100.20, S-0731) and VPN catalogue neighbors V3 (second exit), V4 (shared exit IP, different connection ID), V5 (last-week row); runs covering query for (user=j.patel, window ⊇ 07:25–07:45, source=203.0.113.44).
- **Becomes available:** S-0731 route explained by V-218; 203.0.113.44 not an approved exit in NET-VPN-04 snapshot 07:45; shared city ≠ shared route; shared exit IP ≠ shared connection (facts 6, 7; absence 1 subject to Section 12 coverage).
- **Remains uncertain:** everything the catalogue cannot say: personal connections out of scope; absence ≠ route identification; device enrollment, auth sequence, travel, and access questions untouched.
- **Next actions:** open auth rows for sequence + baseline; open inventory for exact label; read runbook KB-VPN-01 for what absence does/does not mean; document query coverage (filters + window + zero qualifying rows) before claiming absence.

### 17.4 Path D — Morgan first after partial evidence

- **Does:** opens A-1042 plus at least one record (alert body or one auth/device/VPN row), then asks Morgan about handoff or a specific mismatch. Uses Section 14.2/14.3 payloads only.
- **Becomes available:** at most one bounded prior-shift detail per exchange (watched login thread, checked time only, did not pull history/inventory; scanner noise timing looked different); procedural pointer (which system holds which field; compare identifier + address; exact-label match).
- **Remains uncertain:** everything Morgan does not know: no verdict, no enrollment result supplied, no VPN absence asserted, no travel finding, no decision recommendation. Player must still open the records Morgan points at.
- **Next actions:** follow the pointer (open the named system), verify in records, write the mismatch in own words in the ticket. If Morgan says "haven't looked at that," treat as normal peer limit, not a block.

### 17.5 Path-equivalence rule

All four paths can reach the same discovered-fact set (facts 1–12 subject to coverage rules). Order changes discovery sequence only. Content must never reward one entry point or punish another with exclusive information, faster clocks, or hidden flags.

---

## 18. Interruptions (deterministic, deferable, natural)

**Status:** PROPOSED shift-flow content. Reuses records already defined (PH cluster, AL-4, A-1180 follow-up, Section 14 intents/texture). No new mechanics. At most one reminder state per item; texture never gates work.

| # | Interruption | Trigger condition (public state) | Why natural | Optional / deferable | Return-later behavior |
|---|---|---|---|---|---|
| I-1 | Employee phishing report (PH-RPT-01) | T+20 beat; A-1042 already open/investigating | User reports land mid-investigation in real SOCs; creates overlap, forces park-and-resort with notes | Yes — acknowledge now, triage after current A-1042 check | Report stays open/unreviewed; no decay; headers/link/scope all still available; reporter waits without repeat nudges |
| I-2 | Jules status request | T+25 beat; predicates: A-1042 opened (J-STATUS-1) or ticket thin while decision pending (J-DOC-1) | Lead checks status mid-shift; asks for ticket currency, never for the answer | Yes — brief short status now or after finishing current record | Jules re-asks once at most; acknowledgement reflects whatever state exists then; no grade for delay |
| I-3 | Routine scanner notification / follow-up | T+23 beat; predicates: A-1180 acknowledged → normal follow-up arrives; ignored → one reminder state | Scheduled-scan pipeline posts follow-ups; ignored items age visibly | Yes — open now or leave; no fail state | Follow-up waits in queue; reminder does not repeat; close path from Section 16 unchanged whenever player returns |
| I-4 | Coworker / Morgan interaction | Delayed reply to earlier Morgan question (one phase later) or texture T-3/T-4/T-7 moment | Replies take time; teammate mentions scanner noise or duplicate lure in passing | Yes — read now, reply optional, no reply required | Delayed answer arrives mid-investigation where it reframes; unread state persists; nothing expires |

Rules: never stack interruptions (one at a time, focused windows between); never interrupt input or pull focus mid-record; never attach fake urgency to routine items; never require fast clicking. Queue always shows what is open, waiting, or has follow-up.

---

## 19. Resume-work behavior (calm beats between drama)

**Status:** PROPOSED shift-flow content. Maps to beat-sheet T+30–T+40 and pacing rule `focus → interruption → short routine → return → decision → calm → fallout`. No new records.

After any major action on A-1042 (ticket update, monitor/escalate/close decision, Morgan/Jules exchange, phishing triage step), the shift deliberately returns the player to normal work before the next consequence beat:

1. **Mundane queue check** — re-open queue; confirm what is open / waiting / has follow-up; re-sort severity-then-age (OPTIONAL REALISM FILLER behavior, teaches prioritization visibly).
2. **Documentation** — add timestamped ticket note: facts checked, record IDs cited, gap named, next check stated (KB-NOTE-01 shape). Amend earlier note if new evidence changed it; correction shows in history, no penalty.
3. **Routine alert** — advance A-1180 closure (Section 16) or phishing sub-step (headers → destination → scope count) or false-positive review sub-step (Section 21).
4. **Monitoring state** — if player chose monitor, item enters monitoring/waiting with explicit re-surface condition ("flag if second session appears"); player sees the state, not a grade.
5. **Short waiting period through other work** — delayed replies (Morgan answer, escalation acknowledgement) arrive while the player does 2–4 above. No literal idle waiting; calm is housekeeping time (notes, KB skim per texture T-6).

Purpose stated for implementers: this delay breaks the quiz pattern where every decision earns immediate correctness feedback. Consequences fire on consequence beats (Section 20), not instantly.

---

## 20. Delayed consequences (world feedback, not grades)

**Status:** PROPOSED consequence content. Engine owns firing; content below defines only the world-facing text shapes and their trigger states. No scores, no "correct/incorrect," no stars. Every outcome keeps the shift continuable.

### 20.1 Timely handling (evidence-backed ticket + decision)

- **Trigger state:** ticket cites record IDs + sequence + coverage caveats; attached/discovered refs present; decision taken (monitor or escalate with package).
- **World feedback:** clean operational acknowledgement. Escalation: "Senior review has the session IDs and the open question; case with Tier 2." Monitor: "Monitoring through end of shift; flag if a second session appears." Ticket noted as readable for next shift.
- **Later payoff:** handoff references the player's notes; Morgan/Jules acknowledgement names the open question back (Section 14.4/14.6 shapes).

### 20.2 Delayed handling (parked, then completed)

- **Trigger state:** player acknowledged A-1042, handled phishing/scanner first, returned later; ticket updated late but before handoff.
- **World feedback:** one polite nudge at most (Jules doc-request or queue reminder), then same clean acknowledgement as 20.1 once documentation lands. Reminder text frames delay as normal re-sorting ("Two in the queue now — oldest-highest first"), never as failure.
- **Later payoff:** no lasting penalty; handoff shows completion time honestly. Teaches parking work with notes as a skill.

### 20.3 Insufficiently supported escalation (thin package)

- **Trigger state:** escalation with zero attached/discovered refs, or with auth-only and no device/VPN check, or with single-source double-count (A-1042 + login-context-1 cited as two corroborations).
- **World feedback:** escalation accepted but returned with specific evidence requests: "Accepted — can you add what you checked for device and route before Tier 2 picks up?" or "What ties the session to the account?" Player does the enrichment late; it was always available. Costs a round-trip, never points.
- **Later payoff:** resubmitted package with added refs earns the clean acknowledgement from 20.1. Ticket history shows the correction.

### 20.4 Monitoring / waiting state

- **Trigger state:** player sets A-1042 to monitor with stated re-surface condition.
- **World feedback:** case stays open in monitoring; queue shows waiting state; no news is valid news for a stretch. If related activity is authored to arrive (follow-up alert or record per beat sheet T+40+), it re-surfaces with history intact and cites the monitored condition.
- **Later payoff:** player meets the signal they chose to watch. If nothing arrives before handoff, handoff lists the watch as an open monitoring item with its condition — an honest, complete ending.

### 20.5 Dismissed / closed (with reason recorded)

- **Trigger state:** player closes A-1042 with a stated reason.
- **World feedback:** "Closed for now with your reason recorded. If related activity arrives the case reopens with history intact." No praise/blame at close time.
- **Later payoff:** if canonical follow-up activity warrants it, the case reopens visibly (same ticket, history preserved); if not, it stays closed and handoff records the disposition + residual uncertainty. Single-signal closure (e.g., MFA-active therefore fine, history unexamined) is designed to meet the unexamined signal later via the reopen path — the lesson lands as process, not punishment.

---

## 21. False-positive review Work Item (compact, SHOULD-ship)

**Status:** PROPOSED SUPPORTING RECORD item. Confirms the Section 5.2 AL-3 design as the T+43 SHOULD-ship contrast case, scoped to reuse existing mechanics only. Discardable if T+43 is cut; if cut, delete this section with AL-3 and its one auth row, keeping V4/D4 (still needed for route logic).

### 21.1 Item shape

- **Alert row AL-3 (A-1204):** medium-low rule severity with auto-note: single successful login for `c.okonkwo@example.com` from previously unseen residential IP, geo estimate "Chicago" vs assigned Toronto.
- **Cost:** 1 alert row + 1 auth row (single success, enrolled device, extra check completed, VPN V-217 exit matched, zero prior failures) + reuse of V4 (V-217 shared-exit connection) and D4 (corp-macbook-okonkwo enrolled/active). No new systems, no new mechanics, no discrimination minigame.
- **Size bound:** strictly smaller than A-1042 and shorter than phishing. Target: 2–3 record opens + 1 note + 1 close.

### 21.2 Player verbs (same as everywhere else)

Record query (filter by user/time; open the one auth row) → evidence correlation (enrolled + MFA-complete + route-matched all agree; geo estimate alone disagrees) → ticket/documentation (close with reason "expected/verified: enrolled device + completed extra check + matched route; city estimate alone is not suspicion") → bounded decision (close as expected/verified). KB-ALERT-01 + KB-VPN-01 + KB-DEVICE-01 support; no article names this verdict.

### 21.3 Teaching point

`unusual != malicious.` Shares A-1042's surface (unseen IP + surprising city) but inverts every load-bearing signal:

| Signal | A-1042 | A-1204 (this item) |
|---|---|---|
| Device | unenrolled unknown-laptop-17 | enrolled corp-macbook-okonkwo |
| Extra check | absent for S-0741 after 6 fails | completed, zero prior fails |
| Route | no matching VPN row (absence 1) | V-217 exit matched |
| Geo estimate | Montreal hint, estimate only | Chicago hint, estimate only |

Lesson lands by doing the same checks and reaching a different disposition with reasons — which also blocks "always escalate" as a winning strategy.

### 21.4 What stays out

No new ticket type (close inside existing ticket/notes pattern); no new NPC knowledge (Morgan/Jules use existing 14.4/14.6 acknowledgement shapes); no new consequence type (clean close acknowledgement + handoff line only).

---

## 22. End-of-shift handoff (work product, not assessment)

**Status:** PROPOSED shift-flow content. No canonical fields exist yet; content below defines the fields and their sources. System must not grade writing style.

### 22.1 What the analyst actually does (T+60 shape)

1. **Review open work** — open queue; list each item's state: open / monitoring / escalated / closed with reason. Sources: Work Item states + ticket keys `suspicious-login-1`, `routine-alert-1`, phishing report status, AL-3 disposition if shipped.
2. **Update ticket status** — ensure each ticket has current status, attached/discovered record refs, and disposition or pending follow-up. Missing update draws at most one Jules doc-reminder (J-DOC-1 shape), never a block.
3. **Write handoff note** — concise fields (short text each):
   - items still open and who holds them;
   - actions taken this shift (queries run, records opened, notes written, decisions taken);
   - evidence attached (record/fact IDs);
   - pending follow-ups with re-surface conditions (monitoring watches, expected replies);
   - current disposition per item;
   - important unresolved uncertainty stated plainly (e.g., "access unverified — export ends 07:45"; "no entry in approved-trips register is not a travel finding").
4. **Mention monitoring items** — every monitoring/waiting state appears with its condition so next shift can continue without re-work.
5. **Summarize unresolved questions** — gaps named as gaps (who controlled S-0741; what was accessed; travel question limits). Report-not-proof and coverage-limit qualifiers preserved verbatim in meaning.

### 22.2 Handoff quality rule

A good handoff lets the next analyst continue without re-reading every record. Content requirement: record IDs + states + open questions present. Prose elegance not evaluated. Free text never becomes world truth; structured refs carry the state.

### 22.3 Shift ends mid-story (T+65 shape)

Two things may still be open, both documented, both handed off — the intended end-of-shift feeling. Post-shift reflection/debrief stays secondary and must not retroactively score the shift.

---

## 23. Content-density and plausibility filter (applies to Sections 15–22)

- **Time budget:** most of the shift spent investigating, correlating, documenting, communicating, monitoring, deciding, and resuming routine work. Per realism reference: 1 major investigation, 3–5 routine items, 2–4 interruptions, 2–4 Morgan exchanges, 2–3 Jules exchanges, 5–9 attachable findings for the major case, 3–5 meaningful decisions, 2–4 delayed-consequence beats.
- **Avoid:** long exposition, quiz prompts, dramatic event after dramatic event, excessive dialogue, fake hacking, arbitrary minigames, jargon gates, hidden pixel hunts, exact-syntax demands, raw log walls.
- **Final pass per beat:** *Is the player doing something a junior SOC analyst plausibly does?* If not, remove or redesign the beat. Mundane actions must teach, change state, or set up a later payoff — otherwise cut.

---

## Complete content inventory — shift-flow additions (Sections 15–23)

| ID | Content | Provenance | Depends on | Notes |
|---|---|---|---|---|
| SH-ARR-01 | Arrival / handoff beat | PROPOSED (restates EXISTING handoff-email) | Sec 1.1, 7, 14.1 | Read handoff, check queue, skim routine, choose inspect order |
| SH-SCAN-01 | Routine scanner depth | PROPOSED on EXISTING AL-2/SC rows | Sec 5.1, 7, 8, 13 | Event-vs-delivery, scope, coverage cap; 5–10 min close |
| SH-A1042-A..D | Four investigation paths | PROPOSED flow over EXISTING rows | Sec 2–4, 11–12, 14.2–14.3 | Auth / device / VPN / Morgan-after-partial; equivalence rule |
| SH-INT-01..04 | Interruptions I-1..I-4 | PROPOSED | Sec 5–6, 14.6–14.7 | Phishing, Jules, scanner follow-up, coworker; deferable |
| SH-RES-01 | Resume-work calm beats | PROPOSED | Beat T+30–T+40 | Queue, docs, routine, monitor state, wait-through-work |
| SH-CON-01..05 | Delayed consequences | PROPOSED text shapes | Sec 11, 14.4, 14.6 | Timely / delayed / thin / monitor / close; world feedback only |
| SH-FP-01 | False-positive WI (AL-3) | PROPOSED SUPPORTING RECORD | Sec 5.2, V4, D4 | Confirms SHOULD-ship scope; 1 alert + 1 auth row + reuse |
| SH-HAND-01 | End-of-shift handoff | PROPOSED fields | Tickets, 14.6 handoff | Open items, actions, evidence, follow-ups, uncertainty |
| SH-FILT-01 | Density / plausibility filter | Derived | Realism ref Sec 13–14 | Budget + avoid-list + per-beat question |

**Non-goals honored in Sections 15–23:** no schema, no engine semantics, no required-query strings, no answer keys, no verdict changes, no scoring, no new NPC knowledge beyond Section 14 bounds, no private-travel exposure, no real-world phishing domains, no absolute dates invented.
