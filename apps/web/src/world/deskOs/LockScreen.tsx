import { useEffect, useRef, useState } from "react";
import { COMPANY } from "../company.js";
import { DESK_LOGIN } from "../deskLogin.js";

export function LockScreen({
  onLoginSuccess,
  onStand,
}: {
  onLoginSuccess: () => void;
  onStand: () => void;
}) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string>();
  const [signingIn, setSigningIn] = useState(false);
  const userRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    userRef.current?.focus();
    return () => {
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="desk-os-lock" aria-labelledby="desk-os-login-title">
      <aside className="desk-os-bezel-note" data-testid="login-post-it">
        <p className="desk-os-bezel-note-title">login</p>
        <p>
          <code>{DESK_LOGIN.username}</code>
        </p>
        <p>
          <code>{DESK_LOGIN.password}</code>
        </p>
      </aside>
      <div className="desk-os-lock-card">
        <div className="desk-os-lock-status">
          <span>SOC-07</span>
          <span>Locked</span>
        </div>
        <p className="eyebrow">{COMPANY.name} · workstation</p>
        <h2 id="desk-os-login-title">Sign in</h2>
        <p className="desk-os-hint">
          Credentials are on the yellow note:{" "}
          <code>{DESK_LOGIN.username}</code> /{" "}
          <code>{DESK_LOGIN.password}</code>
        </p>
        <form
          className="desk-os-login-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              user.trim() === DESK_LOGIN.username &&
              pass === DESK_LOGIN.password
            ) {
              setSigningIn(true);
              setError(undefined);
              timerRef.current = window.setTimeout(() => {
                onLoginSuccess();
              }, 280);
            } else {
              setError("Incorrect username or password.");
            }
          }}
        >
          <label>
            Username
            <input
              ref={userRef}
              autoComplete="username"
              name="username"
              onChange={(e) => {
                setUser(e.target.value);
              }}
              type="text"
              value={user}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              name="password"
              onChange={(e) => {
                setPass(e.target.value);
              }}
              type="password"
              value={pass}
            />
          </label>
          {error ? <p className="desk-os-error">{error}</p> : null}
          <div className="desk-os-lock-actions">
            <button className="desk-os-primary" disabled={signingIn} type="submit">
              {signingIn ? "Signing in…" : "Login"}
            </button>
            <button className="desk-os-ghost" onClick={onStand} type="button">
              Stand up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
