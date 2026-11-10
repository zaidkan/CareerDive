# Career Expo — Motion upload assets

Upload only the 13 PNGs in `MOTION-UPLOAD/`. `SOURCE/` contains provenance, original captures, current style/data extracts, and reproducible editorial-board HTML. It is not a second upload selection.

## Truth constraints

- Career Expo is the platform. Cybersecurity Analyst is the **only playable career** in this checkout.
- Current public UI says **Playable now** and **Taking shape**. The requested film aliases **READY NOW** and **IN THE WORKSHOP** appear only on the explicitly editorial status board. They describe the same availability, not additional functionality.
- Registered Nurse, Mechanical Engineer, Electrician, and Lawyer / Attorney have previews, not playable simulations. Do not animate their cards into playable workplace scenes.
- Verdaly is the fictional employer inside the Cybersecurity experience, not the platform brand.
- Scenario accounts, identifiers, and security records are synthetic product content. An unfamiliar location or missing device record is not a finding of compromise.
- The ticket is a real saved **in-progress draft**. This package does not show a completed outgoing handoff, submitted decision, completed shift, or debrief.
- Editorial boards reframe authentic data for a designer. They are not screenshots of additional product screens.

## Selected assets

| Filename | Depicts and source | Actual product UI/gameplay? | Suggested use | Important constraint |
| --- | --- | --- | --- | --- |
| `01-brand-board.png` | Production text wordmark, Plus Jakarta Sans, computed dark/light foundation tokens, actual hero CTA and career card. Sources: `foundation.css`, `SiteChrome.tsx`, live `/` DOM. | Editorial reference board incorporating actual identity and UI crops. | Establish typography, palette, borders, surfaces, and button treatment. | No new logo invented. The small repository favicon is a legacy V mark, explicitly labeled; do not adopt it as a new Career Expo symbol. |
| `02-career-explorer.png` | Current homepage career selection: proposition, layered five-career cards, Cyber active, Start CTA. Live `/`, framed around `.home-hero`. | Yes, live public UI capture. | Front-load product proposition and show selecting a career. | This is the currently mounted selection interface, not the older unmounted `CareerExplorer` component. Background cards are not playable. |
| `03-cybersecurity-card.png` | Actual selected Cybersecurity Analyst hero card, captured as one DOM element at 3× density. | Yes, live UI element. | Animate independently into the first playable experience. | Preserve “Playable now” or the approved equivalent READY NOW. |
| `04-workshop-careers.png` | Four actual selected homepage career-card captures assembled into one clean board. | Editorial assembly of unchanged live UI cards. | Expand from Cyber to the platform's future careers near the film's end. | All four remain Taking shape. No fictional gameplay or invented screenshots. |
| `05-cybersecurity-career-page.png` | Current Cyber page intro and Start CTA, framed from `/careers/cybersecurity-analyst` `.cyber-hero-copy`. | Yes, live public UI capture. | Bridge career selection into the workplace; an optional readable title/copy treatment. | The page describes a synthetic security-operations scenario, not employment placement or a live incident. |
| `06-workplace.png` | Real rendered 3D Security Ops workplace, desks, people, lighting, and workstation prompt. Crop of live `SOURCE/captures/workplace-full.png`. | Yes, actual gameplay render. | Immediate spatial proof: the visitor enters a workplace. | Captured locally with Chromium/SwiftShader. The visible sit prompt is real. No teleport, camera mutation, fabricated environment, or fixture render. |
| `07-desk-os.png` | Real signed-in workstation and SOC Ops Console dashboard; captured from Desk OS. | Yes, actual gameplay UI. | Transition from the workplace into tools and ordinary operational work. | Some app tiles sit below the native console scroll area. Do not interpret the dashboard as a completed case. |
| `08-alert.png` | Full opened A-1042 narrative, read from `.alert-record .artifact-body` in the real Alerts tool. | Actual live artifact DOM, isolated into a read-only capture document. | Alert arrives; emphasize the identifier, failures, and successful sign-in. | The record's qualifications remain intact. Isolation removes ancestor clipping and the artifact's 14rem scroll cap only in the capture document, never in the application. |
| `09-evidence.png` | Opened `Device inventory · j.patel`: managed devices and absence of `unknown-laptop-17`. Live Guides `.artifact-detail`. | Actual live artifact DOM, isolated into a read-only capture document. | Move from alert to evidence; zoom to the exact inventory comparison. | Missing enrollment does not identify the device owner or prove compromise. Full source qualifications are preserved. |
| `10-decision-or-ticket.png` | Four actual ticket decision options and the second option selected in the real working form. Text/state extracted from `TicketComposer`. | Editorial board of real current UI choices/state, not a product-screen screenshot. | Demonstrate that the visitor makes a reasoned decision. | Selection is not a submitted or completed outcome. Do not animate it as a score or confirmed finding. |
| `11-handoff.png` | Actual saved draft: verified evidence, uncertainty, next step, two attached sources, and canonical “in progress” status. Exact values extracted after successful Save draft. | Editorial readable board of real session data, not a new product screen. | Show work being prepared for the next reviewer: evidence → uncertainty → next step. | Filename is a film concept. This is a handoff-ready case draft, **not a completed outgoing shift handoff**. Notes were entered through the real form during capture. |
| `12-career-status-board.png` | Current availability of Cyber and the four future careers, from `careers.ts`. Production public palette/type. | Explicit editorial status board. | Prevent incorrect availability interpretation; show the broader platform. | READY NOW / IN THE WORKSHOP are requested film aliases. Actual UI uses Playable now / Taking shape. Lawyer's full UI title is Lawyer / Attorney. |
| `13-wordmark.png` | Career Expo text portion of the actual nav brand, isolated using a DOM text range. | Yes, live wordmark crop. | Clean closing brand lockup. | Raster text crop; not a newly designed logo or vector mark. Production font is Plus Jakarta Sans. Beta excluded by cropping the brand text node, not changing the UI. |

Dimensions and SHA-256 checksums are recorded in `SOURCE/asset-integrity.json`.

## Film use guidance — asset preparation only

Preferred runtime: 22–26 seconds; hard maximum: 30 seconds. Put the proposition before a brand intro. Assets 02/03 can establish the idea within 5–6 seconds; 06/07 prove the playable experience by 6–9 seconds; 08–11 show operational work; 04/12 expand to the future platform; 13 resolves the brand. Avoid requiring viewers to read whole evidence records: animate selective emphasis while retaining the source's meaning and qualifications. No launch video has been implemented.
