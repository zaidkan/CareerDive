# Brag Plan: Career Expo

## Planning rubric
1. Career Expo lets people explore a career by doing ordinary work in a simulated workplace; Cybersecurity Analyst is currently playable.
2. Strongest claim: “Know the work before you choose the career.”
3. Visual hook: huge brand typography alongside the actual Verdaly security operations floor.
4. Show the real 3D workplace, A-1042 alert, device inventory, and saved investigation ticket.
5. Minimum satisfying film: 22 seconds, landscape, 1920 × 1080, 30 fps.
6. Tone: polished. Direction: a first day that becomes a real investigation; patient holds, crisp cuts, purposeful motion.
7. Warm restrained music with three quiet, motion-matched UI/reveal accents. No narration was requested.
8. Caption: “Built Career Expo: know the work before you choose the career. Step into a simulated cybersecurity shift, investigate an unfamiliar login, and leave a clear handoff.”
9. Flow: begin your first day → investigate A-1042 using evidence → document uncertainty and escalate.

## The angle
Let the audience see the work behind a job title. One case travels from an unfamiliar login to a defensible ticket, framed by the project's own career-exploration claim. Feature only the playable cybersecurity career.

## Visual identity
- Canvas: #0C0F14; panels: #12171E and #181F28.
- Primary text: #F5F7FA; secondary: #B9C2CF.
- Accent: #8CB7FF; success: #72D6A3.
- Display/body: Plus Jakarta Sans; metadata: IBM Plex Mono. Local font assets.
- Real audited media from apps/web/public/careers/media; no fabricated app panels.
- Captures contain fictional coworkers, example.com identities and documentation-range IP addresses belonging to the project's synthetic scenario. No real personal data or credentials used.

## Storyboard

### Scene 1 — Know the work — 3.70s (0–3.70)
Oversized verbatim headline, “Know the work before you choose the career.” Left-aligned, three readable lines. Actual SOC workplace fills the right side, slowly moving closer. Career Expo brand and a small “Simulated workplace” label ground the frame.
Sequential/interaction: headline enters as three line groups over 0.5s, then holds until transition.
Audio intent: warm opening, restrained weight.
Audio-coupled idea: subtle music-driven border presence; no typed narration.
Transition: confident hard cut on 3.70s music cue.

### Scene 2 — First day — 3.16s (3.70–6.86)
Actual SOC office fills the frame, with a gentle move toward the workstation. Copy: “Begin your first day”; “Cybersecurity Analyst · Playable now.”
Sequential/interaction: small simulated cursor settles on the CTA, brief click pulse before next scene.
Audio intent: one soft transition hit and a quiet UI click at the action.
Audio-coupled idea: reveal on 3.70s, click at 6.34s.
Transition: move from workplace into its work at 6.86s.

### Scene 3 — One login, a trail of evidence — 11.58s (6.86–18.44)
Three distinct work beats, all using audited current product screenshots:
- 6.86–11.06: A-1042 alert. Headline: “Check the sign-in.” Extracted source facts: “6 failed identity checks → 1 successful sign-in.” Crop the real alert detail for readable evidence.
- 11.06–14.76: device inventory. Headline: “Compare the records.” Copy: “unknown-laptop-17”; “Enrolled: no.” Show the actual inventory result and the actual account baseline as the next evidence source; preserve the limitation that a location estimate does not establish identity.
- 14.76–18.44: actual investigation ticket. Headline: “Leave a clear handoff.” Focus on the saved note's three real sections: Verified evidence, Uncertainty, Next step. Reveal three editorial labels in order at 14.76, 15.81, 16.86; full set holds through the cut. This is a demonstration of the documented path, not a claim that every player receives an identical result.
Sequential/interaction: cursor selects the alert; crops follow the record being examined; evidence labels arrive on every other beat with adequate hold.
Audio intent: soft click and one warm ticket reveal cue; no alarm sound implying a real breach.
Transition: clean cut to brand outro at 18.44s.

### Scene 4 — Start your first day — 3.56s (18.44–22.00)
Career Expo wordmark anchors the left. Final CTA: “Start your first day.” Right-side real workplace view returns, now framed as a window. Supporting line: “Cybersecurity Analyst · Playable now.” Hold the finished frame through the end; do not fade to black.
Sequential/interaction: brand and CTA arrive quickly, then readable hold for more than 2.5s.
Audio intent: warm landing with final music fade across 20.4–22.0s.
Transition: none; final pose remains.

## Audio direction and music cue guidance
Music: happy-beats-business-moves-vol-11-by-ende-dot-app.mp3, warm, 114.84 estimated BPM; volume 0.28, short fade-in, fade-out over final 1.6s.
Cue source: bundled matching music-cues.json and music-cues.md.
Major cue locks: 3.70s office reveal, 14.76s ticket reveal (beat grid), 18.44s outro.
Sequential ticket labels: 14.76, 15.81, 16.86, then full-set hold. Readability overrides cue timing.
Audio-reactive treatment: subtle accent border or workplace light presence from pre-extracted music bands. No waveform, equalizer or particles.
SFX: three restrained low-HF-risk cues matching reveal/click/ticket motion; exact files selected during composition.

## Source grounding
Headline, career availability, CTA and workflow lines: LandingPage.tsx and README.md.
Alert facts: LandingPage.tsx SHIFT_WORK and a-01 screenshot.
Inventory result: a-03 screenshot and README.md.
Ticket sections and limitation: a-06 screenshot; README.md investigation flow.
Authenticity and provenance: productMedia.ts and public/careers/media/provenance.json.

## Delivery
brag.mp4, a deliberately chosen brag.jpg poster baked into frame 0, editable local Hyperframes composition, and share-copy.txt. Preview and checks precede final render.
