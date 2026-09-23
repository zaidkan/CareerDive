import { useState } from "react";
import { navigate } from "./routes.js";
import { DoorHud } from "./DoorHud.js";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Arrival film — calm studio entry, not a test.
 * Required gate: video freezes at tower doors, DoorHud animates
 * onto the doors (center) and goes straight to the sim. No extra page.
 */
export function ArrivalFilm({
  teaser = false,
  required = false,
  onSeen,
}: {
  teaser?: boolean;
  required?: boolean;
  onSeen?: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [reducedMotion] = useState(prefersReducedMotion);
  const [doorHold, setDoorHold] = useState(false);
  const [mediaError, setMediaError] = useState(false);

  function triggerDoorHold() {
    setDoorHold(true);
  }

  function handleMediaError() {
    if (!mediaError) setMediaError(true);
    setDoorHold(true);
  }

  if (teaser) {
    return (
      <section className="film-gate" aria-labelledby="arrival-film">
        <p className="eyebrow">A quick hello from Verdaly</p>
        <h2 id="arrival-film">Before you start — a short film</h2>
        <p className="lede">
          Just a minute at the tower doors. It’s the same hello you’d get on day one.
        </p>
        <div className="hero-ctas">
          <button
            type="button"
            className="start-shift"
            onClick={() => {
              navigate("/start");
            }}
          >
            Watch the film
          </button>
        </div>
      </section>
    );
  }

  if (required) {
    return (
      <section className="film-gate film-cinema" aria-labelledby="arrival-film-gate">
        <p className="eyebrow">Arrival film · Verdaly Technologies</p>
        <h2 id="arrival-film-gate">Short preview film before your first day</h2>

        <div className="film-hold-wrap film-hold-wrap-cinema">
          {reducedMotion ? (
            <>
              <img
                src="/verdaly-tower-doors.svg"
                alt="Verdaly tower entrance — doors hold"
                width={1600}
                height={900}
                loading="eager"
                style={{ width: "100%", height: "auto", display: "block", borderRadius: 8 }}
              />
              <DoorHud reducedMotion onStart={() => onSeen?.()} />
            </>
          ) : !playing ? (
            <>
              <img
                src="/verdaly-tower-doors.svg"
                alt="Arrival film poster: Verdaly tower doors"
                width={1600}
                height={900}
                loading="eager"
                style={{ width: "100%", height: "auto", display: "block", borderRadius: 8 }}
              />
              <button
                type="button"
                className="film-play-overlay"
                onClick={() => {
                  setPlaying(true);
                }}
                aria-label="Play arrival film"
              >
                <span className="film-play-icon" aria-hidden="true">▶</span>
                Play arrival film
              </button>
            </>
          ) : (
            <>
              {!mediaError ? (
                <video
                  controls={!doorHold}
                  autoPlay
                  muted
                  preload="metadata"
                  poster="/verdaly-tower-doors.svg"
                  aria-label="Arrival at Verdaly: from bedroom to tower doors"
                  playsInline
                  onEnded={triggerDoorHold}
                  onError={handleMediaError}
                  onTimeUpdate={(e) => {
                    const v = e.currentTarget;
                    if (
                      !doorHold &&
                      Number.isFinite(v.duration) &&
                      v.duration - v.currentTime < 0.5
                    ) {
                      v.pause();
                      triggerDoorHold();
                    }
                  }}
                >
                  <source src="/arrival-film.mp4" type="video/mp4" />
                  <p>Film file lands at launch. Read the transcript below.</p>
                  <track kind="captions" srcLang="en" label="English" src="/arrival-film.vtt" />
                </video>
              ) : (
                <img
                  src="/verdaly-tower-doors.svg"
                  alt="Arrival film unavailable — Verdaly tower doors poster"
                  width={1600}
                  height={900}
                  loading="eager"
                  style={{ width: "100%", height: "auto", display: "block", borderRadius: 8 }}
                />
              )}
              {mediaError ? (
                <p role="status" aria-live="polite" className="film-unavailable-note">
                  Film unavailable for now — no worries, the poster and transcript below tell the
                  same story. You can still step through the doors.
                </p>
              ) : null}
              {doorHold ? (
                <DoorHud
                  reducedMotion={false}
                  onStart={() => {
                    onSeen?.();
                  }}
                />
              ) : null}
            </>
          )}
        </div>

        {!doorHold && !reducedMotion && !playing ? (
          <p className="mode-note film-cinema-note">No skip — finish the film to unlock the simulator.</p>
        ) : null}

        <details className="film-transcript">
          <summary>Transcript and stills</summary>
          <ArrivalTranscript />
          {reducedMotion ? null : <StillsGrid />}
        </details>
      </section>
    );
  }

  return null;
}

function ArrivalTranscript() {
  return (
    <>
      <ol>
        <li>Bedroom. Laptop open. Notification: accepted to Verdaly.</li>
        <li>Family dinner. Confetti. Quick flash, warm, quiet.</li>
        <li>Apartment exit. Cab door. City sound rises.</li>
        <li>Cab exit. Bustling street: briefcases, phone calls, traffic.</li>
        <li>Look up. VERDALY tower sign and logo above the entrance.</li>
        <li>Walk to the grand doors. Breath in. Doors hold.</li>
        <li>Button where hands reach: Start your first day.</li>
      </ol>
      <p>
        If you prefer not to watch, the stills below cover the same beats — no fast cuts.
      </p>
    </>
  );
}

function StillsGrid() {
  return (
    <div className="stills-grid" aria-label="Reduced-motion stills alternative">
      <figure>
        <figcaption>1 · Acceptance note on laptop</figcaption>
      </figure>
      <figure>
        <figcaption>2 · Family dinner confetti</figcaption>
      </figure>
      <figure>
        <figcaption>3 · Cab into the city</figcaption>
      </figure>
      <figure>
        <figcaption>4 · Street bustle, both directions</figcaption>
      </figure>
      <figure>
        <figcaption>5 · Tower lookup: VERDALY</figcaption>
      </figure>
      <figure>
        <figcaption>6 · Doors, breath in, enter</figcaption>
      </figure>
    </div>
  );
}
