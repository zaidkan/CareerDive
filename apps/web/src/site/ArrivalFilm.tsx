import { useRef, useState } from "react";
import { DoorHud } from "./DoorHud.js";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** ponytail: 6 honest stills from the actual 6.4s film; closest representative frames, no fabrication */
const STILLS = [
  {
    id: "01-bedroom-laptop",
    alt: "Still 1 — Bedroom laptop with Verdaly acceptance notification, from the arrival film",
    caption: "1 · Bedroom · acceptance note",
  },
  {
    id: "02-cab-exit",
    alt: "Still 2 — Apartment doorway and cab into the city, from the arrival film",
    caption: "2 · City approach · cab door",
  },
  {
    id: "03-street-bustle",
    alt: "Still 3 — Bustling street with briefcases and traffic, from the arrival film",
    caption: "3 · Street · both directions",
  },
  {
    id: "04-city-approach",
    alt: "Still 4 — City approach toward Verdaly tower, from the arrival film",
    caption: "4 · Approach · tower ahead",
  },
  {
    id: "05-look-up-tower",
    alt: "Still 5 — Look up at the VERDALY tower sign, from the arrival film",
    caption: "5 · Tower lookup · VERDALY",
  },
  {
    id: "06-doors-hold",
    alt: "Still 6 — Grand doors holding open, breath in before entering",
    caption: "6 · Doors hold · enter",
  },
] as const;

function StillFigure({ id, alt, caption }: (typeof STILLS)[number]) {
  return (
    <figure>
      <img
        src={`/arrival-stills/${id}-640.webp`}
        width={1280}
        height={720}
        loading="lazy"
        decoding="async"
        srcSet={`/arrival-stills/${id}-640.webp 640w, /arrival-stills/${id}-1280.webp 1280w`}
        sizes="(max-width: 640px) 640px, 1280px"
        alt={alt}
        style={{ width: "100%", height: "auto", display: "block", borderRadius: 8 }}
      />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function ArrivalTranscript() {
  return (
    <>
      <ol>
        <li>Bedroom. Laptop open. Notification: accepted to Verdaly.</li>
        <li>Apartment exit. Cab door. City sound rises.</li>
        <li>Bustling street — briefcases, phone calls, traffic.</li>
        <li>Walk toward the tower. VERDALY sign comes into view.</li>
        <li>Look up at the sign. Doors ahead.</li>
        <li>Grand doors hold. Breath in. Start your first day.</li>
      </ol>
      <p className="stills-note">
        Frames above are honest exports from the approved short film (about 6 seconds). If your device
        prefers reduced motion, they are the same film without the cut.
      </p>
    </>
  );
}

type Props = {
  onSeen?: () => void;
  // compat: old callers may still pass required/teaser; treat as noop
  required?: boolean;
  teaser?: boolean;
};

/**
 * Arrival — presentation only. No session, no persistence, no auth.
 * Preserves existing heading/play copy so site-entry tests stay green;
 * lede notes the short duration honestly. Poster is static (no 24s drift).
 */
export function ArrivalFilm({ onSeen }: Props) {
  const [playing, setPlaying] = useState(false);
  const [doorHold, setDoorHold] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const reducedMotion = prefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  if (reducedMotion) {
    return (
      <section className="film-gate film-cinema threshold-stage" aria-labelledby="arrival-film-gate">
        <p className="eyebrow">Arrival film · Verdaly Technologies</p>
        <h1 id="arrival-film-gate">Short preview film before your first day</h1>
        <p className="lede">
          About six seconds at the tower — the same hello you get on day one.{" "}
          <span className="stills-note">(Short film; static poster in reduced motion.)</span>
        </p>
        <div className="film-hold-wrap film-hold-wrap-cinema threshold-media">
          <img
            src="/verdaly-tower-doors.svg"
            alt="Verdaly tower entrance — doors hold"
            width={1600}
            height={900}
            loading="eager"
            style={{ width: "100%", height: "auto", display: "block", borderRadius: 8 }}
          />
          <DoorHud
            reducedMotion
            onStart={() => {
              onSeen?.();
            }}
          />
        </div>
        <details className="film-transcript">
          <summary>Transcript and stills</summary>
          <ArrivalTranscript />
          <div className="stills-grid" aria-label="Stills from the short arrival film">
            {STILLS.map((s) => (
              <StillFigure key={s.id} {...s} />
            ))}
          </div>
        </details>
      </section>
    );
  }

  return (
    <section className="film-gate film-cinema threshold-stage" aria-labelledby="arrival-film-gate">
      <p className="eyebrow">Arrival film · Verdaly Technologies</p>
      <h1 id="arrival-film-gate">Short preview film before your first day</h1>
      <p className="lede">About six seconds at the tower — the same hello you get on day one.</p>

      <div className="film-hold-wrap film-hold-wrap-cinema threshold-media">
        {!playing ? (
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
                ref={videoRef}
                controls={!doorHold}
                autoPlay
                muted
                preload="metadata"
                poster="/verdaly-tower-doors.svg"
                aria-label="Arrival at Verdaly: from bedroom to tower doors"
                playsInline
                onEnded={() => {
                  setDoorHold(true);
                }}
                onError={() => {
                  setMediaError(true);
                  setDoorHold(true);
                }}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (!doorHold && Number.isFinite(v.duration) && v.duration - v.currentTime < 0.5) {
                    v.pause();
                    setDoorHold(true);
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
                Film unavailable — the poster and stills below tell the same story. You can still step
                through the doors.
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

      <details className="film-transcript">
        <summary>Transcript and stills</summary>
        <ArrivalTranscript />
        <div className="stills-grid" aria-label="Stills from the short arrival film">
          {STILLS.map((s) => (
            <StillFigure key={s.id} {...s} />
          ))}
        </div>
      </details>
    </section>
  );
}
