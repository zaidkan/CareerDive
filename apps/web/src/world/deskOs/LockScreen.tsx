import { useEffect, useRef, useState } from "react";
import { COMPANY } from "../company.js";
import { DESK_LOGIN } from "../deskLogin.js";

export function LockScreen({
  onLoginSuccess,
}: {
  onLoginSuccess: () => void;
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
      <div className="desk-os-lock-brand" aria-hidden="true">
        <span className="desk-os-lock-brand-mark">V</span>
        <span>{COMPANY.name}</span>
      </div>
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
        <div className="desk-os-lock-avatar" aria-hidden="true">
          DA
        </div>
        <h2 id="desk-os-login-title">
          <span className="visually-hidden">Sign in as </span>
          Day One Analyst
        </h2>
        <p className="desk-os-lock-account">{COMPANY.name} work account</p>
        <form
          className="desk-os-login-form"
          aria-labelledby="desk-os-login-title"
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
          {error ? (
            <p className="desk-os-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="desk-os-lock-actions">
            <button
              className="desk-os-primary"
              disabled={signingIn}
              type="submit"
            >
              {signingIn ? "Signing in…" : "Login"}
            </button>
          </div>
        </form>
        <p className="desk-os-hint">
          Credentials on the yellow note: <code>{DESK_LOGIN.username}</code> /{" "}
          <code>{DESK_LOGIN.password}</code>
        </p>
      </div>
      <div className="desk-os-lock-tray" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M2.5 8.5a14.5 14.5 0 0 1 19 0M5.8 12a9.5 9.5 0 0 1 12.4 0M9.2 15.5a4.5 4.5 0 0 1 5.6 0" />
          <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
        </svg>
        <svg
          viewBox="0 0 26 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        >
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M24 10v4M5 9h13v6H5z" fill="currentColor" stroke="none" />
        </svg>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 6.5V12l3.5 2" />
        </svg>
        <span>08:42</span>
      </div>
    </div>
  );
}
