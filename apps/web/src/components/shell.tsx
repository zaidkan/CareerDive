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
      </div>
      <div className="scene-copy">
        <p className="eyebrow">
          {COMPANY.fullName} · {COMPANY.floor}
        </p>
        <h2 id="briefing-title">
          Welcome to day one as a {COMPANY.role} at {COMPANY.name}
        </h2>
        <p className="manager-name">Morgan · your manager · showing you the ropes</p>
        <p>
          Badge in, walk the floor, meet the team. Your desk is in Security
          Operations. The Break Room has coffee if you need a breath. Read the
          handoff, ask questions, and take your time — real work is not a race.
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

  return (
    <section className="tutorial" aria-labelledby="tutorial-title">
      <p className="eyebrow">
        Practice · day one at {COMPANY.name}
      </p>
      <h2 id="tutorial-title">
        {step ? step.title : "You are ready for the real shift"}
      </h2>
      <p>
        {step
          ? step.body
          : "You tried the basics. Start the assessed shift when you want a full run — it records how you work."}
      </p>
      {!view ? (
        <p className="tutorial-loading">Loading your practice desk…</p>
      ) : null}
    </section>
  );
}
