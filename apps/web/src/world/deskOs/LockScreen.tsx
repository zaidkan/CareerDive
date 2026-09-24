import { useEffect, useRef, useState } from "react";
import { COMPANY } from "../company.js";
import { DESK_LOGIN } from "../deskLogin.js";
import { usePrefersReducedMotion } from "./os/reducedMotion.js";
import { WorkstationBoot } from "./login/WorkstationBoot.js";
import "./login/login.css";

/** State B — managed initialization atmosphere. */
const BOOT_HOLD_MS = 560;
const BOOT_FADE_MS = 200;
/** Authentication feedback before the unlock transition. */
const AUTH_MS = 260;
/** State F — surface resolves into the desktop. */
const UNLOCK_FADE_MS = 180;

type Stage = "lock" | "verifying" | "unlocking";

function formatClock(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Managed workstation lock + sign-in surface. Owns no session or evidence
 * state: it authenticates against the existing `DESK_LOGIN` credentials and
 * reports success exactly once through `onLoginSuccess`.
 */
export function LockScreen({
  onLoginSuccess,
}: {
  onLoginSuccess: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const [booting, setBooting] = useState(!reduced);
  const [bootClosing, setBootClosing] = useState(false);
  const [stage, setStage] = useState<Stage>("lock");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string>();
  const [clock] = useState(() => formatClock(new Date()));
  const userRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const busyRef = useRef(false);
  const firedRef = useRef(false);

  // Short initialization atmosphere, then the lock surface is at rest.
  // The sign-in form is mounted beneath from the start — atmosphere, never
  // a loading obstacle.
  useEffect(() => {
    if (!booting) return;
    const closing = window.setTimeout(() => {
      setBootClosing(true);
    }, BOOT_HOLD_MS);
    const done = window.setTimeout(() => {
      setBooting(false);
    }, BOOT_HOLD_MS + BOOT_FADE_MS);
    return () => {
      window.clearTimeout(closing);
      window.clearTimeout(done);
    };
  }, [booting]);

  // Keyboard-first: focus the username field once the surface is at rest —
  // but never steal focus from someone who already started typing.
  useEffect(() => {
    if (booting) return;
    if (document.activeElement !== document.body) return;
    userRef.current?.focus();
  }, [booting]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const busy = stage !== "lock";

  return (
    <div
      aria-labelledby="desk-os-login-title"
      className="desk-os-lock login-surface"
      data-stage={stage}
      data-testid="login-surface"
    >
      <header className="login-identity">
        <span aria-hidden="true" className="login-mark">
          V
        </span>
        <span className="login-identity-copy">
          <strong>{COMPANY.fullName}</strong>
          <small>{COMPANY.floor}</small>
        </span>
        <p className="login-clock">{clock}</p>
      </header>
      <div className="login-content">
        <section
          aria-labelledby="desk-os-login-title"
          className="desk-os-lock-card login-panel"
        >
          <div className="desk-os-lock-status">
            <span>SOC-07</span>
            <span>Locked</span>
          </div>
          <p className="eyebrow">Managed workstation</p>
          <h2 id="desk-os-login-title">Sign in to Verdaly</h2>
          <p className="desk-os-hint">
            Credentials are on the yellow note:{" "}
            <code>{DESK_LOGIN.username}</code> /{" "}
            <code>{DESK_LOGIN.password}</code>
          </p>
          <form
            className="desk-os-login-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (busyRef.current) return;
              if (
                user.trim() === DESK_LOGIN.username &&
                pass === DESK_LOGIN.password
              ) {
                busyRef.current = true;
                setError(undefined);
                setStage("verifying");
                timerRef.current = window.setTimeout(() => {
                  if (firedRef.current) return;
                  setStage("unlocking");
                  if (reduced) {
                    firedRef.current = true;
                    onLoginSuccess();
                    return;
                  }
                  timerRef.current = window.setTimeout(() => {
                    if (firedRef.current) return;
                    firedRef.current = true;
                    onLoginSuccess();
                  }, UNLOCK_FADE_MS);
                }, AUTH_MS);
              } else {
                setError("Incorrect username or password.");
                setPass("");
                passRef.current?.focus();
              }
            }}
          >
            <label>
              Username
              <input
                aria-describedby={error ? "desk-os-login-error" : undefined}
                aria-invalid={error ? true : undefined}
                autoComplete="username"
                name="username"
                onChange={(e) => {
                  setUser(e.target.value);
                }}
                ref={userRef}
                type="text"
                value={user}
              />
            </label>
            <label>
              Password
              <input
                aria-describedby={error ? "desk-os-login-error" : undefined}
                aria-invalid={error ? true : undefined}
                autoComplete="current-password"
                name="password"
                onChange={(e) => {
                  setPass(e.target.value);
                }}
                ref={passRef}
                type="password"
                value={pass}
              />
            </label>
            {error ? (
              <p className="desk-os-error" id="desk-os-login-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="desk-os-lock-actions">
              <button className="desk-os-primary" disabled={busy} type="submit">
                {busy ? "Signing in…" : "Login"}
              </button>
            </div>
          </form>
        </section>
        <aside className="desk-os-bezel-note" data-testid="login-post-it">
          <p className="desk-os-bezel-note-title">login</p>
          <p>
            <code>{DESK_LOGIN.username}</code>
          </p>
          <p>
            <code>{DESK_LOGIN.password}</code>
          </p>
        </aside>
      </div>
      {booting ? <WorkstationBoot closing={bootClosing} /> : null}
    </div>
  );
}
