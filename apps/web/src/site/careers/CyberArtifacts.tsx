export function AlertArtifact({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`v2-artifact v2-media-frame${compact ? " v2-artifact-compact" : ""}`}
      data-media-slot="evidence"
      aria-label="Illustrative A-1042 alert and evidence comparison from the Cybersecurity Analyst first day"
    >
      <div className="v2-artifact-top">
        <span>Verdaly Technologies · Alerts</span>
        <span>Static product preview</span>
      </div>
      <div className="v2-artifact-body">
        <div className="v2-artifact-title">
          <span className="v2-artifact-mark" aria-hidden="true" />
          <div>
            <small>Open investigation</small>
            <strong>Alert A-1042</strong>
          </div>
          <span className="v2-artifact-state">Needs review</span>
        </div>
        <p className="v2-artifact-signal">Sign-in from an unfamiliar device</p>
        <div className="v2-evidence-grid" aria-label="Evidence to compare">
          <div>
            <strong>Identity</strong>
            <span>Who signed in?</span>
          </div>
          <div>
            <strong>Session</strong>
            <span>What does the sign-in record show?</span>
          </div>
          <div>
            <strong>Device</strong>
            <span>Does inventory recognize it?</span>
          </div>
          <div>
            <strong>VPN</strong>
            <span>Does access history line up?</span>
          </div>
        </div>
      </div>
      {compact ? null : (
        <div className="v2-artifact-bottom">
          Compare the records <span aria-hidden="true">→</span> Leave a traceable
          case note
        </div>
      )}
    </div>
  );
}

export function InvestigationSteps() {
  return (
    <div className="v2-work-steps" aria-label="Your investigation">
      <p>
        <strong>01 · Read</strong> the previous analyst’s handoff
      </p>
      <p>
        <strong>02 · Compare</strong> identity, session, device, and VPN records
      </p>
      <p>
        <strong>03 · Document</strong> what’s known and what’s uncertain
      </p>
    </div>
  );
}

export function DeskPreview() {
  return (
    <div
      className="v2-desk v2-media-frame"
      data-media-slot="desk"
      aria-label="Illustrative preview of the existing Desk OS tools"
    >
      <div className="v2-desk-bar">
        <span>Desk OS</span>
        <span>Verdaly · first shift</span>
      </div>
      <div className="v2-desk-body">
        <div className="v2-desk-sidebar">
          <strong>Dashboard</strong>
          <span>Alerts</span>
          <span>Email</span>
          <span>Tickets</span>
          <span>Guides</span>
          <span>Team</span>
          <span>Files · Notes</span>
        </div>
        <div className="v2-desk-window">
          <div className="v2-desk-window-head">
            Alerts · A-1042 <span>Review queue</span>
          </div>
          <div className="v2-desk-alert">
            <span className="v2-desk-alert-icon" aria-hidden="true" />
            <div>
              <strong>Sign-in from an unfamiliar device</strong>
              <small>Check the evidence before you decide.</small>
            </div>
            <span>Review</span>
          </div>
          <div className="v2-desk-record">
            <span>Compare</span>
            <strong>Identity · Session · Device · VPN</strong>
          </div>
          <div className="v2-desk-record">
            <span>Document</span>
            <strong>Known facts and open questions</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export const FIRST_SHIFT_STEPS = [
  "Read the handoff",
  "Choose what needs attention first",
  "Investigate A-1042",
  "Handle scanner interruption A-1180",
  "Give status and leave a usable handoff",
] as const;

export function FirstShiftTimeline() {
  return (
    <ol className="v2-day-list">
      {FIRST_SHIFT_STEPS.map((step) => (
        <li key={step}>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}
