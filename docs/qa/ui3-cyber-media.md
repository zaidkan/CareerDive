# Cyber public media integration notes

## Open product defect: Desk OS at 390 px

The real A-12 mobile capture (a-12-mobile-dark.webp, also present in light) shows narrow-screen clipping in Desk OS. The top navigation truncates after Alerts, the objective text is cut off, the main case title is clipped at the right edge, and the bottom Notes tab is clipped. This is visible in the deterministic 390 × 844 capture from the current product state.

The public Cybersecurity Analyst page uses the real A-12 desktop source at mobile widths inside a deliberate viewport crop. It does not present the mobile source as a repaired Desk OS state. Fix the product layout in a separate runtime task, then recapture A-12 mobile and reassess the public crop.

## Media replacement targets

- A-01–A-05, A-07–A-09, A-11, and A-12 were recaptured against the integrated 2.0.0 pack. Their provenance records the new pack hash. A-06 and A-10 still carry their original 1.0.0 provenance and remain labeled representative.
- A-06: replace the representative investigation ticket with a verified, complete in-product ticket state when available.
- A-10: replace the representative partial-shift debrief with a verified completed-shift capture from the integrated consequence/debrief runtime.
- A-12: recapture mobile after the Desk OS clipping defect is fixed.

The public route reads static registry sources only; it never requests a live simulation session.
