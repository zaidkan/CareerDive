import { useCallback, useEffect, useRef, useState } from "react";
import { COMPANY } from "../company.js";
import { DESK_LOGIN } from "../deskLogin.js";
import { usePrefersReducedMotion } from "./os/reducedMotion.js";
import { MonitorWake } from "./login/WorkstationBoot.js";
import "./login/login.css";

/** Authentication feedback before the unlock transition. */
const AUTH_MS = 220;
/** Reduced motion: a short static beat instead of staged transitions. */
const AUTH_MS_REDUCED = 150;
/** State F — surface resolves into the desktop. */
const UNLOCK_FADE_MS = 180;
/** How long the dismissed curtain lingers while lifting away. */
const CURTAIN_EXIT_MS = 200;

type Stage = "curtain" | "lock" | "verifying" | "unlocking";

function clockTimeOf(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateLineOf(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Managed workstation lock + sign-in surface ("a quiet, managed corporate
 * laptop waking up"). Owns no session or evidence state: it authenticates
 * against the existing `DESK_LOGIN` credentials and reports success exactly
 * once through `onLoginSuccess`.
 *
 * Flow: monitor wake → lock curtain (observation state; any key/click
 * dismisses) → sign-in reveal → short verify → unlock. Same-session returns
 * never reach this surface — the preserved desktop resumes directly.
 *
 * Credential discovery: exactly one visible source of truth — the Verdaly IT
 * provisioning slip. No duplicated hints anywhere in the UI.
 */
export function LockScreen({
  onLoginSuccess,
}: {
  onLoginSuccess: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const [stage, setStage] = useState<Stage>("curtain");
  const [curtainGone, setCurtainGone] = useState(false);
  const [user, setUser] = useState<string>(DESK_LOGIN.username);
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string>();
  const [now, setNow] = useState(() => new Date());
  const userRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);
  const slipRef = useRef<HTMLElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const curtainTimerRef = useRef<number | undefined>(undefined);
  const busyRef = useRef(false);
  const firedRef = useRef(false);

  // The clock is alive — a workstation shows the real time.
  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
      }
      if (curtainTimerRef.current !== undefined) {
        window.clearTimeout(curtainTimerRef.current);
      }
    };
  }, []);

  const dismissCurtain = useCallback(() => {
    if (stage !== "curtain") return;
    setStage("lock");
    if (reduced) {
      setCurtainGone(true);
      return;
    }
    curtainTimerRef.current = window.setTimeout(() => {
      setCurtainGone(true);
    }, CURTAIN_EXIT_MS);
  }, [stage, reduced]);

  // Lock curtain: any key or click advances to the sign-in reveal. Focus
  // transfers predictably into the password field (the account is known).
  useEffect(() => {
    if (stage !== "curtain") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (["Shift", "Control", "Alt", "Meta"].includes(event.key)) return;
      event.preventDefault();
      dismissCurtain();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [stage, dismissCurtain]);

  // Reveal is always user-initiated, so moving focus to the credential field
  // is safe and expected.
  useEffect(() => {
    if (stage !== "lock") return;
    passRef.current?.focus();
  }, [stage]);

  const busy = stage === "verifying" || stage === "unlocking";

  const fillFromSlip = (focusPassword: boolean) => {
    if (stage === "curtain") return;
    setUser(DESK_LOGIN.username);
    setPass(DESK_LOGIN.password);
    setError(undefined);
    if (focusPassword) passRef.current?.focus();
  };

  return (
    <div
      className="desk-os-lock login-surface"
      data-stage={stage}
      data-testid="login-surface"
      onClick={() => {
        dismissCurtain();
      }}
    >
      <header className="login-identity">
        <span aria-hidden="true" className="login-mark">
          V
        </span>
        <span className="login-identity-copy">
          <strong>{COMPANY.fullName}</strong>
          <small>{COMPANY.floor}</small>
        </span>
        <p className="login-chip">SOC-07 · Managed workstation</p>
      </header>

      <div className="login-stage">
        {stage === "curtain" || !curtainGone ? (
          <section
            aria-hidden={stage !== "curtain" ? true : undefined}
            className={`login-curtain${stage !== "curtain" ? " login-curtain-leaving" : ""}`}
            data-testid="login-curtain"
            inert={stage !== "curtain" ? true : undefined}
          >
            <div className="login-clock-block">
              <p className="login-clock-big" data-testid="login-clock">
                {clockTimeOf(now)}
              </p>
              <p className="login-date">{dateLineOf(now)}</p>
            </div>
          </section>
        ) : null}

        {stage !== "curtain" ? (
          <section
            aria-labelledby="desk-os-login-title"
            className="desk-os-lock-card login-panel"
          >
            <div className="desk-os-lock-status">
              <span>SOC-07</span>
              <span>Locked</span>
            </div>
            <h2 id="desk-os-login-title">Sign in to Verdaly</h2>
            <div className="login-account">
              <span aria-hidden="true" className="login-avatar">
                D
              </span>
              <span className="login-account-copy">
                <strong>Day 1 Analyst</strong>
                <small>{DESK_LOGIN.username}</small>
              </span>
            </div>
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
                  timerRef.current = window.setTimeout(
                    () => {
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
                    },
                    reduced ? AUTH_MS_REDUCED : AUTH_MS,
                  );
                } else {
                  setError("That username or password didn’t work.");
                  setPass("");
                  passRef.current?.focus();
                }
              }}
            >
              <div className="login-field">
                <label htmlFor="desk-os-login-user">Username</label>
                <input
                  aria-describedby={error ? "desk-os-login-error" : undefined}
                  aria-invalid={error ? true : undefined}
                  autoComplete="username"
                  id="desk-os-login-user"
                  name="username"
                  onChange={(e) => {
                    setUser(e.target.value);
                  }}
                  ref={userRef}
                  type="text"
                  value={user}
                />
              </div>
              <div className="login-field">
                <label htmlFor="desk-os-login-pass">Password</label>
                <div className="login-pass-row">
                  <input
                    aria-describedby={error ? "desk-os-login-error" : undefined}
                    aria-invalid={error ? true : undefined}
                    autoComplete="current-password"
                    id="desk-os-login-pass"
                    name="password"
                    onChange={(e) => {
                      setPass(e.target.value);
                    }}
                    ref={passRef}
                    type={showPass ? "text" : "password"}
                    value={pass}
                  />
                  <button
                    aria-label={showPass ? "Hide password" : "Show password"}
                    aria-pressed={showPass}
                    className="login-eye"
                    onClick={() => {
                      setShowPass((value) => !value);
                    }}
                    type="button"
                  >
                    <span aria-hidden="true">{showPass ? "🙈" : "👁"}</span>
                  </button>
                </div>
              </div>
              <div className="login-error-row">
                {error ? (
                  <p
                    className="desk-os-error"
                    id="desk-os-login-error"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
              <div className="desk-os-lock-actions login-actions">
                <button
                  aria-label={busy ? "Signing in…" : "Sign in"}
                  className="login-submit"
                  disabled={busy}
                  type="submit"
                >
                  {busy ? (
                    <span aria-hidden="true" className="login-spinner" />
                  ) : (
                    <span aria-hidden="true">→</span>
                  )}
                </button>
                <button
                  aria-controls="login-slip"
                  className="login-where"
                  onClick={() => {
                    slipRef.current?.focus();
                  }}
                  type="button"
                >
                  Where are my credentials?
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <aside
          aria-label="Verdaly IT provisioning slip"
          className="login-slip"
          data-testid="login-post-it"
          id="login-slip"
          onClick={() => {
            if (stage === "curtain") {
              dismissCurtain();
              return;
            }
            fillFromSlip(false);
          }}
          ref={slipRef}
          tabIndex={-1}
        >
          <p className="login-slip-head">
            <strong>Verdaly IT</strong>
            <span>Temporary access</span>
          </p>
          <dl className="login-slip-rows">
            <dt>Workstation</dt>
            <dd>SOC-07</dd>
            <dt>User</dt>
            <dd>{DESK_LOGIN.username}</dd>
            <dt>Password</dt>
            <dd>{DESK_LOGIN.password}</dd>
          </dl>
          <p className="login-slip-foot">
            Temporary access · provided by IT · Expires end of shift
          </p>
          {stage !== "curtain" ? (
            <button
              className="login-slip-use"
              onClick={() => {
                fillFromSlip(true);
              }}
              type="button"
            >
              Use these credentials
            </button>
          ) : null}
        </aside>
      </div>

      <div className="login-foot">
        {stage === "curtain" ? (
          <p className="login-dismiss-hint" data-testid="login-dismiss-hint">
            Press any key or click to sign in
          </p>
        ) : null}
        <div aria-hidden="true" className="login-affordances">
          <span title="Network · connected">◍</span>
          <span title="Accessibility">◎</span>
          <span title="Power · managed by IT">⏻</span>
        </div>
      </div>

      <MonitorWake />
    </div>
  );
}
