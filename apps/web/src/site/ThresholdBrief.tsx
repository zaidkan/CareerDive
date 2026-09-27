// ThresholdBrief — ephemeral presentation only, no persistence, no new FSM.
// Content: canonical beats from Shell.tsx / pack.yaml only. No invented Morgan quote.

import { COMPANY } from "../world/company.js";

export function ThresholdBrief({
  onContinue,
  onLeave,
}: {
  onContinue: () => void;
  onLeave?: () => void;
}) {
  return (
    <section className="threshold-brief" aria-labelledby="threshold-brief-title">
      <div className="threshold-brief-main">
        <p className="eyebrow">
          {COMPANY.fullName} · {COMPANY.floor}
        </p>
        <h2 id="threshold-brief-title">
          Day one as a {COMPANY.role} at {COMPANY.name}
        </h2>
        <p className="threshold-brief-lede">
          Badge in, walk the floor, find your desk in Security Operations. The previous analyst left a
          handoff — it is missing a few things on purpose. Read what is available, keep uncertainty
          visible, follow approval boundaries, and leave enough context for the next analyst.
        </p>
        <ol className="briefing-beats" aria-label="What you will do">
          <li>Walk the floor map into Security Operations</li>
          <li>Sit at your desk and sign in</li>
          <li>Work alerts, email, and tickets one step at a time</li>
        </ol>
        <p className="threshold-brief-note">
          About 10 minutes, at your own pace. No scores chasing you.
        </p>
        <div className="threshold-brief-actions">
          <button type="button" className="start-shift" onClick={onContinue} autoFocus>
            Continue to floor
          </button>
          {onLeave ? (
            <button type="button" className="button-secondary" onClick={onLeave}>
              Leave first shift
            </button>
          ) : null}
        </div>
      </div>

      <aside className="threshold-brief-artifact" aria-label="Your destination — Security Operations">
        <p className="artifact-kicker">Your destination</p>
        <h3 className="artifact-title">Floor 12 · Security Operations</h3>
        <div className="artifact-schematic" aria-hidden="true">
          <div className="artifact-room">Reception</div>
          <div className="artifact-room">Trust Lab</div>
          <div className="artifact-room artifact-room--active">
            Security Ops <span className="artifact-room-you">· you</span>
          </div>
          <div className="artifact-room">Break room</div>
        </div>
        <p className="artifact-caption">
          Walk the floor map, find your desk, sign in. The previous analyst’s handoff is already at your
          inbox — read what’s there before you decide.
        </p>
        <div className="artifact-meta">
          <span className="artifact-badge">F12</span>
          <span>Badge · 10 min · No scores</span>
        </div>
      </aside>
    </section>
  );
}
