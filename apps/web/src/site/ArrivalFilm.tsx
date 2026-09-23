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
 * Arrival film in two shapes:
 * - teaser (landing): no player. Single link card into /start.
 * - required (start gate): cinematic player that freezes at the
 *   tower doors, then DoorHud button animates onto the doors (center)
 *   and continues directly to the sim. No intermediate briefing page.
 *   Reduced-motion gets stills + immediate DoorHud, no video bytes.
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
        <p className="eyebrow">Arrival film · Verdaly Technologies</p>
        <h2 id="arrival-film">Short preview film before your first day</h2>
        <p className="lede">
          Watch the film so you can continue to the simulator itself. Player
          lives only on the start path, ending frozen at the doors.
        </p>
        <div className="hero-ctas">
          <button
            type="button"
            className="start-shift"
            onClick={() => {
              navigate("/start");
            }}
          >
            Watch arrival film
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
                alt="Arrival film poster: Verdaly tower sign above glowing entrance doors"
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
                  <p>
                    Film file lands at launch. Read the full beat transcript below.
                  </p>
                  <track
                    kind="captions"
                    srcLang="en"
                    label="English"
                    src="/arrival-film.vtt"
                  />
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
                <p
                  role="status"
                  aria-live="polite"
                  className="film-unavailable-note"
                >
                  Film unavailable — continue with the poster, stills and transcript
                  below.
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
          <p className="mode-note film-cinema-note">
            No skip — finish the film to unlock the simulator.
          </p>
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
        Reduced-motion alternative: the still beats below with no flashing
        cuts. Flashes stay slower than 3 per second when the film ships.
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
