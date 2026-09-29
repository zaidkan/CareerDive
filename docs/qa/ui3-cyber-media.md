# Cyber public media integration notes

## Open product defect: Desk OS at 390 px

The real A-12 mobile capture (a-12-mobile-dark.webp, also present in light) shows narrow-screen clipping in Desk OS. The top navigation truncates after Alerts, the objective text is cut off, the main case title is clipped at the right edge, and the bottom Notes tab is clipped. This is visible in the deterministic 390 × 844 capture from the current product state.

The public Cybersecurity Analyst page uses the real A-12 desktop source at mobile widths inside a deliberate viewport crop. It does not present the mobile source as a repaired Desk OS state. Fix the product layout in a separate runtime task, then recapture A-12 mobile and reassess the public crop.

## Capture status

All twelve scenes now use the integrated Cyber 2.0.0 pack. A-06 shows a submitted investigation ticket from a deterministic shift replay; A-10 shows the completed-shift debrief from that replay. Each has light/dark and desktop/mobile captures. The provenance records the pack hash, action log and state hashes, decision route, and capture setup.

A-12 still needs a mobile recapture after the Desk OS clipping defect is fixed.

The public route reads static registry sources only; it never requests a live simulation session.
