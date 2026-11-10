# Hyperframes Composition Brief: Career Expo

Create the 22-second, 1920 × 1080, 30 fps landscape launch film described in brag-plan.md. Tone: polished; ordinary work becomes an evidence-led investigation.

Source root: /Users/zaid/orca/Career-Expo. Primary sources: apps/web/src/site/pages/LandingPage.tsx, apps/web/src/foundation.css, apps/web/src/site/productMedia.ts, apps/web/fixtures/product-media.tsx, README.md, and audited screenshots in apps/web/public/careers/media.

Use real screenshots a-11 (SOC), a-01 (alert), a-03 (inventory), a-04 (account history), and a-06 (ticket). Cropping and spotlight overlays may improve readability; preserve what the underlying records say. Synthetic scenario names are fictional product content. No real account data is included.

Copy that appears verbatim: “Know the work before you choose the career.”; “Begin your first day”; “Check the sign-in”; “Compare the records”; “Leave a clear handoff”; “Start your first day”. Product name: Career Expo. Only Cybersecurity Analyst is presented as playable.

Visual identity: #0C0F14 canvas, #F5F7FA primary type, #B9C2CF supporting type, #8CB7FF accent, Plus Jakarta Sans display/body, IBM Plex Mono labels. Use local fonts and GSAP. Composition uses one registered seek-safe paused timeline and native data-start/data-duration clip timing; runtime owns audio/media playback.

Scene summary: hook 0–3.70; workplace 3.70–6.86; real work 6.86–18.44 with alert, inventory and ticket sub-beats; brand/CTA 18.44–22.00. Readable headlines at video scale, rapid entrances followed by stable holds. Controlled movement instead of generic background filler.

Music: assets/music/happy-beats-business-moves-vol-11-by-ende-dot-app.mp3, gain 0.28 with native volume automation, fade-in 0–0.5s and fade-out 20.4–22s. Cue metadata copied into assets/music/cues/. Use 3.70s and 18.44s as major musical landing moments. Ticket labels land at 14.76, 15.81 and 16.86s then remain visible.

SFX: low-HF-risk impactSoft_medium_001 for office reveal, quiet interface/click_003 for simulated CTA click, impactSoft_medium_004 for ticket reveal. Native audio tracks with unique ids and separate overlapping track indices. No narration.

Audio-reactive extraction: use hyperframes-creative/scripts/extract-audio-data.py; sample its precomputed bands synchronously through the timeline to vary a narrow accent border. If extraction fails, document it here and preserve planned audio.

Keep all creation local. Run hyperframes check with contrast and layout audits enabled, inspect representative frames, and open the final Studio timeline preview. Render locally to ../brag.mp4 after the final review requirement is satisfied. Choose the strongest settled product/brand frame for ../brag.jpg and bake that image as frame 0. Write the one canonical caption in ../share-copy.txt.

## Verification
Hyperframes check: zero errors in lint/runtime/layout/motion/contrast. Eight nonblocking lint advisories concern the deliberately monolithic six-beat timeline and repeated workplace source image; each image has a distinct id and pixel snapshots show correct content. Motion sidecar proves hook arrival, ordered ticket labels and final CTA bounds. Precomputed music-band animation is present. Final Studio URL: http://localhost:3002/#project/composition. Poster candidate: hook at 1.8s, with headline settled and actual workplace visible.
