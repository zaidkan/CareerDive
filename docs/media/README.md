# README captures

Captured on October 17, 2026 from the local web client and development API at
source commit `042788020ebe60cd5646dea7c92230067b731a21`, with the accompanying
README, legal-document synchronization, and test corrections in the working tree.
These images do not establish which commit is deployed on Render.

- [Landing page](home.jpg).
- [Security Operations office](soc-office.jpg), rendered after the arrival film.
- [Desk OS](desk-os.jpg), after reading the assignment and starting the unfamiliar-login case.
- [Six-second walkthrough](desk-os-demo.gif), switching between Email, Alerts, and Tickets in that case.

The capture uses Playwright Chromium, a 1366 × 900 viewport, device scale 1,
and software WebGL. It starts an ordinary local assessed session with the
in-memory development API. No production account or production database is used.
The GIF is scaled to 960 pixels wide and encoded with FFmpeg's palette filter.
The recorded flow creates exactly one session, with no uncaught browser errors
or failed API responses.

To explore the same flow, run `pnpm dev`, open `http://localhost:5173`, choose
**Start your first day**, then **Security Operations**, wait for the arrival film,
walk to the marked desk with WASD, and press E. The sign-in details on the
fictional sticky note belong only to the simulated workstation.

`pnpm capture:product-media` is a separate harness for the site's career-page
fixtures; it does not regenerate these README captures.
