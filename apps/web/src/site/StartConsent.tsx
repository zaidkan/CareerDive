import { useId, type ReactNode } from "react";
import { SiteLink } from "./SiteLink.js";
import { markStartIntent, warmApiServer } from "./apiWarmup.js";

const CONSENT_KEY = "careerdive-start-consent";
const CONSENT_VERSION = "2026-10-11";

export function hasStartConsent(): boolean {
  try {
    return window.sessionStorage.getItem(CONSENT_KEY) === CONSENT_VERSION;
  } catch {
    return false;
  }
}

export function acknowledgeStart(): void {
  try {
    window.sessionStorage.setItem(CONSENT_KEY, CONSENT_VERSION);
  } catch {
    // The inline Start button can still acknowledge this visit without storage.
  }
}

export function StartConsent({ id }: { id: string }) {
  return (
    <p id={id} className="start-consent">
      By clicking Start, you confirm you&apos;re 13 or older and agree to our{" "}
      <SiteLink to="/terms">Terms</SiteLink> and{" "}
      <SiteLink to="/privacy">Privacy Policy</SiteLink>.
    </p>
  );
}

/** The notice travels with each content CTA; plain navigation uses the Start page. */
export function StartLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="start-cta">
      <SiteLink
        to="/start"
        className={className}
        aria-describedby={id}
        onPointerEnter={warmApiServer}
        onFocus={warmApiServer}
        onNavigate={() => {
          acknowledgeStart();
          markStartIntent();
          warmApiServer();
        }}
      >
        {children}
      </SiteLink>
      <StartConsent id={id} />
    </div>
  );
}
