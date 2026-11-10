# Capture notes

## Version and environment

- Repository: `/Users/zaid/orca/Career-Expo`
- Branch: `worker/public-motion-sitewide-final`
- Commit inspected and captured: `00143b30ae7797efa11af97d06f51930d5c547b3`
- Local capture date: 2026-10-02.
- Vite application: `http://localhost:5173`; existing local API: `http://localhost:3001`.
- Browser: Playwright Chromium, headless, native WebGL rendered using SwiftShader.
- Public captures: 1920×1080 CSS viewport, dark theme, reduced motion to settle the real final state; 2× or 3× density for isolated public elements. Gameplay source captures: 1920×1080 CSS viewport, approximately 1× effective density. Editorial reference boards: 1920×1080; work boards: 1200px CSS capture viewport with 2× density and panel-level crops. Exact PNG dimensions are in `SOURCE/asset-integrity.json`.
- No browser chrome, DevTools, debug overlays, cursor artwork, or production source changes.

## Product inspection

Inspected the current public routes, `careers.ts`, the old CareerExplorer implementation and current CareersPage, CyberDetail, foundation tokens, SiteChrome identity, 3D workplace/Desk OS, Email/Alerts/Guides tools, ArtifactDetail, RecordQueryTool, and TicketComposer. Future plans in documentation were not treated as shipped behavior.

Cyber alone has `ready_now`, a published detail page, and `/start`. The other four public careers have `in_workshop` and no playable route. Public labels are Playable now / Taking shape. The status board deliberately maps these to the requested film terms READY NOW / IN THE WORKSHOP.

The production public wordmark is text. No separate current Career Expo vector logo was found. The actual favicon contains a legacy V; its provenance is noted on the brand board. Public typography is Plus Jakarta Sans. The existing simulation separately uses DM Sans, Syne, and IBM Plex Mono; its captures were not reskinned. Editorial work boards use existing public palette tokens with the simulation's DM Sans type treatment and are explicitly labeled as editorial in the manifest.

## Actual experience reached

One real browser session followed:

Homepage → Start your first day → arrival media/door → first-day brief → Head to Security Ops → 3D workplace → keyboard walking → Sit at computer → actual DeskLogin → sign in → Desk OS → read incoming handoff → acknowledge initial ownership → review A-1042 → inspect login context → inspect account history → check device inventory → prepare and successfully save the case-ticket draft.

Arrival playback was advanced using browser media controls/events to reach the implemented entry controls. Walking and sitting used actual keyboard/button input. Camera position was read from the existing render store solely to orient corrective walking; it was never mutated or teleported. Accessibility recovery was inspected but not invoked. Shift time reached 08:55; the saved ticket reported `Canonical ticket: in progress. 2 source(s) attached.`

Capture input was ordinary gameplay: actual fictional desk credentials and notes based on opened scenario sources. No fixture state, mocked response, database injection, fabricated query results, or forced completed scenario was used. The input notes were created for this real capture run and are preserved verbatim in `SOURCE/ticket-state.json`.

## Isolation and editorial assembly

- 02/03/05/07/13 are screenshots/crops of the actual live UI; 06 is a crop of a real rendered workplace frame.
- 08/09 copy the unchanged opened artifact DOM into a separate read-only document with the application's CSS, inherited tokens, and existing fonts. Only capture-document clipping is removed so the complete source text can be shown. The application and its behavior are untouched. The corresponding HTML is included in SOURCE.
- 01 is a reference board of production tokens, typography, wordmark, UI crops, and labeled legacy favicon.
- 04 assembles four actual future-career card captures. Its title/caption describe their real availability.
- 10/11 are readable editorial boards derived from real form choices and actual saved draft values. They are not presented in the manifest as product-screen screenshots. `ticket-state.json` preserves the captured values and selected working-form option; the option itself is not a submitted outcome.
- 12 is an editorial availability board from current career data, with requested film aliases and actual public vocabulary clearly distinguished.

Reproducible board HTML and source/style/data extracts are included. External Google Fonts links in the HTML mirror the app's font families; final PNGs are self-contained and need no network or application access.

## Quality control

Selected 13 PNGs. Reviewed a contact sheet and individual frames for the public composition, full evidence record, decision board, ticket proof, branding, and readable availability. Rejected wall/overshoot navigation frames, a giant sit-prompt close-up, clipped nested artifact screenshots, dense workshop text-panel assemblies, and public screenshots containing partial next sections. Final product sources are settled captures, not mid-animation frames.

Verified all final files have valid PNG dimensions and recorded SHA-256 checksums. Production tracked diff remains empty. This is an asset-only task; source-code typecheck/lint/build suites were not claimed or run as proof of image quality.

## Missing / limitations

- Structured record-search action failed in this run (“That action could not be completed”). The Guides search interface also lacked an enabled submission path for the current work item. Repository inspection found its RecordQueryTool mounting without an `onQueryRecords` handler. No search-results asset was manufactured; opened device evidence substitutes truthfully.
- The current draft was saved, but its decision was not submitted. No completed outgoing handoff, completed shift, or debrief was captured. Incoming handoff/initial ownership was completed during the real run. Use 11 as work prepared for follow-up, not proof of final shift completion.
- No `motion-reference-videos/` directory exists. No MP4 references or reference-frame boards were available.
- No current separate vector Career Expo logo found. Actual text wordmark, production font/token sources, and the labeled existing favicon are included. A new logo is not needed to use these assets.

## Motion must not infer

Do not infer playable Nurse/Mechanical/Electrician/Lawyer experiences, real customer incidents, confirmed attacker identity, confirmed compromise, completed assessment, career-fit score, live production data, new backend capabilities, or future features. Do not turn a selected decision or saved draft into a completed outcome. Do not treat editorial layouts as existing application screens, or Verdaly/its legacy V mark as Career Expo's platform identity.

Nothing essential remains for the owner to capture manually. Optional reference MP4s or an approved separate vector logo can be supplied later if desired. No video, deployment, merge, backend change, simulation change, or production behavior change was performed.
