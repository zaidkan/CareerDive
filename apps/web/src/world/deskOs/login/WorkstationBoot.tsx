import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "../os/reducedMotion.js";

/** State A — monitor wake: the display fades up into the lock curtain. */
export const WAKE_FADE_MS = 240;
/** Same-session return: a light veil so the preserved desktop feels woken. */
export const VEIL_FADE_MS = 200;

/**
 * Quiet display wake for the first workstation sign-in. Purely a monitor
 * coming up — no text, no progress, no fake boot process. Input passes
 * straight through to the surface beneath, and reduced-motion users never
 * see it at all.
 */
export function MonitorWake() {
  const reduced = usePrefersReducedMotion();
  const [done, setDone] = useState(reduced);

  useEffect(() => {
    if (done) return;
    const timer = window.setTimeout(() => {
      setDone(true);
    }, WAKE_FADE_MS + 80);
    return () => {
      window.clearTimeout(timer);
    };
  }, [done]);

  if (done) return null;
  return (
    <div
      aria-hidden="true"
      className="login-wake"
      data-testid="login-wake"
    />
  );
}

/**
 * Same-session resume veil: the workstation wakes over the preserved
 * desktop instead of asking for credentials again. Non-blocking, decorative,
 * gone within VEIL_FADE_MS.
 */
export function ResumeVeil() {
  const reduced = usePrefersReducedMotion();
  const [done, setDone] = useState(reduced);

  useEffect(() => {
    if (done) return;
    const timer = window.setTimeout(() => {
      setDone(true);
    }, VEIL_FADE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [done]);

  if (done) return null;
  return (
    <div
      aria-hidden="true"
      className="login-veil"
      data-testid="login-veil"
    />
  );
}
