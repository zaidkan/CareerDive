# Cybersecurity work captures

Captured from Career Expo at base `8af4a80200ce1479943e9f6c84a79ba7dd8f0b48`.

- Desktop: existing `DeskOs`, `BrowserApp`, and `OpsConsole`, with A-1042 opened.
- Narrow crop: existing `AlertTool`, showing that same observed alert artifact.
- Both existing themes; WebP output, no recreated product UI or decorative imagery.
- Source: approved `content/packs/cybersecurity-analyst/pack.yaml`.
- Capture state: seed 7, canonical initial world; `read_handoff`,
  `acknowledge_handoff`, `review_alert`, then `open_alert_record` for A-1042.
  Pending notifications were acknowledged through `respondToNotification` with
  `continue`. Screenshots were taken after the window entrance settled.

All account, device, network, and employee records are synthetic simulation
content. Screenshots are static previews, not interactive workstation controls.
The handoff and ticket excerpts alongside them quote the same approved pack.

## Current product media pipeline

The four `verdaly-alert-*.webp` files above were recovered from `c792e38`.
Their A-1042 record and component still exist in the current pack and app;
they show an older presentation style, so the public media registry uses the
new captures under `media/` instead. These historical files remain available
for comparison. No old page design was recovered.

Run from the repository root:

```bash
pnpm capture:product-media
# If another local app uses 5173:
MEDIA_CAPTURE_PORT=5178 pnpm capture:product-media
```

Requires Chromium installed for Playwright and `cwebp` on `PATH`. Pass one or
more scene IDs (`a-01` through `a-12`) for a focused recapture; run the full
command before commit to write complete `media/provenance.json`. The script
starts Vite on port 5173 (or `MEDIA_CAPTURE_PORT`), loads the approved `cybersecurity_analyst@1.0.0`
pack with a fixed loader date, creates seed 7 through the current core,
performs the recorded actions and queries, renders current React product
components in a development-only fixture, and saves WebP captures. It needs
no server, database, or production route. It fails if the port is occupied,
the pack state differs, or the browser reports an error.

`media/provenance.json` records every capture's pack hash, seed, fixture route,
exact state setup, theme, viewport, full-page crop, timestamp, and tools.
`apps/web/src/site/productMedia.ts` provides the typed public-site registry.
The fixture does not ship as a production Vite entry. No public page layout or
simulation runtime behavior changed.

Capture map: A-01 alert; A-02 sign-in timeline; A-03 device inventory; A-04
account history; A-05 VPN context; A-06 investigation ticket; A-07 Morgan
mid-shift status; A-08 handoff; A-09 scanner records; A-10 debrief; A-11 3D SOC; A-12
Desk OS. The ticket uses a bounded analyst sample note entered through the
canonical action, and the debrief is a partial-shift sample built by the
existing server debrief function; the registry marks both `representative`.
No task answer key, required option IDs, or consequence internals appear in
the registry or captures. A-12 mobile records current narrow-screen clipping;
verify suitability before placement.
