import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../world/deskOs/os/reducedMotion.js";
import { useSimulationMuted } from "../world/dialogue/audio.js";
import "./ArrivalFilm.css";

const DISSOLVE_MS = 300;
const POSTER = "/verdaly-tower-doors.svg";

/** Removable presentation layer. The caller owns the live scene and fullscreen
 * target; completing this layer never creates a session or changes simulation state. */
export function ArrivalFilm({
  sceneReady,
  onComplete,
}: {
  sceneReady: boolean;
  onComplete: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const soundMuted = useSimulationMuted();
  const [phase, setPhase] = useState<
    "playing" | "blocked" | "waiting" | "fading"
  >(() => (reducedMotion ? "waiting" : "playing"));
  const currentPhase = useRef(phase);
  currentPhase.current = phase;
  const [mediaFailed, setMediaFailed] = useState(false);
  const [heldForScene, setHeldForScene] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const alive = useRef(false);
  const completed = useRef(false);
  const focusControl = useCallback((node: HTMLButtonElement | null) => {
    node?.focus();
  }, []);
  const finishFilm = useCallback(() => {
    setPhase("waiting");
  }, []);

  useEffect(() => {
    let currentAttempt = true;
    alive.current = true;
    const isCurrent = () => currentAttempt && currentPhase.current === "playing";
    const video = videoRef.current;
    if (!reducedMotion && video) {
      void video.play().catch(async () => {
        if (!isCurrent()) return;
        // Room entry is a gesture, but some browsers lose activation before
        // React mounts the video. Retry silently without extending the gate.
        if (!video.muted) {
          video.muted = true;
          try {
            await video.play();
            return;
          } catch { /* Existing explicit-entry fallback still applies. */ }
        }
        if (isCurrent())
          setPhase((current) => (current === "playing" ? "blocked" : current));
      });
    }
    return () => {
      currentAttempt = false;
      alive.current = false;
      video?.pause();
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) finishFilm();
  }, [reducedMotion, finishFilm]);

  useEffect(() => {
    if (phase === "waiting") dialogRef.current?.focus();
    if (phase === "waiting" && !sceneReady) setHeldForScene(true);
  }, [phase, sceneReady]);

  useEffect(() => {
    if (phase !== "playing") videoRef.current?.pause();
    if (phase !== "playing") return;
    // A stalled download/decoder must not become an endless movie gate.
    const timer = window.setTimeout(finishFilm, 30_000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [phase, finishFilm]);

  useEffect(() => {
    if (phase !== "waiting" || !sceneReady) return;
    if (reducedMotion) {
      if (!completed.current) {
        completed.current = true;
        onComplete();
      }
    } else setPhase("fading");
  }, [phase, sceneReady, reducedMotion, onComplete]);

  useEffect(() => {
    if (phase !== "fading") return;
    const timer = window.setTimeout(
      () => {
        if (!completed.current) {
          completed.current = true;
          onComplete();
        }
      },
      reducedMotion ? 0 : DISSOLVE_MS,
    );
    return () => {
      window.clearTimeout(timer);
    };
  }, [phase, reducedMotion, onComplete]);

  function retryPlayback() {
    const video = videoRef.current;
    if (!video) {
      finishFilm();
      return;
    }
    setPhase("playing");
    // A second refusal takes the user straight to the live scene; no retry loop.
    void video.play().catch(() => {
      if (alive.current) finishFilm();
    });
  }

  return (
    <div
      ref={dialogRef}
      className="arrival-handoff"
      role="dialog"
      aria-modal="true"
      aria-label="Arrival at Verdaly"
      data-phase={phase}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        event.preventDefault();
        (
          event.currentTarget.querySelector<HTMLButtonElement>("button") ??
          event.currentTarget
        ).focus();
      }}
    >
      {phase === "playing" ? (
        <p className="arrival-handoff-notice" aria-live="polite">
          Switching to fullscreen… Press Esc to exit.
        </p>
      ) : null}
      {!reducedMotion && !mediaFailed ? (
        <video
          ref={videoRef}
          className="arrival-handoff-video"
          src="/arrival-film.mp4"
          poster={POSTER}
          autoPlay
          muted={soundMuted}
          playsInline
          preload="auto"
          aria-hidden="true"
          onEnded={finishFilm}
          onError={() => {
            setMediaFailed(true);
            finishFilm();
          }}
        />
      ) : null}
      {phase === "blocked" ? (
        <>
          <img
            className="arrival-handoff-poster"
            src={POSTER}
            alt="Verdaly arrival film poster"
          />
          <button
            ref={focusControl}
            className="arrival-handoff-enter start-shift"
            type="button"
            onClick={retryPlayback}
          >
            Enter Security Operations
          </button>
        </>
      ) : phase === "playing" ? (
        <button
          ref={focusControl}
          className="arrival-handoff-skip guidance-secondary"
          type="button"
          onClick={finishFilm}
        >
          Skip film
        </button>
      ) : null}
      {heldForScene || reducedMotion || mediaFailed ? (
        <div className="arrival-handoff-veil">
          <p role="status">Entering Security Operations…</p>
        </div>
      ) : null}
    </div>
  );
}
