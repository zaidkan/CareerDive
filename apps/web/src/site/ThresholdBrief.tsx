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
      <ul className="briefing-beats" aria-label="What you will do">
        <li>Walk the floor map into Security Operations</li>
        <li>Sit at your desk and sign in</li>
        <li>Work alerts, email, and tickets one step at a time</li>
      </ul>
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
    </section>
  );
}
