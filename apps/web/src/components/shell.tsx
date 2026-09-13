import type { ClientView } from "@sim/schemas";
import { getTutorialStep, TUTORIAL_STEPS } from "../guidance.js";
import { COMPANY } from "../world/company.js";

export function ManagerContext({
  message,
  onReturn,
}: {
  message: string;
  onReturn: () => void;
}) {
  return (
    <section className="manager-context" aria-labelledby="manager-title">
      <div className="scene-side" aria-hidden="true">
        <div className="manager-profile">
          <span>M</span>
        </div>
        <p className="scene-side-caption">Live · manager desk</p>
      </div>
      <div className="scene-copy">
        <p className="eyebrow">{COMPANY.name} · your manager</p>
        <h2 id="manager-title">Morgan is here to help</h2>
        <p className="manager-name">Security Operations Manager</p>
        <blockquote>
          <p>{message}</p>
        </blockquote>
        <button className="start-shift" onClick={onReturn} type="button">
          Back to my desk
        </button>
      </div>
    </section>
  );
}

export function ShiftBriefing({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="shift-briefing" aria-labelledby="briefing-title">
      <div className="scene-side" aria-hidden="true">
        <div className="manager-profile">
          <span>M</span>
        </div>
        <p className="scene-side-caption">Day one · onboarding</p>
      </div>
      <div className="scene-copy">
        <p className="eyebrow">
          {COMPANY.fullName} · {COMPANY.floor}
        </p>
        <h2 id="briefing-title">
          Welcome to day one as a {COMPANY.role} at {COMPANY.name}
        </h2>
        <p className="manager-name">
          Morgan · your manager · showing you the ropes
        </p>
        <p>
          Welcome. You do not need cybersecurity experience to begin. Your job
          is to help the team understand unusual computer activity: read the
          records, compare what they say, and leave clear notes about what still
          needs checking. You can ask for guidance as you go.
        </p>
        <ul className="briefing-beats">
          <li>
            Start with the handoff in Email — the previous analyst’s note about
            unfinished work.
          </li>
          <li>
            Use Alerts to inspect warnings, Guides to check references, and
            Tickets to save your investigation notes.
          </li>
          <li>
            Expect an interruption. Leave yourself a next step before switching
            work, and ask Morgan in Team Chat when a procedure is unclear.
          </li>
        </ul>
        <p>
          Walk the office, stay at your desk, or use Simple list: each mode
          offers the same work and outcomes. Take time to read; moving quickly
          is not part of the career evidence. At the end, you will review your
          choices and consider how the work felt to you.
        </p>
        <button className="start-shift" onClick={onOpen} type="button">
          Enter the {COMPANY.name} floor
        </button>
      </div>
    </section>
  );
}

export function Tutorial(props: { view?: ClientView } = {}) {
  const view = props.view;
  const step = view ? getTutorialStep(view) : TUTORIAL_STEPS[0];
  const stepIndex = step
    ? TUTORIAL_STEPS.findIndex((item) => item.id === step.id)
    : TUTORIAL_STEPS.length;
  const total = TUTORIAL_STEPS.length;
  const progress = Math.min(stepIndex + 1, total);

  return (
    <section className="tutorial" aria-labelledby="tutorial-title">
      <div className="tutorial-top">
        <p className="eyebrow">Practice · day one at {COMPANY.name}</p>
        {view && step ? (
          <p
            className="tutorial-progress"
            aria-label={`Step ${String(progress)} of ${String(total)}`}
          >
            Step {progress} / {total}
          </p>
        ) : null}
      </div>
      {view && step ? (
        <div className="tutorial-track" aria-hidden="true">
          {TUTORIAL_STEPS.map((item, index) => (
            <span
              className={
                index < progress
                  ? "tutorial-pip tutorial-pip-done"
                  : "tutorial-pip"
              }
              key={item.id}
            />
          ))}
        </div>
      ) : null}
      <p>
        This is a practice shift. Try the controls and ask questions without
        generating career evidence. A handoff is a note from the previous
        analyst; an alert is a warning to investigate, not a conclusion.
      </p>
      <h2 id="tutorial-title">
        {step ? step.title : "You have tried the starting steps"}
      </h2>
      <p>
        {step
          ? step.body
          : "You can keep exploring practice or start the assessed shift when you are ready. That shift records your workplace actions for a debrief; it does not decide whether this career is right for you."}
      </p>
      {!view ? (
        <p className="tutorial-loading">Loading your practice desk…</p>
      ) : null}
    </section>
  );
}
